import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PlantsService } from '../core/plants.service';
import { RecordsService } from '../core/records.service';
import { Plant } from '../models/plant.model';
import { PlantRecord } from '../models/record.model';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="d-flex align-items-center justify-content-between mb-3">
      <div>
        <h2 class="mb-0">Detalle de planta</h2>
        <p class="text-muted mb-0">Información y registros en tiempo real (mock)</p>
      </div>

      <a class="btn btn-outline-secondary" routerLink="/plants">Volver</a>
    </div>

    <ng-container *ngIf="notFound(); else content">
      <div class="alert alert-warning">
        Planta no encontrada.
      </div>
    </ng-container>

    <ng-template #content>
      <ng-container *ngIf="plant(); else loading">
        <div class="card shadow-sm mb-3">
          <img
            [src]="imgFor(plant()!)"
            class="card-img-top"
            alt="Foto planta"
            style="height: 280px; object-fit: cover;"
          >

          <div class="card-body">
            <h3 class="card-title mb-1">{{ plant()!.name }}</h3>
            <p class="text-muted mb-3">{{ plant()!.description || 'Sin descripción' }}</p>

            <div class="row g-2">
              <div class="col-12 col-md-6">
                <div class="border rounded p-2">
                  <div class="small text-muted">Latitud</div>
                  <div class="fw-semibold">{{ plant()!.lat }}</div>
                </div>
              </div>
              <div class="col-12 col-md-6">
                <div class="border rounded p-2">
                  <div class="small text-muted">Longitud</div>
                  <div class="fw-semibold">{{ plant()!.lng }}</div>
                </div>
              </div>
            </div>

            <div class="mt-3 small text-muted">
              ID: {{ plant()!.id }} · Owner: {{ plant()!.ownerId }}
            </div>
          </div>
        </div>

        <div class="card shadow-sm">
          <div class="card-body">
            <h4 class="mb-3">Últimos registros (mock)</h4>

            <div *ngIf="lastRecords().length === 0" class="alert alert-info mb-0">
              Aún no hay registros (espera unos segundos).
            </div>

            <div class="table-responsive" *ngIf="lastRecords().length > 0">
              <table class="table table-sm align-middle">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Consumo (W)</th>
                    <th>Generación (W)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let r of lastRecords()">
                    <td class="text-muted">{{ r.createdAt }}</td>
                    <td>{{ r.consumptionW }}</td>
                    <td>{{ r.generationW }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <small class="text-muted">
              (Cuando tengamos Supabase, esto se conectará por websockets en tiempo real)
            </small>
          </div>
        </div>
      </ng-container>

      <ng-template #loading>
        <div class="alert alert-secondary">Cargando...</div>
      </ng-template>
    </ng-template>
  `
})
export class PlantDetailPage {
  private route = inject(ActivatedRoute);
  private plants = inject(PlantsService);
  private records = inject(RecordsService);

  plant = signal<Plant | null>(null);
  lastRecords = signal<PlantRecord[]>([]);
  notFound = signal(false);

  constructor() {
    const id = this.route.snapshot.paramMap.get('id') ?? '';

    this.plants.getById(id).subscribe(p => {
      if (!p) {
        this.notFound.set(true);
        return;
      }

      this.plant.set(p);

      this.records.startMockEmitter(p.id);

      this.records.getByPlant(p.id).subscribe(list => {
        this.lastRecords.set(list.slice(-10).reverse());
      });
    });
  }

  imgFor(p: Plant) {
    return p.photoUrl && p.photoUrl.trim().length > 0
      ? p.photoUrl
      : 'https://picsum.photos/1200/600?random=' + encodeURIComponent(p.id);
  }
}
