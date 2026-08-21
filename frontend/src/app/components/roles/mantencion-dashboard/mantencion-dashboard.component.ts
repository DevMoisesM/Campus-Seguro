import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TicketService, MaterialCatalog } from '../../../services/ticket.service';
import { AuthService } from '../../../services/auth.service';
import { Ticket } from '../../../models/ticket.model';

@Component({
  selector: 'app-mantencion-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './mantencion-dashboard.component.html'
})
export class MantencionDashboardComponent implements OnInit {
  ticketService = inject(TicketService);
  authService = inject(AuthService);

  tickets = signal<Ticket[]>([]);
  loading = signal(true);
  submitting = signal(false);

  catalogoMateriales = signal<MaterialCatalog[]>([]);

  // Modal de Registro / Avance de Mantenimiento y Pañol
  selectedTicket = signal<Ticket | null>(null);
  isAvanceDiario = signal(false);
  horasTrabajadas = 1;
  observacionesTecnicas = '';
  imagenUrl = signal<string>('');
  
  // Lista dinámica de materiales consumidos del pañol
  materiales = signal<Array<{ nombre_material: string; cantidad: number; unidad: string }>>([
    { nombre_material: '', cantidad: 1, unidad: 'unidades' }
  ]);

  // Métricas para Mantenedor
  ordenesPendientes = computed(() => this.tickets().filter(t => t.estado.codigo === 'validado' || t.estado.codigo === 'en_mantencion').length);
  ordenesReparadas = computed(() => this.tickets().filter(t => t.estado.codigo === 'reparado' || t.estado.codigo === 'cerrado').length);

  ngOnInit(): void {
    this.loadTickets();
    this.loadMaterialesCatalog();
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

  loadMaterialesCatalog(): void {
    this.ticketService.getMateriales().subscribe({
      next: (data) => this.catalogoMateriales.set(data),
      error: () => {}
    });
  }

  onMaterialSelect(m: { nombre_material: string; cantidad: number; unidad: string }): void {
    const selected = this.catalogoMateriales().find(item => item.nombre === m.nombre_material);
    if (selected) {
      m.unidad = selected.unidad_defecto;
    }
  }

  iniciarTrabajo(ticket: Ticket): void {
    this.submitting.set(true);
    this.ticketService.derivarMantencion(ticket.id).subscribe({
      next: () => {
        this.submitting.set(false);
        this.loadTickets();
      },
      error: () => this.submitting.set(false)
    });
  }

  openAvanceModal(ticket: Ticket): void {
    this.isAvanceDiario.set(true);
    this.selectedTicket.set(ticket);
    this.horasTrabajadas = 1;
    this.observacionesTecnicas = '';
    this.imagenUrl.set('');
    this.materiales.set([{ nombre_material: '', cantidad: 1, unidad: 'unidades' }]);
  }

  openRegisterModal(ticket: Ticket): void {
    this.isAvanceDiario.set(false);
    this.selectedTicket.set(ticket);
    this.horasTrabajadas = 1;
    this.observacionesTecnicas = '';
    this.imagenUrl.set('');
    this.materiales.set([{ nombre_material: '', cantidad: 1, unidad: 'unidades' }]);
  }

  closeRegisterModal(): void {
    this.selectedTicket.set(null);
  }

  addMaterialRow(): void {
    this.materiales.update(m => [...m, { nombre_material: '', cantidad: 1, unidad: 'unidades' }]);
  }

  removeMaterialRow(index: number): void {
    this.materiales.update(m => m.filter((_, i) => i !== index));
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string || '';
        this.imagenUrl.set(result);
      };
      reader.readAsDataURL(file);
    }
  }

  removeFile(): void {
    this.imagenUrl.set('');
  }

  // Modal de Declarar No Reparable / Inviable
  showInviableModal = signal(false);
  inviableMotivo = '';
  subestadoRechazo = 'requiere_proveedor_externo';
  inviableImagenUrl = signal<string>('');

  openInviableModal(ticket: Ticket): void {
    this.selectedTicket.set(ticket);
    this.inviableMotivo = '';
    this.subestadoRechazo = 'requiere_proveedor_externo';
    this.inviableImagenUrl.set('');
    this.showInviableModal.set(true);
  }

  closeInviableModal(): void {
    this.showInviableModal.set(false);
    this.selectedTicket.set(null);
  }

  submitInviable(): void {
    const ticket = this.selectedTicket();
    if (!ticket) return;

    if (!this.inviableMotivo.trim()) {
      alert('Debes ingresar la justificación técnica por la cual no es posible efectuar la reparación.');
      return;
    }

    this.submitting.set(true);
    this.ticketService.declararInviable(ticket.id, {
      motivo: this.inviableMotivo.trim(),
      subestado_rechazo: this.subestadoRechazo,
      imagen_url: this.inviableImagenUrl().trim() || undefined
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.closeInviableModal();
        this.loadTickets();
      },
      error: () => this.submitting.set(false)
    });
  }

  // Modal de Licencia / Permiso
  showInasistenciaModal = signal(false);
  inasiMotivo = '';
  inasiFechaDesde = '';
  inasiFechaHasta = '';

  openInasistenciaModal(): void {
    const today = new Date().toISOString().split('T')[0];
    this.inasiMotivo = '';
    this.inasiFechaDesde = today;
    this.inasiFechaHasta = today;
    this.showInasistenciaModal.set(true);
  }

  closeInasistenciaModal(): void {
    this.showInasistenciaModal.set(false);
  }

  submitInasistencia(): void {
    if (!this.inasiMotivo.trim() || !this.inasiFechaDesde || !this.inasiFechaHasta) {
      alert('Por favor complete todos los campos de la solicitud.');
      return;
    }

    this.ticketService.createInasistencia({
      motivo: this.inasiMotivo,
      fecha_desde: this.inasiFechaDesde,
      fecha_hasta: this.inasiFechaHasta
    }).subscribe({
      next: () => {
        alert('Solicitud de permiso/licencia enviada exitosamente para revisión del Gestor.');
        this.closeInasistenciaModal();
      },
      error: () => alert('Error al enviar la solicitud.')
    });
  }

  submitRegistro(): void {
    const ticket = this.selectedTicket();
    if (!ticket) return;

    const validMateriales = this.materiales()
      .filter(m => m.nombre_material.trim().length > 0)
      .map(m => ({ nombre: m.nombre_material, cantidad: m.cantidad, unidad: m.unidad }));

    const payload = {
      horas_trabajadas: this.horasTrabajadas,
      observaciones_tecnicas: this.observacionesTecnicas || (this.isAvanceDiario() ? 'Avance de mantenimiento registrado.' : 'Mantenimiento preventivo/correctivo ejecutado exitosamente.'),
      materiales: validMateriales,
      imagen_url: this.imagenUrl().trim() || undefined
    };

    this.submitting.set(true);

    if (this.isAvanceDiario()) {
      this.ticketService.registrarAvance(ticket.id, payload).subscribe({
        next: () => {
          this.submitting.set(false);
          this.closeRegisterModal();
          this.loadTickets();
        },
        error: () => this.submitting.set(false)
      });
    } else {
      this.ticketService.registrarMantencion(ticket.id, payload).subscribe({
        next: () => {
          this.submitting.set(false);
          this.closeRegisterModal();
          this.loadTickets();
        },
        error: () => this.submitting.set(false)
      });
    }
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
