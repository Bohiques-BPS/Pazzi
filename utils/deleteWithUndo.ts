import { toast } from '../hooks/useToast';

interface DeleteWithUndoOpts {
    /** Etiqueta para el toast, p.ej. "Cliente", "Producto". */
    label: string;
    /** Quita el ítem de la UI de inmediato (optimista). */
    optimisticRemove: () => void;
    /** Restaura el ítem en la UI si se pulsa "Deshacer" o si la API falla. */
    restore: () => void;
    /** Llamada real de borrado al backend (se ejecuta si NO se deshace). */
    apiDelete: () => Promise<unknown>;
    /** Se llama tras un borrado confirmado (no deshecho). */
    onDeleted?: () => void;
    /** Mensaje de error si la API falla. */
    errorMessage?: string;
    /** Segundos antes de confirmar el borrado (default 5). */
    seconds?: number;
}

/**
 * Borrado con opción de DESHACER:
 * 1) Quita el ítem de la UI de inmediato y muestra un toast "… eliminado — Deshacer".
 * 2) Si el usuario pulsa Deshacer (o cierra la app) antes de que expire, NO se borra en el backend
 *    y se restaura en la UI.
 * 3) Si no, al expirar se ejecuta el borrado real en el backend.
 */
export function deleteWithUndo(opts: DeleteWithUndoOpts): void {
    const { label, optimisticRemove, restore, apiDelete, onDeleted, errorMessage, seconds = 5 } = opts;

    optimisticRemove();
    let undone = false;

    const commit = async () => {
        if (undone) return;
        try {
            await apiDelete();
            onDeleted?.();
        } catch (err: any) {
            restore();
            toast.error(errorMessage || err?.message || `No se pudo eliminar ${label.toLowerCase()}.`);
        }
    };

    const timer = setTimeout(commit, seconds * 1000);

    toast.undo(`${label} eliminado`, () => {
        undone = true;
        clearTimeout(timer);
        restore();
    }, { duration: seconds * 1000 });
}
