import { useCallback } from 'react';

/**
 * Hook para gestionar notificaciones (Toasts).
 * Esta implementación emite eventos personalizados que pueden ser capturados
 * por un componente de UI global para mostrar las alertas.
 */
export const useToast = () => {
    const success = useCallback((message: string) => {
        window.dispatchEvent(new CustomEvent('pazzi-toast', { detail: { type: 'success', message } }));
    }, []);

    const error = useCallback((message: string) => {
        window.dispatchEvent(new CustomEvent('pazzi-toast', { detail: { type: 'error', message } }));
    }, []);

    return { toast: { success, error } };
};
