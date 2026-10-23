
import { environment } from "@/environments/environments.prod";
import { fetchWithAuth, type FetchOptions } from "@/lib/http-client";

/** Raiz de la API CamarasVisor: <appAPI>/api */
export const CAMARAS_API_URL = `${environment.appAPI}/api`;

type QueryValue = string | number | boolean | null | undefined;

/** Arma la URL con los query params definidos (omite null/undefined/''). */
export function buildUrl(url: string, params?: Record<string, QueryValue>): string {
  if (!params) return url;
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.append(key, String(value));
  });
  const qs = query.toString();
  return qs ? `${url}?${qs}` : url;
}

/**
 * Lanza un Error con el mensaje del backend. La API devuelve los errores como
 * {error, message?, details?, code?}.
 */
async function throwApiError(response: Response, fallback: string): Promise<never> {
  const errorBody = await response.json().catch(() => ({ message: 'Error desconocido' }));
  const message = errorBody.message || errorBody.error || fallback;
  const error = new Error(message) as Error & { status?: number; code?: string; details?: unknown };
  error.status = response.status;
  error.code = errorBody.code;
  error.details = errorBody.details;
  throw error;
}

/** Peticion que devuelve JSON. */
export async function requestJson<T>(url: string, fallback: string, options: FetchOptions = {}): Promise<T> {
  const response = await fetchWithAuth(url, options);
  if (!response.ok) await throwApiError(response, fallback);
  return response.json();
}

/** Peticion que devuelve un archivo (ej. captura JPEG). */
export async function requestBlob(url: string, fallback: string, options: FetchOptions = {}): Promise<Blob> {
  const response = await fetchWithAuth(url, options);
  if (!response.ok) await throwApiError(response, fallback);
  return response.blob();
}

/** Opciones para enviar un cuerpo JSON. */
export function jsonBody(method: string, data?: unknown): FetchOptions {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: data !== undefined ? JSON.stringify(data) : undefined,
  };
}
