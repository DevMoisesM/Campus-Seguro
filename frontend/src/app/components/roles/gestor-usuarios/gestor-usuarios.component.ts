import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { UserService } from '../../../services/user.service';
import { User, Rol, RolCodigo } from '../../../models/auth.model';

@Component({
  selector: 'app-gestor-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './gestor-usuarios.component.html'
})
export class GestorUsuariosComponent implements OnInit {
  userService = inject(UserService);

  loading = signal(true);
  usuarios = signal<User[]>([]);
  roles = signal<Rol[]>([]);

  activeTab = signal<'solicitudes' | 'usuarios'>('solicitudes');
  searchTerm = signal('');

  // Solicitudes pendientes (estado_cuenta == 'pendiente')
  solicitudesPendientes = computed(() => 
    this.usuarios().filter(u => u.estado_cuenta === 'pendiente' || !u.is_active)
  );

  // Usuarios activos filtrados
  usuariosFiltrados = computed(() => {
    const term = this.searchTerm().toLowerCase();
    return this.usuarios().filter(u => 
      u.estado_cuenta !== 'pendiente' &&
      ((u.first_name || '').toLowerCase().includes(term) ||
       (u.last_name || '').toLowerCase().includes(term) ||
       (u.correo_institucional || '').toLowerCase().includes(term) ||
       (u.username || '').toLowerCase().includes(term))
    );
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.userService.getUsuarios().subscribe({
      next: (data) => {
        this.usuarios.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });

    this.userService.getRoles().subscribe({
      next: (data) => this.roles.set(data),
      error: () => {}
    });
  }

  aprobarCuenta(user: User, rolCodigo: string): void {
    this.userService.aprobarCuenta(user.id, rolCodigo as RolCodigo).subscribe({
      next: () => this.loadData(),
      error: () => alert('Error al aprobar cuenta')
    });
  }

  cambiarRol(user: User, event: Event): void {
    const select = event.target as HTMLSelectElement;
    const nuevoRol = select.value as RolCodigo;
    this.userService.cambiarRol(user.id, nuevoRol).subscribe({
      next: () => this.loadData(),
      error: () => alert('Error al cambiar el rol')
    });
  }

  toggleActivo(user: User): void {
    this.userService.toggleActivo(user.id).subscribe({
      next: () => this.loadData(),
      error: () => alert('Error al cambiar estado del usuario')
    });
  }

  setTab(tab: 'solicitudes' | 'usuarios'): void {
    this.activeTab.set(tab);
  }
}
