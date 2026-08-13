import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User, Rol, Especialidad, RolCodigo, EstadoCuenta } from '../models/auth.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private http = inject(HttpClient);
  private apiUrl = 'http://127.0.0.1:8000/api';

  getUsuarios(rol?: RolCodigo, estado?: EstadoCuenta): Observable<User[]> {
    let params = new HttpParams();
    if (rol) params = params.set('rol', rol);
    if (estado) params = params.set('estado', estado);
    return this.http.get<User[]>(`${this.apiUrl}/usuarios/`, { params });
  }

  getMantenedores(): Observable<User[]> {
    return this.getUsuarios('mantencion', 'activa');
  }

  getRoles(): Observable<Rol[]> {
    return this.http.get<Rol[]>(`${this.apiUrl}/roles/`);
  }

  getEspecialidades(): Observable<Especialidad[]> {
    return this.http.get<Especialidad[]>(`${this.apiUrl}/especialidades/`);
  }

  createInternalStaff(userData: any): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/usuarios/`, userData);
  }

  updateUsuario(id: number, userData: Partial<User>): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/usuarios/${id}/`, userData);
  }

  aprobarCuenta(id: number, rol_codigo: RolCodigo): Observable<{ status: string; mensaje: string }> {
    return this.http.post<{ status: string; mensaje: string }>(`${this.apiUrl}/usuarios/${id}/aprobar_cuenta/`, { rol_codigo });
  }

  cambiarRol(id: number, rol_codigo: RolCodigo): Observable<{ status: string; rol: string }> {
    return this.http.post<{ status: string; rol: string }>(`${this.apiUrl}/usuarios/${id}/cambiar_rol/`, { rol_codigo });
  }

  toggleActivo(id: number): Observable<{ status: string; is_active: boolean }> {
    return this.http.post<{ status: string; is_active: boolean }>(`${this.apiUrl}/usuarios/${id}/toggle_activo/`, {});
  }
}
