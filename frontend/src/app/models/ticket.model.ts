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
  imagen_url?: string;
  imagenes_urls?: string[];
}

export interface TicketMetrics {
  total?: number;
  enviados: number;
  validados: number;
  en_mantencion: number;
  reparados: number;
  cerrados: number;
  cerrados_periodo?: number;
  tasa_cierre?: number;
  afectan_clase?: number;
  porc_impacto?: number;
  riesgos?: {
    electricos: number;
    estructurales: number;
    accesibilidad: number;
    total: number;
  };
  por_urgencia?: {
    baja: number;
    media: number;
    alta: number;
    critica: number;
  };
  por_sede?: Array<{ id: number; nombre: string; total: number }>;
  por_edificio?: Array<{ edificio: string; total: number }>;
  por_categoria?: Array<{ categoria: string; total: number }>;
  cruce_checklist?: {
    electrico: { total: number; cubierto: number; pct: number };
    estructural: { total: number; cubierto: number; pct: number };
    accesibilidad: { total: number; cubierto: number; pct: number };
  };
  top_materiales?: Array<{ nombre: string; cantidad: number; unidad: string }>;
  rendimiento_guardias?: Array<{ nombre: string; validaciones: number; aprobados: number; rechazados: number }>;
  rendimiento_mantencion?: Array<{ nombre: string; ordenes_completadas: number; hh_totales: number }>;
  ubicaciones_reincidentes?: Array<{ edificio: string; piso: number; sala: string; total: number }>;
  guardias_metrics?: {
    total_validaciones: number;
    validas: number;
    invalidas: number;
    precision: number;
    tiempo_prom_min: number;
    calidad_foto: number;
  };
  mantencion_metrics?: {
    completados: number;
    hh_totales: number;
    hh_promedio: number;
    tasa_no_reparacion: number;
    tiempo_prom_min: number;
    requirio_apoyo: number;
    escalados: number;
    calidad_foto_final: number;
    tablero_tecnicos: Array<{
      id: number;
      nombre: string;
      reparados: number;
      en_proceso: number;
      no_reparables: number;
      reasignados: number;
      inasistencias: number;
    }>;
  };
  materiales_metrics?: {
    materiales_distintos: number;
    categorias_consumidas: number;
    top_compras_inteligentes: Array<{
      id: number;
      codigo: string;
      nombre: string;
      categoria: string;
      veces_usado: number;
      en_tickets: number;
      total_consumido: number;
      unidad: string;
      demanda: string;
    }>;
  };
  comunidad_metrics?: {
    funcionarios_registrados: number;
    alumnos_registrados: number;
    tickets_por_vinculo: Array<{ vinculo: string; total: number }>;
    tickets_por_jornada: Array<{ jornada: string; total: number }>;
    escuela_tickets: Array<{ escuela: string; total: number }>;
    clases_afectadas_escuela: Array<{ escuela: string; total: number }>;
  };
  rango?: string;
  desde?: string;
  hasta?: string;
}
