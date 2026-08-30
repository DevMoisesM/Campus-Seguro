import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TicketService } from '../../../services/ticket.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-mis-ausencias',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './mis-ausencias.component.html'
})
export class MisAusenciasComponent implements OnInit {
  ticketService = inject(TicketService);
  authService = inject(AuthService);

  loading = signal(true);
  inasistencias = signal<any[]>([]);

  // Modal para solicitar nueva inasistencia
  showModal = signal(false);
  inasiMotivo = '';
  inasiFechaDesde = '';
  inasiFechaHasta = '';
  submitting = signal(false);

  // Feedback Banners
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  // Filtrar solo las inasistencias del usuario conectado
  misInasistencias = computed(() => {
    return this.inasistencias();
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.ticketService.getInasistencias().subscribe({
      next: (data) => {
        this.inasistencias.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  openModal(): void {
    const today = new Date().toISOString().split('T')[0];
    this.inasiMotivo = '';
    this.inasiFechaDesde = today;
    this.inasiFechaHasta = today;
    this.errorMessage.set(null);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.errorMessage.set(null);
  }

  submitInasistencia(): void {
    if (!this.inasiMotivo.trim() || !this.inasiFechaDesde || !this.inasiFechaHasta) {
      this.errorMessage.set('Por favor completa todos los campos requeridos antes de enviar.');
      return;
    }

    if (this.inasiFechaHasta < this.inasiFechaDesde) {
      this.errorMessage.set('La fecha "Hasta" no puede ser anterior a la fecha "Desde".');
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.submitting.set(true);

    this.ticketService.createInasistencia({
      motivo: this.inasiMotivo.trim(),
      fecha_desde: this.inasiFechaDesde,
      fecha_hasta: this.inasiFechaHasta
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.successMessage.set('Tu solicitud de permiso/licencia fue enviada exitosamente para revisión del Gestor.');
        this.closeModal();
        this.loadData();
        setTimeout(() => this.successMessage.set(null), 6000);
      },
      error: (err) => {
        this.submitting.set(false);
        const msg = err?.error?.detail || err?.error?.motivo?.[0] || 'Ocurrió un error al enviar la solicitud.';
        this.errorMessage.set(msg);
      }
    });
  }
}
