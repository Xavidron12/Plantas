import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './core/auth.service';
import { MATERIAL } from './shared/material';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, ...MATERIAL],
  templateUrl: './app.html',
})
export class AppComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  // lo dejamos por compatibilidad (aunque ya no es necesario con mat-menu)
  menuOpen = signal(false);

  user = computed(() => this.auth.user());
  isLogged = computed(() => this.auth.isLoggedIn());
  isAdmin = computed(() => this.auth.isAdmin());

  avatarLetter = computed(() => {
    const u = this.user();
    const nameOrEmail = (u?.name || u?.email || 'U').trim();
    return (nameOrEmail[0] || 'U').toUpperCase();
  });

  theme = signal<'light' | 'dark'>('light');

  toggleTheme() {
    const next = this.theme() === 'light' ? 'dark' : 'light';
    this.theme.set(next);
    document.body.setAttribute('data-theme', next);
  }

  isAuthRoute() {
    const cleanUrl = this.router.url.split('?')[0].split('#')[0];
    return cleanUrl === '/login' || cleanUrl === '/register';
  }

  toggleMenu() {
    this.menuOpen.set(!this.menuOpen());
  }

  closeMenu() {
    this.menuOpen.set(false);
  }

  async logout() {
    await this.auth.logout();
    this.closeMenu();
    this.router.navigateByUrl('/login');
  }
}
