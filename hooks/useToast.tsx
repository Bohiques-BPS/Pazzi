import React from 'react';
import toastLib, { Toast, ToastOptions } from 'react-hot-toast';

/**
 * API canónica de toasts del proyecto (wrapper sobre react-hot-toast).
 * El botón × para cerrar y la duración (4s) se aplican de forma GLOBAL en el <Toaster> de App.tsx,
 * así que cubren también el código que usa `react-hot-toast` directamente.
 * `toast.undo(msg, onUndo)` agrega además un botón "Deshacer" (para los eliminar).
 */

const DURATION = 4000;

export const toast = {
  success: (message: string, opts?: ToastOptions) => toastLib.success(message, { duration: DURATION, ...opts }),
  error: (message: string, opts?: ToastOptions) => toastLib.error(message, { duration: DURATION, ...opts }),
  warning: (message: string, opts?: ToastOptions) => toastLib(message, { duration: DURATION, icon: '⚠️', ...opts }),
  info: (message: string, opts?: ToastOptions) => toastLib(message, { duration: DURATION, icon: 'ℹ️', ...opts }),

  /**
   * Toast con botón "Deshacer". Devuelve el id (para cerrarlo manualmente si hace falta).
   * El × global lo agrega el <Toaster>; aquí solo renderizamos el mensaje + Deshacer.
   */
  undo: (message: string, onUndo: () => void, opts?: ToastOptions) =>
    toastLib.custom(
      (t: Toast) => (
        <div className="flex items-center gap-3">
          <span className="text-sm text-neutral-800 dark:text-neutral-100">{message}</span>
          <button
            type="button"
            onClick={() => { onUndo(); toastLib.dismiss(t.id); }}
            className="text-sm font-semibold text-primary hover:text-secondary whitespace-nowrap"
          >
            Deshacer
          </button>
        </div>
      ),
      { duration: opts?.duration ?? 5000, ...opts }
    ),

  loading: (message: string) => toastLib.loading(message),
  dismiss: (id?: string) => toastLib.dismiss(id),

  promise: <T,>(
    promise: Promise<T>,
    msgs: { loading: string; success: string | ((data: T) => string); error: string | ((err: any) => string) }
  ) => toastLib.promise(promise, msgs),
};

/** Compat: `const { toast } = useToast()`. */
export const useToast = () => ({ toast });
