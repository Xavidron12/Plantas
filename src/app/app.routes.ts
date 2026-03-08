import { Routes } from '@angular/router';
import { HomePage } from './pages/home.page';
import { LoginPage } from './pages/login.page';
import { RegisterPage } from './pages/register.page';
import { ProfilePage } from './pages/profile.page';
import { PlantsPage } from './pages/plants.page';
import { PlantDetailPage } from './pages/plant-detail.page';
import { AdminPage } from './pages/admin.page';
import { MapPage } from './pages/map.page';
import { RestCrudPage } from './pages/rest-crud.page';
import { NotFoundPage } from './pages/not-found.page';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'home' },
  { path: 'home', component: HomePage },

  { path: 'login', component: LoginPage },
  { path: 'register', component: RegisterPage },
  { path: 'profile', component: ProfilePage, canActivate: [authGuard] },

  { path: 'plants', component: PlantsPage, canActivate: [authGuard] },
  { path: 'plants/:id', component: PlantDetailPage, canActivate: [authGuard] },

  { path: 'map', component: MapPage, canActivate: [authGuard] },

  { path: 'admin', component: AdminPage, canActivate: [adminGuard] },
  { path: 'rest-demo', component: RestCrudPage, canActivate: [adminGuard] },

  { path: '**', component: NotFoundPage }
];
