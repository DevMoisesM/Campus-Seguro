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
  modalError = signal<string | null>(null);

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
    this.modalError.set(null);
    this.showModal.set(true);
  }

  openEditModal(mat: MaterialCatalog): void {
    this.editingId.set(mat.id);
    this.nombre = mat.nombre;
    this.unidadDefecto = mat.unidad_defecto;
    this.stockDisponible = mat.stock_disponible;
    this.modalError.set(null);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.modalError.set(null);
  }

  saveMaterial(): void {
    this.modalError.set(null);

    if (!this.nombre.trim() || this.nombre.trim().length < 3) {
      this.modalError.set('Por favor ingresa un nombre de material válido (al menos 3 caracteres).');
      return;
    }

    if (this.stockDisponible < 0 || this.stockDisponible === null || this.stockDisponible === undefined) {
      this.modalError.set('El stock disponible no puede ser negativo.');
      return;
    }

    if (this.editingId()) {
      this.ticketService.updateMaterial(this.editingId()!, {
        nombre: this.nombre.trim(),
        unidad_defecto: this.unidadDefecto,
        stock_disponible: Number(this.stockDisponible)
      }).subscribe({
        next: () => {
          this.closeModal();
          this.loadMateriales();
        },
        error: (err) => {
          this.modalError.set(err?.error?.detail || err?.error?.nombre?.[0] || 'Error al actualizar el material.');
        }
      });
    } else {
      this.ticketService.createMaterial({
        nombre: this.nombre.trim(),
        unidad_defecto: this.unidadDefecto,
        stock_disponible: Number(this.stockDisponible)
      }).subscribe({
        next: () => {
          this.closeModal();
          this.loadMateriales();
        },
        error: (err) => {
          this.modalError.set(err?.error?.detail || err?.error?.nombre?.[0] || 'Error al crear el material.');
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
