import { Component, OnDestroy, OnInit, computed, inject, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { PlantsService } from '../core/plants.service';
import { ProfilesService, Profile } from '../core/profiles.service';
import { RecordsService, AdminRecord, RealtimeChannelState } from '../core/records.service';
import { AppStoreService } from '../core/store/app-store.service';
import { AuthService } from '../core/auth.service';
import { Plant } from '../models/plant.model';
import { PlantFormComponent } from '../components/plant-form.component';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PlantFormComponent],
  template: `
    <div class="container">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h2 class="mb-0">Admin</h2>
          <div class="text-muted">Gestión de plantas, usuarios y registros</div>
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
              (save)="onSavePlant($event)"
              (cancel)="cancelEditPlant()"
            ></app-plant-form>

            <div class="alert alert-danger mt-3 mb-0 py-2" *ngIf="error()">
              {{ error() }}
            </div>
          </div>
        </div>

        <div class="card mb-3 shadow-sm">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <h5 class="mb-0">Todas las plantas</h5>
              <button class="btn btn-sm btn-outline-primary" (click)="refreshAllPlants()">
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
                    <th>Usuario</th>
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
                      <button class="btn btn-sm btn-outline-secondary me-2" (click)="editPlant(p)">
                        Editar
                      </button>
                      <button class="btn btn-sm btn-outline-danger" (click)="removePlant(p.id)">
                        Borrar
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="card mb-3 shadow-sm">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <h5 class="mb-0">Usuarios</h5>
              <button class="btn btn-sm btn-outline-primary" (click)="refreshUsers()">
                Recargar
              </button>
            </div>

            <div class="alert alert-warning" *ngIf="users().length === 0">
              No hay usuarios.
            </div>

            <div class="table-responsive" *ngIf="users().length > 0">
              <table class="table table-sm align-middle">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Rol</th>
                    <th style="width:220px;">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let u of users()">
                    <td>{{ u.name || '-' }}</td>
                    <td>{{ u.email || '-' }}</td>
                    <td>
                      <span class="badge" [class.bg-dark]="u.role==='admin'" [class.bg-secondary]="u.role!=='admin'">
                        {{ u.role }}
                      </span>
                    </td>
                    <td>
                      <button
                        class="btn btn-sm btn-outline-success me-2"
                        (click)="setUserRole(u, 'admin')"
                        [disabled]="u.role==='admin'"
                      >
                        Hacer admin
                      </button>

                      <button
                        class="btn btn-sm btn-outline-warning"
                        (click)="setUserRole(u, 'client')"
                        [disabled]="u.role==='client'"
                      >
                        Hacer client
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="card mb-3 shadow-sm">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <h5 class="mb-0">Registros</h5>
              <button class="btn btn-sm btn-outline-primary" (click)="refreshRecords()">
                Recargar
              </button>
            </div>

            <div class="row g-3 mb-3">
              <div class="col-12 col-md-3">
                <div class="small text-muted mb-1">Conexión realtime global</div>
                <span
                  class="badge"
                  [class.bg-success]="realtimeStatus()==='subscribed'"
                  [class.bg-warning]="realtimeStatus()==='connecting'"
                  [class.bg-danger]="realtimeStatus()==='channel_error' || realtimeStatus()==='timed_out'"
                  [class.bg-secondary]="realtimeStatus()==='closed'"
                >
                  {{ realtimeStatusLabel() }}
                </span>
              </div>

              <div class="col-12 col-md-3">
                <div class="small text-muted mb-1">Última inserción global</div>
                <div>{{ lastGlobalInsertAt() }}</div>
              </div>

              <div class="col-12 col-md-3">
                <div class="small text-muted mb-1">Registros recibidos (sesión)</div>
                <div>{{ recordsReceivedInSession() }}</div>
              </div>

              <div class="col-12 col-md-3">
                <div class="small text-muted mb-1">Frecuencia esperada</div>
                <div>1 registro/minuto por planta</div>
              </div>
            </div>

            <form class="row g-2 mb-3" (ngSubmit)="createRecord()">
              <div class="col-12 col-md-5">
                <select class="form-select" name="newPlantId" [ngModel]="newRecordPlantId()" (ngModelChange)="newRecordPlantId.set($event)" required>
                  <option value="" disabled>Selecciona planta</option>
                  <option *ngFor="let p of plants()" [value]="p.id">{{ p.name }}</option>
                </select>
              </div>

              <div class="col-6 col-md-2">
                <input
                  class="form-control"
                  type="number"
                  name="newConsumption"
                  [ngModel]="newConsumption()"
                  (ngModelChange)="newConsumption.set(toInt($event))"
                  min="0"
                  required
                  placeholder="Consumo"
                />
              </div>

              <div class="col-6 col-md-2">
                <input
                  class="form-control"
                  type="number"
                  name="newGeneration"
                  [ngModel]="newGeneration()"
                  (ngModelChange)="newGeneration.set(toInt($event))"
                  min="0"
                  required
                  placeholder="Generación"
                />
              </div>

              <div class="col-12 col-md-3 d-grid">
                <button class="btn btn-success" type="submit">Crear registro</button>
              </div>
            </form>

            <div class="alert alert-warning" *ngIf="records().length === 0">
              No hay registros.
            </div>

            <div class="table-responsive" *ngIf="records().length > 0">
              <table class="table table-sm align-middle">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Planta</th>
                    <th>Consumo</th>
                    <th>Generación</th>
                    <th style="width:150px;">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let r of records()">
                    <td>{{ r.createdAt }}</td>
                    <td>{{ r.plantName || r.plantId }}</td>
                    <td>{{ r.consumptionW }} W</td>
                    <td>{{ r.generationW }} W</td>
                    <td>
                      <button class="btn btn-sm btn-outline-secondary me-2" (click)="editRecord(r)">
                        Editar
                      </button>
                      <button class="btn btn-sm btn-outline-danger" (click)="removeRecord(r.id)">
                        Borrar
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </ng-container>
    </div>
  `,
})
export class AdminPage implements OnInit, OnDestroy {
  private plantsService = inject(PlantsService);
  private profilesService = inject(ProfilesService);
  private recordsService = inject(RecordsService);
  private store = inject(AppStoreService);
  private auth = inject(AuthService);
  private destroyRef = inject(DestroyRef);

