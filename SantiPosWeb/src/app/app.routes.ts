import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'pos',
    pathMatch: 'full'
  },
  {
    path: 'login',
    // Carga perezosa (Lazy loading) para optimizar inicio
    loadComponent: () => import('./features/auth/login').then(m => m.LoginComponent)
  },
  {
    path: 'pos',
    loadComponent: () => import('./features/pos/pos').then(m => m.PosComponent),
    canActivate: [authGuard] // <--- AQUÍ PROTEGEMOS LA RUTA
  },
  {
    path: '**', // Cualquier ruta desconocida vuelve al login
    redirectTo: 'login'
  }
];
