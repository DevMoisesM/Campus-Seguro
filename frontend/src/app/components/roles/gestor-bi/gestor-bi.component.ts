import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TicketService } from '../../../services/ticket.service';
import { LocationService } from '../../../services/location.service';
import { TicketMetrics } from '../../../models/ticket.model';
import { Sede } from '../../../models/location.model';

@Component({
  selector: 'app-gestor-bi',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './gestor-bi.component.html'
})
export class GestorBiComponent implements OnInit {
  ticketService = inject(TicketService);
  locationService = inject(LocationService);

  loading = signal(true);
  metrics = signal<TicketMetrics | null>(null);

  sedes = signal<Sede[]>([]);
  selectedSedeId: number | null = null;

  // Pestañas del módulo BI
  activeTab = signal<'general' | 'guardias' | 'mantencion' | 'materiales' | 'graficos'>('general');

  // Filtros de Período
  rango = signal<'dia' | 'semana' | 'mes' | 'ano'>('mes');
  fechaDesde = '';
  fechaHasta = '';

  // Max value para barras proporcionales
  maxSedeTotal = computed(() => {
    const list = this.metrics()?.por_sede || [];
    return Math.max(...list.map(s => s.total), 1);
  });

  maxEdificioTotal = computed(() => {
    const list = this.metrics()?.por_edificio || [];
    return Math.max(...list.map(e => e.total), 1);
  });

  maxCategoriaTotal = computed(() => {
    const list = this.metrics()?.por_categoria || [];
    return Math.max(...list.map(c => c.total), 1);
  });

  maxMaterialTotal = computed(() => {
    const list = this.metrics()?.top_materiales || [];
    return Math.max(...list.map(m => m.cantidad), 1);
  });

  ngOnInit(): void {
    this.loadSedes();
    this.loadMetrics();
  }

  loadSedes(): void {
    this.locationService.getSedes().subscribe({
      next: (data) => this.sedes.set(data),
      error: () => {}
    });
  }

  loadMetrics(): void {
    this.loading.set(true);
    this.ticketService.getMetrics({
      rango: this.rango(),
      fecha_desde: this.fechaDesde || undefined,
      fecha_hasta: this.fechaHasta || undefined,
      sede: this.selectedSedeId || undefined
    }).subscribe({
      next: (data) => {
        this.metrics.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  setRango(rangoVal: 'dia' | 'semana' | 'mes' | 'ano'): void {
    this.rango.set(rangoVal);
    this.fechaDesde = '';
    this.fechaHasta = '';
    this.loadMetrics();
  }

  onFilterSubmit(): void {
    this.loadMetrics();
  }

  clearFilters(): void {
    this.rango.set('mes');
    this.fechaDesde = '';
    this.fechaHasta = '';
    this.selectedSedeId = null;
    this.loadMetrics();
  }

  setTab(tab: 'general' | 'guardias' | 'mantencion' | 'materiales' | 'graficos'): void {
    this.activeTab.set(tab);
  }
}
