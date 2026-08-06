import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService, HealthResponse } from './services/api.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'Campus-Seguro';
  private apiService = inject(ApiService);
  
  backendStatus: 'loading' | 'online' | 'offline' = 'loading';
  healthData: HealthResponse | null = null;
  errorMessage: string | null = null;

  ngOnInit(): void {
    this.checkBackendConnection();
  }

  checkBackendConnection(): void {
    this.backendStatus = 'loading';
    this.errorMessage = null;

    this.apiService.getHealthCheck().subscribe({
      next: (data) => {
        this.healthData = data;
        this.backendStatus = 'online';
      },
      error: (err) => {
        console.error('Error al conectar con el backend:', err);
        this.backendStatus = 'offline';
        this.errorMessage = 'No se pudo conectar con la API Django en http://127.0.0.1:8000/api/health/. Asegúrate de tener el backend ejecutándose.';
      }
    });
  }
}
