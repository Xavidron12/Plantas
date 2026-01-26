import { Injectable } from '@angular/core';
import { SupabaseService } from '../services/supabase.service';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class FavoritesService {
  constructor(private sb: SupabaseService, private auth: AuthService) {}

  async getMyFavoritePlantIds(): Promise<Set<string>> {
    const u = this.auth.user();
    if (!u) return new Set();

    const { data, error } = await this.sb.supabase
      .from('favorites')
      .select('plant_id')
      .eq('user_id', u.id);

    if (error) {
      console.error(error);
      return new Set();
    }

    return new Set((data ?? []).map((x: any) => x.plant_id as string));
  }

  async add(plantId: string): Promise<void> {
    const u = this.auth.user();
    if (!u) throw new Error('No hay usuario logueado');

    const { error } = await this.sb.supabase
      .from('favorites')
      .insert({ user_id: u.id, plant_id: plantId });

    if (error) throw error;
  }

  async remove(plantId: string): Promise<void> {
    const u = this.auth.user();
    if (!u) throw new Error('No hay usuario logueado');

    const { error } = await this.sb.supabase
      .from('favorites')
      .delete()
      .eq('user_id', u.id)
      .eq('plant_id', plantId);

    if (error) throw error;
  }

  async toggle(plantId: string, isFav: boolean): Promise<boolean> {
    if (isFav) {
      await this.remove(plantId);
      return false;
    } else {
      await this.add(plantId);
      return true;
    }
  }
}
