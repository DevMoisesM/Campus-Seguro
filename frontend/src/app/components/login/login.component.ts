import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html'
})
export class LoginComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  username = '';
  password = '';
  loading = signal(false);
  errorMessage = signal<string | null>(null);

  // Cuentas de prueba rápidas con colores distintivos por rol (Modo Claro)
  testAccounts = [
    { label: 'Gestor', user: 'gestor1', pass: 'Gestor2026!', badge: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 hover:border-purple-300' },
    { label: 'Guardia', user: 'guardia1', pass: 'Guardia2026!', badge: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 hover:border-amber-300' },
    { label: 'Mantenedor', user: 'mantencion1', pass: 'Mantencion2026!', badge: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:border-blue-300' },
    { label: 'Estudiante', user: 'estudiante1', pass: 'Estudiante2026!', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300' },
  ];

  ngOnInit(): void {
    // Si ya está autenticado, redirige a la URL prefijada de su rol
    if (this.authService.isAuthenticated()) {
      this.redirectUserByRole(this.authService.userRole());
    }
  }

  fillTestAccount(account: { user: string; pass: string }) {
    this.username = account.user;
    this.password = account.pass;
    this.onSubmit();
  }

  onSubmit() {
    if (!this.username || !this.password) {
      this.errorMessage.set('Por favor ingresa usuario y contraseña');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    this.authService.login({ username: this.username, password: this.password }).subscribe({
      next: (res) => {
        this.loading.set(false);
        const role = res.user.rol_codigo || 'usuario';
        this.redirectUserByRole(role);
      },
      error: (err) => {
        this.loading.set(false);
        const msg = err?.error?.detail || 'Credenciales incorrectas. Verifica tu usuario y contraseña.';
        this.errorMessage.set(msg);
      }
    });
  }

  onSsoLogin() {
    alert('Redirigiendo al portal seguro de Auth0 Institucional...');
  }

  private redirectUserByRole(role: string) {
    switch (role) {
      case 'gestor':
        this.router.navigate(['/gestor/dashboard']);
        break;
      case 'guardia':
        this.router.navigate(['/guardia/dashboard']);
        break;
      case 'mantencion':
        this.router.navigate(['/mantencion/dashboard']);
        break;
      default:
        this.router.navigate(['/estudiante/dashboard']);
        break;
    }
  }
}
