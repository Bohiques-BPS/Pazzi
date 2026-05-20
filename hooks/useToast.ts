import toastLib, { Toast } from 'react-hot-toast';

/**
 * API canónica de toasts del proyecto.
 * Es un wrapper sobre react-hot-toast para:
 *   - No acoplar el resto del código a una librería concreta.
 *   - Estandarizar duración, ícono, posición.
 *   - Facilitar swap futuro a otra solución (ej. shadcn/ui).
 *
 * Uso:
 *   import { toast } from '../hooks/useToast';
 *   toast.success('Producto guardado');
 *   toast.error('No se pudo guardar');
 *   toast.promise(savePromise, { loading: 'Guardando...', success: 'Listo', error: 'Falló' });
 */

const DEFAULT_DURATION = 4000;
const ERROR_DURATION = 6000;

export const toast = {
  success: (message: string, opts?: Partial<Toast>) =>
    toastLib.success(message, { duration: DEFAULT_DURATION, ...opts }),

  error: (message: string, opts?: Partial<Toast>) =>
    toastLib.error(message, { duration: ERROR_DURATION, ...opts }),

  warning: (message: string, opts?: Partial<Toast>) =>
    toastLib(message, {
      duration: DEFAULT_DURATION,
      icon: '⚠️',
      style: { background: '#FEF3C7', color: '#92400E' },
      ...opts,
    }),

  info: (message: string, opts?: Partial<Toast>) =>
    toastLib(message, {
      duration: DEFAULT_DURATION,
      icon: 'ℹ️',
      ...opts,
    }),

  loading: (message: string) => toastLib.loading(message),

  dismiss: (id?: string) => toastLib.dismiss(id),

  promise: <T,>(
    promise: Promise<T>,
    msgs: { loading: string; success: string | ((data: T) => string); error: string | ((err: any) => string) }
  ) => toastLib.promise(promise, msgs),
};

/**
 * Hook idéntico al objeto `toast` exportado arriba. Existe por compatibilidad
 * con código que ya hacía `const { toast } = useToast()`.
 */
export const useToast = () => ({ toast });
