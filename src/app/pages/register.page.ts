import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { noSpaces } from '../validators/no-spaces.validator';
import { MATERIAL } from '../shared/material';

type MsgType = 'neutral' | 'bad' | 'ok';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, ...MATERIAL],
  templateUrl: './register.page.html',
  styleUrl: './register.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterPage {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  loading = signal(false);
  error = signal('');
  showPassword = signal(false);

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3), noSpaces]],
    email: ['', [Validators.required, Validators.email, noSpaces]],
    password: ['', [Validators.required, Validators.minLength(6), noSpaces]],
  });

  private nameCtrl = this.form.controls.name;
  private emailCtrl = this.form.controls.email;
  private passCtrl = this.form.controls.password;

  nameMsg = computed(() => {
    const value = (this.nameCtrl.value ?? '').toString();
    const interacted = this.nameCtrl.touched || this.nameCtrl.dirty;

    if (!interacted)
      return { type: 'neutral' as MsgType, text: 'Introduce tu nombre (minimo 3 caracteres).' };

    const val = value.trim();
    if (!val) return { type: 'bad' as MsgType, text: 'El nombre es obligatorio.' };

    const errs = this.nameCtrl.errors;
    if (errs?.['noSpaces']) return { type: 'bad' as MsgType, text: 'El nombre no puede contener espacios.' };
    if (errs?.['minlength'])
      return { type: 'bad' as MsgType, text: `Minimo 3 caracteres (llevas ${val.length}).` };
    if (errs?.['required']) return { type: 'bad' as MsgType, text: 'El nombre es obligatorio.' };

    return { type: 'ok' as MsgType, text: 'Nombre correcto.' };
  });

  emailMsg = computed(() => {
    const value = (this.emailCtrl.value ?? '').toString();
    const interacted = this.emailCtrl.touched || this.emailCtrl.dirty;

    if (!interacted)
      return { type: 'neutral' as MsgType, text: 'Introduce un email valido (ej: nombre@dominio.com).' };

    const val = value.trim();
    if (!val) return { type: 'bad' as MsgType, text: 'El email es obligatorio.' };

    const errs = this.emailCtrl.errors;
    if (errs?.['noSpaces']) return { type: 'bad' as MsgType, text: 'El email no puede contener espacios.' };
    if (errs?.['email']) return { type: 'bad' as MsgType, text: 'Formato de email no valido.' };
    if (errs?.['required']) return { type: 'bad' as MsgType, text: 'El email es obligatorio.' };

    return { type: 'ok' as MsgType, text: 'Email correcto.' };
  });

  passMsg = computed(() => {
    const value = (this.passCtrl.value ?? '').toString();
    const interacted = this.passCtrl.touched || this.passCtrl.dirty;

    if (!interacted)
      return { type: 'neutral' as MsgType, text: 'Crea una contrasena (minimo 6 caracteres).' };

    if (!value) return { type: 'bad' as MsgType, text: 'La contrasena es obligatoria.' };

    const errs = this.passCtrl.errors;
    if (errs?.['noSpaces'])
      return { type: 'bad' as MsgType, text: 'La contrasena no puede contener espacios.' };
    if (errs?.['minlength'])
      return { type: 'bad' as MsgType, text: `Minimo 6 caracteres (llevas ${value.length}).` };
    if (errs?.['required']) return { type: 'bad' as MsgType, text: 'La contrasena es obligatoria.' };

    return { type: 'ok' as MsgType, text: 'Contrasena correcta.' };
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

  togglePasswordVisibility() {
    this.showPassword.update(v => !v);
  }
}

