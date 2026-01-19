import { Component, computed, inject, signal } from '@angular/core';
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
      <div class="col-12 col-md-7 col-lg-6">
        <div class="card shadow-sm">
          <div class="card-body">
            <div class="d-flex align-items-center justify-content-between mb-3">
              <div>
                <h2 class="mb-0">Perfil</h2>
                <div class="text-muted">Gestiona tu usuario</div>
              </div>
              <a class="btn btn-outline-secondary" routerLink="/plants">Volver</a>
            </div>

            <ng-container *ngIf="user(); else noUser">
              <div class="mb-3">
                <div><span class="text-muted">Email:</span> <b>{{ user()!.email }}</b></div>
                <div><span class="text-muted">Rol:</span>
                  <span class="badge" [class.bg-dark]="isAdmin()" [class.bg-secondary]="!isAdmin()">
                    {{ user()!.role }}
                  </span>
                </div>
              </div>

              <form [formGroup]="form" (ngSubmit)="save()" class="d-grid gap-2">
                <div>
                  <label class="form-label">Nombre</label>
                  <input class="form-control" formControlName="name" placeholder="Tu nombre">
                  <div class="text-danger mt-1" *ngIf="showError('required')">
                    El nombre es obligatorio
                  </div>
                  <div class="text-danger mt-1" *ngIf="showError('minlength')">
                    Mínimo 3 caracteres
                  </div>
                  <div class="text-danger mt-1" *ngIf="showError('noSpaces')">
                    No se permiten espacios
                  </div>
                </div>

                <div class="d-flex gap-2">
                  <button class="btn btn-primary" type="submit" [disabled]="form.invalid || form.pristine">
                    Guardar
                  </button>

                  <button class="btn btn-outline-danger" type="button" (click)="logout()">
                    Logout
                  </button>
                </div>
              </form>

              <div class="mt-3 d-flex gap-2">
                <a class="btn btn-outline-primary" routerLink="/plants">Ir a plantas</a>
                <a class="btn btn-outline-dark" routerLink="/admin" *ngIf="isAdmin()">Ir a Admin</a>
              </div>

              <div class="alert alert-success mt-3 py-2" *ngIf="msg()">
                {{ msg() }}
              </div>
            </ng-container>

            <ng-template #noUser>
              <div class="alert alert-warning mb-0">
                No hay usuario logueado.
              </div>
              <div class="mt-2">
                <a routerLink="/login">Ir a login</a>
              </div>
            </ng-template>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ProfilePage {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  user = computed(() => this.auth.user());
  isAdmin = computed(() => this.auth.isAdmin());
  msg = signal('');

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3), noSpaces]],
  });

  constructor() {
    const u = this.auth.user();
    if (u) this.form.patchValue({ name: u.name });
  }

  showError(err: string) {
    const c = this.form.controls.name;
    return c.touched && !!c.errors?.[err];
  }

  async save() {
    this.msg.set('');
    this.form.markAllAsTouched();
    const name = this.form.value.name ?? '';
    await this.auth.updateProfile(name);
    this.msg.set('Perfil actualizado');
    this.form.markAsPristine();
  }

  async logout() {
    await this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
