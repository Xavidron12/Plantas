import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PlantsService } from '../core/plants.service';
import { AuthService } from '../core/auth.service';
import { Plant } from '../models/plant.model';
import { PlantFormComponent } from '../components/plant-form.component';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink, PlantFormComponent],
  template: `
    <div class="container">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h2 class="mb-0">Admin</h2>
          <div class="text-muted">CRUD de plantas (Supabase)</div>
        </div>
        <a class="btn btn-outline-secondary" routerLink="/plants">Volver</a>
      </div>

      <div class="alert alert-info" *ngIf="loading()">
        Cargando...
      </div>

      <div class="alert alert-danger" *ngIf="!loading() && !isAdmin()">
        No eres admin.
      </div>

      <ng-container *ngIf="!loading() && isAdmin()">
        <div class="card mb-3 shadow-sm">
          <div class="card-body">
            <h5 class="mb-3">{{ editingId() ? 'Editar planta' : 'Nueva planta' }}</h5>

            <app-plant-form
              [initial]="editingPlant()"
              (save)="onSave($event)"
              (cancel)="cancelEdit()"
            ></app-plant-form>

            <div class="alert alert-danger mt-3 mb-0 py-2" *ngIf="error()">
              {{ error() }}
            </div>
          </div>
        </div>

        <div class="d-flex justify-content-between align-items-center mb-2">
          <h5 class="mb-0">Todas las plantas</h5>
          <button class="btn btn-sm btn-outline-primary" (click)="loadAll()">
            Recargar
          </button>
        </div>

        <div class="alert alert-warning" *ngIf="plants().length === 0">
          No hay plantas.
        </div>

        <div class="table-responsive" *ngIf="plants().length > 0">
          <table class="table table-sm align-middle">
            <thead>
              <tr>
                <th>Nombre</th>
                <th class="d-none d-md-table-cell">Descripción</th>
                <th>Owner</th>
                <th>Foto</th>
                <th style="width:160px;">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let p of plants()">
                <td>{{ p.name }}</td>
                <td class="d-none d-md-table-cell">{{ p.description }}</td>
                <td class="text-muted">{{ ownerOf(p) }}</td>
                <td>
                  <span class="text-muted" *ngIf="!photoOf(p)">-</span>
                  <a *ngIf="photoOf(p)" [href]="photoOf(p)!" target="_blank">ver</a>
                </td>
                <td>
                  <button class="btn btn-sm btn-outline-secondary me-2" (click)="edit(p)">
                    Editar
                  </button>
                  <button class="btn btn-sm btn-outline-danger" (click)="remove(p.id)">
                    Borrar
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </ng-container>
    </div>
  `,
})
export class AdminPage implements OnInit {
  private plantsService = inject(PlantsService);
  private auth = inject(AuthService);

  isAdmin = computed(() => this.auth.isAdmin());

  loading = signal(true);
  plants = signal<Plant[]>([]);
  error = signal('');

  editingId = signal<string>('');
  editingPlant = signal<Plant | null>(null);

  // ✅ Para evitar el bug de refrescar (F5) antes de que supabase restaure la sesión
  private async waitForUser(maxMs = 4000) {
    const start = Date.now();
    while (!this.auth.user()) {
      if (Date.now() - start > maxMs) return null;
      await new Promise(r => setTimeout(r, 100));
    }
    return this.auth.user();
  }

  async ngOnInit() {
    this.loading.set(true);
    this.error.set('');

    const u = await this.waitForUser();
    if (!u) {
      this.error.set('No hay sesión. Vuelve a iniciar sesión.');
      this.loading.set(false);
      return;
    }

    await this.loadAll();
    this.loading.set(false);
  }

  // ✅ Helpers (evitamos "as any" en HTML)
  ownerOf(p: Plant): string {
    return (p as any).owner_id ?? (p as any).ownerId ?? '-';
  }

  photoOf(p: Plant): string | null {
    return (p as any).photo_url ?? (p as any).photoUrl ?? null;
  }

  async loadAll() {
    this.error.set('');
    try {
      const list = await this.plantsService.getAll();
      this.plants.set(list);
    } catch (e: any) {
      this.error.set(e?.message ?? String(e));
    }
  }

  edit(p: Plant) {
    this.editingId.set(p.id);
    this.editingPlant.set(p);
  }

  cancelEdit() {
    this.editingId.set('');
    this.editingPlant.set(null);
    this.error.set('');
  }

  async onSave(data: { name: string; description: string; lat: number; lng: number; photoFile: File | null }) {
    this.error.set('');

    try {
      let photoUrl: string | null = null;

      if (data.photoFile) {
        photoUrl = await this.plantsService.uploadPlantPhoto(data.photoFile);
      }

      if (this.editingId()) {
        await this.plantsService.update(this.editingId(), {
          name: data.name,
          description: data.description,
          lat: data.lat,
          lng: data.lng,
          photo_url: photoUrl,
        } as any);
      } else {
        // OJO: create() crea para el usuario actual (admin)
        // Si quieres crear PARA UN CLIENTE, usa createForOwner en otra pantalla.
        await this.plantsService.create({
          name: data.name,
          description: data.description,
          lat: data.lat,
          lng: data.lng,
          photo_url: photoUrl,
        });
      }

      this.cancelEdit();
      await this.loadAll();
    } catch (e: any) {
      this.error.set(e?.message ?? String(e));
    }
  }

  async remove(id: string) {
    if (!confirm('¿Borrar planta?')) return;

    this.error.set('');
    try {
      await this.plantsService.delete(id);
      await this.loadAll();
    } catch (e: any) {
      this.error.set(e?.message ?? String(e));
    }
  }
}
