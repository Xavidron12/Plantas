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

    // 👇 LEEMOS SIEMPRE EL ROL DESDE public.profiles
    const { data: profile, error } = await this.sb.supabase
      .from('profiles')
      .select('name, role')
      .eq('id', sessionUser.id)
      .maybeSingle();

    // Si falla la lectura por RLS o cualquier cosa, al menos no rompemos
    const dbName = profile?.name as string | undefined;
    const dbRole = profile?.role as UserRole | undefined;

    const name =
      dbName ??
      (sessionUser.user_metadata?.['name'] as string | undefined) ??
      (email.split('@')[0] ?? 'user');

    const role: UserRole = dbRole === 'admin' ? 'admin' : 'client';


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
