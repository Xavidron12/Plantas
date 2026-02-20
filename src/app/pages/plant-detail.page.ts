import { Component, DestroyRef, OnDestroy, OnInit, computed, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { PlantsService } from '../core/plants.service';
import { RecordsService, PlantRecord, RealtimeChannelState } from '../core/records.service';
import { FavoritesService } from '../core/favorites.service';
import { Plant } from '../models/plant.model';

import { RecordsChartComponent } from '../components/records-chart.component';
import { RecordsListComponent } from '../components/records-list.component';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, RecordsChartComponent, RecordsListComponent],
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
                  class="btn d-inline-flex align-items-center gap-1"
                  [class.btn-outline-danger]="!isFav()"
                  [class.btn-danger]="isFav()"
                  (click)="toggleFav()"
                  title="Favorito"
                >
                  <mat-icon>{{ isFav() ? 'favorite' : 'favorite_border' }}</mat-icon>
                  <span>{{ isFav() ? 'Quitar favorito' : 'Marcar favorito' }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="card mb-3">
          <div class="card-body">
            <h5 class="mb-2">Estado de datos en tiempo real</h5>
            <div class="text-muted small mb-3">
              Los registros se generan en backend con Supabase (<code>pg_cron</code>) cada 1 minuto y esta vista se actualiza por Realtime.
            </div>

            <div class="row g-3">
              <div class="col-12 col-md-3">
                <div class="small text-muted mb-1">Conexión realtime</div>
                <span
                  class="badge"
                  [class.bg-success]="realtimeStatus()==='subscribed'"
                  [class.bg-warning]="realtimeStatus()==='connecting'"
                  [class.bg-danger]="realtimeStatus()==='channel_error' || realtimeStatus()==='timed_out'"
                  [class.bg-secondary]="realtimeStatus()==='closed'"
                >
                  {{ realtimeStatusLabel() }}
                </span>
              </div>

              <div class="col-12 col-md-3">
                <div class="small text-muted mb-1">Último registro</div>
                <div>{{ lastRecordAt() }}</div>
              </div>

              <div class="col-12 col-md-3">
                <div class="small text-muted mb-1">Registros recibidos (sesión)</div>
                <div>{{ receivedInSession() }}</div>
              </div>

              <div class="col-12 col-md-3">
                <div class="small text-muted mb-1">Frecuencia esperada</div>
                <div>1 registro/minuto por planta</div>
              </div>
            </div>
          </div>
        </div>

        <app-records-chart [records]="records()" />

        <app-records-list [records]="records()" />
      </ng-container>

      <ng-template #loading>
        <div class="alert alert-info">Cargando...</div>
      </ng-template>
    </div>
  `,
})
export class PlantDetailPage implements OnInit, OnDestroy {
  private plants = inject(PlantsService);
  private recordsService = inject(RecordsService);
  private favs = inject(FavoritesService);
  private destroyRef = inject(DestroyRef);

  id = input.required<string>();

  plant = signal<Plant | null>(null);
  records = signal<PlantRecord[]>([]);
  error = signal('');

  realtimeStatus = signal<RealtimeChannelState>('closed');
  baselineRecordsCount = signal(0);

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

  realtimeStatusLabel = computed(() => {
    switch (this.realtimeStatus()) {
      case 'subscribed':
        return 'Conectado';
      case 'connecting':
        return 'Conectando...';
      case 'timed_out':
        return 'Timeout';
      case 'channel_error':
        return 'Error de canal';
      default:
        return 'Desconectado';
    }
  });

  lastRecordAt = computed(() => {
    const list = this.records();
    if (!list.length) return 'Sin registros aún';
    return this.formatDate(list[list.length - 1].createdAt);
  });

  receivedInSession = computed(() => {
    return Math.max(this.records().length - this.baselineRecordsCount(), 0);
  });

  async ngOnInit() {
    this.error.set('');

    try {
      const plantId = this.id();
      if (!plantId) {
        this.error.set('ID de planta inválido.');
        return;
      }

      const p = await this.plants.getById(plantId);
      if (!p) {
        this.error.set('Planta no encontrada.');
        return;
      }

      this.plant.set(p);

      const favs = await this.favs.getMyFavoritePlantIds();
      this.favIds.set(favs);

      this.recordsService
        .recordsByPlant$(plantId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(list => this.records.set(list));

      this.recordsService
        .realtimeStatus$(plantId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(status => this.realtimeStatus.set(status));

      await this.recordsService.refreshPlant(plantId);
      this.baselineRecordsCount.set(this.records().length);

      this.recordsService.startRealtime(plantId);
    } catch (e: any) {
      this.error.set(e?.message ?? String(e));
    }
  }

  ngOnDestroy() {
    const plantId = this.id();
    if (plantId) {
      this.recordsService.stopRealtime(plantId);
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

  private formatDate(value: string) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString();
  }
}
