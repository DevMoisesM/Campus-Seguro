import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TicketService } from '../../../services/ticket.service';
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

  // Modal de Registro de Mantenimiento y Pañol
  selectedTicket = signal<Ticket | null>(null);
  horasTrabajadas = 1;
  observacionesTecnicas = '';
  
  // Lista dinámica de materiales consumidos del pañol
  materiales = signal<Array<{ nombre_material: string; cantidad: number; unidad: string }>>([
    { nombre_material: '', cantidad: 1, unidad: 'unidades' }
  ]);

  // Métricas para Mantenedor
  ordenesPendientes = computed(() => this.tickets().filter(t => t.estado.codigo === 'validado' || t.estado.codigo === 'en_mantencion').length);
  ordenesReparadas = computed(() => this.tickets().filter(t => t.estado.codigo === 'reparado' || t.estado.codigo === 'cerrado').length);

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

  openRegisterModal(ticket: Ticket): void {
    this.selectedTicket.set(ticket);
    this.horasTrabajadas = 1;
    this.observacionesTecnicas = '';
    this.materiales.set([{ nombre_material: '', cantidad: 1, unidad: 'unidades' }]);
  }

  closeRegisterModal(): void {
    this.selectedTicket.set(null);
  }

  addMaterialRow(): void {
    this.materiales.update(list => [...list, { nombre_material: '', cantidad: 1, unidad: 'unidades' }]);
  }

  removeMaterialRow(index: number): void {
    this.materiales.update(list => list.filter((_, i) => i !== index));
  }

  submitRegistro(): void {
    const ticket = this.selectedTicket();
    if (!ticket) return;

    const validMateriales = this.materiales()
      .filter(m => m.nombre_material.trim().length > 0)
      .map(m => ({ nombre: m.nombre_material, cantidad: m.cantidad, unidad: m.unidad }));

    this.submitting.set(true);
    this.ticketService.registrarMantencion(ticket.id, {
      horas_trabajadas: this.horasTrabajadas,
      observaciones_tecnicas: this.observacionesTecnicas || 'Mantenimiento preventivo/correctivo ejecutado exitosamente.',
      materiales: validMateriales
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.closeRegisterModal();
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
