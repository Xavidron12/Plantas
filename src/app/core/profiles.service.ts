import { Injectable } from '@angular/core';
import { SupabaseService } from '../services/supabase.service';

export type Profile = {
  id: string;
  name: string;
  role: 'admin' | 'client';
};

@Injectable({ providedIn: 'root' })
export class ProfilesService {
  constructor(private sb: SupabaseService) {}

  async getAll(): Promise<Profile[]> {
    const { data, error } = await this.sb.supabase
      .from('profiles')
      .select('id,name,role')
      .order('role', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error(error);
      return [];
    }

    return (data ?? []) as Profile[];
  }
}