  isAdmin = computed(() => this.auth.isAdmin());

  loading = signal(true);
  plants = signal<Plant[]>([]);
  users = signal<Profile[]>([]);
  records = signal<AdminRecord[]>([]);
  realtimeStatus = signal<RealtimeChannelState>('closed');
  baselineRecordsCount = signal(0);
  error = signal('');

  editingId = signal<string>('');
  editingPlant = signal<Plant | null>(null);

  newRecordPlantId = signal('');
  newConsumption = signal(350);
  newGeneration = signal(600);

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

  lastGlobalInsertAt = computed(() => {
    const latest = this.records()[0];
    if (!latest) return 'Sin registros aún';
    return this.formatDate(latest.createdAt);
  });

  recordsReceivedInSession = computed(() => {
    return Math.max(this.records().length - this.baselineRecordsCount(), 0);
  });

  ownerLabelById = computed(() => {
    const map = new Map<string, string>();
    for (const user of this.users()) {
      const label = (user.name ?? '').trim() || (user.email ?? '').trim() || user.id;
      map.set(user.id, label);
    }
    return map;
  });

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

    this.plantsService
      .plants$()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(list => {
        this.plants.set(list);
        this.store.dispatch({ type: 'plants/setAll', payload: { plants: list } });
      });

    this.recordsService
      .latestRecords$()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(list => {
        this.records.set(list);
        this.store.dispatch({ type: 'admin/setRecords', payload: { records: list } });
      });

    this.recordsService
      .latestRealtimeStatus$()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(status => this.realtimeStatus.set(status));

