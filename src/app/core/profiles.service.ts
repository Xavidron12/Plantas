import { Injectable } from '@angular/core';
import { SupabaseService } from '../services/supabase.service';

export type Profile = {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'client';
  createdAt: string;
};

@Injectable({ providedIn: 'root' })
export class ProfilesService {
  constructor(private sb: SupabaseService) {}

  async getAll(): Promise<Profile[]> {
    const { data, error } = await this.sb.supabase
      .from('profiles')
      .select('id,email,name,role,created_at')
      .order('role', { ascending: true })
      .order('created_at', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error(error);
      return [];
    }

    return ((data ?? []) as any[]).map(r => ({
      id: r.id,
      email: r.email ?? '',
      name: r.name ?? '',
      role: (r.role === 'admin' ? 'admin' : 'client') as 'admin' | 'client',
      createdAt: r.created_at ?? '',
    }));
  }

  async updateRole(userId: string, role: 'admin' | 'client'): Promise<void> {
    const { error } = await this.sb.supabase.from('profiles').update({ role }).eq('id', userId);
    if (error) throw error;
  }
}
