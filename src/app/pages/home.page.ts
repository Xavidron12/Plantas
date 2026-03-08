import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../core/auth.service';

type HomeKpi = {
  label: string;
  value: string;
  description: string;
};

type QuickLinkTone = 'primary' | 'secondary' | 'dark';

type QuickLink = {
  title: string;
  description: string;
  route: string;
  badge: string;
  tone: QuickLinkTone;
  visible: boolean;
};

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.page.html',
  styleUrl: './home.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  private auth = inject(AuthService);

  isLogged = computed(() => this.auth.isLoggedIn());
  isAdmin = computed(() => this.auth.isAdmin());
  userName = computed(() => (this.auth.user()?.name ?? '').trim());
  userEmail = computed(() => this.auth.user()?.email ?? '');
  userRole = computed(() => this.auth.user()?.role ?? 'guest');

  heroPrimaryLink = computed(() => (this.isLogged() ? '/plants' : '/login'));
  heroPrimaryText = computed(() => (this.isLogged() ? 'Abrir panel de plantas' : 'Iniciar sesion'));

  heroSecondaryLink = computed(() => (this.isLogged() ? '/map' : '/register'));
  heroSecondaryText = computed(() => (this.isLogged() ? 'Ver mapa operativo' : 'Crear cuenta'));

  kpisGuest: readonly HomeKpi[] = [
    {
      label: 'Arquitectura',
      value: 'Angular 21',
      description: 'Standalone components, router avanzado y control de estado.',
    },
    {
      label: 'Backend',
      value: 'Supabase',
      description: 'Auth, PostgreSQL, Storage y Realtime en una sola plataforma.',
    },
    {
      label: 'Cobertura funcional',
      value: 'CRUD + Realtime',
      description: 'Plantas, registros y panel admin con flujo completo.',
    },
  ] as const;

  kpisLogged: readonly HomeKpi[] = [
    {
      label: 'Estado de sesion',
      value: 'Activa',
      description: 'Tu cuenta esta autenticada y lista para operar.',
    },
    {
      label: 'Perfil activo',
      value: 'Role-based',
      description: 'Permisos aplicados por rol client/admin en rutas y datos.',
    },
    {
      label: 'Observabilidad',
      value: 'HTTP traced',
      description: 'Peticiones instrumentadas con interceptor para depuracion.',
    },
  ] as const;

  visibleKpis = computed(() => (this.isLogged() ? this.kpisLogged : this.kpisGuest));

  quickLinks = computed(() => {
    const links: QuickLink[] = [
      {
        title: 'Plantas',
        description: 'Gestion de plantas, favoritos y filtros.',
        route: '/plants',
        badge: 'Core',
        tone: 'primary',
        visible: this.isLogged(),
      },
      {
        title: 'Mapa',
        description: 'Vista geolocalizada de plantas con Leaflet.',
        route: '/map',
        badge: 'Geo',
        tone: 'secondary',
        visible: this.isLogged(),
      },
      {
        title: 'Perfil',
        description: 'Datos de usuario y avatar en storage.',
        route: '/profile',
        badge: 'Auth',
        tone: 'secondary',
        visible: this.isLogged(),
      },
      {
        title: 'Admin',
        description: 'Roles, registros y operaciones globales.',
        route: '/admin',
        badge: 'Role',
        tone: 'dark',
        visible: this.isLogged() && this.isAdmin(),
      },
    ];

    return links.filter(link => link.visible);
  });

  stack: readonly string[] = [
    'Signals',
    'RxJS',
    'Reactive Forms',
    'Template Forms',
    'Supabase Auth',
    'Supabase Realtime',
    'Supabase Storage',
    'Angular Material',
    'Bootstrap',
    'Chart.js',
    'Leaflet',
  ] as const;
}

