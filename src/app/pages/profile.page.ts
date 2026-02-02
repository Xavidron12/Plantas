import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../core/auth.service';
import { noSpaces } from '../validators/no-spaces.validator';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  template: `
    <div class="row justify-content-center">
      <div class="col-12 col-md-8 col-lg-6">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h2 class="mb-0">Perfil</h2>
            <div class="text-muted">Gestiona tu usuario</div>
          </div>
          <a class="btn btn-outline-secondary" routerLink="/plants">Volver</a>
        </div>

        <div class="card shadow-sm" *ngIf="u(); else noUser">
          <div class="card-body">
            <div class="d-flex align-items-center gap-3 mb-3">
              <div
                class="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center"
                style="width: 56px; height: 56px; font-weight: 700;"
              >
                {{ initials() }}
              </div>

              <div class="flex-grow-1">
                <div class="fw-semibold">{{ u()!.name }}</div>
                <div class="text-muted small">{{ u()!.email }}</div>
              </div>

              <span
                class="badge"
                [class.bg-dark]="u()!.role === 'admin'"
                [class.bg-secondary]="u()!.role !== 'admin'"
              >
                {{ u()!.role }}
              </span>
            </div>

            <form [formGroup]="form" (ngSubmit)="save()" class="d-grid gap-2">
              <div>
                <label class="form-label">Nombre</label>
                <input class="form-control" formControlName="name" />
                <div class="text-danger small mt-1" *ngIf="form.controls.name.touched && form.controls.name.invalid">
                  Nombre inválido (mínimo 3, sin espacios).
                </div>
              </div>

              <div class="d-flex gap-2">
                <button class="btn btn-primary" type="submit" [disabled]="form.invalid || loading()">
                  {{ loading() ? 'Guardando...' : 'Guardar' }}
                </button>

                <button class="btn btn-outline-danger" type="button" (click)="logout()">
                  Cerrar sesión
                </button>

                <a class="btn btn-outline-secondary ms-auto" routerLink="/plants">
                  Ir a plantas
                </a>
              </div>
            </form>

            <div class="alert alert-danger mt-3 py-2" *ngIf="error()">
              {{ error() }}
            </div>
          </div>
        </div>

        <ng-template #noUser>
          <div class="alert alert-warning">
            No hay sesión iniciada.
            <a routerLink="/login" class="ms-2">Ir al login</a>
          </div>
        </ng-template>
      </div>
    </div>
  `,
})
export class ProfilePage {
  private auth = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  loading = signal(false);
  error = signal('');

  u = computed(() => this.auth.user());

  initials = computed(() => {
    const name = (this.u()?.name ?? '').trim();
    if (!name) return 'U';
    const parts = name.split(/\s+/).slice(0, 2);
    return parts.map(p => p[0]?.toUpperCase() ?? '').join('') || 'U';
  });

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3), noSpaces]],
  });

  constructor() {
    effect(() => {
      const user = this.u();
      if (!user) return;
      this.form.patchValue({ name: user.name ?? '' }, { emitEvent: false });
    });
  }

  async save() {
    this.error.set('');
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.loading.set(true);
    try {
      const name = (this.form.value.name ?? '').toString();
      await this.auth.updateProfile(name);
    } catch (e: any) {
      this.error.set(e?.message ?? String(e));
    } finally {
      this.loading.set(false);
    }
  }

  async logout() {
    await this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
