import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import * as L from 'leaflet';

import { PlantsService } from '../core/plants.service';
import { AuthService } from '../core/auth.service';
import { Plant } from '../models/plant.model';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './map.page.html',
  styleUrl: './map.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapPage implements AfterViewInit, OnDestroy {
  private plantsService = inject(PlantsService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  loading = signal(true);
  error = signal('');

  subtitle = signal('Haz clic en un marcador para abrir su detalle.');

  plants = signal<Plant[]>([]);
  markerCount = signal(0);

  mapStatus = computed(() => {
    if (this.loading()) return 'Cargando datos geograficos...';
    if (this.error()) return 'Error de carga';
    if (this.markerCount() === 0) return 'Sin marcadores activos';
    return `${this.markerCount()} marcadores activos`;
  });

  private map: L.Map | null = null;
  private layer = L.layerGroup();
  private streamsBound = false;

  async ngAfterViewInit() {
    await this.init();
  }

  async reload() {
    await this.init();
  }

  ngOnDestroy() {
    this.layer.clearLayers();
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  private async waitForUser(maxMs = 10000) {
    const start = Date.now();
    while (!this.auth.user()) {
      if (Date.now() - start > maxMs) return null;
      await new Promise(r => setTimeout(r, 100));
    }
    return this.auth.user();
  }

  private initLeaflet() {
    if (this.map) return;

    const map = L.map('map', { zoomControl: true }).setView([40.4168, -3.7038], 6);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '(c) OpenStreetMap contributors',
    }).addTo(map);

    this.layer.addTo(map);
    this.map = map;
  }

  private renderMarkers(list: Plant[]) {
    if (!this.map) return;

    this.layer.clearLayers();

    const valid = list.filter(
      p => Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng))
    );

    this.markerCount.set(valid.length);

    for (const p of valid) {
      const m = L.marker([p.lat, p.lng])
        .bindPopup(
          `<b>${escapeHtml(p.name)}</b><br/>` +
            `${escapeHtml(p.description ?? '')}<br/>` +
            `<small>(${p.lat}, ${p.lng})</small>`
        )
        .on('click', () => this.router.navigate(['/plants', p.id]));

      this.layer.addLayer(m);
    }

    if (valid.length > 0) {
      const bounds = L.latLngBounds(valid.map(p => [p.lat, p.lng] as [number, number]));
      this.map.fitBounds(bounds.pad(0.2));
    } else {
      this.map.setView([40.4168, -3.7038], 6);
    }
  }

  private async init() {
    this.loading.set(true);
    this.error.set('');

    try {
      const user = await this.waitForUser();
      if (!user) {
        this.error.set('No hay sesion. Vuelve a iniciar sesion.');
        return;
      }

      const isAdmin = this.auth.isAdmin();
      const ownerId = user.id;

      this.initLeaflet();

      if (!this.streamsBound) {
        if (isAdmin) {
          this.plantsService
            .plants$()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(list => {
              this.plants.set(list);
              this.renderMarkers(list);
            });
        } else {
          this.plantsService
            .plantsByOwner$(ownerId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(list => {
              this.plants.set(list);
              this.renderMarkers(list);
            });
        }

        this.streamsBound = true;
      }

      if (isAdmin) {
        await this.plantsService.refreshAll();
      } else {
        await this.plantsService.refreshByOwner(ownerId);
      }
    } catch (e: any) {
      this.error.set(e?.message ?? String(e));
    } finally {
      this.loading.set(false);
    }
  }
}

function escapeHtml(s: string) {
  return (s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

