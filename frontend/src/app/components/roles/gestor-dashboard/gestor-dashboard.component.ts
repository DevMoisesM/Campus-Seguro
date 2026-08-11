import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TicketService } from '../../../services/ticket.service';
import { UserService } from '../../../services/user.service';
import { AuthService } from '../../../services/auth.service';
import { Ticket, TicketMetrics } from '../../../models/ticket.model';
import { User } from '../../../models/auth.model';

@Component({
  selector: 'app-gestor-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './gestor-dashboard.component.html'
})
export class GestorDashboardComponent implements OnInit {
  ticketService = inject(TicketService);
  userService = inject(UserService);
  authService = inject(AuthService);

  tickets = signal<Ticket[]>([]);
  mantenedores = signal<User[]>([]);
  metrics = signal<TicketMetrics>({ enviados: 0, validados: 0, en_mantencion: 0, reparados: 0, cerrados: 0 });
  
  loading = signal(true);
  submitting = signal(false);

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    
    this.ticketService.getMetrics().subscribe({
      next: (m) => this.metrics.set(m)
    });

    this.userService.getMantenedores().subscribe({
      next: (mList) => this.mantenedores.set(mList)
    });

    this.ticketService.getTickets().subscribe({
      next: (tList) => {
        this.tickets.set(tList);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  assignMantenedor(ticketId: number, mantenedorIdStr: string): void {
    const mantenedorId = Number(mantenedorIdStr);
    if (!mantenedorId) return;

    this.submitting.set(true);
    this.ticketService.assignMantencion(ticketId, mantenedorId).subscribe({
      next: () => {
        this.submitting.set(false);
        this.loadData();
      },
      error: () => this.submitting.set(false)
    });
  }

  cerrarTicket(ticketId: number): void {
    this.submitting.set(true);
    this.ticketService.cerrarTicket(ticketId).subscribe({
      next: () => {
        this.submitting.set(false);
        this.loadData();
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
