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

  // Filtrar solo las inasistencias del usuario conectado
  misInasistencias = computed(() => {
    const currentUser = this.authService.currentUser();
    if (!currentUser) return this.inasistencias();
    return this.inasistencias().filter(i => i.usuario === currentUser.id || i.usuario_nombre === currentUser.first_name);
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
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  submitInasistencia(): void {
    if (!this.inasiMotivo.trim() || !this.inasiFechaDesde || !this.inasiFechaHasta) {
      alert('Por favor complete todos los campos de la solicitud.');
      return;
    }

    this.submitting.set(true);
    this.ticketService.createInasistencia({
      motivo: this.inasiMotivo,
      fecha_desde: this.inasiFechaDesde,
      fecha_hasta: this.inasiFechaHasta
    }).subscribe({
      next: () => {
        alert('Solicitud de permiso/licencia enviada exitosamente para revisión del Gestor.');
        this.submitting.set(false);
        this.closeModal();
        this.loadData();
      },
      error: () => {
        alert('Error al enviar la solicitud.');
        this.submitting.set(false);
      }
    });
  }
}
