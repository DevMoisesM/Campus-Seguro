import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TicketService, MaterialCatalog } from '../../../services/ticket.service';

@Component({
  selector: 'app-gestor-materiales',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './gestor-materiales.component.html'
})
export class GestorMaterialesComponent implements OnInit {
  ticketService = inject(TicketService);

  loading = signal(true);
  materiales = signal<MaterialCatalog[]>([]);

  // Modal para Crear / Editar Insumo
  showModal = signal(false);
  editingId = signal<number | null>(null);

  nombre = '';
  unidadDefecto = 'unidades';
  stockDisponible = 100;

  ngOnInit(): void {
    this.loadMateriales();
  }

  loadMateriales(): void {
    this.loading.set(true);
    this.ticketService.getMateriales().subscribe({
      next: (data) => {
        this.materiales.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  openCreateModal(): void {
    this.editingId.set(null);
    this.nombre = '';
    this.unidadDefecto = 'unidades';
    this.stockDisponible = 100;
    this.showModal.set(true);
  }

  openEditModal(mat: MaterialCatalog): void {
    this.editingId.set(mat.id);
    this.nombre = mat.nombre;
    this.unidadDefecto = mat.unidad_defecto;
    this.stockDisponible = mat.stock_disponible;
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  saveMaterial(): void {
    if (!this.nombre.trim()) return;

    if (this.editingId()) {
      this.ticketService.updateMaterial(this.editingId()!, {
        nombre: this.nombre,
        unidad_defecto: this.unidadDefecto,
        stock_disponible: this.stockDisponible
      }).subscribe({
        next: () => {
          this.closeModal();
          this.loadMateriales();
        }
      });
    } else {
      this.ticketService.createMaterial({
        nombre: this.nombre,
        unidad_defecto: this.unidadDefecto,
        stock_disponible: this.stockDisponible
      }).subscribe({
        next: () => {
          this.closeModal();
          this.loadMateriales();
        }
      });
    }
  }

  deleteMaterial(id: number): void {
    if (confirm('¿Eliminar este material del Pañol?')) {
      this.ticketService.deleteMaterial(id).subscribe({
        next: () => this.loadMateriales()
      });
    }
  }
}
