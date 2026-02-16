import { Component, DestroyRef, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { PlantsService } from '../core/plants.service';
import { RecordsService, PlantRecord } from '../core/records.service';
import { FavoritesService } from '../core/favorites.service';
import { Plant } from '../models/plant.model';

import { RecordsChartComponent } from '../components/records-chart.component';
import { RecordsListComponent } from '../components/records-list.component';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink, RecordsChartComponent, RecordsListComponent],
  template: `
    <div class="container">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h2 class="mb-0">Detalle de planta</h2>
          <div class="text-muted">Realtime + gráfica</div>
        </div>
        <a class="btn btn-outline-secondary" routerLink="/plants">Volver</a>
      </div>

      <div class="alert alert-danger" *ngIf="error()">{{ error() }}</div>

      <ng-container *ngIf="plant(); else loading">
        <div class="card mb-3">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start gap-3">
              <div class="flex-grow-1">
                <h3 class="mb-1">{{ plant()!.name }}</h3>
                <div class="text-muted" *ngIf="plant()!.description">{{ plant()!.description }}</div>
                <div class="text-muted mt-2">
                  Ubicación: {{ plant()!.lat }}, {{ plant()!.lng }}
                </div>

                <div class="mt-3" *ngIf="photoUrl()">
                  <img [src]="photoUrl()!" class="img-fluid rounded border" style="max-height: 260px;">
                </div>
              </div>

              <div class="d-flex flex-column gap-2">
                <button
                  type="button"
                  class="btn"
                  [class.btn-outline-danger]="!isFav()"
                  [class.btn-danger]="isFav()"
                  (click)="toggleFav()"
                  title="Favorito"
                >
                  {{ isFav() ? '♥' : '♡' }}
                </button>

                <button class="btn btn-outline-primary" type="button" (click)="startDemo()">
                  Iniciar demo
                </button>

                <button class="btn btn-outline-secondary" type="button" (click)="stopDemo()">
                  Parar demo
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- ✅ Hijo: input records -->
        <app-records-chart [records]="records()" />

        <!-- ✅ Hijo: input records -->
        <app-records-list [records]="records()" />
      </ng-container>

      <ng-template #loading>
        <div class="alert alert-info">Cargando...</div>
      </ng-template>
    </div>
  `,
})
export class PlantDetailPage implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private plants = inject(PlantsService);
  private recordsService = inject(RecordsService);
  private favs = inject(FavoritesService);
  private destroyRef = inject(DestroyRef);

  private plantId = this.route.snapshot.paramMap.get('id') ?? '';

  plant = signal<Plant | null>(null);
  records = signal<PlantRecord[]>([]);
  error = signal('');

  favIds = signal<Set<string>>(new Set());

  photoUrl = computed(() => {
  const p = this.plant();
  if (!p) return null;
  return (p as any).photoUrl ?? null;
});


  isFav = computed(() => {
    const p = this.plant();
    if (!p) return false;
    return this.favIds().has(p.id);
  });

  async ngOnInit() {
    this.error.set('');

    try {
      if (!this.plantId) {
        this.error.set('ID de planta inválido.');
        return;
      }

      const p = await this.plants.getById(this.plantId);
      if (!p) {
        this.error.set('Planta no encontrada.');
        return;
      }

      this.plant.set(p);

      const favs = await this.favs.getMyFavoritePlantIds();
      this.favIds.set(favs);

      // ✅ Stream records
      this.recordsService
        .recordsByPlant$(this.plantId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(list => this.records.set(list));

      // ✅ carga inicial
      await this.recordsService.refreshPlant(this.plantId);

      // ✅ realtime
      this.recordsService.startRealtime(this.plantId);
    } catch (e: any) {
      this.error.set(e?.message ?? String(e));
    }
  }

  ngOnDestroy() {
    if (this.plantId) {
      this.recordsService.stopRealtime(this.plantId);
      this.recordsService.stopMockInserts(this.plantId);
    }
  }

  async toggleFav() {
    const p = this.plant();
    if (!p) return;

    this.error.set('');
    try {
      const current = this.favIds();
      const nowFav = await this.favs.toggle(p.id, current.has(p.id));

      const next = new Set(current);
      if (nowFav) next.add(p.id);
      else next.delete(p.id);

      this.favIds.set(next);
    } catch (e: any) {
      this.error.set(e?.message ?? String(e));
    }
  }

  startDemo() {
    if (!this.plantId) return;
    this.recordsService.startMockInserts(this.plantId, 2000);
  }

  stopDemo() {
    if (!this.plantId) return;
    this.recordsService.stopMockInserts(this.plantId);
  }
}
