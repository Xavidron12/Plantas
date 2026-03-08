import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
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

type SavePlantPayload = {
  name: string;
  description: string;
  lat: number;
  lng: number;
  photoFile: File | null;
};

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PlantFormComponent],
  templateUrl: './admin.page.html',
  styleUrl: './admin.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
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
  message = signal('');

  refreshingPlants = signal(false);
  refreshingUsers = signal(false);
  refreshingRecords = signal(false);
  savingPlant = signal(false);
  creatingRecord = signal(false);
  savingRecordEdit = signal(false);

  editingId = signal('');
  editingPlant = signal<Plant | null>(null);

  newRecordPlantId = signal('');
  newConsumption = signal(350);
  newGeneration = signal(600);

  editingRecord = signal<AdminRecord | null>(null);
  editConsumption = signal(0);
  editGeneration = signal(0);

  plantFilter = signal('');
  userFilter = signal('');
  recordFilter = signal('');

  totalPlants = computed(() => this.plants().length);
  totalUsers = computed(() => this.users().length);
  totalRecords = computed(() => this.records().length);
  canCreateRecord = computed(() => {
    return this.newRecordPlantId().trim().length > 0 && this.newConsumption() >= 0 && this.newGeneration() >= 0;
  });
  canSaveRecordEdit = computed(() => {
    return !!this.editingRecord() && this.editConsumption() >= 0 && this.editGeneration() >= 0;
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

  lastGlobalInsertAt = computed(() => {
    const latest = this.records()[0];
    if (!latest) return 'Sin registros aun';
    return this.formatDate(latest.createdAt);
  });

  recordsReceivedInSession = computed(() => {
    return Math.max(this.records().length - this.baselineRecordsCount(), 0);
  });

  filteredPlantsCount = computed(() => this.filteredPlants().length);
  filteredUsersCount = computed(() => this.filteredUsers().length);
  filteredRecordsCount = computed(() => this.filteredRecords().length);

  ownerLabelById = computed(() => {
    const map = new Map<string, string>();
    for (const user of this.users()) {
      const label = (user.name ?? '').trim() || (user.email ?? '').trim() || user.id;
      map.set(user.id, label);
    }
    return map;
  });

  filteredPlants = computed(() => {
    const term = this.plantFilter().toLowerCase().trim();
    if (!term) return this.plants();

    return this.plants().filter(p => {
      const name = (p.name ?? '').toLowerCase();
      const desc = (p.description ?? '').toLowerCase();
      const owner = this.ownerOf(p).toLowerCase();
      return name.includes(term) || desc.includes(term) || owner.includes(term);
    });
  });

  filteredUsers = computed(() => {
    const term = this.userFilter().toLowerCase().trim();
    if (!term) return this.users();

    return this.users().filter(u => {
      const name = (u.name ?? '').toLowerCase();
      const email = (u.email ?? '').toLowerCase();
      const role = (u.role ?? '').toLowerCase();
      return name.includes(term) || email.includes(term) || role.includes(term);
    });
  });

  filteredRecords = computed(() => {
    const term = this.recordFilter().toLowerCase().trim();
    if (!term) return this.records();

    return this.records().filter(r => {
      const plant = (r.plantName || r.plantId || '').toLowerCase();
      const date = (r.createdAt ?? '').toLowerCase();
      return (
        plant.includes(term) ||
        date.includes(term) ||
        String(r.consumptionW).includes(term) ||
        String(r.generationW).includes(term)
      );
    });
  });

  async ngOnInit() {
    this.loading.set(true);
    this.clearNotices();

    try {
      const user = await this.auth.ensureSession();
      if (!user) {
        this.error.set('No hay sesion. Vuelve a iniciar sesion.');
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
    const ownerId = p.ownerId ?? '';
    if (!ownerId) return '-';
    return this.ownerLabelById().get(ownerId) ?? ownerId;
  }

  photoOf(p: Plant): string | null {
    return p.photoUrl ?? null;
  }

  toInt(v: unknown): number {
    const n = Number(v);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.floor(n));
  }

  async refreshAllPlants() {
    this.error.set('');
    this.refreshingPlants.set(true);
    try {
      await this.plantsService.refreshAll();
    } finally {
      this.refreshingPlants.set(false);
    }
  }

  async refreshUsers() {
    this.error.set('');
    this.refreshingUsers.set(true);
    try {
      const list = await this.profilesService.getAll();
      this.users.set(list);
      this.store.dispatch({ type: 'admin/setUsers', payload: { users: list } });
    } finally {
      this.refreshingUsers.set(false);
    }
  }

  async refreshRecords() {
    this.error.set('');
    this.refreshingRecords.set(true);
    try {
      await this.recordsService.refreshLatest(200);
    } finally {
      this.refreshingRecords.set(false);
    }
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

  async onSavePlant(data: SavePlantPayload) {
    this.clearNotices();
    this.savingPlant.set(true);

    try {
      const isEditing = !!this.editingId();
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

        await this.plantsService.update(this.editingId(), { ...changes });
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
      this.message.set(isEditing ? 'Planta actualizada correctamente.' : 'Planta creada correctamente.');
    } catch (e: any) {
      this.error.set(e?.message ?? String(e));
    } finally {
      this.savingPlant.set(false);
    }
  }

  async removePlant(id: string) {
    if (!confirm('¿Borrar planta?')) return;

    this.clearNotices();
    try {
      await this.plantsService.delete(id);
      await this.refreshRecords();
      this.message.set('Planta eliminada correctamente.');
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

    this.clearNotices();
    try {
      await this.profilesService.updateRole(profile.id, role);
      await this.refreshUsers();
      this.message.set('Rol actualizado correctamente.');
    } catch (e: any) {
      this.error.set(e?.message ?? String(e));
    }
  }

  async createRecord() {
    this.clearNotices();
    const plantId = this.newRecordPlantId();
    const consumption = this.toInt(this.newConsumption());
    const generation = this.toInt(this.newGeneration());

    if (!plantId) {
      this.error.set('Selecciona una planta para crear el registro.');
      return;
    }

    this.creatingRecord.set(true);
    try {
      await this.recordsService.createRecord(plantId, consumption, generation);
      await this.refreshRecords();
      this.message.set('Registro creado correctamente.');
    } catch (e: any) {
      this.error.set(e?.message ?? String(e));
    } finally {
      this.creatingRecord.set(false);
    }
  }

  startEditRecord(r: AdminRecord) {
    this.clearNotices();
    this.editingRecord.set(r);
    this.editConsumption.set(this.toInt(r.consumptionW));
    this.editGeneration.set(this.toInt(r.generationW));
  }

  cancelRecordEdit() {
    this.editingRecord.set(null);
  }

  async saveRecordEdit() {
    const current = this.editingRecord();
    if (!current) return;

    this.clearNotices();
    this.savingRecordEdit.set(true);
    try {
      await this.recordsService.updateRecord(current.id, {
        consumptionW: this.toInt(this.editConsumption()),
        generationW: this.toInt(this.editGeneration()),
      });
      await this.refreshRecords();
      this.editingRecord.set(null);
      this.message.set('Registro actualizado correctamente.');
    } catch (e: any) {
      this.error.set(e?.message ?? String(e));
    } finally {
      this.savingRecordEdit.set(false);
    }
  }

  async removeRecord(id: string) {
    if (!confirm('¿Borrar registro?')) return;

    this.clearNotices();
    try {
      await this.recordsService.deleteRecord(id);
      await this.refreshRecords();
      if (this.editingRecord()?.id === id) {
        this.editingRecord.set(null);
      }
      this.message.set('Registro eliminado correctamente.');
    } catch (e: any) {
      this.error.set(e?.message ?? String(e));
    }
  }

  clearPlantFilter() {
    this.plantFilter.set('');
  }

  clearUserFilter() {
    this.userFilter.set('');
  }

  clearRecordFilter() {
    this.recordFilter.set('');
  }

  private clearNotices() {
    this.error.set('');
    this.message.set('');
  }

  private formatDate(value: string): string {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString();
  }
}

