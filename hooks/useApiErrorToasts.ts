import { useEffect } from 'react';
import { onApiError, ApiError } from '../services/api';
import { toast } from './useToast';

/**
 * Mostrar toasts automáticos para errores comunes del API.
 * Ignora 400 y 422 (errores de validación que el form muestra inline).
 * Ignora 401 (se maneja con refresh + redirect a /login).
 * Muestra toast para 403, 429, 5xx.
 *
 * Llamar UNA SOLA VEZ en el root de la app (ej. en <App />).
 */
export function useApiErrorToasts() {
  useEffect(() => {
    const unsubscribe = onApiError((err: ApiError) => {
      if (err.status === 400 || err.status === 422 || err.status === 401) return;
      if (err.status === 403) {
        // Mensaje específico según el code que el BE manda
        if (err.code === 'ACCOUNT_NOT_ACTIVATED') {
          toast.warning(err.message);
        } else if (err.code === 'ACCOUNT_DISABLED') {
          toast.error(err.message);
        } else {
          toast.error(err.message);
        }
        return;
      }
      if (err.status === 429) {
        toast.warning(err.message);
        return;
      }
      if (err.status >= 500) {
        toast.error(err.message);
        return;
      }
      if (err.status === 404 || err.status === 409 || err.status === 410) {
        toast.error(err.message);
      }
    });
    return unsubscribe;
  }, []);
}
