/**
 * Identidad de "terminal" (esta computadora/navegador). No es hardware real (es web): se genera
 * un UUID persistente en localStorage la primera vez y se reutiliza. Sirve para amarrar una caja
 * a una terminal específica. Si el usuario borra los datos del navegador, se genera uno nuevo y
 * el gerente debe volver a asignar la terminal (con PIN).
 */
const KEY = 'pazzi_device_id';

export function getDeviceId(): string {
    try {
        let id = localStorage.getItem(KEY);
        if (!id) {
            id = (typeof crypto !== 'undefined' && (crypto as any).randomUUID)
                ? (crypto as any).randomUUID()
                : `dev_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            localStorage.setItem(KEY, id);
        }
        return id;
    } catch {
        // Modo privado / storage bloqueado: id efímero por sesión de página.
        return `dev_ephemeral_${Math.random().toString(36).slice(2)}`;
    }
}

/** Nombre sugerido para esta terminal (editable por el gerente al asignar). */
export function suggestDeviceName(): string {
    const ua = navigator.userAgent || '';
    const os = /Windows/i.test(ua) ? 'Windows' : /Mac/i.test(ua) ? 'Mac' : /Android/i.test(ua) ? 'Android' : /iPhone|iPad/i.test(ua) ? 'iOS' : 'PC';
    return `Terminal ${os}`;
}
