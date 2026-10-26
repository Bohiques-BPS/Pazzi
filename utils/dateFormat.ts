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

export function setDateFormat(fmt?: string | null, language?: string | null) {
    if (fmt && DATE_FORMATS.some(f => f.key === fmt)) current = fmt as DateFormatKey;
    monthLocale = language === 'en' ? 'en-US' : 'es';
}

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

/** Fecha y hora con el formato elegido (la hora como la muestra el navegador). */
export function formatDateTime(d: Date | string | number): string {
    const x = d instanceof Date ? d : new Date(d);
    if (isNaN(x.getTime())) return '';
    return `${formatDate(x)}, ${nativeTime.call(x)}`;
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
        return args.length === 0 ? formatDateTime(this) : nativeString.apply(this, args as any);
    } as typeof Date.prototype.toLocaleString;
}
