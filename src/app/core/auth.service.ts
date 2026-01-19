import { Injectable, computed, signal } from '@angular/core';
import { SupabaseService } from '../services/supabase.service';

export type UserRole = 'admin' | 'client';

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _user = signal<AppUser | null>(null);

  user = computed(() => this._user());
  isLoggedIn = computed(() => this._user() !== null);
  isAdmin = computed(() => this._user()?.role === 'admin');

  constructor(private sb: SupabaseService) {
    this.loadSession();
    this.sb.supabase.auth.onAuthStateChange(() => {
      this.loadSession();
    });
  }

  private async loadSession() {
    const { data } = await this.sb.supabase.auth.getSession();
    const sessionUser = data.session?.user ?? null;

    if (!sessionUser) {
      this._user.set(null);
      return;
    }

    const email = sessionUser.email ?? '';

    const { data: profile } = await this.sb.supabase
      .from('profiles')
      .select('name, role')
      .eq('id', sessionUser.id)
      .maybeSingle();

    const name =
      (profile?.name as string | undefined) ??
      (sessionUser.user_metadata?.['name'] as string | undefined) ??
      (email.split('@')[0] ?? 'user');

    const role = ((profile?.role as UserRole | undefined) ?? 'client');

    this._user.set({
      id: sessionUser.id,
      email,
      name,
      role,
    });
  }

  async login(email: string, password: string) {
    const { data, error } = await this.sb.supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, message: error.message };
    if (!data.user) return { ok: false, message: 'No se pudo iniciar sesión' };

    await this.loadSession();
    return { ok: true, message: '' };
  }

  async register(email: string, password: string, name: string) {
    const { data, error } = await this.sb.supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });

    if (error) return { ok: false, message: error.message };
    if (!data.user) return { ok: false, message: 'No se pudo registrar' };

    // OJO: NO hacemos await aquí para evitar que se quede colgado.
    // Queremos que register() termine sí o sí.
    void this.sb.supabase.auth.signOut();
    this._user.set(null);

    return { ok: true, message: '' };
  }

  async logout() {
    await this.sb.supabase.auth.signOut();
    this._user.set(null);
  }

  async updateProfile(name: string) {
    const u = this._user();
    if (!u) return;

    await this.sb.supabase.auth.updateUser({ data: { name } });
    await this.sb.supabase.from('profiles').update({ name }).eq('id', u.id);

    await this.loadSession();
  }
}
