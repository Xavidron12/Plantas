import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth.service';

export const adminGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  try {
    const user = await auth.ensureSession();
    if (!user) return router.createUrlTree(['/login']);
    return user.role === 'admin' ? true : router.createUrlTree(['/plants']);
  } catch {
    return router.createUrlTree(['/login']);
  }
};
