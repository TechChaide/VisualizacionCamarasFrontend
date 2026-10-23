
import type {
  AnalisisImagen,
  CamaraPrueba,
  ConfiguracionVerificacion,
  DataResponse,
  DiagnosticoRed,
  EstadoCamara,
  EstadoResumido,
  LogRecurso,
  ModoGrabacion,
  PaginatedResponse,
  PaginationParams,
  ResultadoGrabacion,
  ResultadoVerificacion,
  ResumenVerificacion,
} from "@/types/camaras";
import { CAMARAS_API_URL, buildUrl, jsonBody, requestBlob, requestJson } from "./camaras-api";

const API_URL = `${CAMARAS_API_URL}/verificacion`;

export const verificacionService = {
  // =============================================
  // Verificacion (registra en log_recurso)
  // =============================================

  /** Verifica en paralelo todas las camaras activas. */
  async verificarTodas(usuario?: string): Promise<ResumenVerificacion> {
    return requestJson(buildUrl(API_URL, { usuario }), 'Error al verificar las camaras', { method: 'POST' });
  },

  /** Verifica una camara de la tabla recurso. */
  async verificarUna(codigoRecurso: number | string, usuario?: string): Promise<DataResponse<ResultadoVerificacion>> {
    return requestJson(
      buildUrl(`${API_URL}/recurso/${codigoRecurso}`, { usuario }),
      `Error al verificar la camara ${codigoRecurso}`,
      { method: 'POST' },
    );
  },

  /** Consulta en vivo todos los recursos activos con el detalle por canal. */
  async getCamaras(): Promise<PaginatedResponse<EstadoResumido>> {
    return requestJson(`${API_URL}/camaras`, 'Error al consultar las camaras');
  },

  /** Consulta en vivo una camara con el detalle por canal. */
  async getCamara(codigoRecurso: number | string): Promise<DataResponse<EstadoResumido>> {
    return requestJson(`${API_URL}/camaras/${codigoRecurso}`, `Error al consultar la camara ${codigoRecurso}`);
  },

  /** Ultimo resultado registrado de cada camara activa (no consulta las camaras). */
  async getEstado(): Promise<PaginatedResponse<EstadoCamara>> {
    return requestJson(`${API_URL}/estado`, 'Error al obtener el estado de las camaras');
  },

  /** Verificaciones de una camara, de la mas reciente a la mas antigua. */
  async getHistorial(codigoRecurso: number | string, params?: PaginationParams): Promise<PaginatedResponse<LogRecurso>> {
    return requestJson(
      buildUrl(`${API_URL}/recurso/${codigoRecurso}/historial`, { ...params }),
      `Error al obtener el historial de la camara ${codigoRecurso}`,
    );
  },

  /** Umbrales y valores por defecto en uso. */
  async getConfiguracion(): Promise<ConfiguracionVerificacion> {
    return requestJson(`${API_URL}/configuracion`, 'Error al obtener la configuracion de verificacion');
  },

  // =============================================
  // Consultas parciales sobre un recurso (registran en log_recurso)
  // =============================================

  /** Puertos HTTP/RTSP y respuesta de ISAPI. */
  async getRed(codigoRecurso: number | string, canal?: number): Promise<DiagnosticoRed> {
    return requestJson(
      buildUrl(`${API_URL}/recurso/${codigoRecurso}/red`, { canal }),
      `Error al revisar la red de la camara ${codigoRecurso}`,
    );
  },

  /** Captura actual en JPEG. Usar URL.createObjectURL(blob) para mostrarla. */
  async getCaptura(codigoRecurso: number | string, canal?: number): Promise<Blob> {
    return requestBlob(
      buildUrl(`${API_URL}/recurso/${codigoRecurso}/captura`, { canal, t: Date.now() }),
      `Error al capturar la imagen de la camara ${codigoRecurso}`,
    );
  },

  /** Solo disco y video grabado. modo vacio = el configurado en la camara. */
  async getGrabacion(codigoRecurso: number | string, canal?: number, modo?: ModoGrabacion): Promise<ResultadoGrabacion> {
    return requestJson(
      buildUrl(`${API_URL}/recurso/${codigoRecurso}/grabacion`, { canal, modo }),
      `Error al revisar la grabacion de la camara ${codigoRecurso}`,
    );
  },

  // =============================================
  // Pruebas sobre una IP cualquiera (no registran log)
  // =============================================

  async probarCamara(camara: CamaraPrueba): Promise<DataResponse<ResultadoVerificacion>> {
    return requestJson(`${API_URL}/pruebas/camara`, `Error al probar la camara ${camara.ip}`, jsonBody('POST', camara));
  },

  async probarRed(camara: CamaraPrueba): Promise<DiagnosticoRed> {
    return requestJson(`${API_URL}/pruebas/red`, `Error al probar la red de ${camara.ip}`, jsonBody('POST', camara));
  },

  /** Captura JPEG de una IP cualquiera. */
  async probarCaptura(camara: CamaraPrueba): Promise<Blob> {
    return requestBlob(`${API_URL}/pruebas/captura`, `Error al capturar la imagen de ${camara.ip}`, jsonBody('POST', camara));
  },

  /** Analiza una imagen (negra / tapada) o dos para detectar imagen congelada. */
  async probarImagen(imagen: Blob, imagen2?: Blob): Promise<AnalisisImagen> {
    const formData = new FormData();
    formData.append('imagen', imagen);
    if (imagen2) formData.append('imagen2', imagen2);
    // Sin Content-Type: el navegador agrega el boundary del multipart
    return requestJson(`${API_URL}/pruebas/imagen`, 'Error al analizar la imagen', { method: 'POST', body: formData });
  },
};
