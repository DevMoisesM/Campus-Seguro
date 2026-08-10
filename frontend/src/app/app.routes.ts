import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { LayoutComponent } from './components/layout/layout.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        component: DashboardComponent
      },
      {
        path: 'tickets',
        component: DashboardComponent
      },
      {
        path: 'tickets/nuevo',
        component: DashboardComponent
      },
      {
        path: 'tickets/:id',
        component: DashboardComponent
      },
      {
        path: 'inspecciones',
        component: DashboardComponent
      },
      {
        path: 'ordenes-trabajo',
        component: DashboardComponent
      },
      {
        path: 'gestion-usuarios',
        component: DashboardComponent
      },
      {
        path: 'reportes-bi',
        component: DashboardComponent
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];
