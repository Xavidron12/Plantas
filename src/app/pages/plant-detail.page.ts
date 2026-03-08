import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnDestroy,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
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
  templateUrl: './plant-detail.page.html',
  styleUrl: './plant-detail.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
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
  loading = signal(true);
  refreshing = signal(false);
  lastSyncedAt = signal<Date | null>(null);

  realtimeStatus = signal<RealtimeChannelState>('closed');
  baselineRecordsCount = signal(0);

  favIds = signal<Set<string>>(new Set());

  photoUrl = computed(() => {
    const p = this.plant();
    if (!p) return null;
    return p.photoUrl ?? null;
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

  latestRecord = computed(() => {
    const list = this.records();
    return list.length ? list[list.length - 1] : null;
  });

  latestConsumption = computed(() => this.latestRecord()?.consumptionW ?? 0);
  latestGeneration = computed(() => this.latestRecord()?.generationW ?? 0);

  latestBalance = computed(() => this.latestGeneration() - this.latestConsumption());
  coveragePct = computed(() => {
    const consumption = this.latestConsumption();
    const generation = this.latestGeneration();

    if (consumption <= 0) return generation > 0 ? 100 : 0;

    const raw = Math.round((generation / consumption) * 100);
    return Math.max(0, Math.min(raw, 999));
  });

  avgConsumption = computed(() => {
    const list = this.records();
    if (!list.length) return 0;
    const total = list.reduce((sum, r) => sum + r.consumptionW, 0);
    return Math.round(total / list.length);
  });

  avgGeneration = computed(() => {
    const list = this.records();
    if (!list.length) return 0;
    const total = list.reduce((sum, r) => sum + r.generationW, 0);
    return Math.round(total / list.length);
  });

  balanceClass = computed(() => (this.latestBalance() >= 0 ? 'metric--positive' : 'metric--negative'));
  balanceText = computed(() => {
    const b = this.latestBalance();
    if (b >= 200) return 'Excedente alto';
    if (b >= 0) return 'Balance positivo';
    if (b > -200) return 'Deficit leve';
    return 'Deficit alto';
  });

  lastRecordAt = computed(() => {
    const r = this.latestRecord();
    if (!r) return 'Sin registros aun';
    return this.formatDate(r.createdAt);
  });

  receivedInSession = computed(() => {
    return Math.max(this.records().length - this.baselineRecordsCount(), 0);
  });

  lastSyncedLabel = computed(() => {
    const d = this.lastSyncedAt();
    if (!d) return 'Sincronizacion pendiente';
    return `Sincronizado a las ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  });

  async ngOnInit() {
    this.loading.set(true);
    this.error.set('');

    try {
      const plantId = this.id();
      if (!plantId) {
        this.error.set('ID de planta invalido.');
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

      await this.refreshRecords();
      this.baselineRecordsCount.set(this.records().length);

      this.recordsService.startRealtime(plantId);
    } catch (e: any) {
      this.error.set(e?.message ?? String(e));
    } finally {
      this.loading.set(false);
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

  async refreshRecords() {
    const plantId = this.id();
    if (!plantId) return;

    this.error.set('');
    this.refreshing.set(true);
    try {
      await this.recordsService.refreshPlant(plantId);
      this.lastSyncedAt.set(new Date());
    } catch (e: any) {
      this.error.set(e?.message ?? String(e));
    } finally {
      this.refreshing.set(false);
    }
  }

  formatWatts(value: number): string {
    return `${Math.round(value).toLocaleString()} W`;
  }

  private formatDate(value: string): string {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString();
  }
}

