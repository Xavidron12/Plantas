import { Injectable, computed, signal } from '@angular/core';
import { SupabaseService } from '../services/supabase.service';
import { AppStoreService } from './store/app-store.service';

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
  private _ready = signal(false);

  user = computed(() => this._user());
  isLoggedIn = computed(() => this._user() !== null);
  isAdmin = computed(() => this._user()?.role === 'admin');
  ready = computed(() => this._ready());

  constructor(private sb: SupabaseService, private store: AppStoreService) {
    void this.loadSession().finally(() => {
      this._ready.set(true);
      this.store.dispatch({ type: 'auth/setReady', payload: { ready: true } });
    });
    this.sb.supabase.auth.onAuthStateChange(() => {
      void this.loadSession().finally(() => {
        this._ready.set(true);
        this.store.dispatch({ type: 'auth/setReady', payload: { ready: true } });
      });
    });
  }

  private async loadSession() {
    const { data } = await this.sb.supabase.auth.getSession();
    const sessionUser = data.session?.user ?? null;

    if (!sessionUser) {
      this._user.set(null);
      this.store.dispatch({ type: 'auth/clearSession' });
      return;
    }

    const email = sessionUser.email ?? '';

    // El rol se lee de public.profiles para que siempre sea el vigente.
    const { data: profile, error } = await this.sb.supabase
      .from('profiles')
      .select('name, role')
      .eq('id', sessionUser.id)
      .maybeSingle();

    // Si falla esta lectura, seguimos con valores por defecto para no romper sesión.
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

    this.store.dispatch({
      type: 'auth/setSession',
      payload: { userId: sessionUser.id, role },
    });
  }

  async ensureSession(): Promise<AppUser | null> {
    await this.loadSession();
    this._ready.set(true);
    this.store.dispatch({ type: 'auth/setReady', payload: { ready: true } });
    return this._user();
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
    this.store.dispatch({ type: 'auth/clearSession' });
  }

  async updateProfile(name: string) {
    const u = this._user();
    if (!u) return;

    await this.sb.supabase.auth.updateUser({ data: { name } });
    await this.sb.supabase.from('profiles').update({ name }).eq('id', u.id);

    await this.loadSession();
  }
}
