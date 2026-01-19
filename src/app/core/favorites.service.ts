import { Injectable, computed, signal } from '@angular/core';
import { SupabaseService } from '../services/supabase.service';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private _favoritePlantIds = signal<Set<string>>(new Set());

  favoritePlantIds = computed(() => this._favoritePlantIds());
  isFavorite = (plantId: string) => this._favoritePlantIds().has(plantId);

  constructor(private sb: SupabaseService, private auth: AuthService) {
    this.refresh();
  }

  async refresh() {
    const user = this.auth.user();
    if (!user) {
      this._favoritePlantIds.set(new Set());
      return;
    }

    const { data, error } = await this.sb.supabase
      .from('favorites')
      .select('plant_id')
      .eq('user_id', user.id);

    if (error) return;

    this._favoritePlantIds.set(new Set(data.map(x => x.plant_id as string)));
  }

  async toggle(plantId: string) {
    const user = this.auth.user();
    if (!user) return;

    if (this.isFavorite(plantId)) {
      await this.sb.supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('plant_id', plantId);

      await this.refresh();
      return;
    }

    await this.sb.supabase.from('favorites').insert({
      user_id: user.id,
      plant_id: plantId,
    });

    await this.refresh();
  }
}
