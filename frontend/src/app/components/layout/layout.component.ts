import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './layout.component.html'
})
export class LayoutComponent {
  authService = inject(AuthService);
  private router = inject(Router);

  mobileMenuOpen = signal(false);
  sidebarCollapsed = signal(false);

  toggleMobileMenu() {
    this.mobileMenuOpen.update(v => !v);
  }

  toggleSidebar() {
    this.sidebarCollapsed.update(v => !v);
  }

  closeMobileMenu() {
    this.mobileMenuOpen.set(false);
  }

  onLogout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  get userInitials(): string {
    const user = this.authService.currentUser();
    if (!user) return 'CS';
    const f = user.first_name ? user.first_name[0] : '';
    const l = user.last_name ? user.last_name[0] : '';
    return (f + l).toUpperCase() || user.username.slice(0, 2).toUpperCase();
  }

  get roleBadgeColor(): string {
    const role = this.authService.userRole();
    switch (role) {
      case 'gestor':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'guardia':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'mantencion':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      default:
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    }
  }
}
