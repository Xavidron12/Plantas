import { Component, computed, inject, signal } from '@angular/core';
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
    <div class="d-flex align-items-center justify-content-between mb-3">
      <h2 class="mb-0">Admin</h2>
      <a class="btn btn-outline-secondary" routerLink="/plants">Ir a plantas</a>
    </div>

    <ng-container *ngIf="isAdmin(); else noAccess">
      <button class="btn btn-primary mb-3" (click)="newPlant()">Crear planta</button>

      <app-plant-form *ngIf="creating()" (save)="create($event)"></app-plant-form>

      <hr>

      <div class="alert alert-info" *ngIf="plants().length === 0">
        Aún no hay plantas en la base de datos.
      </div>

      <ul class="list-group" *ngIf="plants().length > 0">
        <li class="list-group-item d-flex justify-content-between align-items-center" *ngFor="let p of plants()">
          <div>
            <b>{{ p.name }}</b>
            <div class="small text-muted">{{ p.description || 'Sin descripción' }}</div>
          </div>
          <button class="btn btn-sm btn-danger" (click)="remove(p.id)">Borrar</button>
        </li>
      </ul>
    </ng-container>

    <ng-template #noAccess>
      <div class="alert alert-warning">No tienes permisos de admin.</div>
      <a routerLink="/plants">Volver</a>
    </ng-template>
  `
})
export class AdminPage {
  private plantsService = inject(PlantsService);
  private auth = inject(AuthService);

  plants = signal<Plant[]>([]);
  creating = signal(false);
  isAdmin = computed(() => this.auth.isAdmin());

  constructor() {
    this.plantsService.getAll().subscribe(list => this.plants.set(list));
    this.plantsService.refreshAll();
  }

  newPlant() {
    this.creating.set(true);
  }

  async create(data: { name: string; description: string; lat: number; lng: number }) {
    const user = this.auth.user();
    if (!user) return;

    await this.plantsService.create({
      ownerId: user.id,
      name: data.name,
      description: data.description,
      lat: data.lat,
      lng: data.lng,
      photoUrl: '',
    });

    this.creating.set(false);
  }

  async remove(id: string) {
    await this.plantsService.delete(id);
  }
}
