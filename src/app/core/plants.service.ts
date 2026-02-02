import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, distinctUntilChanged, map } from 'rxjs';
import { SupabaseService } from '../services/supabase.service';
import { Plant } from '../models/plant.model';

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

  // ✅ Stream global (admin)
  private all$ = new BehaviorSubject<Plant[]>([]);

  // ✅ Streams por owner (cliente)
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
  // READ (DB)
  // -----------------------------

  async getAll(): Promise<Plant[]> {
    const { data, error } = await this.sb.supabase
      .from('plants')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as Plant[];
  }

  async getByOwner(ownerId: string): Promise<Plant[]> {
    const { data, error } = await this.sb.supabase
      .from('plants')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as Plant[];
  }

  async getById(id: string): Promise<Plant | null> {
    const { data, error } = await this.sb.supabase
      .from('plants')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return (data ?? null) as Plant | null;
  }

  // -----------------------------
  // REFRESH (emite a Observables)
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
  // MUTATIONS (DB + stream update)
  // -----------------------------

  // ✅ CREA PARA EL USUARIO LOGUEADO (owner_id obligatorio)
  async create(data: {
    name: string;
    description?: string;
    lat: number;
    lng: number;
    photo_url?: string | null;
  }): Promise<Plant> {
    const { data: authData, error: authErr } = await this.sb.supabase.auth.getUser();
    if (authErr) throw authErr;

    const userId = authData.user?.id;
    if (!userId) throw new Error('No hay usuario logueado');

    const payload = { ...data, owner_id: userId };

    const { data: created, error } = await this.sb.supabase
      .from('plants')
      .insert(payload)
      .select('*')
      .single();

    if (error) throw error;

    const plant = created as Plant;
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
      photo_url?: string | null;
    }
  ): Promise<Plant> {
    const payload = { ...data, owner_id: ownerId };

    const { data: created, error } = await this.sb.supabase
      .from('plants')
      .insert(payload)
      .select('*')
      .single();

    if (error) throw error;

    const plant = created as Plant;
    this.emitCreated(plant);
    return plant;
  }

  async update(id: string, data: Partial<Plant>): Promise<Plant> {
    const { data: updated, error } = await this.sb.supabase
      .from('plants')
      .update(data)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;

    const plant = updated as Plant;
    this.emitUpdated(plant);
    return plant;
  }

  async delete(id: string): Promise<void> {
    // Para poder actualizar streams sin recargar, intentamos saber el owner del registro a borrar.
    // Si no podemos leerlo por RLS, igual borrará y luego podrás hacer refresh manual si hiciera falta.
    let ownerId: string | null = null;
    try {
      const { data } = await this.sb.supabase.from('plants').select('owner_id').eq('id', id).maybeSingle();
      ownerId = (data as any)?.owner_id ?? null;
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
    const ownerId = (p as any).owner_id ?? (p as any).ownerId ?? null;

    // all$
    this.all$.next([p, ...this.all$.value]);

    // byOwner
    if (ownerId) {
      const s = this.ownerSubject(ownerId);
      s.next([p, ...s.value]);
    }
  }

  private emitUpdated(p: Plant) {
    const ownerId = (p as any).owner_id ?? (p as any).ownerId ?? null;

    // all$
    this.all$.next(this.all$.value.map(x => (x.id === p.id ? p : x)));

    // byOwner: actualiza en TODOS los subjects por si cambió owner (raro, pero por si acaso)
    for (const [oid, s] of this.byOwner.entries()) {
      const exists = s.value.some(x => x.id === p.id);
      if (exists) {
        // si pertenece a este owner, actualiza; si no, quítalo
        if (ownerId && oid === ownerId) {
          s.next(s.value.map(x => (x.id === p.id ? p : x)));
        } else {
          s.next(s.value.filter(x => x.id !== p.id));
        }
      } else {
        // si no estaba y ahora pertenece a este owner, lo añadimos
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
      // si no sabemos owner, lo quitamos de todos los subjects (seguro)
      for (const s of this.byOwner.values()) {
        s.next(s.value.filter(x => x.id !== id));
      }
    }
  }
}
