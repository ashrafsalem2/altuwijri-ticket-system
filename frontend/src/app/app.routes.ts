import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login').then(m => m.Login)
  },
  {
    path: '',
    loadComponent: () => import('./layout/shell').then(m => m.Shell),
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard').then(m => m.Dashboard) },
      {
        path: 'board',
        loadComponent: () => import('./features/tasks/task-board').then(m => m.TaskBoard),
        canActivate: [roleGuard], data: { roles: ['Admin', 'Manager'] }
      },
      { path: 'tasks', loadComponent: () => import('./features/tasks/task-list').then(m => m.TaskList) },
      { path: 'tasks/:id', loadComponent: () => import('./features/tasks/task-detail').then(m => m.TaskDetail) },
      { path: 'projects', loadComponent: () => import('./features/projects/projects').then(m => m.Projects) },
      { path: 'chat', loadComponent: () => import('./features/chat/chat').then(m => m.Chat) },
      {
        path: 'reports',
        loadComponent: () => import('./features/reports/reports').then(m => m.Reports),
        canActivate: [roleGuard], data: { roles: ['Admin', 'Manager'] }
      },
      { path: 'my-tickets', loadComponent: () => import('./features/my-tickets/my-tickets').then(m => m.MyTickets) },
      { path: 'my-reports', loadComponent: () => import('./features/my-reports/my-reports').then(m => m.MyReports) },
      {
        path: 'organization',
        loadComponent: () => import('./features/organization/organization').then(m => m.Organization),
        canActivate: [roleGuard], data: { roles: ['Admin', 'Manager'] }
      },
      {
        path: 'users',
        loadComponent: () => import('./features/users/users').then(m => m.Users),
        canActivate: [roleGuard], data: { roles: ['Admin', 'Manager'] }
      }
    ]
  },
  { path: '**', redirectTo: '' }
];
