/**
 * Generic API Service
 * Automatically handles authentication via httpOnly cookies
 * Use this for any authenticated API calls
 */

import { fetchWithAuth, type FetchOptions } from "@/lib/http-client";

export const apiService = {
  /**
   * GET request with automatic authentication
   */
  async get<T>(url: string, options?: FetchOptions) {
    const response = await fetchWithAuth(url, {
      method: 'GET',
      ...options,
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: 'Error en la petición' }));
      throw new Error(errorBody.message || 'Error al obtener datos');
    }

    return response.json() as Promise<T>;
  },

  /**
   * POST request with automatic authentication
   */
  async post<T>(url: string, data?: Record<string, any>, options?: FetchOptions) {
    const response = await fetchWithAuth(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: 'Error en la petición' }));
      throw new Error(errorBody.message || 'Error al enviar datos');
    }

    return response.json() as Promise<T>;
  },

  /**
   * PUT request with automatic authentication
   */
  async put<T>(url: string, data?: Record<string, any>, options?: FetchOptions) {
    const response = await fetchWithAuth(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: 'Error en la petición' }));
      throw new Error(errorBody.message || 'Error al actualizar datos');
    }

    return response.json() as Promise<T>;
  },

  /**
   * DELETE request with automatic authentication
   */
  async delete<T>(url: string, options?: FetchOptions) {
    const response = await fetchWithAuth(url, {
      method: 'DELETE',
      ...options,
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: 'Error en la petición' }));
      throw new Error(errorBody.message || 'Error al eliminar datos');
    }

    return response.json() as Promise<T>;
  },
};
