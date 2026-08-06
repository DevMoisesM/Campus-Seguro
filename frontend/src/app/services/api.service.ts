import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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
  private apiUrl = 'http://127.0.0.1:8000/api';

  getHealthCheck(): Observable<HealthResponse> {
    return this.http.get<HealthResponse>(`${this.apiUrl}/health/`);
  }
}
