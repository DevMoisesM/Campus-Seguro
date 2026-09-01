import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './register.component.html'
})
export class RegisterComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  firstName = signal('');
  lastName = signal('');
  username = signal('');
  email = signal('');
  rut = signal('');
  telefono = signal('');
  password = signal('');
  confirmPassword = signal('');
  showPassword = signal(false);

  submitted = signal(false);
  loading = signal(false);
  errorMessage = signal('');

  isFieldInvalid(field: 'firstName' | 'lastName' | 'username' | 'email' | 'password' | 'confirmPassword'): boolean {
    if (!this.submitted()) return false;
    switch (field) {
      case 'firstName': return !this.firstName().trim();
      case 'lastName': return !this.lastName().trim();
      case 'username': return !this.username().trim();
      case 'email': {
        const mail = this.email().trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return !mail || !emailRegex.test(mail);
      }
      case 'password': return !this.password().trim() || this.password().trim().length < 6;
      case 'confirmPassword': return !this.confirmPassword().trim() || this.confirmPassword().trim() !== this.password().trim();
      default: return false;
    }
  }

  onSubmit(): void {
    this.submitted.set(true);
    this.errorMessage.set('');

    const first = this.firstName().trim();
    const last = this.lastName().trim();
    const user = this.username().trim();
    const mail = this.email().trim();
    const pass = this.password().trim();
    const confirm = this.confirmPassword().trim();
    const rutVal = this.rut().trim();
    const telVal = this.telefono().trim();

    if (!first || !last || !user || !mail || !pass) {
      this.errorMessage.set('Por favor completa todos los campos requeridos (*).');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(mail)) {
      this.errorMessage.set('El correo electrónico no tiene un formato válido.');
      return;
    }

    if (pass.length < 6) {
      this.errorMessage.set('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (pass !== confirm) {
      this.errorMessage.set('Las contraseñas no coinciden.');
      return;
    }

    this.loading.set(true);

    this.authService.register({
      first_name: first,
      last_name: last,
      username: user,
      email: mail,
      password: pass,
      rut: rutVal || undefined,
      telefono: telVal || undefined
    }).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        if (err.status === 429) {
          this.errorMessage.set('Demasiadas solicitudes de registro desde esta conexión. Por favor espera unos momentos antes de reintentar.');
        } else {
          const backendError = err.error?.error || err.error?.message || err.error?.username?.[0] || err.error?.email?.[0] || 'Error al procesar el registro. Intenta nuevamente.';
          this.errorMessage.set(backendError);
        }
      }
    });
  }
}
