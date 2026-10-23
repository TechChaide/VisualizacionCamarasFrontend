import { format } from 'date-fns';

/** Usuario logueado (localStorage 'user') para usuario_modificacion / usuario de la verificacion. */
export function getUsuarioActual(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const nombre = user?.codigo_empleado || user?.usuario || user?.username || user?.email || user?.id_usuario;
    return nombre ? String(nombre).slice(0, 50) : undefined;
  } catch {
    return undefined;
  }
}

/** Fecha local sin zona horaria: las columnas DateTime de SQL Server no la guardan. */
export function fechaLocalIso(date = new Date()): string {
  return format(date, "yyyy-MM-dd'T'HH:mm:ss");
}

export function formatFecha(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : format(date, 'dd/MM/yyyy HH:mm:ss');
}

/** Resultado de log_recurso ('OK', 'FAIL SIN_RED', 'CH02 OK', 'RED OK'...) -> ok / falla / neutro. */
export function tonoResultado(resultado?: string | null): 'ok' | 'falla' | 'neutro' {
  if (!resultado) return 'neutro';
  const texto = resultado.toUpperCase();
  if (texto.includes('FAIL')) return 'falla';
  if (texto === 'OK' || texto.endsWith(' OK')) return 'ok';
  return 'neutro';
}

/** Log general de una verificacion completa ('OK' / 'FAIL <codigo>'), no el de un canal ni una consulta parcial. */
export function esLogGeneral(resultado?: string | null): boolean {
  return resultado === 'OK' || !!resultado?.startsWith('FAIL ');
}

/** Codigo de falla de un resultado ('CH02 CAPTURA FAIL SIN_IMAGEN' -> 'SIN_IMAGEN'); null si no es FAIL. */
export function codigoFalla(resultado?: string | null): string | null {
  const match = resultado?.match(/\bFAIL\s+(\S+)/);
  return match ? match[1] : null;
}

/** Dia (yyyy-MM-dd) de una fecha de la API: viene en hora local, sin zona. */
export function diaDe(fecha?: string | null): string {
  return fecha ? fecha.slice(0, 10) : '';
}

export function getErrorMessage(error: unknown, fallback = 'Error inesperado'): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
