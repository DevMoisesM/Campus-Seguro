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

  // Modal de Asignación / Reasignación de Mantenedor
  selectedAssignTicket = signal<Ticket | null>(null);
  selectedMantenedorId = signal<number | null>(null);
  reassignMotivo = signal<string>('licencia_medica');
  reassignObservacion = signal<string>('');

  motivosReasignacion = [
    { codigo: 'licencia_medica', label: 'Inasistencia / Licencia médica del técnico actual' },
    { codigo: 'sobrecarga_trabajo', label: 'Sobrecarga de trabajo / Balance de turnos' },
    { codigo: 'requiere_especialista', label: 'Se requiere técnico con otra especialidad' },
    { codigo: 'demora_inactividad', label: 'Demora / Sin avances en el tiempo esperado' },
    { codigo: 'otro', label: 'Otro motivo' }
  ];

  openAssignModal(ticket: Ticket): void {
    this.selectedAssignTicket.set(ticket);
    this.selectedMantenedorId.set(null);
    this.reassignMotivo.set('licencia_medica');
    this.reassignObservacion.set('');
  }

  closeAssignModal(): void {
    this.selectedAssignTicket.set(null);
    this.selectedMantenedorId.set(null);
    this.reassignMotivo.set('licencia_medica');
    this.reassignObservacion.set('');
  }

  confirmarAsignacion(): void {
    const ticket = this.selectedAssignTicket();
    const mantenedorId = this.selectedMantenedorId();
    if (!ticket || !mantenedorId) return;

    this.submitting.set(true);

    const isReassignment = !!ticket.asignado_a && ticket.asignado_a.id !== mantenedorId;
    const motivoObj = this.motivosReasignacion.find(m => m.codigo === this.reassignMotivo());

    const payload = isReassignment ? {
      motivo: this.reassignMotivo(),
      motivo_display: motivoObj ? motivoObj.label : this.reassignMotivo(),
      observacion: this.reassignObservacion().trim() || undefined
    } : {
      observacion: this.reassignObservacion().trim() || undefined
    };

    this.ticketService.assignMantencion(ticket.id, Number(mantenedorId), payload).subscribe({
      next: () => {
        this.submitting.set(false);
        this.closeAssignModal();
        this.loadData();
      },
      error: () => this.submitting.set(false)
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

  // Modal de Bypass / Validación Directa de Emergencia por Gestor
  selectedBypassTicket = signal<Ticket | null>(null);
  bypassObservacion = '';
  bypassValido = true;
  bypassMantenedorId = '';
  bypassSubestadoRechazo = 'falsa_alarma';

  openBypassModal(ticket: Ticket): void {
    this.selectedBypassTicket.set(ticket);
    this.bypassObservacion = '';
    this.bypassValido = true;
    this.bypassMantenedorId = '';
    this.bypassSubestadoRechazo = 'falsa_alarma';
  }

  closeBypassModal(): void {
    this.selectedBypassTicket.set(null);
  }

  submitBypass(): void {
    const ticket = this.selectedBypassTicket();
    if (!ticket) return;

    this.submitting.set(true);
    this.ticketService.validarGestorDirecto(ticket.id, {
      observacion: this.bypassObservacion.trim() || undefined,
      valido: this.bypassValido,
      mantenedor_id: this.bypassValido && this.bypassMantenedorId ? Number(this.bypassMantenedorId) : undefined,
      subestado_rechazo: !this.bypassValido ? this.bypassSubestadoRechazo : undefined
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.closeBypassModal();
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

  getCargaBadgeClass(m: User): string {
    if (m.inasistencia_activa) {
      return 'bg-slate-100 text-slate-500 border-slate-200';
    }
    const activas = m.carga_activa ?? 0;
    if (activas === 0) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (activas <= 2) return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-rose-50 text-rose-700 border-rose-200';
  }

  getCargaLabel(m: User): string {
    if (m.inasistencia_activa) {
      return 'Ausente (Licencia)';
    }
    const activas = m.carga_activa ?? 0;
    const reparadas = m.reparados_hoy ?? 0;
    const activasText = activas === 0 ? '0 en curso' : `${activas} en curso`;
    const reparadasText = `${reparadas} ${reparadas === 1 ? 'resuelta hoy' : 'resueltas hoy'}`;
    return `${activasText} • ${reparadasText}`;
  }

  getCargaIcon(m: User): string {
    if (m.inasistencia_activa) return 'fa-solid fa-ban text-rose-500';
    const activas = m.carga_activa ?? 0;
    if (activas === 0) return 'fa-solid fa-circle-check text-emerald-600';
    if (activas <= 2) return 'fa-solid fa-clock text-amber-600';
    return 'fa-solid fa-triangle-exclamation text-rose-600';
  }
}
