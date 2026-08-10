import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TicketService } from '../../../services/ticket.service';
import { AuthService } from '../../../services/auth.service';
import { Ticket } from '../../../models/ticket.model';

@Component({
  selector: 'app-ticket-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './ticket-list.component.html'
})
export class TicketListComponent implements OnInit {
  ticketService = inject(TicketService);
  authService = inject(AuthService);

  tickets = signal<Ticket[]>([]);
  loading = signal(true);

  // Filtros
  searchQuery = signal('');
  selectedEstado = signal('');
  selectedUrgencia = signal('');

  filteredTickets = computed(() => {
    let result = this.tickets();
    const query = this.searchQuery().toLowerCase().trim();
    const estado = this.selectedEstado();
    const urgencia = this.selectedUrgencia();

    if (query) {
      result = result.filter(t => 
        t.folio.toLowerCase().includes(query) ||
        t.titulo.toLowerCase().includes(query) ||
        t.ubicacion.nombre.toLowerCase().includes(query)
      );
    }

    if (estado) {
      result = result.filter(t => t.estado.codigo === estado);
    }

    if (urgencia) {
      result = result.filter(t => t.urgencia === urgencia);
    }

    return result;
  });

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

  getUrgenciaBadgeClass(urgencia: string): string {
    switch (urgencia) {
      case 'critica': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'alta': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'media': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      default: return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  }
}