    try {
      await Promise.all([this.refreshAllPlants(), this.refreshUsers(), this.refreshRecords()]);
      this.baselineRecordsCount.set(this.records().length);
      this.recordsService.startLatestRealtime();
      if (!this.newRecordPlantId() && this.plants().length > 0) {
        this.newRecordPlantId.set(this.plants()[0].id);
      }
    } catch (e: any) {
      this.error.set(e?.message ?? String(e));
    } finally {
      this.loading.set(false);
    }
  }

  ngOnDestroy() {
    this.recordsService.stopLatestRealtime();
  }

  ownerOf(p: Plant): string {
    const ownerId = (p as any).ownerId ?? '';
    if (!ownerId) return '-';
    return this.ownerLabelById().get(ownerId) ?? ownerId;
  }

  photoOf(p: Plant): string | null {
    return (p as any).photoUrl ?? null;
  }

  toInt(v: any): number {
    const n = Number(v);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.floor(n));
  }

  async refreshAllPlants() {
    this.error.set('');
    await this.plantsService.refreshAll();
  }

  async refreshUsers() {
    this.error.set('');
    const list = await this.profilesService.getAll();
    this.users.set(list);
    this.store.dispatch({ type: 'admin/setUsers', payload: { users: list } });
  }

  async refreshRecords() {
    this.error.set('');
    await this.recordsService.refreshLatest(200);
  }

  editPlant(p: Plant) {
    this.editingId.set(p.id);
    this.editingPlant.set(p);
  }

  cancelEditPlant() {
    this.editingId.set('');
    this.editingPlant.set(null);
    this.error.set('');
  }

  async onSavePlant(data: {
    name: string;
    description: string;
    lat: number;
    lng: number;
    photoFile: File | null;
  }) {
    this.error.set('');

    try {
      let uploadedPhotoUrl: string | undefined;

      if (data.photoFile) {
        uploadedPhotoUrl = await this.plantsService.uploadPlantPhoto(data.photoFile);
      }

      if (this.editingId()) {
        const changes: Partial<Plant> = {
          name: data.name,
          description: data.description,
          lat: data.lat,
          lng: data.lng,
        };

        if (uploadedPhotoUrl !== undefined) {
          changes.photoUrl = uploadedPhotoUrl;
        }

        await this.plantsService.update(this.editingId(), {
          ...changes,
        });
      } else {
        const payload = {
          name: data.name,
          description: data.description,
          lat: data.lat,
          lng: data.lng,
          ...(uploadedPhotoUrl !== undefined ? { photoUrl: uploadedPhotoUrl } : {}),
        };

        await this.plantsService.create(payload);
      }

      this.cancelEditPlant();
    } catch (e: any) {
      this.error.set(e?.message ?? String(e));
    }
  }

  async removePlant(id: string) {
    if (!confirm('¿Borrar planta?')) return;

    this.error.set('');
    try {
      await this.plantsService.delete(id);
      await this.refreshRecords();
    } catch (e: any) {
      this.error.set(e?.message ?? String(e));
    }
  }

  async setUserRole(profile: Profile, role: 'admin' | 'client') {
    const me = this.auth.user();
    if (me?.id === profile.id && role !== 'admin') {
      this.error.set('No puedes quitarte el rol admin a ti mismo.');
      return;
    }

    this.error.set('');
    try {
      await this.profilesService.updateRole(profile.id, role);
      await this.refreshUsers();
    } catch (e: any) {
      this.error.set(e?.message ?? String(e));
    }
  }

  async createRecord() {
    const plantId = this.newRecordPlantId();
    const consumption = this.toInt(this.newConsumption());
    const generation = this.toInt(this.newGeneration());

    if (!plantId) {
      this.error.set('Selecciona una planta para crear el registro.');
      return;
    }

    this.error.set('');
    try {
      await this.recordsService.createRecord(plantId, consumption, generation);
      await this.refreshRecords();
    } catch (e: any) {
      this.error.set(e?.message ?? String(e));
    }
  }

  async editRecord(r: AdminRecord) {
    const c = prompt('Nuevo consumo (W):', String(r.consumptionW));
    if (c === null) return;

    const g = prompt('Nueva generación (W):', String(r.generationW));
    if (g === null) return;

    const consumptionW = this.toInt(c);
    const generationW = this.toInt(g);

    this.error.set('');
    try {
      await this.recordsService.updateRecord(r.id, { consumptionW, generationW });
      await this.refreshRecords();
    } catch (e: any) {
      this.error.set(e?.message ?? String(e));
    }
  }

  async removeRecord(id: string) {
    if (!confirm('¿Borrar registro?')) return;

    this.error.set('');
    try {
      await this.recordsService.deleteRecord(id);
      await this.refreshRecords();
    } catch (e: any) {
      this.error.set(e?.message ?? String(e));
    }
  }

  private formatDate(value: string): string {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString();
  }
}
