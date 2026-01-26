import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../services/supabase.service';
import { Plant } from '../models/plant.model';

@Injectable({ providedIn: 'root' })
export class PlantsService {
  private sb = inject(SupabaseService);

  private readonly BUCKET = 'plant-photos';

  async getAll(): Promise<Plant[]> {
    const { data, error } = await this.sb.supabase
      .from('plants')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Plant[];
  }

  async getByOwner(ownerId: string): Promise<Plant[]> {
    const { data, error } = await this.sb.supabase
      .from('plants')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Plant[];
  }

  async getById(id: string): Promise<Plant | null> {
    const { data, error } = await this.sb.supabase
      .from('plants')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data as Plant;
  }

  async create(data: {
    name: string;
    description?: string;
    lat: number;
    lng: number;
    photo_url?: string | null;
  }) {
    const { error } = await this.sb.supabase.from('plants').insert(data);
    if (error) throw error;
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
  ) {
    const payload = { ...data, owner_id: ownerId };

    const { error } = await this.sb.supabase.from('plants').insert(payload);
    if (error) throw error;
  }

  async update(id: string, data: Partial<Plant>) {
    const { error } = await this.sb.supabase.from('plants').update(data).eq('id', id);
    if (error) throw error;
  }

  async delete(id: string) {
    const { error } = await this.sb.supabase.from('plants').delete().eq('id', id);
    if (error) throw error;
  }

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
}
