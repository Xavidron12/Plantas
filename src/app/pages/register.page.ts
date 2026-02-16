import { Component, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { noSpaces } from '../validators/no-spaces.validator';

type MsgType = 'neutral' | 'bad' | 'ok';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-sunflower-page">
      <span class="sunflower-bloom sunflower-bloom--peek-left" aria-hidden="true"></span>
      <span class="sunflower-bloom sunflower-bloom--peek-right" aria-hidden="true"></span>

      <div class="sunflower-garden" aria-hidden="true">
        <span class="sunflower-stalk sunflower-stalk--1"></span>
        <span class="sunflower-stalk sunflower-stalk--2"></span>
        <span class="sunflower-stalk sunflower-stalk--3"></span>
        <span class="sunflower-stalk sunflower-stalk--4"></span>
        <span class="sunflower-stalk sunflower-stalk--5"></span>
        <span class="sunflower-stalk sunflower-stalk--6"></span>
      </div>

      <div class="auth-sunflower-card-wrap auth-sunflower-card-wrap--wide">
        <div class="card shadow-sm auth-sunflower-card">
          <div class="card-body">
            <h2 class="mb-1">Crear cuenta</h2>
            <p class="text-muted mb-3">Crea tu usuario para empezar a gestionar tus plantas.</p>

            <form [formGroup]="form" (ngSubmit)="submit()" class="d-grid gap-3" novalidate>
              <div>
                <label class="form-label">Nombre</label>
                <input class="form-control" formControlName="name" autocomplete="name" />

                <div
                  class="small mt-1"
                  [class.text-danger]="nameMsg().type==='bad'"
                  [class.text-success]="nameMsg().type==='ok'"
                  [class.text-muted]="nameMsg().type==='neutral'"
                  *ngIf="nameMsg().text"
                >
                  {{ nameMsg().text }}
                </div>
              </div>

              <div>
                <label class="form-label">Email</label>
                <input class="form-control" formControlName="email" autocomplete="email" />

                <div
                  class="small mt-1"
                  [class.text-danger]="emailMsg().type==='bad'"
                  [class.text-success]="emailMsg().type==='ok'"
                  [class.text-muted]="emailMsg().type==='neutral'"
                  *ngIf="emailMsg().text"
                >
                  {{ emailMsg().text }}
                </div>
              </div>

              <div>
                <label class="form-label">Contraseña</label>
                <input class="form-control" type="password" formControlName="password" autocomplete="new-password" />

                <div
                  class="small mt-1"
                  [class.text-danger]="passMsg().type==='bad'"
                  [class.text-success]="passMsg().type==='ok'"
                  [class.text-muted]="passMsg().type==='neutral'"
                  *ngIf="passMsg().text"
                >
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
    const interacted = this.nameCtrl.touched || this.nameCtrl.dirty;

    if (!interacted) return { type: 'neutral' as MsgType, text: 'Introduce tu nombre (mínimo 3 caracteres).' };

    const val = v.trim();
    if (!val) return { type: 'bad' as MsgType, text: 'El nombre es obligatorio.' };

    const errs = this.nameCtrl.errors;
    if (errs?.['noSpaces']) return { type: 'bad' as MsgType, text: 'El nombre no puede contener espacios.' };
    if (errs?.['minlength']) return { type: 'bad' as MsgType, text: `Mínimo 3 caracteres (llevas ${val.length}).` };
    if (errs?.['required']) return { type: 'bad' as MsgType, text: 'El nombre es obligatorio.' };

    return { type: 'ok' as MsgType, text: 'Nombre OK ✅' };
  });

  emailMsg = computed(() => {
    const v = (this.emailCtrl.value ?? '').toString();
    const interacted = this.emailCtrl.touched || this.emailCtrl.dirty;

    if (!interacted) return { type: 'neutral' as MsgType, text: 'Introduce un email válido (ej: nombre@dominio.com).' };

    const val = v.trim();
    if (!val) return { type: 'bad' as MsgType, text: 'El email es obligatorio.' };

    const errs = this.emailCtrl.errors;
    if (errs?.['noSpaces']) return { type: 'bad' as MsgType, text: 'El email no puede contener espacios.' };
    if (errs?.['email']) return { type: 'bad' as MsgType, text: 'Formato de email no válido.' };
    if (errs?.['required']) return { type: 'bad' as MsgType, text: 'El email es obligatorio.' };

    return { type: 'ok' as MsgType, text: 'Email OK ✅' };
  });

  passMsg = computed(() => {
    const v = (this.passCtrl.value ?? '').toString();
    const interacted = this.passCtrl.touched || this.passCtrl.dirty;

    if (!interacted) return { type: 'neutral' as MsgType, text: 'Crea una contraseña (mínimo 6 caracteres).' };

    if (!v) return { type: 'bad' as MsgType, text: 'La contraseña es obligatoria.' };

    const errs = this.passCtrl.errors;
    if (errs?.['noSpaces']) return { type: 'bad' as MsgType, text: 'La contraseña no puede contener espacios.' };
    if (errs?.['minlength']) return { type: 'bad' as MsgType, text: `Mínimo 6 caracteres (llevas ${v.length}).` };
    if (errs?.['required']) return { type: 'bad' as MsgType, text: 'La contraseña es obligatoria.' };

    return { type: 'ok' as MsgType, text: 'Contraseña OK ✅' };
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
