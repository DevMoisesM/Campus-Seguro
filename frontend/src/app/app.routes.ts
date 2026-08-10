import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { LayoutComponent } from './components/layout/layout.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { TicketCreateComponent } from './components/tickets/ticket-create/ticket-create.component';
import { TicketListComponent } from './components/tickets/ticket-list/ticket-list.component';
import { TicketDetailComponent } from './components/tickets/ticket-detail/ticket-detail.component';
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
      
      // ════════════════════════════════════════════════
      // 1. RUTAS DE ESTUDIANTE / USUARIO BASE
      // ════════════════════════════════════════════════
      {
        path: 'estudiante',
        children: [
          { path: 'mis-tickets', component: TicketListComponent },
          { path: 'nuevo-ticket', component: TicketCreateComponent }
        ]
      },

      // ════════════════════════════════════════════════
      // 2. RUTAS DIRECTAS DE TICKETS Y DETALLE
      // ════════════════════════════════════════════════
      {
        path: 'tickets',
        children: [
          { path: '', component: TicketListComponent },
          { path: 'nuevo', component: TicketCreateComponent },
          { path: ':id', component: TicketDetailComponent }
        ]
      },

      // ════════════════════════════════════════════════
      // 3. RUTAS DE GUARDIA DE SEGURIDAD
      // ════════════════════════════════════════════════
      {
        path: 'guardia',
        data: { roles: ['guardia', 'gestor'] },
        children: [
          { path: 'inspecciones', component: TicketListComponent }
        ]
      },

      // ════════════════════════════════════════════════
      // 4. RUTAS DE MANTENEDOR
      // ════════════════════════════════════════════════
      {
        path: 'mantencion',
        data: { roles: ['mantencion', 'gestor'] },
        children: [
          { path: 'ordenes', component: TicketListComponent }
        ]
      },

      // ════════════════════════════════════════════════
      // 5. RUTAS DE GESTOR / ADMINISTRADOR
      // ════════════════════════════════════════════════
      {
        path: 'gestor',
        data: { roles: ['gestor'] },
        children: [
          { path: 'dashboard', component: DashboardComponent },
          { path: 'usuarios', component: DashboardComponent },
          { path: 'reportes-bi', component: DashboardComponent }
        ]
      },

      // Compatibilidad con enlaces directos anteriores
      { path: 'inspecciones', component: TicketListComponent },
      { path: 'ordenes-trabajo', component: TicketListComponent },
      { path: 'gestion-usuarios', component: DashboardComponent },
      { path: 'reportes-bi', component: DashboardComponent }
    ]
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];
