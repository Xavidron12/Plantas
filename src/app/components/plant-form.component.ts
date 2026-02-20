import { Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Plant } from '../models/plant.model';
import { GeolocationService } from '../core/geolocation.service';

type SavePayload = {
  name: string;
  description: string;
  lat: number;
  lng: number;
  photoFile: File | null;
};

@Component({
  standalone: true,
  selector: 'app-plant-form',
  imports: [CommonModule],
  template: `
    <div class="card shadow-sm">
      <div class="card-body">
        <h3 class="mb-3">{{ title() }}</h3>

        <div class="d-grid gap-3">

          <div>
            <label class="form-label">Nombre</label>
            <input
              class="form-control"
              [value]="name()"
              (input)="name.set(($any($event.target).value || '').toString())"
              (blur)="touch('name')"
              placeholder="Ej: Planta Xavi 1"
            />
            <div class="text-danger small mt-1" *ngIf="touchedName() && nameError()">
              {{ nameError() }}
            </div>
          </div>

          <div>
            <label class="form-label">Descripción</label>
            <textarea
              class="form-control"
              rows="2"
              [value]="description()"
              (input)="description.set(($any($event.target).value || '').toString())"
              placeholder="Opcional"
            ></textarea>
          </div>

          <div class="row g-2">
            <div class="col">
              <label class="form-label">Latitud</label>
              <input
                type="number"
                class="form-control"
                [value]="lat()"
                (input)="lat.set(toNumber($any($event.target).value))"
                (blur)="touch('lat')"
              />
              <div class="text-danger small mt-1" *ngIf="touchedLat() && latError()">
                {{ latError() }}
              </div>
            </div>

            <div class="col">
              <label class="form-label">Longitud</label>
              <input
                type="number"
                class="form-control"
                [value]="lng()"
                (input)="lng.set(toNumber($any($event.target).value))"
                (blur)="touch('lng')"
              />
              <div class="text-danger small mt-1" *ngIf="touchedLng() && lngError()">
                {{ lngError() }}
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
            <input class="form-control" type="file" accept="image/*" (change)="onFile($event)" />
            <div class="form-text">Se sube a Supabase Storage.</div>

            <div class="mt-2" *ngIf="previewUrl()">
              <img [src]="previewUrl()" class="img-fluid rounded border" style="max-height: 180px;">
            </div>

            <div class="mt-2" *ngIf="!previewUrl() && currentPhotoUrl()">
              <div class="small text-muted mb-1">Foto actual:</div>
              <img [src]="currentPhotoUrl()!" class="img-fluid rounded border" style="max-height: 180px;">
            </div>
          </div>

          <div class="d-flex gap-2">
            <button class="btn btn-success" type="button" (click)="submit()" [disabled]="!isValid()">
              Guardar planta
            </button>

            <button
              class="btn btn-outline-secondary"
              type="button"
              (click)="cancel.emit()"
              *ngIf="isEdit()"
            >
              Cancelar
            </button>
          </div>

          <div class="alert alert-danger mt-2 mb-0 py-2" *ngIf="error()">
            {{ error() }}
          </div>

        </div>
      </div>
    </div>
  `,
})
export class PlantFormComponent {
  private geo = inject(GeolocationService);

  initial = input<Plant | null>(null);

  title = signal('Nueva planta');
  error = signal('');
  locating = signal(false);
  isEdit = signal(false);

  // Campos del formulario
  name = signal('');
  description = signal('');
  lat = signal(0);
  lng = signal(0);

  // Estado de la foto
  photoFile = signal<File | null>(null);
  previewUrl = signal<string>('');
  currentPhotoUrl = signal<string | null>(null);

  // Flags para mostrar errores cuando se toque el campo
  private touched = signal<{ name: boolean; lat: boolean; lng: boolean }>({ name: false, lat: false, lng: false });

  touchedName = computed(() => this.touched().name);
  touchedLat = computed(() => this.touched().lat);
  touchedLng = computed(() => this.touched().lng);

  // Validaciones del formulario
  nameError = computed(() => {
    const v = this.name().trim();
    if (!v) return 'El nombre es obligatorio.';
    if (v.length < 3) return 'El nombre debe tener al menos 3 caracteres.';
    return '';
  });

  latError = computed(() => {
    const v = this.lat();
    if (!Number.isFinite(v)) return 'Latitud inválida.';
    if (v < -90 || v > 90) return 'Latitud inválida (-90 a 90).';
    return '';
  });

  lngError = computed(() => {
    const v = this.lng();
    if (!Number.isFinite(v)) return 'Longitud inválida.';
    if (v < -180 || v > 180) return 'Longitud inválida (-180 a 180).';
    return '';
  });

  isValid = computed(() => {
    return !this.nameError() && !this.latError() && !this.lngError();
  });

  save = output<SavePayload>();
  cancel = output<void>();

  constructor() {
    effect(() => {
      const initial = this.initial();
      untracked(() => this.applyInitial(initial));
    });
  }

  ngOnDestroy() {
    this.clearPreview();
  }

  private applyInitial(p: Plant | null) {
    if (!p) {
      this.isEdit.set(false);
      this.title.set('Nueva planta');

      this.name.set('');
      this.description.set('');
      this.lat.set(0);
      this.lng.set(0);

      this.photoFile.set(null);
      this.clearPreview();
      this.currentPhotoUrl.set(null);

      this.touched.set({ name: false, lat: false, lng: false });
      this.error.set('');
      return;
    }

    this.isEdit.set(true);
    this.title.set('Editar planta');

    this.name.set(((p as any).name ?? '').toString());
    this.description.set(((p as any).description ?? '').toString());
    this.lat.set(Number((p as any).lat ?? 0));
    this.lng.set(Number((p as any).lng ?? 0));

    this.photoFile.set(null);
    this.clearPreview();
    this.currentPhotoUrl.set((p as any).photoUrl ?? null);

    this.touched.set({ name: false, lat: false, lng: false });
    this.error.set('');
  }

  touch(field: 'name' | 'lat' | 'lng') {
    const t = this.touched();
    this.touched.set({ ...t, [field]: true });
  }

  private touchAll() {
    this.touched.set({ name: true, lat: true, lng: true });
  }

  toNumber(v: any): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  async useLocation() {
    this.error.set('');
    this.locating.set(true);

    try {
      const pos = await this.geo.getCurrentPosition();
      this.lat.set(pos.lat);
      this.lng.set(pos.lng);
    } catch (e: any) {
      this.error.set(e?.message ?? String(e));
    } finally {
      this.locating.set(false);
    }
  }

  onFile(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    this.photoFile.set(file);
    this.clearPreview();
    if (file) this.previewUrl.set(URL.createObjectURL(file));
  }

  private clearPreview() {
    if (this.previewUrl()) URL.revokeObjectURL(this.previewUrl());
    this.previewUrl.set('');
  }

  submit() {
    this.error.set('');
    this.touchAll();

    if (!this.isValid()) return;

    this.save.emit({
      name: this.name().trim(),
      description: this.description().trim(),
      lat: Number(this.lat()),
      lng: Number(this.lng()),
      photoFile: this.photoFile(),
    });
  }
}
