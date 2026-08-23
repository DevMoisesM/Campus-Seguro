import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TicketService } from '../../../services/ticket.service';
import { AuthService } from '../../../services/auth.service';
import { Ticket } from '../../../models/ticket.model';
import { compressImage } from '../../../utils/image-compressor.util';

@Component({
  selector: 'app-guardia-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './guardia-dashboard.component.html'
})
export class GuardiaDashboardComponent implements OnInit {
  ticketService = inject(TicketService);
  authService = inject(AuthService);

  tickets = signal<Ticket[]>([]);
  loading = signal(true);
  submitting = signal(false);

  // Modal de Validación
  selectedTicket = signal<Ticket | null>(null);
  checklistElectrico = false;
  checklistEstructural = false;
  checklistAccesibilidad = false;
  observacion = '';

  // Métricas y Filtros para Guardia
  filtroTurno = signal<'mis_inspecciones' | 'todas'>('mis_inspecciones');
  pendientesInspeccion = computed(() => this.tickets().filter(t => t.estado.codigo === 'enviado').length);
  validadosHoy = computed(() => this.tickets().filter(t => t.estado.codigo !== 'enviado').length);

  inasistenciaActiva = computed(() => {
    // 1. Revisar perfil en sesión
    const user = this.authService.currentUser();
    if (user?.inasistencia_activa) return true;

    // 2. Revisar inasistencias en tiempo real
    const today = new Date().toISOString().split('T')[0];
    return this.misInasistencias().some(i => {
      const aprobada = i.estado === 'aprobada';
      const enRango = i.fecha_desde <= today && today <= i.fecha_hasta;
      return aprobada && enRango;
    });
  });

  misAsignadosCount = computed(() => {
    if (this.inasistenciaActiva()) return 0;
    const user = this.authService.currentUser();
    if (!user) return 0;
    return this.tickets().filter(t => (t.guardia_asignado?.id === user.id || !t.guardia_asignado) && t.estado.codigo === 'enviado').length;
  });

  ticketsFiltrados = computed(() => {
    if (this.filtroTurno() === 'todas') {
      return this.tickets();
    }
    // Si el guardia está con licencia activa hoy, su ronda personal queda vacía
    if (this.inasistenciaActiva()) {
      return [];
    }
    const user = this.authService.currentUser();
    if (!user) return [];
    return this.tickets().filter(t => t.guardia_asignado?.id === user.id || !t.guardia_asignado);
  });

  ngOnInit(): void {
    this.loadTickets();
    this.loadMisInasistencias();
  }

  loadTickets(): void {
    this.loading.set(true);
    this.ticketService.getTickets().subscribe({
      next: (data) => {
        this.tickets.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  // Evidencias Fotográficas Múltiples de la Inspección
  imagenesPreview = signal<string[]>([]);

  onFilesSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    const files = target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach(async (file) => {
        try {
          const compressed = await compressImage(file);
          if (compressed) {
            this.imagenesPreview.update(prev => [...prev, compressed]);
          }
        } catch {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            this.imagenesPreview.update(prev => [...prev, result]);
          };
          reader.readAsDataURL(file);
        }
      });
      target.value = '';
    }
  }

  removeImagenAt(index: number): void {
    this.imagenesPreview.update(prev => prev.filter((_, i) => i !== index));
  }

  openValidationModal(ticket: Ticket): void {
    this.selectedTicket.set(ticket);
    this.checklistElectrico = ticket.riesgo_electrico || false;
    this.checklistEstructural = ticket.riesgo_estructural || false;
    this.checklistAccesibilidad = ticket.riesgo_accesibilidad || false;
    this.observacion = '';
    this.imagenesPreview.set([]);
  }

  closeValidationModal(): void {
    this.selectedTicket.set(null);
    this.imagenesPreview.set([]);
  }

  // Modal de Licencia / Permiso
  showInasistenciaModal = signal(false);
  misInasistencias = signal<any[]>([]);
  inasiMotivo = '';
  inasiFechaDesde = '';
  inasiFechaHasta = '';
  inasistenciaSuccess = signal<string | null>(null);
  inasistenciaError = signal<string | null>(null);
  submittingInasistencia = signal(false);

  openInasistenciaModal(): void {
    const today = new Date().toISOString().split('T')[0];
    this.inasiMotivo = '';
    this.inasiFechaDesde = today;
    this.inasiFechaHasta = today;
    this.inasistenciaSuccess.set(null);
    this.inasistenciaError.set(null);
    this.loadMisInasistencias();
    this.showInasistenciaModal.set(true);
  }

  closeInasistenciaModal(): void {
    this.showInasistenciaModal.set(false);
    this.inasistenciaSuccess.set(null);
    this.inasistenciaError.set(null);
  }

  loadMisInasistencias(): void {
    this.ticketService.getInasistencias().subscribe({
      next: (data) => this.misInasistencias.set(data),
      error: () => {}
    });
  }

  submitInasistencia(): void {
    if (!this.inasiMotivo.trim() || !this.inasiFechaDesde || !this.inasiFechaHasta) {
      this.inasistenciaError.set('Por favor completa todos los campos requeridos antes de enviar.');
      return;
    }

    this.inasistenciaError.set(null);
    this.inasistenciaSuccess.set(null);
    this.submittingInasistencia.set(true);

    this.ticketService.createInasistencia({
      motivo: this.inasiMotivo,
      fecha_desde: this.inasiFechaDesde,
      fecha_hasta: this.inasiFechaHasta
    }).subscribe({
      next: () => {
        this.submittingInasistencia.set(false);
        this.inasistenciaSuccess.set('Tu solicitud fue registrada y enviada para revisión del Gestor.');
        this.inasiMotivo = '';
        this.loadMisInasistencias();
        setTimeout(() => this.inasistenciaSuccess.set(null), 6000);
      },
      error: (err) => {
        this.submittingInasistencia.set(false);
        const msg = err?.error?.detail || err?.error?.motivo?.[0] || 'Ocurrió un error al enviar la solicitud.';
        this.inasistenciaError.set(msg);
      }
    });
  }

  submitValidation(valido: boolean = true): void {
    const ticket = this.selectedTicket();
    if (!ticket) return;

    if (!valido && !this.observacion.trim()) {
      alert('Para rechazar un ticket o declararlo como falsa alarma, debes ingresar un motivo en las observaciones.');
      return;
    }

    this.submitting.set(true);
    this.ticketService.validarGuardia(ticket.id, {
      checklist_electrico: this.checklistElectrico,
      checklist_estructural: this.checklistEstructural,
      checklist_accesibilidad: this.checklistAccesibilidad,
      observacion: this.observacion || (valido ? 'Inspección realizada en terreno sin observaciones críticas.' : 'Ticket rechazado / Falsa alarma comprobada en terreno.'),
      valido: valido,
      imagenes_urls: this.imagenesPreview()
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.closeValidationModal();
        this.loadTickets();
      },
      error: () => this.submitting.set(false)
    });
  }

  getUrgenciaBadgeClass(urgencia: string): string {
    switch (urgencia) {
      case 'critica': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'alta': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'media': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      default: return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  }
}
