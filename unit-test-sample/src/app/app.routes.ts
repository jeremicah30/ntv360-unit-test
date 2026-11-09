import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { Dashboard } from './dashboard/dashboard';
import { Shell } from './layout/shell';
import { Login } from './login/login';
import { Placeholder } from './placeholder/placeholder';

const placeholder = (path: string, title: string) => ({ path, component: Placeholder, data: { title } });

export const routes: Routes = [
  { path: 'login', component: Login },
  {
    path: '',
    component: Shell,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', component: Dashboard },
      placeholder('transaction', 'Transaction'),
      placeholder('reports', 'Reports'),
      placeholder('documents', 'Documents'),
      placeholder('store', 'Store'),
      placeholder('notification', 'Notification'),
      placeholder('profile', 'Profile'),
      placeholder('settings', 'Settings'),
    ],
  },
  { path: '**', redirectTo: '' },
];
