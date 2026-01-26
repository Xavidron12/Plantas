import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PlantsService } from '../core/plants.service';
import { FavoritesService } from '../core/favorites.service';
import { AuthService } from '../core/auth.service';
import { Plant } from '../models/plant.model';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="container">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h2 class="mb-0">Mis plantas</h2>
          <div class="text-muted">Listado de tus plantas (con favoritos)</div>
        </div>
      </div>

      <div class="alert alert-info" *ngIf="loading()">
        Cargando...
      </div>

      <div class="card mb-3" *ngIf="!loading()">
        <div class="card-body">
          <label class="form-label mb-2">Buscar</label>
          <input
            class="form-control"
            placeholder="Buscar planta..."
            [ngModel]="term()"
            (ngModelChange)="term.set($event)"
          />
          <div class="form-text">Filtra por nombre</div>

          <div class="form-check mt-2">
            <input
              class="form-check-input"
              type="checkbox"
              id="onlyFavs"
              [ngModel]="onlyFavs()"
              (ngModelChange)="onlyFavs.set($event)"
            />
            <label class="form-check-label" for="onlyFavs">Solo favoritos</label>
          </div>
        </div>
      </div>

      <div class="alert alert-danger" *ngIf="error()">
        {{ error() }}
      </div>

      <div class="alert alert-warning" *ngIf="!loading() && !error() && filteredPlants().length === 0">
        No hay plantas para mostrar.
      </div>

      <div class="row g-3" *ngIf="!loading() && !error() && filteredPlants().length > 0">
        <div class="col-12 col-md-6 col-lg-4" *ngFor="let p of filteredPlants()">
          <div class="card h-100 shadow-sm">
            <div class="ratio ratio-16x9 bg-light" *ngIf="photoUrlOf(p); else noPhoto">
              <img [src]="photoUrlOf(p)!" class="w-100 h-100" style="object-fit: cover;" alt="Foto planta" />
            </div>

            <ng-template #noPhoto>
              <div class="ratio ratio-16x9 bg-light d-flex align-items-center justify-content-center text-muted">
                Sin foto
              </div>
            </ng-template>

            <div class="card-body d-flex flex-column">
              <div class="d-flex justify-content-between align-items-start gap-2">
                <h5 class="mb-1">{{ p.name }}</h5>

                <button
                  type="button"
                  class="btn btn-sm"
                  [class.btn-outline-danger]="!isFav(p.id)"
                  [class.btn-danger]="isFav(p.id)"
                  (click)="toggleFav(p.id)"
                  title="Favorito"
                >
                  {{ isFav(p.id) ? '♥' : '♡' }}
                </button>
              </div>

              <p class="text-muted mb-3" [title]="p.description || ''">
                {{ shortDesc(p.description || '') }}
              </p>

              <div class="mt-auto d-flex justify-content-end">
                <a class="btn btn-outline-primary btn-sm" [routerLink]="['/plants', p.id]">Información</a>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  `,
})
export class PlantsPage implements OnInit {
  private plantsService = inject(PlantsService);
  private favsService = inject(FavoritesService);
  private auth = inject(AuthService);

  term = signal('');
  onlyFavs = signal(false);

  loading = signal(true);
  error = signal('');

  plants = signal<Plant[]>([]);
  favIds = signal<Set<string>>(new Set());

  filteredPlants = computed(() => {
    const t = this.term().toLowerCase().trim();
    const onlyFavs = this.onlyFavs();
    const favs = this.favIds();

    let list = this.plants();

    if (t) list = list.filter(p => p.name.toLowerCase().includes(t));
    if (onlyFavs) list = list.filter(p => favs.has(p.id));

    return list;
  });

  async ngOnInit() {
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

  private async init() {
    this.loading.set(true);
    this.error.set('');

    try {
      const user = await this.waitForUser();
      if (!user) {
        this.error.set('No hay sesión. Vuelve a iniciar sesión.');
        return;
      }

      const favs = await this.favsService.getMyFavoritePlantIds();
      this.favIds.set(favs);

      const list = await this.plantsService.getByOwner(user.id);
      this.plants.set(list);
    } catch (e: any) {
      this.error.set(e?.message ?? String(e));
    } finally {
      this.loading.set(false);
    }
  }

  photoUrlOf(p: Plant): string | null {
    return (p as any).photoUrl ?? (p as any).photo_url ?? null;
  }

  shortDesc(desc: string): string {
    const s = desc.trim();
    if (!s) return '—';
    return s.length > 70 ? s.slice(0, 70) + '…' : s;
  }

  isFav(plantId: string): boolean {
    return this.favIds().has(plantId);
  }

  async toggleFav(plantId: string) {
    this.error.set('');
    try {
      const current = this.favIds();
      const wasFav = current.has(plantId);

      const nowFav = await this.favsService.toggle(plantId, wasFav);

      const next = new Set(current);
      if (nowFav) next.add(plantId);
      else next.delete(plantId);

      this.favIds.set(next);
    } catch (e: any) {
      this.error.set(e?.message ?? String(e));
    }
  }
}
