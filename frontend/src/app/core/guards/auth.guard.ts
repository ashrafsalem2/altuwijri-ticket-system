import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated()) return true;
  router.navigate(['/login']);
  return false;
};

/** Restricts a route to the given roles (set on route data: { roles: [...] }). */
export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const roles = (route.data?.['roles'] as string[]) ?? [];
  if (auth.isAuthenticated() && (roles.length === 0 || auth.hasRole(...roles))) return true;
  router.navigate(['/dashboard']);
  return false;
};
