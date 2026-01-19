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
      <div class="col-12 col-md-7 col-lg-5">
        <div class="card shadow-sm">
          <div class="card-body">
            <h2 class="mb-1">Crear cuenta</h2>
            <p class="text-muted mb-3">Crea tu usuario y luego inicia sesión.</p>

            <form [formGroup]="form" (ngSubmit)="submit()" class="d-grid gap-3">
              <div>
                <label class="form-label">Nombre</label>
                <input class="form-control" formControlName="name">
              </div>

              <div>
                <label class="form-label">Email</label>
                <input class="form-control" formControlName="email">
              </div>

              <div>
                <label class="form-label">Password</label>
                <input class="form-control" type="password" formControlName="password">
              </div>

              <button class="btn btn-success" type="submit" [disabled]="form.invalid || loading()">
                {{ loading() ? 'Creando...' : 'Crear cuenta' }}
              </button>
            </form>

            <div class="mt-3">
              <a routerLink="/login">Ya tengo cuenta</a>
            </div>

            <div class="alert alert-danger mt-3 py-2" *ngIf="error()">
              {{ error() }}
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class RegisterPage {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  loading = signal(false);
  error = signal('');

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3), noSpaces]],
    email: ['', [Validators.required, Validators.email, noSpaces]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  async submit() {
    this.error.set('');
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.loading.set(true);

    try {
      const name = this.form.value.name ?? '';
      const email = this.form.value.email ?? '';
      const password = this.form.value.password ?? '';

      const res = await this.auth.register(email, password, name);

      if (!res.ok) {
        this.error.set(res.message);
        return;
      }

      await this.router.navigateByUrl('/login');
    } finally {
      this.loading.set(false);
    }
  }
}
