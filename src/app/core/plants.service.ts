import { Injectable } from '@angular/core';
import { SupabaseService } from '../services/supabase.service';
import { Plant } from '../models/plant.model';

@Injectable({ providedIn: 'root' })
export class PlantsService {
  constructor(private sb: SupabaseService) {}

  async getMine() {
    const { data, error } = await this.sb.supabase
      .from('plants')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      return [];
    }
    return data as Plant[];
  }

  async getAll() {
    const { data, error } = await this.sb.supabase
      .from('plants')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      return [];
    }
    return data as Plant[];
  }

  async getById(id: string) {
    const { data, error } = await this.sb.supabase
      .from('plants')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error(error);
      return null;
    }
    return data as Plant | null;
  }

  async create(plant: Omit<Plant, 'id' | 'created_at'>) {
    const { error } = await this.sb.supabase
      .from('plants')
      .insert(plant);

    if (error) {
      console.error(error);
      throw error;
    }
  }

  async update(id: string, plant: Partial<Plant>) {
    const { error } = await this.sb.supabase
      .from('plants')
      .update(plant)
      .eq('id', id);

    if (error) {
      console.error(error);
      throw error;
    }
  }

  async delete(id: string) {
    const { error } = await this.sb.supabase
      .from('plants')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(error);
      throw error;
    }
  }
}
