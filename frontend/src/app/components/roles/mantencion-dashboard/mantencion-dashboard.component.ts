import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TicketService, MaterialCatalog } from '../../../services/ticket.service';
import { AuthService } from '../../../services/auth.service';
import { Ticket } from '../../../models/ticket.model';
import { compressImage } from '../../../utils/image-compressor.util';

@Component({
  selector: 'app-mantencion-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './mantencion-dashboard.component.html'
})
export class MantencionDashboardComponent implements OnInit, OnDestroy {
  ticketService = inject(TicketService);
  authService = inject(AuthService);

  tickets = signal<Ticket[]>([]);
  loading = signal(true);
  submitting = signal(false);

  catalogoMateriales = signal<MaterialCatalog[]>([]);

  // Notificaciones Toast Reactivas
  toastNotification = signal<{ type: 'success' | 'error'; message: string } | null>(null);

  // Reloj / Temporizador en Vivo
  currentTime = signal(new Date());
  private timerInterval: any;

  // Modal de Registro / Avance de Mantenimiento y Pañol
  selectedTicket = signal<Ticket | null>(null);
  isAvanceDiario = signal(false);
  horasTrabajadas = 1;
  tiempoCalculadoTexto = signal<string>('');
  observacionesTecnicas = '';
  imagenUrl = signal<string>('');
  
  // Lista dinámica de materiales consumidos del pañol
  materiales = signal<Array<{ nombre_material: string; cantidad: number; unidad: string }>>([
    { nombre_material: '', cantidad: 1, unidad: 'unidades' }
  ]);

  // Métricas para Mantenedor
  inasistenciaActiva = computed(() => {
    // 1. Revisar perfil en sesión
    const user = this.authService.currentUser();
    if (user?.inasistencia_activa) return true;

    // 2. Revisar inasistencias en tiempo real
    const today = new Date().toISOString().split('T')[0];
    return this.misInasistencias().some(i => {
      const aprobada = i.estado === 'aprobada';
      const enRango = i.fecha_desde <= today && today <= i.fecha_hasta;
      return aprobada && enRango;
    });
  });

  ordenesPendientes = computed(() => this.tickets().filter(t => t.estado.codigo === 'validado' || t.estado.codigo === 'en_mantencion').length);
  ordenesReparadas = computed(() => this.tickets().filter(t => t.estado.codigo === 'reparado' || t.estado.codigo === 'cerrado').length);

