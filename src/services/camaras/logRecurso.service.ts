
import type { DataResponse, LogRecurso, LogRecursoSave, MessageResponse, PaginatedResponse, PaginationParams } from "@/types/camaras";
import { CAMARAS_API_URL, buildUrl, jsonBody, requestJson } from "./camaras-api";

const API_URL = `${CAMARAS_API_URL}/log_recurso`;

export const logRecursoService = {
  async getAll(params?: PaginationParams): Promise<PaginatedResponse<LogRecurso>> {
    return requestJson(buildUrl(API_URL, { ...params }), 'Error al obtener los logs de recurso');
  },

  async getById(id: number | string): Promise<DataResponse<LogRecurso>> {
    return requestJson(`${API_URL}/${id}`, `Error al obtener el log de recurso ${id}`);
  },

  /** Crea si codigo_log_recurso es 0/null; actualiza si es > 0. */
  async save(data: LogRecursoSave): Promise<DataResponse<LogRecurso>> {
    return requestJson(API_URL, 'Error al guardar el log de recurso', jsonBody('POST', data));
  },

  /** Borrado logico: deja estado en 'I'. */
  async delete(id: number | string): Promise<MessageResponse> {
    return requestJson(`${API_URL}/${id}`, `Error al eliminar el log de recurso ${id}`, { method: 'DELETE' });
  },
};
