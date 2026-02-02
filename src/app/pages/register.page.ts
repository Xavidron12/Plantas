import { Component, signal, inject, computed } from '@angular/core';
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

            <form [formGroup]="form" (ngSubmit)="submit()" class="d-grid gap-3" novalidate>
              <div>
                <label class="form-label">Nombre</label>
                <input class="form-control" formControlName="name" autocomplete="name" />

                <div class="small mt-1"
                     [class.text-danger]="nameMsg().type==='bad'"
                     [class.text-success]="nameMsg().type==='ok'"
                     *ngIf="nameMsg().text">
                  {{ nameMsg().text }}
                </div>
              </div>

              <div>
                <label class="form-label">Email</label>
                <input class="form-control" formControlName="email" autocomplete="email" />

                <div class="small mt-1"
                     [class.text-danger]="emailMsg().type==='bad'"
                     [class.text-success]="emailMsg().type==='ok'"
                     *ngIf="emailMsg().text">
                  {{ emailMsg().text }}
                </div>
              </div>

              <div>
                <label class="form-label">Password</label>
                <input class="form-control" type="password" formControlName="password" autocomplete="new-password" />

                <div class="small mt-1"
                     [class.text-danger]="passMsg().type==='bad'"
                     [class.text-success]="passMsg().type==='ok'"
                     *ngIf="passMsg().text">
                  {{ passMsg().text }}
                </div>
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
    password: ['', [Validators.required, Validators.minLength(6), noSpaces]],
  });

  private nameCtrl = this.form.controls.name;
  private emailCtrl = this.form.controls.email;
  private passCtrl = this.form.controls.password;

  nameMsg = computed(() => {
    const v = (this.nameCtrl.value ?? '').toString();

    if (!v) return { type: 'bad' as const, text: 'Escribe tu nombre.' };

    const errs = this.nameCtrl.errors;
    if (errs?.['noSpaces']) {
      const i = Number(errs['spaceIndex'] ?? -1);
      return { type: 'bad' as const, text: i >= 0 ? `Espacio en la posición ${i + 1}.` : 'No se permiten espacios.' };
    }
    if (errs?.['minlength']) {
      const need = Number(errs['minlength']?.requiredLength ?? 3);
      return { type: 'bad' as const, text: `Mínimo ${need} caracteres (llevas ${v.length}).` };
    }
    if (errs?.['required']) return { type: 'bad' as const, text: 'El nombre es obligatorio.' };

    return { type: 'ok' as const, text: 'Nombre OK ✅' };
  });

  emailMsg = computed(() => {
    const v = (this.emailCtrl.value ?? '').toString();

    if (!v) return { type: 'bad' as const, text: 'Escribe tu email.' };

    const errs = this.emailCtrl.errors;
    if (errs?.['noSpaces']) {
      const i = Number(errs['spaceIndex'] ?? -1);
      return { type: 'bad' as const, text: i >= 0 ? `Espacio en la posición ${i + 1}.` : 'No se permiten espacios.' };
    }
    if (errs?.['email']) return { type: 'bad' as const, text: 'Formato de email inválido.' };
    if (errs?.['required']) return { type: 'bad' as const, text: 'El email es obligatorio.' };

    return { type: 'ok' as const, text: 'Email válido ✅' };
  });

  passMsg = computed(() => {
    const v = (this.passCtrl.value ?? '').toString();

    if (!v) return { type: 'bad' as const, text: 'Escribe una contraseña.' };

    const errs = this.passCtrl.errors;
    if (errs?.['noSpaces']) {
      const i = Number(errs['spaceIndex'] ?? -1);
      return { type: 'bad' as const, text: i >= 0 ? `Espacio en la posición ${i + 1}.` : 'No se permiten espacios.' };
    }
    if (errs?.['minlength']) {
      const need = Number(errs['minlength']?.requiredLength ?? 6);
      return { type: 'bad' as const, text: `Mínimo ${need} caracteres (llevas ${v.length}).` };
    }
    if (errs?.['required']) return { type: 'bad' as const, text: 'La contraseña es obligatoria.' };

    return { type: 'ok' as const, text: 'Contraseña OK ✅' };
  });

  async submit() {
    this.error.set('');
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.loading.set(true);
    try {
      const name = (this.nameCtrl.value ?? '').toString();
      const email = (this.emailCtrl.value ?? '').toString();
      const password = (this.passCtrl.value ?? '').toString();

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
