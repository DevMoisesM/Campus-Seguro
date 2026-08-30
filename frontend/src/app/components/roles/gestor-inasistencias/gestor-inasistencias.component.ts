import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TicketService } from '../../../services/ticket.service';

@Component({
  selector: 'app-gestor-inasistencias',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './gestor-inasistencias.component.html'
})
export class GestorInasistenciasComponent implements OnInit {
  ticketService = inject(TicketService);

  loading = signal(true);
  submitting = signal(false);
  inasistencias = signal<any[]>([]);

  // Modales personalizados
  selectedInasistencia = signal<any | null>(null);
  modalAction = signal<'aprobar' | 'rechazar' | 'reasignar' | null>(null);
  modalError = signal<string | null>(null);
  observacion = '';
  devolverTickets = true;

  ngOnInit(): void {
    this.loadInasistencias();
  }

  loadInasistencias(): void {
    this.loading.set(true);
    this.ticketService.getInasistencias().subscribe({
      next: (data) => {
        this.inasistencias.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  openDecisionModal(ina: any, action: 'aprobar' | 'rechazar'): void {
    this.selectedInasistencia.set(ina);
    this.modalAction.set(action);
    this.modalError.set(null);
    this.observacion = '';
    this.devolverTickets = true;
  }

  openReasignarModal(ina: any): void {
    this.selectedInasistencia.set(ina);
    this.modalAction.set('reasignar');
    this.modalError.set(null);
  }

  closeModal(): void {
    this.selectedInasistencia.set(null);
    this.modalAction.set(null);
    this.modalError.set(null);
    this.observacion = '';
  }

  confirmDecision(): void {
    const ina = this.selectedInasistencia();
    const action = this.modalAction();
    if (!ina || !action) return;

    this.modalError.set(null);

    if (action === 'rechazar' && (!this.observacion.trim() || this.observacion.trim().length < 5)) {
      this.modalError.set('Debes ingresar un motivo explicativo de al menos 5 caracteres para rechazar la inasistencia.');
      return;
    }

    this.submitting.set(true);

    if (action === 'aprobar') {
      this.ticketService.aprobarInasistencia(ina.id, this.observacion.trim() || undefined).subscribe({
        next: (res) => {
          if (this.devolverTickets && res.tickets_pendientes > 0) {
            this.ticketService.reasignarTicketsInasistencia(ina.id).subscribe({
              next: () => {
                this.submitting.set(false);
                this.closeModal();
                this.loadInasistencias();
              },
              error: () => {
                this.submitting.set(false);
                this.closeModal();
                this.loadInasistencias();
              }
            });
          } else {
            this.submitting.set(false);
            this.closeModal();
            this.loadInasistencias();
          }
        },
        error: () => this.submitting.set(false)
      });
    } else {
      this.ticketService.rechazarInasistencia(ina.id, this.observacion.trim() || undefined).subscribe({
        next: () => {
          this.submitting.set(false);
          this.closeModal();
          this.loadInasistencias();
        },
        error: () => this.submitting.set(false)
      });
    }
  }

  confirmReasignar(): void {
    const ina = this.selectedInasistencia();
    if (!ina) return;

    this.submitting.set(true);
    this.ticketService.reasignarTicketsInasistencia(ina.id).subscribe({
      next: () => {
        this.submitting.set(false);
        this.closeModal();
        this.loadInasistencias();
      },
      error: () => this.submitting.set(false)
    });
  }
}
