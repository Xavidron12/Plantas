import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth.service';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  try {
    const user = await auth.ensureSession();
    return user ? true : router.createUrlTree(['/login']);
  } catch {
    return router.createUrlTree(['/login']);
  }
};
