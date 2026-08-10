import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Ticket, TicketCreateData, TicketMetrics, CategoriaTicket } from '../models/ticket.model';

@Injectable({
  providedIn: 'root'
})
export class TicketService {
  private http = inject(HttpClient);
  private apiUrl = 'http://127.0.0.1:8000/api';

  getTickets(): Observable<Ticket[]> {
    return this.http.get<Ticket[]>(`${this.apiUrl}/tickets/`);
  }

  getTicketById(id: number): Observable<Ticket> {
    return this.http.get<Ticket>(`${this.apiUrl}/tickets/${id}/`);
  }

  createTicket(data: TicketCreateData): Observable<Ticket> {
    return this.http.post<Ticket>(`${this.apiUrl}/tickets/`, data);
  }

  validarGuardia(ticketId: number, data: {
    observacion: string;
    checklist_electrico?: boolean;
    checklist_estructural?: boolean;
    checklist_accesibilidad?: boolean;
    valido: boolean;
  }): Observable<{ status: string; estado: string }> {
    return this.http.post<{ status: string; estado: string }>(
      `${this.apiUrl}/tickets/${ticketId}/validar_guardia/`,
      data
    );
  }

  derivarMantencion(ticketId: number, mantenedorId: number): Observable<{ status: string; asignado_a: string }> {
    return this.http.post<{ status: string; asignado_a: string }>(
      `${this.apiUrl}/tickets/${ticketId}/derivar_mantencion/`,
      { mantenedor_id: mantenedorId }
    );
  }

  registrarMantencion(ticketId: number, data: {
    observacion?: string;
    materiales?: Array<{ nombre: string; cantidad: number; unidad: string }>;
    imagen_url?: string;
  }): Observable<{ status: string }> {
    return this.http.post<{ status: string }>(
      `${this.apiUrl}/tickets/${ticketId}/registrar_mantencion/`,
      data
    );
  }

  cerrarTicket(ticketId: number): Observable<{ status: string }> {
    return this.http.post<{ status: string }>(
      `${this.apiUrl}/tickets/${ticketId}/cerrar_ticket/`,
      {}
    );
  }

  getCategorias(): Observable<CategoriaTicket[]> {
    return this.http.get<CategoriaTicket[]>(`${this.apiUrl}/categorias-ticket/`);
  }

  getMetrics(): Observable<TicketMetrics> {
    return this.http.get<TicketMetrics>(`${this.apiUrl}/tickets/metrics/`);
  }
}
