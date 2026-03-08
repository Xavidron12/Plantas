import { Injectable } from '@angular/core';
import { SupabaseService } from '../services/supabase.service';

export type Profile = {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'client';
  createdAt: string;
};

type ProfileRow = {
  id: string;
  email: string | null;
  name: string | null;
  role: 'admin' | 'client' | null;
  created_at: string | null;
};

@Injectable({ providedIn: 'root' })
export class ProfilesService {
  constructor(private sb: SupabaseService) {}

  async uploadAvatar(file: File): Promise<string> {
    const { data: authData, error: authError } = await this.sb.supabase.auth.getUser();
    if (authError) throw authError;

    const userId = authData.user?.id;
    if (!userId) throw new Error('No hay usuario logueado');

    const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase();
    const fileName = `${crypto.randomUUID()}.${ext}`;

    const candidates = [
      { bucket: 'profile-avatars', path: `${userId}/${fileName}` },
      { bucket: 'plant-photos', path: `avatars/${userId}/${fileName}` },
    ] as const;

    let lastError: unknown = null;

    for (const target of candidates) {
      const { error } = await this.sb.supabase.storage
        .from(target.bucket)
        .upload(target.path, file, { upsert: false });

      if (error) {
        lastError = error;
        continue;
      }

      const { data } = this.sb.supabase.storage.from(target.bucket).getPublicUrl(target.path);
      return data.publicUrl;
    }

    throw lastError ?? new Error('No se pudo subir el avatar a Storage');
  }

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

    return ((data ?? []) as ProfileRow[]).map(r => ({
      id: r.id,
      email: r.email ?? '',
      name: r.name ?? '',
      role: r.role === 'admin' ? 'admin' : 'client',
      createdAt: r.created_at ?? '',
    }));
  }

  async updateRole(userId: string, role: 'admin' | 'client'): Promise<void> {
    const { error } = await this.sb.supabase.from('profiles').update({ role }).eq('id', userId);
    if (error) throw error;
  }
}
