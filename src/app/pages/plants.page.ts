import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { PlantsService } from '../core/plants.service';
import { FavoritesService } from '../core/favorites.service';
import { AuthService } from '../core/auth.service';
import { AppStoreService } from '../core/store/app-store.service';
import { Plant } from '../models/plant.model';
import { PlantCardComponent } from '../components/plant-card.component';
import { PlantFormComponent } from '../components/plant-form.component';

import { MATERIAL } from '../shared/material';
import { MatCheckboxModule } from '@angular/material/checkbox';

type PlantFormPayload = {
  name: string;
  description: string;
  lat: number;
  lng: number;
  photoFile: File | null;
};

type PlantSort = 'recent' | 'nameAsc' | 'nameDesc' | 'favoritesFirst';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PlantCardComponent,
    PlantFormComponent,
    ...MATERIAL,
    MatCheckboxModule,
  ],
  templateUrl: './plants.page.html',
  styleUrl: './plants.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlantsPage implements OnInit {
  private plantsService = inject(PlantsService);
  private favsService = inject(FavoritesService);
  private auth = inject(AuthService);
  private store = inject(AppStoreService);
  private destroyRef = inject(DestroyRef);

  term = signal(this.store.snapshot().plants.filters.term);
  onlyFavs = signal(this.store.snapshot().plants.filters.onlyFavs);
  sortBy = signal<PlantSort>('recent');

  loading = signal(true);
  refreshing = signal(false);
  error = signal('');
  lastSyncedAt = signal<Date | null>(null);

  plants = signal<Plant[]>([]);
  favIds = signal<Set<string>>(new Set());

  showForm = signal(false);
  private ownerId = '';

  currentUserName = computed(() => {
    const u = this.auth.user();
    const display = (u?.name ?? '').trim() || (u?.email ?? '').trim();
    return display || 'operador';
  });

  totalPlants = computed(() => this.plants().length);

  favoritesCount = computed(() => {
    const favs = this.favIds();
    return this.plants().reduce((total, p) => total + (favs.has(p.id) ? 1 : 0), 0);
  });

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

    const sorted = [...list];

    switch (this.sortBy()) {
      case 'nameAsc':
        sorted.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '', 'es'));
        break;

      case 'nameDesc':
        sorted.sort((a, b) => (b.name ?? '').localeCompare(a.name ?? '', 'es'));
        break;

      case 'favoritesFirst':
        sorted.sort((a, b) => {
          const fa = favs.has(a.id) ? 1 : 0;
          const fb = favs.has(b.id) ? 1 : 0;
          if (fa !== fb) return fb - fa;
          return (a.name ?? '').localeCompare(b.name ?? '', 'es');
        });
        break;

      default:
        sorted.sort((a, b) => {
          const ta = Date.parse(a.createdAt || '');
          const tb = Date.parse(b.createdAt || '');
          return tb - ta;
        });
        break;
    }

    return sorted;
  });

  shownCount = computed(() => this.filteredPlants().length);

  filterActive = computed(() => {
    const t = this.term().trim();
    return this.onlyFavs() || t.length >= 2 || t.length > 0 || this.sortBy() !== 'recent';
  });

  searchHint = computed(() => {
    const t = this.term().trim();

    if (!this.onlyFavs() && !t) {
      return 'Mostrando todas tus plantas.';
    }

    if (t.length > 0 && t.length < 2) {
      return 'Escribe al menos 2 caracteres para aplicar busqueda.';
    }

    return `Mostrando ${this.shownCount()} de ${this.totalPlants()} plantas.`;
  });

  sortLabel = computed(() => {
    switch (this.sortBy()) {
      case 'nameAsc':
        return 'Nombre (A-Z)';
      case 'nameDesc':
        return 'Nombre (Z-A)';
      case 'favoritesFirst':
        return 'Favoritas primero';
      default:
        return 'Mas recientes';
    }
  });

  lastSyncedLabel = computed(() => {
    const d = this.lastSyncedAt();
    if (!d) return 'Sincronizacion pendiente';
    return `Ultima sincronizacion: ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  });

  constructor() {
    effect(() => {
      this.store.dispatch({
        type: 'plants/setFilters',
        payload: { term: this.term(), onlyFavs: this.onlyFavs() },
      });
    });
  }

  async ngOnInit() {
    await this.init();
  }

  private async init() {
    this.loading.set(true);
    this.error.set('');

    try {
      const user = await this.auth.ensureSession();
      if (!user) {
        this.error.set('No hay sesion. Vuelve a iniciar sesion.');
        return;
      }

      this.ownerId = user.id;

      const favs = await this.favsService.getMyFavoritePlantIds();
      this.favIds.set(favs);

      this.plantsService
        .plantsByOwner$(this.ownerId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(list => {
          this.plants.set(list);
          this.store.dispatch({
            type: 'plants/setByOwner',
            payload: { ownerId: this.ownerId, plants: list },
          });
        });

      await this.syncPlants();
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

  clearFilters() {
    this.term.set('');
    this.onlyFavs.set(false);
    this.sortBy.set('recent');
  }

  async createFromForm(payload: PlantFormPayload) {
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

      await this.syncPlants();
      this.showForm.set(false);
    } catch (e: any) {
      this.error.set(e?.message ?? String(e));
    }
  }

  async refresh() {
    await this.syncPlants();
  }

  private async syncPlants() {
    if (!this.ownerId) return;
    this.error.set('');
    this.refreshing.set(true);

    try {
      await this.plantsService.refreshByOwner(this.ownerId);
      this.lastSyncedAt.set(new Date());
    } catch (e: any) {
      this.error.set(e?.message ?? String(e));
    } finally {
      this.refreshing.set(false);
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

