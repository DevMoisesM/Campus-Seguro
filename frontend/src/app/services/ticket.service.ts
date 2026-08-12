import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Ticket, CategoriaTicket, TicketMetrics } from '../models/ticket.model';

export interface TicketCreateData {
  titulo: string;
  descripcion: string;
  ubicacion: number;
  categoria?: number;
  urgencia?: 'baja' | 'media' | 'alta' | 'critica';
  afecta_clase?: boolean;
  riesgo_electrico?: boolean;
  riesgo_estructural?: boolean;
  riesgo_accesibilidad?: boolean;
  imagen_url?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TicketService {
  private http = inject(HttpClient);
  private apiUrl = 'http://127.0.0.1:8000/api';

  getTickets(params?: { estado?: string; urgencia?: string; search?: string }): Observable<Ticket[]> {
    let httpParams = new HttpParams();
    if (params?.estado) httpParams = httpParams.set('estado', params.estado);
    if (params?.urgencia) httpParams = httpParams.set('urgencia', params.urgencia);
    if (params?.search) httpParams = httpParams.set('search', params.search);

    return this.http.get<Ticket[]>(`${this.apiUrl}/tickets/`, { params: httpParams });
  }

  getTicketById(id: number): Observable<Ticket> {
    return this.http.get<Ticket>(`${this.apiUrl}/tickets/${id}/`);
  }

  createTicket(data: TicketCreateData): Observable<Ticket> {
    return this.http.post<Ticket>(`${this.apiUrl}/tickets/`, data);
  }

  validarGuardia(ticketId: number, data: {
    observacion?: string;
    checklist_electrico?: boolean;
    checklist_estructural?: boolean;
    checklist_accesibilidad?: boolean;
    valido?: boolean;
  }): Observable<{ status: string; estado: string }> {
    const payload = {
      valido: data.valido ?? true,
      ...data
    };
    return this.http.post<{ status: string; estado: string }>(
      `${this.apiUrl}/tickets/${ticketId}/validar_guardia/`,
      payload
    );
  }

  derivarMantencion(ticketId: number, mantenedorId?: number): Observable<{ status: string; asignado_a?: string }> {
    return this.http.post<{ status: string; asignado_a?: string }>(
      `${this.apiUrl}/tickets/${ticketId}/derivar_mantencion/`,
      mantenedorId ? { mantenedor_id: mantenedorId } : {}
    );
  }

  assignMantencion(ticketId: number, mantenedorId: number): Observable<{ status: string; asignado_a?: string }> {
    return this.derivarMantencion(ticketId, mantenedorId);
  }

  registrarMantencion(ticketId: number, data: {
    observaciones_tecnicas?: string;
    observacion?: string;
    horas_trabajadas?: number;
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
