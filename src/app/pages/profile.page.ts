import { ChangeDetectionStrategy, Component, OnDestroy, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../core/auth.service';
import { noSpaces } from '../validators/no-spaces.validator';
import { ProfilesService } from '../core/profiles.service';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './profile.page.html',
  styleUrl: './profile.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePage implements OnDestroy {
  private auth = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private profiles = inject(ProfilesService);

  loading = signal(false);
  logoutLoading = signal(false);
  error = signal('');
  success = signal('');

  avatarError = signal('');
  avatarUploading = signal(false);
  avatarFile = signal<File | null>(null);
  avatarPreviewUrl = signal('');

  private readonly maxAvatarBytes = 2 * 1024 * 1024;
  private readonly allowedAvatarMime = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

  u = computed(() => this.auth.user());

  initials = computed(() => {
    const name = (this.u()?.name ?? '').trim();
    if (!name) return 'U';
    const parts = name.split(/\s+/).slice(0, 2);
    return parts.map(p => p[0]?.toUpperCase() ?? '').join('') || 'U';
  });

  displayAvatarUrl = computed(() => {
    return this.avatarPreviewUrl() || this.u()?.avatarUrl || '';
  });

  selectedAvatarName = computed(() => this.avatarFile()?.name ?? '');
  selectedAvatarSizeLabel = computed(() => this.formatBytes(this.avatarFile()?.size ?? 0));
  hasAvatar = computed(() => !!this.u()?.avatarUrl);
  canUploadAvatar = computed(() => !!this.avatarFile() && !this.avatarUploading() && !this.avatarError());
  formDirty = computed(() => {
    const current = (this.form.controls.name.value ?? '').toString().trim();
    const original = (this.u()?.name ?? '').toString().trim();
    return current !== original;
  });
  shortUserId = computed(() => {
    const id = this.u()?.id ?? '';
    if (!id) return '-';
    return `${id.slice(0, 8)}...${id.slice(-4)}`;
  });

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3), noSpaces]],
  });

  private nameCtrl = this.form.controls.name;

  nameHint = computed(() => {
    const value = (this.nameCtrl.value ?? '').toString();
    const touched = this.nameCtrl.touched || this.nameCtrl.dirty;

    if (!touched) return 'Usa tu nombre visible de perfil.';

    if (!value.trim()) return 'El nombre es obligatorio.';

    const errors = this.nameCtrl.errors;
    if (errors?.['noSpaces']) return 'El nombre no puede contener espacios.';
    if (errors?.['minlength']) return `Minimo 3 caracteres (actual: ${value.trim().length}).`;
    if (errors?.['required']) return 'El nombre es obligatorio.';

    return 'Nombre valido.';
  });

  avatarHint = computed(() => {
    if (this.avatarError()) return this.avatarError();
    if (this.selectedAvatarName()) return `Listo para subir (${this.selectedAvatarSizeLabel()}).`;
    return 'Formatos permitidos: PNG, JPG, WEBP o GIF. Tamano maximo 2 MB.';
  });

  constructor() {
    effect(() => {
      const user = this.u();
      if (!user) return;
      this.form.patchValue({ name: user.name ?? '' }, { emitEvent: false });
    });
  }

  ngOnDestroy() {
    this.clearAvatarPreview();
  }

  private clearMessages() {
    this.error.set('');
    this.success.set('');
  }

  async save() {
    this.clearMessages();
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    if (!this.formDirty()) {
      this.success.set('No hay cambios pendientes en el nombre.');
      return;
    }

    this.loading.set(true);
    try {
      const name = (this.form.value.name ?? '').toString();
      await this.auth.updateProfile(name);
      this.success.set('Perfil actualizado correctamente.');
    } catch (e: any) {
      this.error.set(e?.message ?? String(e));
    } finally {
      this.loading.set(false);
    }
  }

  onAvatarSelected(event: Event) {
    this.avatarError.set('');
    this.success.set('');

    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    if (file && !this.allowedAvatarMime.has(file.type)) {
      this.avatarFile.set(null);
      input.value = '';
      this.clearAvatarPreview();
      this.avatarError.set('Formato de imagen no permitido.');
      return;
    }

    if (file && file.size > this.maxAvatarBytes) {
      this.avatarFile.set(null);
      input.value = '';
      this.clearAvatarPreview();
      this.avatarError.set('La imagen supera el maximo de 2 MB.');
      return;
    }

    this.avatarFile.set(file);
    this.clearAvatarPreview();

    if (file) {
      this.avatarPreviewUrl.set(URL.createObjectURL(file));
    }
  }

  clearSelectedAvatar() {
    this.avatarFile.set(null);
    this.clearAvatarPreview();
    this.avatarError.set('');
  }

  private clearAvatarPreview() {
    const url = this.avatarPreviewUrl();
    if (url) URL.revokeObjectURL(url);
    this.avatarPreviewUrl.set('');
  }

  async uploadAvatar() {
    const file = this.avatarFile();
    if (!file) {
      this.avatarError.set('Selecciona una imagen antes de subirla.');
      return;
    }

    this.clearMessages();
    this.avatarError.set('');
    this.avatarUploading.set(true);

    try {
      const publicUrl = await this.profiles.uploadAvatar(file);
      await this.auth.updateAvatar(publicUrl);
      this.avatarFile.set(null);
      this.clearAvatarPreview();
      this.success.set('Avatar actualizado correctamente.');
    } catch (e: any) {
      this.avatarError.set(e?.message ?? String(e));
    } finally {
      this.avatarUploading.set(false);
    }
  }

  async removeAvatar() {
    this.clearMessages();
    this.avatarError.set('');
    this.avatarUploading.set(true);

    try {
      await this.auth.updateAvatar(null);
      this.avatarFile.set(null);
      this.clearAvatarPreview();
      this.success.set('Avatar eliminado correctamente.');
    } catch (e: any) {
      this.avatarError.set(e?.message ?? String(e));
    } finally {
      this.avatarUploading.set(false);
    }
  }

  async logout() {
    this.logoutLoading.set(true);
    try {
      await this.auth.logout();
      this.router.navigateByUrl('/login');
    } finally {
      this.logoutLoading.set(false);
    }
  }

  resetNameField() {
    const currentName = (this.u()?.name ?? '').toString();
    this.form.controls.name.setValue(currentName);
    this.form.controls.name.markAsPristine();
    this.form.controls.name.markAsUntouched();
  }

  private formatBytes(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
}

