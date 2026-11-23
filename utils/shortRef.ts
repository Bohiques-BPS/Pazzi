/**
 * Referencia de pago para MOSTRAR o IMPRIMIR (recibos, facturas, listas). La referencia completa se
 * sigue guardando tal cual para conciliar con el proveedor de pago.
 *
 *  - ATH Móvil devuelve "1024199972-8a36d621a208c7d401a208d9db9d0451": el número que ve el cliente
 *    en su app es la primera parte → "1024199972".
 *  - Identificadores largos sin espacios (UUID, hashes de pasarela) → sus últimos 8 caracteres.
 *  - Lo que escribe una persona (núm. de cheque, nota) se deja igual.
 */
export function shortRef(ref?: string | null): string {
    const r = String(ref ?? '').trim();
    if (!r) return '';
    const ath = r.match(/^(\d{6,})-[0-9a-f]{16,}$/i);
    if (ath) return ath[1];
    if (r.length >= 24 && !/\s/.test(r)) return `…${r.slice(-8).toUpperCase()}`;
    return r;
}
