import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    const allowedRoles = route.data?.['roles'] as string[] | undefined;
    if (allowedRoles && !authService.hasRole(allowedRoles as any)) {
      router.navigate(['/dashboard']);
      return false;
    }
    return true;
  }

  router.navigate(['/login']);
  return false;
};
