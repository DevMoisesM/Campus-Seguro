import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';
import { User, LoginCredentials, TokenResponse, RolCodigo } from '../models/auth.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  // Signals de Angular 22 para estado reactivo sin RxJS innecesario
  currentUser = signal<User | null>(this.getStoredUser());
  isAuthenticated = computed(() => !!this.currentUser());
  userRole = computed(() => this.currentUser()?.rol_codigo || 'usuario');

  constructor() {
    // Si hay token almacenado pero no objeto usuario, intentamos sincronizar
    if (this.getToken() && !this.currentUser()) {
      this.getProfile().subscribe();
    }
  }

  login(credentials: LoginCredentials): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${this.apiUrl}/token/`, credentials).pipe(
      tap((res) => {
        this.saveTokens(res.access, res.refresh);
        const userObj: User = {
          id: res.user.id,
          username: res.user.username,
          email: res.user.email,
          first_name: res.user.first_name,
          last_name: res.user.last_name,
          rut: res.user.rut,
          rol_codigo: res.user.rol_codigo,
          rol_nombre: res.user.rol_nombre,
          estado_cuenta: res.user.estado_cuenta,
        };
        this.currentUser.set(userObj);
        localStorage.setItem('user_data', JSON.stringify(userObj));
      })
    );
  }

  register(data: {
    first_name: string;
    last_name: string;
    username: string;
    email: string;
    password: string;
    telefono?: string;
    rut?: string;
  }): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${this.apiUrl}/usuarios/register/`, data).pipe(
      tap((res) => {
        this.saveTokens(res.access, res.refresh);
        const userObj: User = {
          id: res.user.id,
          username: res.user.username,
          email: res.user.email,
          first_name: res.user.first_name,
          last_name: res.user.last_name,
          rut: res.user.rut,
          rol_codigo: res.user.rol_codigo,
          rol_nombre: res.user.rol_nombre,
          estado_cuenta: res.user.estado_cuenta,
        };
        this.currentUser.set(userObj);
        localStorage.setItem('user_data', JSON.stringify(userObj));
      })
    );
  }

  ssoLoginOrProvision(ssoData: { email: string; first_name?: string; last_name?: string; sub?: string }): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/usuarios/sso_login_or_provision/`, ssoData).pipe(
      tap((user) => {
        this.currentUser.set(user);
        localStorage.setItem('user_data', JSON.stringify(user));
      })
    );
  }

  getProfile(): Observable<User | null> {
    return this.http.get<User>(`${this.apiUrl}/me/`).pipe(
      tap((user) => {
        this.currentUser.set(user);
        localStorage.setItem('user_data', JSON.stringify(user));
      }),
      catchError(() => {
        this.logout();
        return of(null);
      })
    );
  }

  updateProfile(data: { first_name: string; last_name: string }): Observable<User> {
    const user = this.currentUser();
    if (!user) throw new Error('No hay usuario autenticado');
    return this.http.patch<User>(`${this.apiUrl}/usuarios/${user.id}/`, data).pipe(
      tap((updatedUser) => {
        const mergedUser: User = {
          ...user,
          first_name: updatedUser.first_name || data.first_name,
          last_name: updatedUser.last_name || data.last_name
        };
        this.currentUser.set(mergedUser);
        localStorage.setItem('user_data', JSON.stringify(mergedUser));
      })
    );
  }

  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_data');
    this.currentUser.set(null);
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  hasRole(allowedRoles: RolCodigo[]): boolean {
    const currentRole = this.userRole();
    return allowedRoles.includes(currentRole);
  }

  private saveTokens(access: string, refresh: string): void {
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
  }

  private getStoredUser(): User | null {
    const stored = localStorage.getItem('user_data');
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }
}
