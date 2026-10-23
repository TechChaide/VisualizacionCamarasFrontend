
import type { DataResponse, MessageResponse, PaginatedResponse, PaginationParams, Recurso, RecursoSave } from "@/types/camaras";
import { CAMARAS_API_URL, buildUrl, jsonBody, requestJson } from "./camaras-api";

const API_URL = `${CAMARAS_API_URL}/recurso`;

export const recursoService = {
  async getAll(params?: PaginationParams): Promise<PaginatedResponse<Recurso>> {
    return requestJson(buildUrl(API_URL, { ...params }), 'Error al obtener los recursos');
  },

  async getById(id: number | string): Promise<DataResponse<Recurso>> {
    return requestJson(`${API_URL}/${id}`, `Error al obtener el recurso ${id}`);
  },

  /** Crea si codigo_recurso es 0/null; actualiza si es > 0. Sin passcode se conserva el guardado. */
  async save(data: RecursoSave): Promise<DataResponse<Recurso>> {
    return requestJson(API_URL, 'Error al guardar el recurso', jsonBody('POST', data));
  },

  /** Borrado logico: deja estado en 'I'. */
  async delete(id: number | string): Promise<MessageResponse> {
    return requestJson(`${API_URL}/${id}`, `Error al eliminar el recurso ${id}`, { method: 'DELETE' });
  },
};
