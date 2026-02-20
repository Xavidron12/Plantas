import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { noSpaces } from '../validators/no-spaces.validator';

import { MATERIAL } from '../shared/material';

type MsgType = 'neutral' | 'bad' | 'ok';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ...MATERIAL],
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

      <div class="auth-sunflower-card-wrap">
        <mat-card class="auth-sunflower-card" style="width:100%; max-width:520px;">
          <mat-card-header>
            <mat-card-title>Login</mat-card-title>
            <mat-card-subtitle>Inicia sesión para gestionar tus plantas solares.</mat-card-subtitle>
          </mat-card-header>

          <mat-card-content>
            <form [formGroup]="form" (ngSubmit)="submit()" style="display:grid; gap:16px;" novalidate>
              <mat-form-field appearance="outline">
                <mat-label>Email</mat-label>
                <input matInput formControlName="email" autocomplete="email" />

                <mat-hint>
                  <span
                    [style.color]="emailMsg().type==='bad' ? '#b00020' : 'inherit'"
                  >
                    {{ emailMsg().text }}
                  </span>
                </mat-hint>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Contraseña</mat-label>
                <input matInput type="password" formControlName="password" autocomplete="current-password" />

                <mat-hint>
                  <span
                    [style.color]="passMsg().type==='bad' ? '#b00020' : 'inherit'"
                  >
                    {{ passMsg().text }}
                  </span>
                </mat-hint>
              </mat-form-field>

              <button
                mat-raised-button
                color="primary"
                type="submit"
                [disabled]="form.invalid || loading()"
              >
                {{ loading() ? 'Accediendo...' : 'Entrar' }}
              </button>
            </form>

            <mat-card *ngIf="error()" style="margin-top:16px; border:1px solid #b00020;">
              <mat-card-content>
                <mat-error>{{ error() }}</mat-error>
              </mat-card-content>
            </mat-card>
          </mat-card-content>
        </mat-card>
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
    password: ['', [Validators.required, Validators.minLength(6), noSpaces]],
  });

  private emailCtrl = this.form.controls.email;
  private passCtrl = this.form.controls.password;

  emailMsg = computed(() => {
    const v = (this.emailCtrl.value ?? '').toString();
    const interacted = this.emailCtrl.touched || this.emailCtrl.dirty;

    if (!interacted) return { type: 'neutral' as MsgType, text: 'Introduce tu email.' };

    const val = v.trim();
    if (!val) return { type: 'bad' as MsgType, text: 'El email es obligatorio.' };

    const errs = this.emailCtrl.errors;
    if (errs?.['noSpaces']) return { type: 'bad' as MsgType, text: 'El email no puede contener espacios.' };
    if (errs?.['email']) return { type: 'bad' as MsgType, text: 'Formato de email no válido.' };
    if (errs?.['required']) return { type: 'bad' as MsgType, text: 'El email es obligatorio.' };

    return { type: 'ok' as MsgType, text: 'Email correcto.' };
  });

  passMsg = computed(() => {
    const v = (this.passCtrl.value ?? '').toString();
    const interacted = this.passCtrl.touched || this.passCtrl.dirty;

    if (!interacted) return { type: 'neutral' as MsgType, text: 'Introduce tu contraseña.' };

    if (!v) return { type: 'bad' as MsgType, text: 'La contraseña es obligatoria.' };

    const errs = this.passCtrl.errors;
    if (errs?.['noSpaces']) return { type: 'bad' as MsgType, text: 'La contraseña no puede contener espacios.' };
    if (errs?.['minlength']) return { type: 'bad' as MsgType, text: `Mínimo 6 caracteres (llevas ${v.length}).` };
    if (errs?.['required']) return { type: 'bad' as MsgType, text: 'La contraseña es obligatoria.' };

    return { type: 'ok' as MsgType, text: 'Contraseña correcta.' };
  });

  async submit() {
    this.error.set('');
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.loading.set(true);
    try {
      const email = (this.emailCtrl.value ?? '').toString();
      const password = (this.passCtrl.value ?? '').toString();

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
