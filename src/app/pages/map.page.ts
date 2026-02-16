import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, DestroyRef, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import * as L from 'leaflet';

import { PlantsService } from '../core/plants.service';
import { AuthService } from '../core/auth.service';
import { Plant } from '../models/plant.model';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="container">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h2 class="mb-0">Mapa de plantas</h2>
          <div class="text-muted">
            {{ subtitle() }}
          </div>
        </div>
        <a class="btn btn-outline-secondary" routerLink="/plants">Volver</a>
      </div>

      <div class="alert alert-info" *ngIf="loading()">Cargando...</div>
      <div class="alert alert-danger" *ngIf="error()">{{ error() }}</div>

      <div id="map" class="border rounded" style="height: 70vh; min-height: 420px;"></div>
    </div>
  `,
})
export class MapPage implements AfterViewInit {
  private plantsService = inject(PlantsService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  loading = signal(true);
  error = signal('');

  subtitle = signal('Haz click en un marcador para ver el detalle');

  plants = signal<Plant[]>([]);
  private map: L.Map | null = null;
  private layer = L.layerGroup();

  async ngAfterViewInit() {
    await this.init();
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
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    this.layer.addTo(map);
    this.map = map;
  }

  private renderMarkers(list: Plant[]) {
    if (!this.map) return;

    this.layer.clearLayers();

    const valid = list.filter(p => typeof p.lat === 'number' && typeof p.lng === 'number');

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
    }
  }

  private async init() {
    this.loading.set(true);
    this.error.set('');

    try {
      const user = await this.waitForUser();
      if (!user) {
        this.error.set('No hay sesión. Vuelve a iniciar sesión.');
        return;
      }

      const isAdmin = this.auth.isAdmin();
      const ownerId = user.id;

      this.subtitle.set(isAdmin ? 'Vista admin: todas las plantas' : 'Vista cliente: tus plantas');

      this.initLeaflet();

      if (isAdmin) {
        this.plantsService
          .plants$()
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe(list => {
            this.plants.set(list);
            this.renderMarkers(list);
          });

        await this.plantsService.refreshAll();
      } else {
        this.plantsService
          .plantsByOwner$(ownerId)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe(list => {
            this.plants.set(list);
            this.renderMarkers(list);
          });

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
