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

  searchTerm = signal('');
  filterRol = signal<string>('todos');

  // Modal para Crear Usuario
  showCreateModal = signal(false);
  newUser = {
    first_name: '',
    last_name: '',
    correo_institucional: '',
    username: '',
    password: '',
    rol_codigo: 'usuario' as RolCodigo
  };

  // Usuarios filtrados por término y rol
  usuariosFiltrados = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const rolFiltro = this.filterRol();

    return this.usuarios().filter(u => {
      const matchSearch = (u.first_name || '').toLowerCase().includes(term) ||
                          (u.last_name || '').toLowerCase().includes(term) ||
                          (u.correo_institucional || '').toLowerCase().includes(term) ||
                          (u.username || '').toLowerCase().includes(term);

      const matchRol = rolFiltro === 'todos' || u.rol_codigo === rolFiltro;

      return matchSearch && matchRol;
    });
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

  openCreateModal(): void {
    this.newUser = {
      first_name: '',
      last_name: '',
      correo_institucional: '',
      username: '',
      password: '',
      rol_codigo: 'usuario'
    };
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
  }

  submitCreateUser(): void {
    if (!this.newUser.first_name || !this.newUser.last_name || !this.newUser.correo_institucional || !this.newUser.password) {
      alert('Por favor complete los campos obligatorios.');
      return;
    }

    if (!this.newUser.username) {
      this.newUser.username = this.newUser.correo_institucional.split('@')[0];
    }

    const rolObj = this.roles().find(r => r.codigo === this.newUser.rol_codigo);

    this.userService.createInternalStaff({
      first_name: this.newUser.first_name,
      last_name: this.newUser.last_name,
      correo_institucional: this.newUser.correo_institucional,
      username: this.newUser.username,
      password: this.newUser.password,
      rol: rolObj?.id
    }).subscribe({
      next: () => {
        alert('Usuario creado exitosamente.');
        this.closeCreateModal();
        this.loadData();
      },
      error: (err) => alert('Error al crear el usuario: ' + (err.error?.detail || 'Verifique los datos.'))
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
}
