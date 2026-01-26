import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Plant } from '../models/plant.model';
import { GeolocationService } from '../core/geolocation.service';

@Component({
  standalone: true,
  selector: 'app-plant-form',
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="card shadow-sm">
      <div class="card-body">
        <h3 class="mb-3">{{ title() }}</h3>

        <form [formGroup]="form" (ngSubmit)="submit()" class="d-grid gap-3">
          <div>
            <label class="form-label">Nombre</label>
            <input class="form-control" formControlName="name">
            <div class="text-danger small mt-1" *ngIf="form.controls.name.touched && form.controls.name.invalid">
               El nombre es obligatorio (mínimo 3 caracteres).
            </div>
          </div>

          <div>
            <label class="form-label">Descripción</label>
            <textarea class="form-control" rows="2" formControlName="description"></textarea>
          </div>

          <div class="row g-2">
            <div class="col">
              <label class="form-label">Latitud</label>
              <input type="number" class="form-control" formControlName="lat">
              <div class="text-danger small mt-1" *ngIf="form.controls.lat.touched && form.controls.lat.invalid">
                Latitud inválida (-90 a 90).
              </div>
            </div>

            <div class="col">
              <label class="form-label">Longitud</label>
              <input type="number" class="form-control" formControlName="lng">
              <div class="text-danger small mt-1" *ngIf="form.controls.lng.touched && form.controls.lng.invalid">
                Longitud inválida (-180 a 180).
              </div>
            </div>
          </div>

          <button
            type="button"
            class="btn btn-outline-secondary"
            (click)="useLocation()"
            [disabled]="locating()"
          >
            {{ locating() ? 'Obteniendo ubicación...' : 'Usar mi ubicación' }}
          </button>

          <div>
            <label class="form-label">Foto (opcional)</label>
            <input class="form-control" type="file" accept="image/*" (change)="onFile($event)">
            <div class="form-text">Se sube a Supabase Storage.</div>

            <div class="mt-2" *ngIf="previewUrl()">
              <img [src]="previewUrl()" class="img-fluid rounded border" style="max-height: 180px;">
            </div>

            <div class="mt-2" *ngIf="!previewUrl() && currentPhotoUrl()">
              <div class="small text-muted mb-1">Foto actual:</div>
              <img [src]="currentPhotoUrl()" class="img-fluid rounded border" style="max-height: 180px;">
            </div>
          </div>

          <div class="d-flex gap-2">
            <button class="btn btn-success" type="submit" [disabled]="form.invalid">
              Guardar planta
            </button>

            <button class="btn btn-outline-secondary" type="button" (click)="cancel.emit()" *ngIf="isEdit()">
              Cancelar
            </button>
          </div>
        </form>

        <div class="alert alert-danger mt-3 mb-0 py-2" *ngIf="error()">
          {{ error() }}
        </div>
      </div>
    </div>
  `
})
export class PlantFormComponent {
  private fb = inject(FormBuilder);
  private geo = inject(GeolocationService);

  title = signal('Nueva planta');
  error = signal('');
  locating = signal(false);
  isEdit = signal(false);

  private selectedFile = signal<File | null>(null);
  previewUrl = signal<string>('');
  currentPhotoUrl = signal<string>('');

  @Input() set initial(p: Plant | null) {
    if (!p) {
      this.isEdit.set(false);
      this.title.set('Nueva planta');
      this.form.reset({ name: '', description: '', lat: 0, lng: 0 });
      this.selectedFile.set(null);
      this.previewUrl.set('');
      this.currentPhotoUrl.set('');
      return;
    }

    this.isEdit.set(true);
    this.title.set('Editar planta');

    this.form.patchValue({
      name: (p as any).name ?? '',
      description: (p as any).description ?? '',
      lat: (p as any).lat ?? 0,
      lng: (p as any).lng ?? 0,
    });

    this.selectedFile.set(null);
    this.previewUrl.set('');
    this.currentPhotoUrl.set((p as any).photoUrl ?? null);
  }

  @Output() save = new EventEmitter<{
    name: string;
    description: string;
    lat: number;
    lng: number;
    photoFile: File | null;
  }>();

  @Output() cancel = new EventEmitter<void>();

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
    lat: [0, [Validators.required, Validators.min(-90), Validators.max(90)]],
    lng: [0, [Validators.required, Validators.min(-180), Validators.max(180)]],
  });

  async useLocation() {
    this.error.set('');
    this.locating.set(true);
    try {
      const pos = await this.geo.getCurrentPosition();
      this.form.patchValue({ lat: pos.lat, lng: pos.lng });
    } catch (e: any) {
      this.error.set(e?.message ?? String(e));
    } finally {
      this.locating.set(false);
    }
  }

  onFile(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.selectedFile.set(file);

    if (this.previewUrl()) URL.revokeObjectURL(this.previewUrl());
    this.previewUrl.set(file ? URL.createObjectURL(file) : '');
  }

  submit() {
    this.error.set('');
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const v = this.form.value;

    this.save.emit({
      name: (v.name ?? '').toString(),
      description: (v.description ?? '').toString(),
      lat: Number(v.lat ?? 0),
      lng: Number(v.lng ?? 0),
      photoFile: this.selectedFile(),
    });
  }
}
