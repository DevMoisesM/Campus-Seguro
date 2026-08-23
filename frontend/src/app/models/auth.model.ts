export type RolCodigo = 'usuario' | 'guardia' | 'mantencion' | 'gestor';
export type EstadoCuenta = 'activa' | 'pendiente' | 'suspendida' | 'rechazada';

export interface Rol {
  id: number;
  nombre: string;
  codigo: RolCodigo;
}

export interface Especialidad {
  id: number;
  nombre: string;
  descripcion?: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  correo_institucional?: string;
  first_name: string;
  last_name: string;
  rut?: string;
  telefono?: string;
  rol?: Rol;
  rol_codigo?: RolCodigo;
  rol_nombre?: string;
  estado_cuenta: EstadoCuenta;
  especialidades?: Especialidad[];
  auth0_sub?: string;
  is_active?: boolean;
  inasistencia_activa?: {
    id: number;
    motivo: string;
    fecha_desde: string;
    fecha_hasta: string;
  } | null;
}

export interface LoginCredentials {
  username: string;
  password?: string;
}

export interface TokenResponse {
  access: string;
  refresh: string;
  user: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    rut?: string;
    rol_codigo: RolCodigo;
    rol_nombre: string;
    estado_cuenta: EstadoCuenta;
  };
}
