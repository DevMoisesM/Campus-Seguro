import { User, Especialidad } from './auth.model';
import { Ubicacion } from './location.model';

export type UrgenciaTicket = 'baja' | 'media' | 'alta' | 'critica';

export interface EstadoCatalogo {
  id: number;
  entidad: string;
  codigo: string;
  nombre_display: string;
  orden: number;
  color_hex?: string;
}

export interface CategoriaTicket {
  id: number;
  codigo: string;
  nombre_display: string;
  descripcion?: string;
}

export interface CategoriaMaterial {
  id: number;
  codigo: string;
  nombre_display: string;
  descripcion?: string;
}

export interface EvidenciaFotografica {
  id: number;
  ticket: number;
  fase: 'reporte' | 'inspeccion' | 'reparacion';
  imagen_url: string;
  creado_por: number;
  creado_por_nombre?: string;
  created_at: string;
}

export interface ValidacionGuardia {
  id: number;
  ticket: number;
  guardia: number;
  guardia_nombre?: string;
  observacion: string;
  checklist_electrico: boolean;
  checklist_estructural: boolean;
  checklist_accesibilidad: boolean;
  valido: boolean;
  created_at: string;
}

export interface SesionTrabajo {
  id: number;
  ticket: number;
  mantenedor: number;
  mantenedor_nombre?: string;
  inicio: string;
  fin?: string;
  observaciones?: string;
}

export interface MaterialUtilizado {
  id: number;
  ticket: number;
  nombre_material: string;
  categoria?: number;
  categoria_nombre?: string;
  cantidad: number;
  unidad: string;
}

export interface LogAuditoria {
  id: number;
  ticket?: number;
  usuario?: number;
  usuario_nombre?: string;
  accion: string;
  estado_anterior?: string;
  estado_nuevo?: string;
  ip_address?: string;
  detalle?: string;
  created_at: string;
}

export interface Ticket {
  id: number;
  folio: string;
  titulo: string;
  descripcion: string;
  categoria?: CategoriaTicket;
  especialidad_requerida?: Especialidad;
  ubicacion: Ubicacion;
  urgencia: UrgenciaTicket;
  estado: EstadoCatalogo;
  creado_por: User;
  validado_por?: User;
  asignado_a?: User;
  afecta_clase: boolean;
  riesgo_electrico: boolean;
  riesgo_estructural: boolean;
  riesgo_accesibilidad: boolean;
  created_at: string;
  updated_at: string;
  cerrado_at?: string;
  validacion_guardia?: ValidacionGuardia;
  evidencias?: EvidenciaFotografica[];
  materiales_utilizados?: MaterialUtilizado[];
  sesiones_trabajo?: SesionTrabajo[];
}

export interface TicketCreateData {
  titulo: string;
  descripcion: string;
  ubicacion: number;
  categoria?: number;
  especialidad_requerida?: number;
  urgencia: UrgenciaTicket;
  afecta_clase?: boolean;
  riesgo_electrico?: boolean;
  riesgo_estructural?: boolean;
  riesgo_accesibilidad?: boolean;
}

export interface TicketMetrics {
  total?: number;
  enviados: number;
  validados: number;
  en_mantencion: number;
  reparados: number;
  cerrados: number;
}
