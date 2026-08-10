import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { TicketService } from '../../../services/ticket.service';
import { AuthService } from '../../../services/auth.service';
import { Ticket } from '../../../models/ticket.model';

@Component({
  selector: 'app-ticket-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './ticket-detail.component.html'
})
export class TicketDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private ticketService = inject(TicketService);
  authService = inject(AuthService);

  ticket = signal<Ticket | null>(null);
  loading = signal(true);
  errorMessage = signal<string | null>(null);

  // Estados clave para determinar la posición en la línea de tiempo
  timelineSteps = [
    { code: 'enviado', label: '1. Reportado / Enviado', icon: 'fa-paper-plane' },
    { code: 'validado', label: '2. Validado por Guardia', icon: 'fa-user-shield' },
    { code: 'en_mantencion', label: '3. En Mantenimiento', icon: 'fa-wrench' },
    { code: 'reparado', label: '4. Reparado', icon: 'fa-check-double' },
    { code: 'cerrado', label: '5. Cerrado', icon: 'fa-circle-check' }
  ];

  ngOnInit(): void {
    const idStr = this.route.snapshot.paramMap.get('id');
    if (idStr) {
      this.loadTicketDetail(Number(idStr));
    }
  }

  loadTicketDetail(id: number): void {
    this.loading.set(true);
    this.ticketService.getTicketById(id).subscribe({
      next: (data) => {
        this.ticket.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set('No se pudo cargar el detalle del incidente.');
      }
    });
  }

  isStepCompleted(stepCode: string): boolean {
    const currentStatus = this.ticket()?.estado?.codigo;
    if (!currentStatus) return false;

    const orderMap: Record<string, number> = {
      'creado': 1,
      'enviado': 1,
      'validado': 2,
      'en_mantencion': 3,
      'reparado': 4,
      'cerrado': 5
    };

    const currentOrder = orderMap[currentStatus] || 1;
    const stepOrder = orderMap[stepCode] || 1;

    return currentOrder >= stepOrder;
  }

  getUrgenciaBadgeClass(urgencia?: string): string {
    switch (urgencia) {
      case 'critica': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'alta': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'media': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      default: return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  }
}
