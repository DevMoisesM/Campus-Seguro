import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TicketService } from '../../../services/ticket.service';
import { AuthService } from '../../../services/auth.service';
import { Ticket } from '../../../models/ticket.model';

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

  // Métricas para Guardia
  pendientesInspeccion = computed(() => this.tickets().filter(t => t.estado.codigo === 'enviado').length);
  validadosHoy = computed(() => this.tickets().filter(t => t.estado.codigo !== 'enviado').length);

  ngOnInit(): void {
    this.loadTickets();
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

  openValidationModal(ticket: Ticket): void {
    this.selectedTicket.set(ticket);
    this.checklistElectrico = ticket.riesgo_electrico || false;
    this.checklistEstructural = ticket.riesgo_estructural || false;
    this.checklistAccesibilidad = ticket.riesgo_accesibilidad || false;
    this.observacion = '';
  }

  closeValidationModal(): void {
    this.selectedTicket.set(null);
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

  submitValidation(): void {
    const ticket = this.selectedTicket();
    if (!ticket) return;

    this.submitting.set(true);
    this.ticketService.validarGuardia(ticket.id, {
      checklist_electrico: this.checklistElectrico,
      checklist_estructural: this.checklistEstructural,
      checklist_accesibilidad: this.checklistAccesibilidad,
      observacion: this.observacion || 'Inspección realizada en terreno sin observaciones críticas.'
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
