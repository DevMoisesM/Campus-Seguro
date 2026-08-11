import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TicketService } from '../../../services/ticket.service';
import { AuthService } from '../../../services/auth.service';
import { Ticket } from '../../../models/ticket.model';

@Component({
  selector: 'app-estudiante-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './estudiante-dashboard.component.html'
})
export class EstudianteDashboardComponent implements OnInit {
  ticketService = inject(TicketService);
  authService = inject(AuthService);

  tickets = signal<Ticket[]>([]);
  loading = signal(true);

  // Métricas calculadas para el usuario
  totalReportados = computed(() => this.tickets().length);
  enRevision = computed(() => this.tickets().filter(t => t.estado.codigo === 'enviado' || t.estado.codigo === 'validado').length);
  enMantenimiento = computed(() => this.tickets().filter(t => t.estado.codigo === 'en_mantencion').length);
  resueltos = computed(() => this.tickets().filter(t => t.estado.codigo === 'reparado' || t.estado.codigo === 'cerrado').length);

  ngOnInit(): void {
    this.loadUserTickets();
  }

  loadUserTickets(): void {
    this.loading.set(true);
    this.ticketService.getTickets().subscribe({
      next: (data) => {
        this.tickets.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
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
