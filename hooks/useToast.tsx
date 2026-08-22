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
      // toastLib.custom NO trae contenedor/estilo propio (ni el × global del ToastBar), por eso hay
      // que dibujar aquí el fondo, sombra, padding y pointer-events para que se vea y sea clicable.
      (t: Toast) => (
        <div
          className={`pointer-events-auto flex items-center gap-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-lg rounded-lg px-4 py-3 max-w-sm transition-all ${t.visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}
          role="status"
        >
          <span className="text-sm text-neutral-800 dark:text-neutral-100">{message}</span>
          <button
            type="button"
            onClick={() => { onUndo(); toastLib.dismiss(t.id); }}
            className="text-sm font-semibold text-primary hover:text-secondary whitespace-nowrap"
          >
            Deshacer
          </button>
          <button
            type="button"
            onClick={() => toastLib.dismiss(t.id)}
            aria-label="Cerrar"
            className="ml-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 text-lg leading-none"
          >
            ×
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
