export interface Sede {
  id: number;
  nombre: string;
  direccion?: string;
}

export interface Edificio {
  id: number;
  sede: number;
  sede_nombre: string;
  nombre: string;
}

export interface Piso {
  id: number;
  edificio: number;
  edificio_nombre: string;
  numero: string;
}

export interface TipoUbicacion {
  id: number;
  codigo: string;
  nombre_display: string;
}

export interface Ubicacion {
  id: number;
  piso: number;
  piso_numero: string;
  edificio_nombre: string;
  sede_nombre: string;
  tipo?: number;
  tipo_nombre?: string;
  nombre: string;
  descripcion?: string;
}
