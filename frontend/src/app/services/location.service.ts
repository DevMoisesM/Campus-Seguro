import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Sede, Edificio, Piso, TipoUbicacion, Ubicacion } from '../models/location.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  getSedes(): Observable<Sede[]> {
    return this.http.get<Sede[]>(`${this.apiUrl}/sedes/`);
  }

  getEdificios(sedeId?: number): Observable<Edificio[]> {
    let params = new HttpParams();
    if (sedeId) {
      params = params.set('sede', sedeId.toString());
    }
    return this.http.get<Edificio[]>(`${this.apiUrl}/edificios/`, { params });
  }

  getPisos(edificioId?: number): Observable<Piso[]> {
    let params = new HttpParams();
    if (edificioId) {
      params = params.set('edificio', edificioId.toString());
    }
    return this.http.get<Piso[]>(`${this.apiUrl}/pisos/`, { params });
  }

  getUbicaciones(pisoId?: number): Observable<Ubicacion[]> {
    let params = new HttpParams();
    if (pisoId) {
      params = params.set('piso', pisoId.toString());
    }
    return this.http.get<Ubicacion[]>(`${this.apiUrl}/ubicaciones/`, { params });
  }
}