  ngOnInit(): void {
    this.loadTickets();
    this.loadMaterialesCatalog();
    this.loadMisInasistencias();
    // Actualizar temporizador cada segundo para badges reactivos
    this.timerInterval = setInterval(() => {
      this.currentTime.set(new Date());
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  showToast(type: 'success' | 'error', message: string): void {
    this.toastNotification.set({ type, message });
    setTimeout(() => {
      this.toastNotification.set(null);
    }, 4000);
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

  loadMaterialesCatalog(): void {
    this.ticketService.getMateriales().subscribe({
      next: (data) => this.catalogoMateriales.set(data),
      error: () => {}
    });
  }

  onMaterialSelect(m: { nombre_material: string; cantidad: number; unidad: string }): void {
    const selected = this.catalogoMateriales().find(item => item.nombre === m.nombre_material);
    if (selected) {
      m.unidad = selected.unidad_defecto;
    }
  }

  hasActiveSession(ticket: Ticket): boolean {
    return !!ticket.sesion_activa;
  }

  getTiempoTranscurrido(inicioIso?: string): string {
    if (!inicioIso) return '00:00:00';
    const start = new Date(inicioIso).getTime();
    const now = this.currentTime().getTime();
    const diffSecs = Math.max(0, Math.floor((now - start) / 1000));

    const hours = Math.floor(diffSecs / 3600);
    const minutes = Math.floor((diffSecs % 3600) / 60);
    const seconds = diffSecs % 60;

    const pad = (n: number) => n.toString().padStart(2, '0');
    if (hours > 0) {
      return `${hours}h ${pad(minutes)}m ${pad(seconds)}s`;
    }
    return `${pad(minutes)}m ${pad(seconds)}s`;
  }

  getHorasCalculadas(inicioIso?: string): number {
    if (!inicioIso) return 1.0;
    const start = new Date(inicioIso).getTime();
    const now = new Date().getTime();
    const diffHours = (now - start) / (1000 * 60 * 60);
    return Math.max(0.1, Number(diffHours.toFixed(1)));
  }

  iniciarTrabajo(ticket: Ticket): void {
    this.submitting.set(true);
    this.ticketService.iniciarTrabajo(ticket.id).subscribe({
      next: (res) => {
        this.submitting.set(false);
        this.showToast('success', `Trabajo iniciado en terreno. Cronómetro activo para el folio ${ticket.folio}`);
        this.loadTickets();
      },
      error: () => {
        this.submitting.set(false);
        this.showToast('error', 'No fue posible iniciar la jornada de trabajo.');
      }
    });
  }

  openAvanceModal(ticket: Ticket): void {
    this.isAvanceDiario.set(true);
    this.selectedTicket.set(ticket);
    
    if (ticket.sesion_activa?.inicio) {
      this.horasTrabajadas = this.getHorasCalculadas(ticket.sesion_activa.inicio);
      this.tiempoCalculadoTexto.set(this.getTiempoTranscurrido(ticket.sesion_activa.inicio));
    } else {
      this.horasTrabajadas = 1;
      this.tiempoCalculadoTexto.set('');
    }

    this.observacionesTecnicas = '';
    this.imagenUrl.set('');
    this.materiales.set([{ nombre_material: '', cantidad: 1, unidad: 'unidades' }]);
  }

  openRegisterModal(ticket: Ticket): void {
    this.isAvanceDiario.set(false);
    this.selectedTicket.set(ticket);

    if (ticket.sesion_activa?.inicio) {
      this.horasTrabajadas = this.getHorasCalculadas(ticket.sesion_activa.inicio);
      this.tiempoCalculadoTexto.set(this.getTiempoTranscurrido(ticket.sesion_activa.inicio));
    } else {
      this.horasTrabajadas = 1;
      this.tiempoCalculadoTexto.set('');
    }

    this.observacionesTecnicas = '';
    this.imagenUrl.set('');
    this.materiales.set([{ nombre_material: '', cantidad: 1, unidad: 'unidades' }]);
  }

  closeRegisterModal(): void {
    this.selectedTicket.set(null);
  }

  addMaterialRow(): void {
    this.materiales.update(m => [...m, { nombre_material: '', cantidad: 1, unidad: 'unidades' }]);
  }

  removeMaterialRow(index: number): void {
    this.materiales.update(m => m.filter((_, i) => i !== index));
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      compressImage(file).then(compressed => {
        this.imagenUrl.set(compressed);
      }).catch(() => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string || '';
          this.imagenUrl.set(result);
        };
        reader.readAsDataURL(file);
      });
    }
  }

  removeFile(): void {
    this.imagenUrl.set('');
  }

  // Modal de Declarar No Reparable / Inviable
  showInviableModal = signal(false);
  inviableMotivo = '';
  subestadoRechazo = 'requiere_proveedor_externo';
  inviableImagenUrl = signal<string>('');
  inviableError = signal<string | null>(null);

  openInviableModal(ticket: Ticket): void {
    this.selectedTicket.set(ticket);
    this.inviableMotivo = '';
    this.subestadoRechazo = 'requiere_proveedor_externo';
    this.inviableImagenUrl.set('');
    this.inviableError.set(null);
    this.showInviableModal.set(true);
  }

  closeInviableModal(): void {
    this.showInviableModal.set(false);
    this.selectedTicket.set(null);
    this.inviableError.set(null);
  }

  submitInviable(): void {
    const ticket = this.selectedTicket();
    if (!ticket) return;

    if (!this.inviableMotivo.trim()) {
      this.inviableError.set('Debes ingresar la justificación técnica por la cual no es posible efectuar la reparación.');
      return;
    }

    this.submitting.set(true);
    this.inviableError.set(null);
    this.ticketService.declararInviable(ticket.id, {
      motivo: this.inviableMotivo.trim(),
      subestado_rechazo: this.subestadoRechazo,
      imagen_url: this.inviableImagenUrl().trim() || undefined
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.closeInviableModal();
        this.showToast('success', `Ticket ${ticket.folio} derivado / declarado no reparable.`);
        this.loadTickets();
      },
      error: (err) => {
        this.submitting.set(false);
        this.inviableError.set(err?.error?.error || 'Error al derivar el ticket.');
      }
    });
  }

