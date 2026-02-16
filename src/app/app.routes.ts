import { Routes } from '@angular/router';
import { LoginPage } from './pages/login.page';
import { RegisterPage } from './pages/register.page';
import { ProfilePage } from './pages/profile.page';
import { PlantsPage } from './pages/plants.page';
import { PlantDetailPage } from './pages/plant-detail.page';
import { AdminPage } from './pages/admin.page';
import { MapPage } from './pages/map.page';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },

  { path: 'login', component: LoginPage },
  { path: 'register', component: RegisterPage },
  { path: 'profile', component: ProfilePage },

  { path: 'plants', component: PlantsPage },
  { path: 'plants/:id', component: PlantDetailPage },

  { path: 'map', component: MapPage },

  { path: 'admin', component: AdminPage },

  { path: '**', redirectTo: 'login' }
];
