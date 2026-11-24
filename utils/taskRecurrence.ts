/** Regla de repetición de una tarea (igual que en el backend: utils/taskRecurrence.ts). */
export interface TaskRecurrence {
    freq: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    weekdays?: number[];   // 0 = domingo … 6 = sábado
    monthDays?: number[];  // 1–31
    yearDates?: string[];  // "MM-DD"
    until?: string | null; // YYYY-MM-DD
    mode?: 'on_complete' | 'schedule';
    start?: string;
}

export const WEEKDAY_SHORT = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
export const WEEKDAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
export const MONTH_NAMES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** Regla por defecto según la fecha de la tarea (o hoy). */
export function defaultRecurrence(freq: TaskRecurrence['freq'], dateStr?: string): TaskRecurrence {
    const d = dateStr ? new Date(dateStr + 'T12:00:00') : new Date();
    const base: TaskRecurrence = { freq, interval: 1, mode: 'on_complete' };
    if (freq === 'weekly') base.weekdays = [d.getDay()];
    if (freq === 'monthly') base.monthDays = [d.getDate()];
    if (freq === 'yearly') base.yearDates = [`${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`];
    return base;
}

const list = (xs: string[]) => xs.length <= 1 ? (xs[0] || '') : `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}`;

/** Texto corto: "3 veces por semana (lunes, miércoles y viernes)". */
export function describeRecurrence(r?: TaskRecurrence | null): string {
    if (!r || !r.freq) return '';
    const n = Math.max(1, r.interval || 1);
    let s = '';
    if (r.freq === 'daily') s = n === 1 ? 'Todos los días' : `Cada ${n} días`;
    if (r.freq === 'weekly') {
        const days = (r.weekdays || []).map(d => WEEKDAY_NAMES[d]);
        const every = n === 1 ? 'por semana' : `cada ${n} semanas`;
        s = days.length > 1 ? `${days.length} veces ${every} (${list(days)})` : `${n === 1 ? 'Cada semana' : `Cada ${n} semanas`}${days.length ? ` (${days[0]})` : ''}`;
    }
    if (r.freq === 'monthly') {
        const days = (r.monthDays || []).map(String);
        const every = n === 1 ? 'al mes' : `cada ${n} meses`;
        s = days.length > 1 ? `${days.length} veces ${every} (días ${list(days)})` : `${n === 1 ? 'Cada mes' : `Cada ${n} meses`}${days.length ? `, el día ${days[0]}` : ''}`;
    }
    if (r.freq === 'yearly') {
        const dates = (r.yearDates || []).map(md => { const [m, d] = md.split('-').map(Number); return `${d} de ${MONTH_NAMES[m - 1]}`; });
        const every = n === 1 ? 'al año' : `cada ${n} años`;
        s = dates.length > 1 ? `${dates.length} veces ${every} (${list(dates)})` : `${n === 1 ? 'Cada año' : `Cada ${n} años`}${dates.length ? `, el ${dates[0]}` : ''}`;
    }
    if (r.until) s += ` · hasta el ${new Date(r.until + 'T12:00:00').toLocaleDateString()}`;
    return s;
}
