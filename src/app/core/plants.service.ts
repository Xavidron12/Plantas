import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { SupabaseService } from '../services/supabase.service';
import { Plant } from '../models/plant.model';

type PlantRow = {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  lat: number;
  lng: number;
  photo_url: string | null;
  created_at: string;
};

@Injectable({ providedIn: 'root' })
export class PlantsService {
  private plants$ = new BehaviorSubject<Plant[]>([]);

  constructor(private sb: SupabaseService) {}

  getAll(): Observable<Plant[]> {
    return this.plants$.asObservable();
  }

  getByOwner(ownerId: string): Observable<Plant[]> {
    return this.getAll().pipe(map(list => list.filter(p => p.ownerId === ownerId)));
  }

  getById(id: string): Observable<Plant | undefined> {
    return this.getAll().pipe(map(list => list.find(p => p.id === id)));
  }

  async refreshAll() {
    const { data, error } = await this.sb.supabase
      .from('plants')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return;

    const mapped = (data as PlantRow[]).map(r => this.mapRow(r));
    this.plants$.next(mapped);
  }

  async create(plant: { ownerId: string; name: string; description?: string; lat: number; lng: number; photoUrl?: string; }) {
    const { error } = await this.sb.supabase.from('plants').insert({
      owner_id: plant.ownerId,
      name: plant.name,
      description: plant.description ?? null,
      lat: plant.lat,
      lng: plant.lng,
      photo_url: plant.photoUrl ?? null,
    });

    if (!error) await this.refreshAll();
  }

  async update(id: string, changes: Partial<Plant>) {
    const patch: any = {};
    if (changes.name !== undefined) patch.name = changes.name;
    if (changes.description !== undefined) patch.description = changes.description ?? null;
    if (changes.lat !== undefined) patch.lat = changes.lat;
    if (changes.lng !== undefined) patch.lng = changes.lng;
    if (changes.photoUrl !== undefined) patch.photo_url = changes.photoUrl ?? null;

    const { error } = await this.sb.supabase.from('plants').update(patch).eq('id', id);
    if (!error) await this.refreshAll();
  }

  async delete(id: string) {
    const { error } = await this.sb.supabase.from('plants').delete().eq('id', id);
    if (!error) await this.refreshAll();
  }

  private mapRow(r: PlantRow): Plant {
    return {
      id: r.id,
      ownerId: r.owner_id,
      name: r.name,
      description: r.description ?? '',
      lat: r.lat,
      lng: r.lng,
      photoUrl: r.photo_url ?? '',
      createdAt: r.created_at,
    };
  }
}
