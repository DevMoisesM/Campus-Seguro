import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { LocationService } from '../../../services/location.service';
import { TicketService } from '../../../services/ticket.service';
import { AuthService } from '../../../services/auth.service';
import { Sede, Edificio, Piso, Ubicacion } from '../../../models/location.model';
import { CategoriaTicket, UrgenciaTicket } from '../../../models/ticket.model';
import { compressImage } from '../../../utils/image-compressor.util';

@Component({
  selector: 'app-ticket-create',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './ticket-create.component.html'
})
export class TicketCreateComponent implements OnInit {
  private locationService = inject(LocationService);
  private ticketService = inject(TicketService);
  authService = inject(AuthService);
  private router = inject(Router);

  // Form Fields
  titulo = '';
  descripcion = '';
  imagenesUrls = signal<string[]>([]);
  selectedSedeId: number | null = null;
  selectedEdificioId: number | null = null;
  selectedPisoId: number | null = null;
  selectedUbicacionId: number | null = null;
  selectedCategoriaId: number | null = null;
  urgencia: UrgenciaTicket = 'media';
  afectaClase = false;
  riesgoElectrico = false;
  riesgoEstructural = false;
  riesgoAccesibilidad = false;

  // Signals para selectores en cascada
  sedes = signal<Sede[]>([]);
  edificios = signal<Edificio[]>([]);
  pisos = signal<Piso[]>([]);
  ubicaciones = signal<Ubicacion[]>([]);
  categorias = signal<CategoriaTicket[]>([]);

  submitted = signal(false);
  loading = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  isFieldInvalid(field: 'titulo' | 'descripcion' | 'sede' | 'edificio' | 'piso' | 'ubicacion' | 'categoria'): boolean {
    if (!this.submitted()) return false;
    switch (field) {
      case 'titulo': return !this.titulo || this.titulo.trim().length < 5;
      case 'descripcion': return !this.descripcion || this.descripcion.trim().length < 10;
      case 'sede': return !this.selectedSedeId;
      case 'edificio': return !this.selectedEdificioId;
      case 'piso': return !this.selectedPisoId;
      case 'ubicacion': return !this.selectedUbicacionId;
      case 'categoria': return !this.selectedCategoriaId;
      default: return false;
    }
  }

  ngOnInit(): void {
    this.loadInitialCatalogs();
  }

  loadInitialCatalogs(): void {
    this.locationService.getSedes().subscribe({
      next: (data) => this.sedes.set(data),
      error: () => {}
    });

    this.ticketService.getCategorias().subscribe({
      next: (data) => this.categorias.set(data),
      error: () => {}
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      Array.from(input.files).forEach(async (file) => {
        try {
          const compressed = await compressImage(file);
          if (compressed) {
            this.imagenesUrls.update(list => [...list, compressed]);
          }
        } catch {
          const reader = new FileReader();
          reader.onload = (e) => {
            const result = e.target?.result as string || '';
            if (result) {
              this.imagenesUrls.update(list => [...list, result]);
            }
          };
          reader.readAsDataURL(file);
        }
      });
      input.value = '';
    }
  }

  // Modal Lightbox para Ampliar Imagen
  previewModalImage = signal<string | null>(null);

  openPreviewModal(img: string): void {
    this.previewModalImage.set(img);
  }

  closePreviewModal(): void {
    this.previewModalImage.set(null);
  }

  removeFile(index: number): void {
    this.imagenesUrls.update(list => list.filter((_, i) => i !== index));
  }

  onSedeChange(sedeIdStr: string): void {
    const sedeId = Number(sedeIdStr);
    this.selectedSedeId = sedeId || null;
    this.selectedEdificioId = null;
    this.selectedPisoId = null;
    this.selectedUbicacionId = null;
    this.edificios.set([]);
    this.pisos.set([]);
    this.ubicaciones.set([]);

    if (sedeId) {
      this.locationService.getEdificios(sedeId).subscribe({
        next: (data) => this.edificios.set(data)
      });
    }
  }

  onEdificioChange(edificioIdStr: string): void {
    const edificioId = Number(edificioIdStr);
    this.selectedEdificioId = edificioId || null;
    this.selectedPisoId = null;
    this.selectedUbicacionId = null;
    this.pisos.set([]);
    this.ubicaciones.set([]);

    if (edificioId) {
      this.locationService.getPisos(edificioId).subscribe({
        next: (data) => this.pisos.set(data)
      });
    }
  }

  onPisoChange(pisoIdStr: string): void {
    const pisoId = Number(pisoIdStr);
    this.selectedPisoId = pisoId || null;
    this.selectedUbicacionId = null;
    this.ubicaciones.set([]);

    if (pisoId) {
      this.locationService.getUbicaciones(pisoId).subscribe({
        next: (data) => this.ubicaciones.set(data)
      });
    }
  }

  onSubmit(): void {
    this.submitted.set(true);
    this.errorMessage.set(null);

    if (this.isFieldInvalid('titulo')) {
      this.errorMessage.set('El título del incidente es obligatorio y debe tener al menos 5 caracteres.');
      return;
    }

    if (this.isFieldInvalid('descripcion')) {
      this.errorMessage.set('La descripción es obligatoria y debe tener al menos 10 caracteres explicando el problema.');
      return;
    }

    if (this.isFieldInvalid('sede') || this.isFieldInvalid('edificio') || this.isFieldInvalid('piso') || this.isFieldInvalid('ubicacion')) {
      this.errorMessage.set('Debes completar la ubicación en cascada (Sede, Edificio, Piso y Sala/Ubicación exacta).');
      return;
    }

    if (this.isFieldInvalid('categoria')) {
      this.errorMessage.set('Debes seleccionar una Categoría para clasificar el tipo de incidente.');
      return;
    }

    this.loading.set(true);

    this.ticketService.createTicket({
      titulo: this.titulo.trim(),
      descripcion: this.descripcion.trim(),
      ubicacion: this.selectedUbicacionId!,
      categoria: this.selectedCategoriaId || undefined,
      urgencia: this.urgencia,
      afecta_clase: this.afectaClase,
      riesgo_electrico: this.riesgoElectrico,
      riesgo_estructural: this.riesgoEstructural,
      riesgo_accesibilidad: this.riesgoAccesibilidad,
      imagen_url: this.imagenesUrls().length > 0 ? this.imagenesUrls()[0] : undefined,
      imagenes_urls: this.imagenesUrls()
    }).subscribe({
      next: (ticket) => {
        this.loading.set(false);
        this.successMessage.set(`✓ Ticket ${ticket.folio} creado exitosamente.`);
        setTimeout(() => {
          this.router.navigate(['/tickets', ticket.id]);
        }, 1200);
      },
      error: (err) => {
        this.loading.set(false);
        const detail = err.error?.detail || err.error?.message || 'Error al crear el ticket. Revisa los campos e intenta nuevamente.';
        this.errorMessage.set(detail);
      }
    });
  }
}
