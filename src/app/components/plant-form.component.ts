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
          </div>

          <div>
            <label class="form-label">Descripción</label>
            <textarea class="form-control" rows="2" formControlName="description"></textarea>
          </div>

          <div class="row g-2">
            <div class="col">
              <label class="form-label">Latitud</label>
              <input type="number" class="form-control" formControlName="lat">
            </div>

            <div class="col">
              <label class="form-label">Longitud</label>
              <input type="number" class="form-control" formControlName="lng">
            </div>
          </div>

          <button type="button" class="btn btn-outline-secondary" (click)="useLocation()">
            Usar mi ubicación
          </button>

          <button class="btn btn-success" type="submit" [disabled]="form.invalid">
            Guardar planta
          </button>
        </form>

        <div class="alert alert-danger mt-3" *ngIf="error()">
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

  @Input() set initialPlant(p: Plant | null) {
    if (!p) return;
    this.form.patchValue(p);
    this.title.set('Editar planta');
  }

  @Output() save = new EventEmitter<{
    name: string;
    description: string;
    lat: number;
    lng: number;
  }>();

  form = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    lat: [0, Validators.required],
    lng: [0, Validators.required],
  });

  async useLocation() {
    this.error.set('');
    try {
      const pos = await this.geo.getCurrentPosition();
      this.form.patchValue({
        lat: pos.lat,
        lng: pos.lng,
      });
    } catch (e) {
      this.error.set(String(e));
    }
  }

  submit() {
    this.save.emit(this.form.value as any);
  }
}
