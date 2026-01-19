import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, debounceTime, startWith } from 'rxjs';
import { PlantsService } from '../core/plants.service';
import { AuthService } from '../core/auth.service';
import { FavoritesService } from '../core/favorites.service';
import { Plant } from '../models/plant.model';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="d-flex align-items-center justify-content-between mb-3">
      <div>
        <h2 class="mb-0">Plantas</h2>
        <p class="text-muted mb-0" *ngIf="userEmail()">Sesión: {{ userEmail() }}</p>
      </div>

      <div class="d-flex gap-2">
        <a class="btn btn-outline-secondary" routerLink="/profile">Perfil</a>
        <a class="btn btn-outline-dark" routerLink="/admin" *ngIf="isAdmin()">Admin</a>
      </div>
    </div>

    <div class="card shadow-sm mb-3">
      <div class="card-body">
        <label class="form-label mb-1">Buscar</label>
        <input
          class="form-control"
          placeholder="Ej: planta..."
          [(ngModel)]="term"
          (ngModelChange)="termChanged$.next($event)"
        >
      </div>
    </div>

    <div *ngIf="filteredPlants().length === 0" class="alert alert-warning">
      No hay plantas para mostrar.
    </div>

    <div class="row g-3" *ngIf="filteredPlants().length > 0">
      <div class="col-12 col-md-6 col-lg-4" *ngFor="let p of filteredPlants()">
        <div class="card h-100 shadow-sm">
          <img
            [src]="imgFor(p)"
            class="card-img-top"
            alt="Foto planta"
            style="height: 160px; object-fit: cover;"
          >

          <div class="card-body d-flex flex-column">
            <div class="d-flex align-items-start justify-content-between gap-2">
              <div>
                <h5 class="card-title mb-1">{{ p.name }}</h5>
                <p class="card-text text-muted mb-2">{{ p.description || 'Sin descripción' }}</p>
              </div>

              <button
                class="btn btn-light border"
                type="button"
                (click)="toggleFav(p.id)"
                [disabled]="!isLoggedIn()"
                title="Favorito"
              >
                <span style="font-size: 20px;">
                  {{ favorites.isFavorite(p.id) ? '❤️' : '🤍' }}
                </span>
              </button>
            </div>

            <div class="mt-auto">
              <a class="btn btn-primary w-100" [routerLink]="['/plants', p.id]">Información</a>
            </div>
          </div>

          <div class="card-footer small text-muted">
            Ubicación: {{ p.lat }}, {{ p.lng }}
          </div>
        </div>
      </div>
    </div>
  `
})
export class PlantsPage {
  private plantsService = inject(PlantsService);
  private auth = inject(AuthService);
  favorites = inject(FavoritesService);

  term = '';
  termChanged$ = new Subject<string>();

  plants = signal<Plant[]>([]);
  userEmail = computed(() => this.auth.user()?.email ?? '');
  isLoggedIn = computed(() => this.auth.isLoggedIn());
  isAdmin = computed(() => this.auth.isAdmin());

  filteredPlants = computed(() => {
    const t = this.term.toLowerCase().trim();
    return this.plants().filter(p => p.name.toLowerCase().includes(t));
  });

  constructor() {
    this.plantsService.getAll().subscribe(list => this.plants.set(list));

    this.termChanged$.pipe(startWith(''), debounceTime(200)).subscribe(v => {
      this.term = v;
    });

    this.plantsService.refreshAll();
    this.favorites.refresh();
  }

  imgFor(p: Plant) {
    return p.photoUrl && p.photoUrl.trim().length > 0
      ? p.photoUrl
      : 'https://picsum.photos/600/300?random=' + encodeURIComponent(p.id);
  }

  async toggleFav(plantId: string) {
    await this.favorites.toggle(plantId);
  }
}
