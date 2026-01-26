import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './core/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink],
  templateUrl: './app.html',
})
export class AppComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  menuOpen = signal(false);

  user = computed(() => this.auth.user());
  isLogged = computed(() => this.auth.isLoggedIn());
  isAdmin = computed(() => this.auth.isAdmin());

  avatarLetter = computed(() => {
    const u = this.user();
    const nameOrEmail = (u?.name || u?.email || 'U').trim();
    return (nameOrEmail[0] || 'U').toUpperCase();
  });

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
