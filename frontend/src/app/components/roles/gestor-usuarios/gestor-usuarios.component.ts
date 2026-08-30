import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { UserService } from '../../../services/user.service';
import { User, Rol, RolCodigo, Especialidad } from '../../../models/auth.model';

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
  especialidades = signal<Especialidad[]>([]);

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
    rol_codigo: 'usuario' as RolCodigo,
    especialidades: [] as number[]
  };

  // Modal para Editar Especialidades de Mantenedor
  selectedMantenedor = signal<User | null>(null);
  mantenedorEspecialidades = signal<number[]>([]);

  // Notificaciones y Estados de Carga
  pageNotification = signal<{ type: 'success' | 'error'; message: string } | null>(null);
  modalError = signal<string | null>(null);
  submitting = signal(false);
  especialidadesModalError = signal<string | null>(null);
  submittingEspecialidades = signal(false);

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

  showToast(type: 'success' | 'error', message: string): void {
    this.pageNotification.set({ type, message });
    setTimeout(() => {
      if (this.pageNotification()?.message === message) {
        this.pageNotification.set(null);
      }
    }, 4000);
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

    this.userService.getEspecialidades().subscribe({
      next: (data) => this.especialidades.set(data),
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
      rol_codigo: 'usuario',
      especialidades: []
    };
    this.modalError.set(null);
    this.submitting.set(false);
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
    this.modalError.set(null);
    this.submitting.set(false);
  }

  toggleEspecialidadNewUser(id: number): void {
    const current = [...this.newUser.especialidades];
    const index = current.indexOf(id);
    if (index >= 0) {
      current.splice(index, 1);
    } else {
      current.push(id);
    }
    this.newUser.especialidades = current;
  }

  isEspecialidadSelectedNewUser(id: number): boolean {
    return this.newUser.especialidades.includes(id);
  }

  submitCreateUser(): void {
    if (!this.newUser.first_name.trim() || !this.newUser.last_name.trim() || !this.newUser.correo_institucional.trim() || !this.newUser.password.trim()) {
      this.modalError.set('Por favor completa todos los campos obligatorios (*).');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.newUser.correo_institucional.trim())) {
      this.modalError.set('El correo institucional no tiene un formato válido.');
      return;
    }

    if (this.newUser.password.trim().length < 6) {
      this.modalError.set('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (!this.newUser.username) {
      this.newUser.username = this.newUser.correo_institucional.split('@')[0];
    }

    this.modalError.set(null);
    this.submitting.set(true);

    const rolObj = this.roles().find(r => r.codigo === this.newUser.rol_codigo);

    const payload: any = {
      first_name: this.newUser.first_name,
      last_name: this.newUser.last_name,
      correo_institucional: this.newUser.correo_institucional,
      username: this.newUser.username,
      password: this.newUser.password,
      rol: rolObj?.id
    };

    if (this.newUser.rol_codigo === 'mantencion' && this.newUser.especialidades.length > 0) {
      payload.especialidades = this.newUser.especialidades;
    }

    this.userService.createInternalStaff(payload).subscribe({
      next: () => {
        this.submitting.set(false);
        const name = `${this.newUser.first_name} ${this.newUser.last_name}`;
        this.closeCreateModal();
        this.showToast('success', `Usuario ${name} creado exitosamente.`);
        this.loadData();
      },
      error: (err) => {
        this.submitting.set(false);
        const errText = err.error?.detail || err.error?.error || err.error?.correo_institucional?.[0] || 'Error al crear el usuario. Verifica los datos ingresados.';
        this.modalError.set(errText);
      }
    });
  }

  // Métodos para Modal de Especialidades
  openEspecialidadesModal(user: User): void {
    this.selectedMantenedor.set(user);
    const ids = (user.especialidades || []).map(e => e.id);
    this.mantenedorEspecialidades.set(ids);
    this.especialidadesModalError.set(null);
    this.submittingEspecialidades.set(false);
  }

  closeEspecialidadesModal(): void {
    this.selectedMantenedor.set(null);
    this.mantenedorEspecialidades.set([]);
    this.especialidadesModalError.set(null);
    this.submittingEspecialidades.set(false);
  }

  toggleEspecialidadEdit(id: number): void {
    const current = [...this.mantenedorEspecialidades()];
    const index = current.indexOf(id);
    if (index >= 0) {
      current.splice(index, 1);
    } else {
      current.push(id);
    }
    this.mantenedorEspecialidades.set(current);
  }

  isEspecialidadSelectedEdit(id: number): boolean {
    return this.mantenedorEspecialidades().includes(id);
  }

  submitEspecialidades(): void {
    const user = this.selectedMantenedor();
    if (!user) return;

    this.submittingEspecialidades.set(true);
    this.especialidadesModalError.set(null);

    this.userService.updateUsuario(user.id, { especialidades: this.mantenedorEspecialidades() as any }).subscribe({
      next: () => {
        this.submittingEspecialidades.set(false);
        this.closeEspecialidadesModal();
        this.showToast('success', `Especialidades de ${user.first_name} ${user.last_name} actualizadas correctamente.`);
        this.loadData();
      },
      error: () => {
        this.submittingEspecialidades.set(false);
        this.especialidadesModalError.set('Error al actualizar especialidades. Intenta nuevamente.');
      }
    });
  }

  cambiarRol(user: User, event: Event): void {
    const select = event.target as HTMLSelectElement;
    const nuevoRol = select.value as RolCodigo;
    this.userService.cambiarRol(user.id, nuevoRol).subscribe({
      next: () => {
        this.showToast('success', `Rol de ${user.first_name} actualizado a ${nuevoRol}.`);
        this.loadData();
      },
      error: () => this.showToast('error', 'Error al cambiar el rol del usuario.')
    });
  }

  toggleActivo(user: User): void {
    this.userService.toggleActivo(user.id).subscribe({
      next: (res) => {
        const estadoTxt = res.is_active ? 'activado' : 'desactivado';
        this.showToast('success', `Acceso de ${user.first_name} ${estadoTxt} exitosamente.`);
        this.loadData();
      },
      error: () => this.showToast('error', 'Error al cambiar estado de acceso del usuario.')
    });
  }
}
