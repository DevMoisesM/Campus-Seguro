import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './perfil.component.html'
})
export class PerfilComponent implements OnInit {
  authService = inject(AuthService);

  firstName = '';
  lastName = '';
  submitting = signal(false);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    const user = this.authService.currentUser();
    if (user) {
      this.firstName = user.first_name || '';
      this.lastName = user.last_name || '';
    }
  }

  get userInitials(): string {
    const user = this.authService.currentUser();
    if (!user) return 'CS';
    const f = user.first_name ? user.first_name[0] : '';
    const l = user.last_name ? user.last_name[0] : '';
    return (f + l).toUpperCase() || user.username.slice(0, 2).toUpperCase();
  }

  get roleBadgeClass(): string {
    const role = this.authService.userRole();
    switch (role) {
      case 'gestor':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'guardia':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'mantencion':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
  }

  submitProfileUpdate(): void {
    if (!this.firstName.trim()) {
      this.errorMessage.set('El nombre no puede estar vacío.');
      return;
    }

    this.submitting.set(true);
    this.successMessage.set(null);
    this.errorMessage.set(null);

    this.authService.updateProfile({
      first_name: this.firstName.trim(),
      last_name: this.lastName.trim()
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.successMessage.set('Perfil actualizado con éxito.');
      },
      error: () => {
        this.submitting.set(false);
        this.errorMessage.set('Error al actualizar la información del perfil.');
      }
    });
  }
}
