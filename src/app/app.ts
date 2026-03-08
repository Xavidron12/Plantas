import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './core/auth.service';
import { MATERIAL } from './shared/material';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ...MATERIAL],
  templateUrl: './app.html',
})
export class AppComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private readonly themeStorageKey = 'solar-theme';

  user = computed(() => this.auth.user());
  isLogged = computed(() => this.auth.isLoggedIn());
  isAdmin = computed(() => this.auth.isAdmin());

  avatarLetter = computed(() => {
    const u = this.user();
    const nameOrEmail = (u?.name || u?.email || 'U').trim();
    return (nameOrEmail[0] || 'U').toUpperCase();
  });

  theme = signal<'light' | 'dark'>('light');

  constructor() {
    this.applyTheme(this.detectInitialTheme());
  }

  toggleTheme() {
    const next = this.theme() === 'light' ? 'dark' : 'light';
    this.applyTheme(next);
  }

  isAuthRoute() {
    const cleanUrl = this.router.url.split('?')[0].split('#')[0];
    return cleanUrl === '/login' || cleanUrl === '/register';
  }

  async logout() {
    await this.auth.logout();
    this.router.navigateByUrl('/login');
  }

  private detectInitialTheme(): 'light' | 'dark' {
    if (typeof window === 'undefined') return 'light';

    const saved = window.localStorage.getItem(this.themeStorageKey);
    if (saved === 'light' || saved === 'dark') return saved;

    const prefersDark =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;

    return prefersDark ? 'dark' : 'light';
  }

  private applyTheme(theme: 'light' | 'dark') {
    this.theme.set(theme);

    if (typeof document !== 'undefined') {
      document.body.setAttribute('data-theme', theme);
    }

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(this.themeStorageKey, theme);
    }
  }
}
