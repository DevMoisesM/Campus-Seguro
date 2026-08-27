import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { TicketService } from '../../services/ticket.service';
import { TicketMetrics, Ticket } from '../../models/ticket.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit {
  authService = inject(AuthService);
  private ticketService = inject(TicketService);

  metrics = signal<TicketMetrics>({
    total: 0,
    enviados: 0,
    validados: 0,
    en_mantencion: 0,
    reparados: 0,
    cerrados: 0
  });

  recentTickets = signal<Ticket[]>([]);
  loading = signal(true);

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);

    // Si es gestor, carga métricas globales BI
    if (this.authService.hasRole(['gestor'])) {
      this.ticketService.getMetrics().subscribe({
        next: (m) => this.metrics.set(m),
        error: () => {}
      });
    }

    // Carga lista de incidentes asignados o creados
    this.ticketService.getTickets().subscribe({
      next: (tickets) => {
        this.recentTickets.set(tickets.slice(0, 5));
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  getRoleBadgeClass(roleCode: string): string {
    switch (roleCode) {
      case 'gestor': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'guardia': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'mantencion': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      default: return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    }
  }

  getUrgenciaBadgeClass(urgencia: string): string {
    switch (urgencia) {
      case 'critica': return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      case 'alta': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'media': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      default: return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  }
}
