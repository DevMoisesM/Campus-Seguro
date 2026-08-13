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
  inasistencias = signal<any[]>([]);

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

  aprobar(id: number): void {
    const obs = prompt('Observación opcional para aprobación:');
    this.ticketService.aprobarInasistencia(id, obs || undefined).subscribe({
      next: () => this.loadInasistencias()
    });
  }

  rechazar(id: number): void {
    const obs = prompt('Motivo de rechazo:');
    this.ticketService.rechazarInasistencia(id, obs || undefined).subscribe({
      next: () => this.loadInasistencias()
    });
  }
}
