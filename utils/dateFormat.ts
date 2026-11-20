/**
 * Formato de fecha de TODA la web (lo elige el gerente en Configuración → `dateFormat`).
 *
 * La app muestra fechas con `toLocaleDateString()` / `toLocaleString()` en muchos sitios, y eso
 * dependía del idioma del navegador (la tarjeta de un lead decía 22/10/2026 y otra pantalla
 * 10/22/2026). Aquí se intercepta SOLO la llamada SIN argumentos: las que piden algo concreto
 * (`'en-CA'` para fechas internas YYYY-MM-DD, `{ weekday: 'long' }`, `{ month: 'short' }`…)
 * siguen funcionando igual.
 */

export const DATE_FORMATS = [
    { key: 'DD/MM/YYYY', example: '22/10/2026' },
    { key: 'MM/DD/YYYY', example: '10/22/2026' },
    { key: 'YYYY-MM-DD', example: '2026-10-22' },
    { key: 'DD-MM-YYYY', example: '22-10-2026' },
    { key: 'DD MMM YYYY', example: '22 oct 2026' },
    { key: 'MMM DD, YYYY', example: 'Oct 22, 2026' },
] as const;
export type DateFormatKey = typeof DATE_FORMATS[number]['key'];

let current: DateFormatKey = 'DD/MM/YYYY';
let monthLocale = 'es';
// Formato de hora del negocio: 12 h (am/pm) o 24 h (militar). Antes dependía del idioma del
// navegador (un navegador en "Español (España)" mostraba 16:00 y otro 4:00 p. m.).
let hour12 = true;

export function setDateFormat(fmt?: string | null, language?: string | null, timeFormat?: string | null) {
    if (fmt && DATE_FORMATS.some(f => f.key === fmt)) current = fmt as DateFormatKey;
    monthLocale = language === 'en' ? 'en-US' : 'es';
    hour12 = timeFormat !== '24h';
}
const timeLocale = () => (monthLocale === 'en-US' ? 'en-US' : 'es-PR');

const nativeDate = Date.prototype.toLocaleDateString;
const nativeTime = Date.prototype.toLocaleTimeString;

/** Fecha con el formato elegido por el gerente. */
export function formatDate(d: Date | string | number, fmt: DateFormatKey = current): string {
    const x = d instanceof Date ? d : new Date(d);
    if (isNaN(x.getTime())) return '';
    const dd = String(x.getDate()).padStart(2, '0');
    const mm = String(x.getMonth() + 1).padStart(2, '0');
    const yyyy = String(x.getFullYear());
    const mon = () => nativeDate.call(x, monthLocale, { month: 'short' }).replace('.', '');
    switch (fmt) {
        case 'MM/DD/YYYY': return `${mm}/${dd}/${yyyy}`;
        case 'YYYY-MM-DD': return `${yyyy}-${mm}-${dd}`;
        case 'DD-MM-YYYY': return `${dd}-${mm}-${yyyy}`;
        case 'DD MMM YYYY': return `${dd} ${mon()} ${yyyy}`;
        case 'MMM DD, YYYY': { const m = mon(); return `${m.charAt(0).toUpperCase()}${m.slice(1)} ${dd}, ${yyyy}`; }
        default: return `${dd}/${mm}/${yyyy}`;
    }
}

/** Hora con el formato del negocio (12 h / 24 h). */
export function formatTime(d: Date | string | number, withSeconds = true): string {
    const x = d instanceof Date ? d : new Date(d);
    if (isNaN(x.getTime())) return '';
    return nativeTime.call(x, timeLocale(), { hour: hour12 ? 'numeric' : '2-digit', minute: '2-digit', ...(withSeconds ? { second: '2-digit' } : {}), hour12 });
}

/** Fecha y hora con el formato elegido (fecha y hora del negocio). */
export function formatDateTime(d: Date | string | number): string {
    const x = d instanceof Date ? d : new Date(d);
    if (isNaN(x.getTime())) return '';
    return `${formatDate(x)}, ${formatTime(x)}`;
}

/** Opciones con la hora forzada al formato del negocio (si el formato pide hora). */
// timeCall: toLocaleTimeString (siempre lleva hora). En toLocaleString: sin opciones lleva fecha+hora;
// con opciones, solo si piden hora (hour/timeStyle).
function withHourCycle(opts: any, timeCall: boolean): any {
    if (opts && opts.hourCycle != null) return opts; // pidió un ciclo exacto: se respeta
    const hasTime = timeCall || !opts || opts.hour != null || opts.timeStyle != null;
    if (!hasTime) return opts;
    const o = { ...(opts || {}) };
    delete o.hour12;
    if (hour12 && o.hour === '2-digit') o.hour = 'numeric'; // 4:30 p. m. (no 04:30 p. m.)
    return { ...o, hour12 };
}

let installed = false;
/** Hace que `fecha.toLocaleDateString()` / `fecha.toLocaleString()` (sin argumentos) usen el formato elegido. */
export function installDateFormat() {
    if (installed) return;
    installed = true;
    const nativeString = Date.prototype.toLocaleString;
    Date.prototype.toLocaleDateString = function (this: Date, ...args: any[]) {
        return args.length === 0 ? formatDate(this) : nativeDate.apply(this, args as any);
    } as typeof Date.prototype.toLocaleDateString;
    Date.prototype.toLocaleString = function (this: Date, ...args: any[]) {
        if (args.length === 0) return formatDateTime(this);
        // toLocaleString(locale) sin opciones también lleva hora; con opciones, solo si piden hora.
        return nativeString.call(this, args[0], withHourCycle(args[1], false));
    } as typeof Date.prototype.toLocaleString;
    Date.prototype.toLocaleTimeString = function (this: Date, ...args: any[]) {
        if (args.length === 0) return formatTime(this);
        return nativeTime.call(this, args[0], withHourCycle(args[1], true));
    } as typeof Date.prototype.toLocaleTimeString;
}
