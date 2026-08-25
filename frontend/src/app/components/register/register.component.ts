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

  loading = signal(false);
  errorMessage = signal('');

  onSubmit(): void {
    const first = this.firstName().trim();
    const last = this.lastName().trim();
    const user = this.username().trim();
    const mail = this.email().trim();
    const pass = this.password().trim();
    const confirm = this.confirmPassword().trim();
    const rutVal = this.rut().trim();
    const telVal = this.telefono().trim();

    this.errorMessage.set('');

    if (!first || !last || !user || !mail || !pass) {
      this.errorMessage.set('Por favor completa todos los campos requeridos (*).');
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
        const backendError = err.error?.error || err.error?.message || 'Error al procesar el registro. Intenta nuevamente.';
        this.errorMessage.set(backendError);
      }
    });
  }
}
