import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, distinctUntilChanged } from 'rxjs';
import { SupabaseService } from '../services/supabase.service';
import { Plant } from '../models/plant.model';

type PlantRow = {
  id: string;
  owner_id: string | null;
  name: string;
  description: string | null;
  lat: number | null;
  lng: number | null;
  photo_url: string | null;
  created_at: string | null;
};

function sameList(a: Plant[], b: Plant[]) {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i]?.id !== b[i]?.id) return false;
  }
  return true;
}

@Injectable({ providedIn: 'root' })
export class PlantsService {
  private sb = inject(SupabaseService);

  private readonly BUCKET = 'plant-photos';

  private all$ = new BehaviorSubject<Plant[]>([]);
  private byOwner = new Map<string, BehaviorSubject<Plant[]>>();

  plants$(): Observable<Plant[]> {
    return this.all$.asObservable().pipe(distinctUntilChanged(sameList));
  }

  plantsByOwner$(ownerId: string): Observable<Plant[]> {
    return this.ownerSubject(ownerId).asObservable().pipe(distinctUntilChanged(sameList));
  }

  private ownerSubject(ownerId: string) {
    let s = this.byOwner.get(ownerId);
    if (!s) {
      s = new BehaviorSubject<Plant[]>([]);
      this.byOwner.set(ownerId, s);
    }
    return s;
  }

  // -----------------------------
  // MAPPERS (DB <-> MODEL)
  // -----------------------------

  private toPlant(row: PlantRow): Plant {
    return {
      id: row.id,
      ownerId: row.owner_id,
      name: row.name,
      description: row.description,
      lat: row.lat,
      lng: row.lng,
      photoUrl: row.photo_url,
      createdAt: row.created_at,
    } as Plant;
  }

  private toRow(partial: {
    name?: string;
    description?: string | null;
    lat?: number | null;
    lng?: number | null;
    photoUrl?: string | null;
  }): Record<string, any> {
    const p = partial ?? {};
    const row: any = {};

    if ('name' in p) row.name = p.name;
    if ('description' in p) row.description = p.description ?? null;
    if ('lat' in p) row.lat = p.lat;
    if ('lng' in p) row.lng = p.lng;
    if ('photoUrl' in p) row.photo_url = p.photoUrl ?? null;

    return row;
  }

  // -----------------------------
  // READ (DB)
  // -----------------------------

  async getAll(): Promise<Plant[]> {
    const { data, error } = await this.sb.supabase
      .from('plants')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return ((data ?? []) as PlantRow[]).map(r => this.toPlant(r));
  }

  async getByOwner(ownerId: string): Promise<Plant[]> {
    const { data, error } = await this.sb.supabase
      .from('plants')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return ((data ?? []) as PlantRow[]).map(r => this.toPlant(r));
  }

  async getById(id: string): Promise<Plant | null> {
    const { data, error } = await this.sb.supabase
      .from('plants')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;

    return data ? this.toPlant(data as PlantRow) : null;
  }

  // -----------------------------
  // REFRESH
  // -----------------------------

  async refreshAll(): Promise<void> {
    const list = await this.getAll();
    this.all$.next(list);
  }

  async refreshByOwner(ownerId: string): Promise<void> {
    const list = await this.getByOwner(ownerId);
    this.ownerSubject(ownerId).next(list);
  }

  // -----------------------------
  // MUTATIONS
  // -----------------------------

  async create(data: {
    name: string;
    description?: string;
    lat: number;
    lng: number;
    photoUrl?: string | null;
  }): Promise<Plant> {
    const { data: authData, error: authErr } = await this.sb.supabase.auth.getUser();
    if (authErr) throw authErr;

    const userId = authData.user?.id;
    if (!userId) throw new Error('No hay usuario logueado');

    const payload = { ...this.toRow(data), owner_id: userId };

    const { data: created, error } = await this.sb.supabase
      .from('plants')
      .insert(payload)
      .select('*')
      .single();

    if (error) throw error;

    const plant = this.toPlant(created as PlantRow);
    this.emitCreated(plant);
    return plant;
  }

  async createForOwner(
    ownerId: string,
    data: {
      name: string;
      description?: string;
      lat: number;
      lng: number;
      photoUrl?: string | null;
    }
  ): Promise<Plant> {
    const payload = { ...this.toRow(data), owner_id: ownerId };

    const { data: created, error } = await this.sb.supabase
      .from('plants')
      .insert(payload)
      .select('*')
      .single();

    if (error) throw error;

    const plant = this.toPlant(created as PlantRow);
    this.emitCreated(plant);
    return plant;
  }

  async update(id: string, data: Partial<Plant>): Promise<Plant> {
    const payload = this.toRow({
      name: (data as any).name,
      description: (data as any).description,
      lat: (data as any).lat,
      lng: (data as any).lng,
      photoUrl: (data as any).photoUrl,
    });

    const { data: updated, error } = await this.sb.supabase
      .from('plants')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;

    const plant = this.toPlant(updated as PlantRow);
    this.emitUpdated(plant);
    return plant;
  }

  async delete(id: string): Promise<void> {
    let ownerId: string | null = null;
    try {
      const { data } = await this.sb.supabase
        .from('plants')
        .select('owner_id')
        .eq('id', id)
        .maybeSingle();

      ownerId = (data as { owner_id: string | null } | null)?.owner_id ?? null;
    } catch {}

    const { error } = await this.sb.supabase.from('plants').delete().eq('id', id);
    if (error) throw error;

    this.emitDeleted(id, ownerId);
  }

  // -----------------------------
  // STORAGE
  // -----------------------------

  async uploadPlantPhoto(file: File): Promise<string> {
    const ext = file.name.split('.').pop() ?? 'jpg';
    const safeExt = ext.toLowerCase();
    const path = `plants/${crypto.randomUUID()}.${safeExt}`;

    const { error: upErr } = await this.sb.supabase.storage
      .from(this.BUCKET)
      .upload(path, file, { upsert: false });

    if (upErr) throw upErr;

    const { data } = this.sb.supabase.storage.from(this.BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }

  // -----------------------------
  // helpers para streams
  // -----------------------------

  private emitCreated(p: Plant) {
    const ownerId = p.ownerId ?? null;

    this.all$.next([p, ...this.all$.value]);

    if (ownerId) {
      const s = this.ownerSubject(ownerId);
      s.next([p, ...s.value]);
    }
  }

  private emitUpdated(p: Plant) {
    const ownerId = p.ownerId ?? null;

    this.all$.next(this.all$.value.map(x => (x.id === p.id ? p : x)));

    for (const [oid, s] of this.byOwner.entries()) {
      const exists = s.value.some(x => x.id === p.id);
      if (exists) {
        if (ownerId && oid === ownerId) {
          s.next(s.value.map(x => (x.id === p.id ? p : x)));
        } else {
          s.next(s.value.filter(x => x.id !== p.id));
        }
      } else {
        if (ownerId && oid === ownerId) {
          s.next([p, ...s.value]);
        }
      }
    }
  }

  private emitDeleted(id: string, ownerId: string | null) {
    this.all$.next(this.all$.value.filter(x => x.id !== id));

    if (ownerId) {
      const s = this.byOwner.get(ownerId);
      if (s) s.next(s.value.filter(x => x.id !== id));
    } else {
      for (const s of this.byOwner.values()) {
        s.next(s.value.filter(x => x.id !== id));
      }
    }
  }
}
