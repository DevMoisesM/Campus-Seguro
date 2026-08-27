import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface HealthResponse {
  status: string;
  message: string;
  system: string;
  version: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  getHealthCheck(): Observable<HealthResponse> {
    return this.http.get<HealthResponse>(`${this.apiUrl}/health/`);
  }
}
