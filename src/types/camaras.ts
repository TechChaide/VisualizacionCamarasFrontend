// Tipos de la API CamarasVisor (FastAPI). Reflejan los esquemas Pydantic de
// Camaras-Visor/src/schemas.

// =============================================
// Sobres de respuesta
// =============================================
export interface DataResponse<T> {
  data: T;
  length: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  length: number;
  total: number;
  page: number;
  totalPages: number;
}

export interface MessageResponse {
  message: string;
  id?: number | string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

// =============================================
// Tablas
// =============================================
export interface Recurso {
  codigo_recurso: number;
  nombre_recurso: string | null;
  ip_recurso: string | null;
  referencia: string | null;
  estado: string | null;
  fecha_modificacion: string | null;
  usuario_modificacion: string | null;
  usuario: string | null;
}

/** codigo_recurso = 0 o null -> crea | > 0 -> actualiza. passcode es de solo escritura. */
export interface RecursoSave {
  codigo_recurso?: number | null;
  nombre_recurso?: string | null;
  ip_recurso?: string | null;
  referencia?: string | null;
  estado?: string | null;
  fecha_modificacion?: string | null;
  usuario_modificacion?: string | null;
  usuario?: string | null;
  passcode?: string | null;
}

export interface LogRecurso {
  codigo_log_recurso: number;
  codigo_recurso: number | null;
  resultado: string | null;
  estado: string | null;
  fecha_modificacion: string | null;
  usuario_modificacion: string | null;
  fecha_hora_registro: string | null;
  recurso?: Recurso | null;
}

/** codigo_log_recurso = 0 o null -> crea | > 0 -> actualiza. */
export interface LogRecursoSave {
  codigo_log_recurso?: number | null;
  codigo_recurso?: number | null;
  resultado?: string | null;
  estado?: string | null;
  fecha_modificacion?: string | null;
  usuario_modificacion?: string | null;
  fecha_hora_registro?: string | null;
}

// =============================================
// Verificacion
// =============================================
export interface ResultadoImagen {
  ok: boolean;
  codigo: string;
  detalle: string;
  metodo?: string | null;
  equipo?: string | null;
  disponible?: boolean | null;
  ancho?: number | null;
  alto?: number | null;
  brillo?: number | null;
  contraste?: number | null;
  variacion?: number | null;
}

export interface ResultadoGrabacion {
  ok: boolean | null;
  codigo: string;
  detalle: string;
}

export interface ResultadoCanal {
  canal: number;
  codigo_log_recurso?: number | null;
  nombre?: string | null;
  en_linea?: boolean | null;
  /** Estado que reporta el NVR (connect, notExist...) */
  estado_nvr?: string | null;
  disponibilidad?: boolean | null;
  devuelve_imagen: boolean;
  graba_disco?: boolean | null;
  ok: boolean;
  codigo: string;
  detalle: string;
  imagen?: ResultadoImagen | null;
  grabacion?: ResultadoGrabacion | null;
}

export interface ResultadoVerificacion {
  codigo_recurso?: number | null;
  codigo_log_recurso?: number | null;
  nombre?: string | null;
  ip?: string | null;
  equipo?: string | null;
  /** nvr (todos los canales) | camara (un canal) */
  modo: string;
  disponibilidad?: boolean | null;
  devuelve_imagen: boolean;
  graba_disco?: boolean | null;
  ok: boolean;
  codigo: string;
  detalle: string;
  canales_total: number;
  canales_en_linea: number;
  canales_ok: number;
  canales_desconectados: number;
  canales: ResultadoCanal[];
  duracion_s: number;
  fecha: string;
}

export interface ResumenVerificacion {
  data: ResultadoVerificacion[];
  length: number;
  total: number;
  ok: number;
  fallas: number;
  duracion_s: number;
}

export interface CanalResumido {
  canal: number;
  codigo_log_recurso?: number | null;
  nombre?: string | null;
  disponibilidad?: boolean | null;
  devuelve_imagen: boolean;
  graba_disco?: boolean | null;
  resultado: string;
  detalle: string;
}

export interface EstadoResumido {
  codigo_recurso?: number | null;
  codigo_log_recurso?: number | null;
  nombre?: string | null;
  ip?: string | null;
  disponibilidad?: boolean | null;
  devuelve_imagen: boolean;
  graba_disco?: boolean | null;
  /** OK, SIN_RED, FALLAN_CANALES 2/10... */
  resultado: string;
  detalle: string;
  canales_en_linea: number;
  canales_ok: number;
  canales_desconectados: number;
  canales: CanalResumido[];
  fecha: string;
}

export interface EstadoCamara {
  codigo_recurso: number;
  nombre_recurso?: string | null;
  ip_recurso?: string | null;
  ok?: boolean | null;
  resultado?: string | null;
  codigo_log_recurso?: number | null;
  fecha_verificacion?: string | null;
}

export interface DiagnosticoRed {
  ip: string;
  http_port: number;
  http_abierto: boolean;
  rtsp_port: number;
  rtsp_abierto: boolean;
  canal_id: string;
  isapi_ok?: boolean | null;
  equipo?: string | null;
}

export interface AnalisisImagen {
  ok: boolean;
  codigo: string;
  ancho: number;
  alto: number;
  brillo: number;
  contraste: number;
  variacion?: number | null;
}

export interface ConfiguracionVerificacion {
  usuario: string;
  clave_configurada: boolean;
  modo_grabacion: string;
  tolerancia_min: number;
  ventana_continua_min: number;
  ventana_eventos_min: number;
  timeout_s: number;
  brillo_min: number;
  contraste_min: number;
  dif_congelada: number;
  segundos_entre_muestras: number;
  hilos: number;
  intervalo_programado_min: number;
}

export type ModoGrabacion = 'continua' | 'eventos' | 'ninguna';

export interface GrabadorPrueba {
  ip: string;
  canal?: number;
  usuario?: string;
  clave?: string;
  http_port?: number;
  https?: boolean;
}

/** Camara que no esta en la tabla recurso (las credenciales no se guardan). */
export interface CamaraPrueba {
  ip: string;
  nombre?: string;
  /** Vacio = si es un NVR revisa todos sus canales */
  canal?: number;
  /** 1 = principal, 2 = substream */
  stream?: 1 | 2;
  usuario?: string;
  clave?: string;
  http_port?: number;
  rtsp_port?: number;
  https?: boolean;
  grabacion?: ModoGrabacion;
  grabador?: GrabadorPrueba;
}
