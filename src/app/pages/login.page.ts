import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { noSpaces } from '../validators/no-spaces.validator';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="row justify-content-center">
      <div class="col-12 col-md-6 col-lg-4">
        <h2 class="mb-3">Login</h2>

        <form [formGroup]="form" (ngSubmit)="submit()" class="d-grid gap-2">
          <div>
            <label class="form-label">Email</label>
            <input class="form-control" formControlName="email">
          </div>

          <div>
            <label class="form-label">Password</label>
            <input class="form-control" type="password" formControlName="password">
          </div>

          <button class="btn btn-primary" type="submit" [disabled]="form.invalid || loading()">
            {{ loading() ? 'Entrando...' : 'Entrar' }}
          </button>
        </form>

        <div class="mt-3">
          <a routerLink="/register">Crear cuenta</a>
        </div>

        <div class="alert alert-danger mt-3 py-2" *ngIf="error()">
          {{ error() }}
        </div>
      </div>
    </div>
  `,
})
export class LoginPage {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  loading = signal(false);
  error = signal('');

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email, noSpaces]],
    password: ['', [Validators.required]],
  });

  async submit() {
    this.error.set('');
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.loading.set(true);

    try {
      const email = this.form.value.email ?? '';
      const password = this.form.value.password ?? '';

      const res = await this.auth.login(email, password);

      if (!res.ok) {
        this.error.set(res.message);
        return;
      }

      this.router.navigateByUrl('/plants');
    } finally {
      this.loading.set(false);
    }
  }
}