  // Modal de Licencia / Permiso
  showInasistenciaModal = signal(false);
  misInasistencias = signal<any[]>([]);
  inasiMotivo = '';
  inasiFechaDesde = '';
  inasiFechaHasta = '';
  inasistenciaSuccess = signal<string | null>(null);
  inasistenciaError = signal<string | null>(null);
  submittingInasistencia = signal(false);

  openInasistenciaModal(): void {
    const today = new Date().toISOString().split('T')[0];
    this.inasiMotivo = '';
    this.inasiFechaDesde = today;
    this.inasiFechaHasta = today;
    this.inasistenciaSuccess.set(null);
    this.inasistenciaError.set(null);
    this.loadMisInasistencias();
    this.showInasistenciaModal.set(true);
  }

  closeInasistenciaModal(): void {
    this.showInasistenciaModal.set(false);
    this.inasistenciaSuccess.set(null);
    this.inasistenciaError.set(null);
  }

  loadMisInasistencias(): void {
    this.ticketService.getInasistencias().subscribe({
      next: (data) => this.misInasistencias.set(data),
      error: () => {}
    });
  }

  submitInasistencia(): void {
    if (!this.inasiMotivo.trim() || !this.inasiFechaDesde || !this.inasiFechaHasta) {
      this.inasistenciaError.set('Por favor completa todos los campos requeridos antes de enviar.');
      return;
    }

    this.inasistenciaError.set(null);
    this.inasistenciaSuccess.set(null);
    this.submittingInasistencia.set(true);

    this.ticketService.createInasistencia({
      motivo: this.inasiMotivo,
      fecha_desde: this.inasiFechaDesde,
      fecha_hasta: this.inasiFechaHasta
    }).subscribe({
      next: () => {
        this.submittingInasistencia.set(false);
        this.inasistenciaSuccess.set('Tu solicitud fue registrada y enviada para revisión del Gestor.');
        this.inasiMotivo = '';
        this.loadMisInasistencias();
        setTimeout(() => this.inasistenciaSuccess.set(null), 6000);
      },
      error: (err) => {
        this.submittingInasistencia.set(false);
        const msg = err?.error?.detail || err?.error?.motivo?.[0] || 'Ocurrió un error al enviar la solicitud.';
        this.inasistenciaError.set(msg);
      }
    });
  }

  submitRegistro(): void {
    const ticket = this.selectedTicket();
    if (!ticket) return;

    const validMateriales = this.materiales()
      .filter(m => m.nombre_material.trim().length > 0)
      .map(m => ({ nombre: m.nombre_material, cantidad: m.cantidad, unidad: m.unidad }));

    const payload = {
      horas_trabajadas: this.horasTrabajadas,
      observaciones_tecnicas: this.observacionesTecnicas || (this.isAvanceDiario() ? 'Avance de mantenimiento registrado.' : 'Mantenimiento preventivo/correctivo ejecutado exitosamente.'),
      materiales: validMateriales,
      imagen_url: this.imagenUrl().trim() || undefined
    };

    this.submitting.set(true);

    if (this.isAvanceDiario()) {
      this.ticketService.registrarAvance(ticket.id, payload).subscribe({
        next: () => {
          this.submitting.set(false);
          this.closeRegisterModal();
          this.loadTickets();
        },
        error: () => this.submitting.set(false)
      });
    } else {
      this.ticketService.registrarMantencion(ticket.id, payload).subscribe({
        next: () => {
          this.submitting.set(false);
          this.closeRegisterModal();
          this.loadTickets();
        },
        error: () => this.submitting.set(false)
      });
    }
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
