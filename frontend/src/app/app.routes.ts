import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { LayoutComponent } from './components/layout/layout.component';
import { EstudianteDashboardComponent } from './components/roles/estudiante-dashboard/estudiante-dashboard.component';
import { GuardiaDashboardComponent } from './components/roles/guardia-dashboard/guardia-dashboard.component';
import { MantencionDashboardComponent } from './components/roles/mantencion-dashboard/mantencion-dashboard.component';
import { GestorDashboardComponent } from './components/roles/gestor-dashboard/gestor-dashboard.component';
import { GestorBiComponent } from './components/roles/gestor-bi/gestor-bi.component';
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
        component: EstudianteDashboardComponent
      },
      
      // ════════════════════════════════════════════════
      // 1. RUTAS PREFIJADAS DE ESTUDIANTE / USUARIO BASE
      // ════════════════════════════════════════════════
      {
        path: 'estudiante',
        children: [
          { path: 'dashboard', component: EstudianteDashboardComponent },
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
      // 3. RUTAS PREFIJADAS DE GUARDIA DE SEGURIDAD
      // ════════════════════════════════════════════════
      {
        path: 'guardia',
        data: { roles: ['guardia', 'gestor'] },
        children: [
          { path: 'dashboard', component: GuardiaDashboardComponent },
          { path: 'inspecciones', component: GuardiaDashboardComponent }
        ]
      },

      // ════════════════════════════════════════════════
      // 4. RUTAS PREFIJADAS DE MANTENEDOR
      // ════════════════════════════════════════════════
      {
        path: 'mantencion',
        data: { roles: ['mantencion', 'gestor'] },
        children: [
          { path: 'dashboard', component: MantencionDashboardComponent },
          { path: 'ordenes', component: MantencionDashboardComponent }
        ]
      },

      // ════════════════════════════════════════════════
      // 5. RUTAS PREFIJADAS DE GESTOR / ADMINISTRADOR
      // ════════════════════════════════════════════════
      {
        path: 'gestor',
        data: { roles: ['gestor'] },
        children: [
          { path: 'dashboard', component: GestorDashboardComponent },
          { path: 'usuarios', component: GestorDashboardComponent },
          { path: 'reportes-bi', component: GestorBiComponent }
        ]
      },

      // Compatibilidad con enlaces directos anteriores
      { path: 'inspecciones', component: GuardiaDashboardComponent },
      { path: 'ordenes-trabajo', component: MantencionDashboardComponent },
      { path: 'gestion-usuarios', component: GestorDashboardComponent },
      { path: 'reportes-bi', component: GestorBiComponent }
    ]
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];
