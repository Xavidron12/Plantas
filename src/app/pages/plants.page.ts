import { Component, computed, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { PlantsService } from '../core/plants.service';
import { FavoritesService } from '../core/favorites.service';
import { AuthService } from '../core/auth.service';
import { Plant } from '../models/plant.model';
import { PlantCardComponent } from '../components/plant-card.component';
import { PlantFormComponent } from '../components/plant-form.component';

import { MATERIAL } from '../shared/material';
import { MatCheckboxModule } from '@angular/material/checkbox';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, PlantCardComponent, PlantFormComponent, ...MATERIAL, MatCheckboxModule],
  template: `
    <div style="max-width:1200px; margin:0 auto; padding:24px;">
      <!-- Header -->
      <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:16px; margin-bottom:16px;">
        <div>
          <h2 style="margin:0;">Mis plantas</h2>
          <div style="opacity:0.75;">Listado de tus plantas (con favoritos)</div>
        </div>

        <button mat-raised-button color="primary" type="button" (click)="openCreate()" *ngIf="!showForm()">
          Nueva planta
        </button>
      </div>

      <!-- Loading -->
      <mat-card *ngIf="loading()" style="margin-bottom:16px;">
        <mat-card-content>Cargando...</mat-card-content>
      </mat-card>

      <!-- Error -->
      <mat-card *ngIf="error()" style="margin-bottom:16px; border:1px solid #b00020;">
        <mat-card-content>
          <mat-error>{{ error() }}</mat-error>
        </mat-card-content>
      </mat-card>

      <!-- FORM NUEVA PLANTA -->
      <div style="margin-bottom:16px;" *ngIf="!loading() && showForm()">
        <app-plant-form
          [initial]="null"
          (save)="createFromForm($event)"
          (cancel)="closeCreate()"
        />
      </div>

      <!-- BUSCADOR / FILTROS -->
      <mat-card style="margin-bottom:16px;" *ngIf="!loading() && !showForm()">
        <mat-card-content>
          <form #f="ngForm" (ngSubmit)="$event.preventDefault()" style="display:grid; gap:12px;">
            <mat-form-field appearance="outline">
              <mat-label>Buscar</mat-label>
              <input
                matInput
                name="term"
                [ngModel]="term()"
                (ngModelChange)="term.set($event)"
                placeholder="Buscar planta..."
                minlength="2"
              />
              <mat-hint>Escribe al menos 2 caracteres para buscar (o deja vacío para ver todas).</mat-hint>

              <div style="font-size:12px; margin-top:6px; color:#b00020;"
                   *ngIf="f.controls['term']?.touched && f.controls['term']?.invalid">
                El texto de búsqueda debe tener al menos 2 caracteres.
              </div>
            </mat-form-field>

            <mat-checkbox
              name="onlyFavs"
              [ngModel]="onlyFavs()"
              (ngModelChange)="onlyFavs.set($event)"
            >
              Solo favoritos
            </mat-checkbox>

            <div>
              <button mat-stroked-button type="button" (click)="refresh()">
                Recargar
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>

      <!-- Empty -->
      <mat-card *ngIf="!loading() && !error() && !showForm() && filteredPlants().length === 0">
        <mat-card-content>No hay plantas para mostrar.</mat-card-content>
      </mat-card>

      <!-- Grid -->
      <div
        style="display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:16px;"
        *ngIf="!loading() && !error() && !showForm() && filteredPlants().length > 0"
      >
        <app-plant-card
          *ngFor="let p of filteredPlants()"
          [plant]="p"
          [photoUrl]="photoUrlOf(p)"
          [isFav]="isFav(p.id)"
          (toggleFav)="toggleFav($event)"
        />
      </div>
    </div>
  `,
})
export class PlantsPage implements OnInit {
  private plantsService = inject(PlantsService);
  private favsService = inject(FavoritesService);
  private auth = inject(AuthService);
  private destroyRef = inject(DestroyRef);

  term = signal('');
  onlyFavs = signal(false);

  loading = signal(true);
  error = signal('');

  plants = signal<Plant[]>([]);
  favIds = signal<Set<string>>(new Set());

  showForm = signal(false);
  private ownerId = '';

  filteredPlants = computed(() => {
    const raw = this.term();
    const t = raw.toLowerCase().trim();
    const onlyFavs = this.onlyFavs();
    const favs = this.favIds();

    let list = this.plants();

    if (t.length >= 2) {
      list = list.filter(p => (p.name ?? '').toLowerCase().includes(t));
    }

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

      this.ownerId = user.id;

      const favs = await this.favsService.getMyFavoritePlantIds();
      this.favIds.set(favs);

      this.plantsService
        .plantsByOwner$(this.ownerId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(list => this.plants.set(list));

      await this.plantsService.refreshByOwner(this.ownerId);
    } catch (e: any) {
      this.error.set(e?.message ?? String(e));
    } finally {
      this.loading.set(false);
    }
  }

  openCreate() {
    this.error.set('');
    this.showForm.set(true);
  }

  closeCreate() {
    this.showForm.set(false);
  }

  async createFromForm(payload: {
    name: string;
    description: string;
    lat: number;
    lng: number;
    photoFile: File | null;
  }) {
    if (!this.ownerId) return;

    this.error.set('');
    try {
      let photoUrl: string | null = null;

      if (payload.photoFile) {
        photoUrl = await this.plantsService.uploadPlantPhoto(payload.photoFile);
      }

      await this.plantsService.create({
        name: payload.name,
        description: payload.description,
        lat: payload.lat,
        lng: payload.lng,
        photoUrl,
      });

      await this.plantsService.refreshByOwner(this.ownerId);
      this.showForm.set(false);
    } catch (e: any) {
      this.error.set(e?.message ?? String(e));
    }
  }

  async refresh() {
    if (!this.ownerId) return;
    this.error.set('');
    try {
      await this.plantsService.refreshByOwner(this.ownerId);
    } catch (e: any) {
      this.error.set(e?.message ?? String(e));
    }
  }

  photoUrlOf(p: Plant): string | null {
    return p.photoUrl ?? null;
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
