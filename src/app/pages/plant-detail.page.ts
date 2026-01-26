import {
  AfterViewInit,
  Component,
  ElementRef,
  ViewChild,
  computed,
  inject,
  signal,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import Chart from 'chart.js/auto';

import { PlantsService } from '../core/plants.service';
import { RecordsService, PlantRecord } from '../core/records.service';
import { FavoritesService } from '../core/favorites.service';
import { Plant } from '../models/plant.model';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink],
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

        <div class="card mb-3">
          <div class="card-body">
            <h5 class="mb-3">Gráfica en tiempo real</h5>
            <canvas #chartCanvas></canvas>
          </div>
        </div>

        <div class="card">
          <div class="card-body">
            <h5 class="mb-3">Últimos registros</h5>

            <div class="alert alert-warning" *ngIf="records().length === 0">
              Aún no hay registros.
            </div>

            <ul class="mb-0" *ngIf="records().length > 0">
              <li *ngFor="let r of records().slice().reverse()">
                {{ r.createdAt }} | Consumo: {{ r.consumptionW }}W | Generación: {{ r.generationW }}W
              </li>
            </ul>
          </div>
        </div>
      </ng-container>

      <ng-template #loading>
        <div class="alert alert-info">Cargando...</div>
      </ng-template>
    </div>
  `,
})
export class PlantDetailPage implements OnInit, AfterViewInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private plants = inject(PlantsService);
  private recordsService = inject(RecordsService);
  private favs = inject(FavoritesService);

  @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;
  private chart: Chart | null = null;

  plant = signal<Plant | null>(null);
  records = signal<PlantRecord[]>([]);
  error = signal('');

  favIds = signal<Set<string>>(new Set());

  photoUrl = computed(() => {
    const p = this.plant();
    if (!p) return null;
    return (p as any).photoUrl ?? (p as any).photo_url ?? null;
  });

  isFav = computed(() => {
    const p = this.plant();
    if (!p) return false;
    return this.favIds().has(p.id);
  });

  private plantId = '';
  private sub: { unsubscribe: () => void } | null = null;

  async ngOnInit() {
    this.error.set('');
    try {
      this.plantId = this.route.snapshot.paramMap.get('id') ?? '';
      const p = await this.plants.getById(this.plantId);
      if (!p) {
        this.error.set('Planta no encontrada.');
        return;
      }
      this.plant.set(p);

      const favs = await this.favs.getMyFavoritePlantIds();
      this.favIds.set(favs);
    } catch (e: any) {
      this.error.set(e?.message ?? String(e));
    }
  }

  async ngAfterViewInit() {
    this.initChart();

    // ✅ ahora sí: carga inicial + realtime (ya existe el canvas)
    this.error.set('');
    try {
      const initial = await this.recordsService.getByPlant(this.plantId);
      this.records.set(initial);
      this.updateChart(initial);

      this.sub = this.recordsService.watchPlant(this.plantId, (list) => {
        this.records.set(list);
        this.updateChart(list);
      });
    } catch (e: any) {
      this.error.set(e?.message ?? String(e));
    }
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
    if (this.plantId) {
      this.recordsService.stopRealtime(this.plantId);
      this.recordsService.stopMockInserts(this.plantId);
    }
    this.chart?.destroy();
  }

  private initChart() {
    const ctx = this.chartCanvas?.nativeElement.getContext('2d');
    if (!ctx) return;

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          { label: 'Consumo (W)', data: [] },
          { label: 'Generación (W)', data: [] },
        ],
      },
      options: {
        responsive: true,
        animation: false,
        scales: { y: { beginAtZero: true } },
      },
    });
  }

  private updateChart(list: PlantRecord[]) {
    if (!this.chart) return;

    const last = list.slice(-20);
    const labels = last.map(r => {
      const d = new Date(r.createdAt);
      return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d
        .getSeconds()
        .toString()
        .padStart(2, '0')}`;
    });

    this.chart.data.labels = labels;
    this.chart.data.datasets[0].data = last.map(r => r.consumptionW);
    this.chart.data.datasets[1].data = last.map(r => r.generationW);
    this.chart.update();
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
