import React, { useState } from 'react';
import { ArrowPathIcon } from '../icons';
import { TaskRecurrence, defaultRecurrence, describeRecurrence, WEEKDAY_SHORT, WEEKDAY_NAMES, MONTH_NAMES } from '../../utils/taskRecurrence';

/**
 * "Repetir esta tarea": diario, X veces por semana (días), X veces por mes (días del mes) o
 * X veces al año (fechas). Cada repetición es una tarea nueva que se crea al completar la actual
 * (o, si se elige, sola al llegar su fecha).
 */
const FREQS: { id: TaskRecurrence['freq']; label: string }[] = [
    { id: 'daily', label: 'Diario' },
    { id: 'weekly', label: 'Semanal' },
    { id: 'monthly', label: 'Mensual' },
    { id: 'yearly', label: 'Anual' },
];
const UNIT: Record<TaskRecurrence['freq'], [string, string]> = {
    daily: ['día', 'días'], weekly: ['semana', 'semanas'], monthly: ['mes', 'meses'], yearly: ['año', 'años'],
};
// Campo compacto (todos los controles del bloque con la misma altura).
const FIELD = 'h-9 rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-sm px-2.5 text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary';
const SUBLABEL = 'block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5';

export const TaskRecurrenceFields: React.FC<{
    value: TaskRecurrence | null;
    onChange: (r: TaskRecurrence | null) => void;
    /** Fecha límite de la tarea (YYYY-MM-DD): base de la regla. */
    dueDate?: string;
    /** Si la tarea no tiene fecha al activar, se pone hoy (la repetición se calcula desde ella). */
    onNeedDate?: (ymd: string) => void;
}> = ({ value, onChange, dueDate, onNeedDate }) => {
    const on = !!value;
    const r = value || defaultRecurrence('weekly', dueDate);
    const set = (patch: Partial<TaskRecurrence>) => onChange({ ...r, ...patch });
    const [yMonth, setYMonth] = useState(1);
    const [yDay, setYDay] = useState(1);

    const toggle = (checked: boolean) => {
        if (!checked) { onChange(null); return; }
        if (!dueDate && onNeedDate) {
            const t = new Date();
            onNeedDate(`${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`);
        }
        onChange(defaultRecurrence('weekly', dueDate));
    };
    const toggleNum = (key: 'weekdays' | 'monthDays', n: number) => {
        const cur = r[key] || [];
        const next = cur.includes(n) ? cur.filter(x => x !== n) : [...cur, n].sort((a, b) => a - b);
        if (next.length) set({ [key]: next } as any);
    };
    const dayBtn = (active: boolean) => `flex items-center justify-center rounded-full text-xs font-semibold transition select-none ${active
        ? 'bg-primary text-white shadow-sm'
        : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300 hover:bg-primary/10 hover:text-primary'}`;
    const modeCard = (active: boolean) => `flex-1 text-left rounded-lg border p-2.5 transition ${active
        ? 'border-primary bg-primary/5 dark:bg-primary/10'
        : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'}`;

    return (
        <div className={`rounded-lg border transition ${on ? 'border-primary/40 dark:border-primary/50' : 'border-neutral-200 dark:border-neutral-700'}`}>
            {/* Encabezado: interruptor + resumen */}
            <label className="flex items-center gap-3 px-3 py-2.5 cursor-pointer">
                <span className={`flex h-8 w-8 items-center justify-center rounded-md ${on ? 'bg-primary/10 text-primary' : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-400'}`}>
                    <ArrowPathIcon className="w-4 h-4" />
                </span>
                <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium text-neutral-700 dark:text-neutral-200">Repetir esta tarea</span>
                    <span className="block text-xs text-neutral-500 dark:text-neutral-400 truncate">
                        {on ? describeRecurrence(r) : 'Diario, semanal, mensual o anual'}
                    </span>
                </span>
                {/* Interruptor */}
                <input type="checkbox" checked={on} onChange={e => toggle(e.target.checked)} className="sr-only peer" />
                <span aria-hidden className={`relative h-5 w-9 flex-shrink-0 rounded-full transition ${on ? 'bg-primary' : 'bg-neutral-300 dark:bg-neutral-600'} peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40`}>
                    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${on ? 'left-[18px]' : 'left-0.5'}`} />
                </span>
            </label>

            {on && (
                <div className="border-t border-neutral-200 dark:border-neutral-700 px-3 py-3 space-y-4">
                    {/* Frecuencia + cada N */}
                    <div className="flex flex-wrap items-end gap-3">
                        <div>
                            <span className={SUBLABEL}>Frecuencia</span>
                            <div className="inline-flex rounded-md bg-neutral-100 dark:bg-neutral-900 p-0.5">
                                {FREQS.map(f => (
                                    <button key={f.id} type="button"
                                        onClick={() => f.id !== r.freq && onChange({ ...defaultRecurrence(f.id, dueDate), mode: r.mode, until: r.until, interval: 1 })}
                                        className={`h-8 px-3 rounded text-sm font-medium transition ${r.freq === f.id
                                            ? 'bg-white dark:bg-neutral-700 text-primary shadow-sm'
                                            : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-800 dark:hover:text-neutral-100'}`}>
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <span className={SUBLABEL}>Cada</span>
                            <div className="flex items-center gap-2">
                                <input type="number" min={1} max={365} value={r.interval}
                                    onChange={e => set({ interval: Math.max(1, Math.min(365, parseInt(e.target.value) || 1)) })}
                                    className={`${FIELD} w-16 text-center`} />
                                <span className="text-sm text-neutral-600 dark:text-neutral-300">{r.interval === 1 ? UNIT[r.freq][0] : UNIT[r.freq][1]}</span>
                            </div>
                        </div>
                    </div>

                    {r.freq === 'weekly' && (
                        <div>
                            <span className={SUBLABEL}>Días de la semana</span>
                            <div className="flex flex-wrap gap-1.5">
                                {WEEKDAY_SHORT.map((d, i) => (
                                    <button key={i} type="button" title={WEEKDAY_NAMES[i]} aria-pressed={(r.weekdays || []).includes(i)}
                                        onClick={() => toggleNum('weekdays', i)} className={`${dayBtn((r.weekdays || []).includes(i))} h-9 w-9`}>{d}</button>
                                ))}
                            </div>
                        </div>
                    )}

                    {r.freq === 'monthly' && (
                        <div>
                            <span className={SUBLABEL}>Días del mes <span className="font-normal text-neutral-400">· si el mes no tiene ese día, cae el último</span></span>
                            <div className="grid grid-cols-7 gap-1 w-fit">
                                {Array.from({ length: 31 }, (_, i) => i + 1).map(n => (
                                    <button key={n} type="button" aria-pressed={(r.monthDays || []).includes(n)}
                                        onClick={() => toggleNum('monthDays', n)} className={`${dayBtn((r.monthDays || []).includes(n))} h-8 w-8`}>{n}</button>
                                ))}
                            </div>
                        </div>
                    )}

                    {r.freq === 'yearly' && (
                        <div>
                            <span className={SUBLABEL}>Fechas del año</span>
                            <div className="flex flex-wrap gap-1.5 mb-2">
                                {(r.yearDates || []).map(md => {
                                    const [m, d] = md.split('-').map(Number);
                                    return (
                                        <span key={md} className="inline-flex items-center gap-1.5 h-7 pl-2.5 pr-1.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                            {d} de {MONTH_NAMES[m - 1]}
                                            {(r.yearDates || []).length > 1 && (
                                                <button type="button" onClick={() => set({ yearDates: (r.yearDates || []).filter(x => x !== md) })}
                                                    className="h-4 w-4 rounded-full flex items-center justify-center hover:bg-primary/20" aria-label="Quitar fecha">×</button>
                                            )}
                                        </span>
                                    );
                                })}
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <select value={yDay} onChange={e => setYDay(Number(e.target.value))} className={`${FIELD} w-16`}>
                                    {Array.from({ length: 31 }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}</option>)}
                                </select>
                                <select value={yMonth} onChange={e => setYMonth(Number(e.target.value))} className={`${FIELD} w-36`}>
                                    {MONTH_NAMES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                                </select>
                                <button type="button" onClick={() => {
                                    const md = `${String(yMonth).padStart(2, '0')}-${String(yDay).padStart(2, '0')}`;
                                    if (!(r.yearDates || []).includes(md)) set({ yearDates: [...(r.yearDates || []), md].sort() });
                                }} className="h-9 px-3 rounded-md text-sm font-medium text-primary hover:bg-primary/10">Agregar fecha</button>
                            </div>
                        </div>
                    )}

                    {/* Fin */}
                    <div>
                        <span className={SUBLABEL}>Termina</span>
                        <div className="flex flex-wrap items-center gap-2">
                            <input type="date" value={r.until || ''} onChange={e => set({ until: e.target.value || null })} className={`${FIELD} w-44`} />
                            {r.until
                                ? <button type="button" onClick={() => set({ until: null })} className="h-9 px-3 rounded-md text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700" title="Quitar la fecha de fin (se repite sin fin)">Limpiar</button>
                                : <span className="text-xs text-neutral-400">Nunca (déjalo vacío)</span>}
                        </div>
                    </div>

                    {/* Cuándo se crea la siguiente */}
                    <div>
                        <span className={SUBLABEL}>Cuándo aparece la siguiente</span>
                        <div className="flex flex-col sm:flex-row gap-2">
                            {([
                                ['on_complete', 'Al completar esta', 'Al pasarla a la última columna sale la próxima con su fecha.'],
                                ['schedule', 'Sola en su fecha', 'Se crea cuando llega la fecha, aunque esta no esté completada.'],
                            ] as const).map(([id, title, desc]) => {
                                const active = (r.mode || 'on_complete') === id;
                                return (
                                    <button key={id} type="button" onClick={() => set({ mode: id })} className={modeCard(active)} aria-pressed={active}>
                                        <span className="flex items-center gap-2 text-sm font-medium text-neutral-800 dark:text-neutral-100">
                                            <span className={`h-3.5 w-3.5 rounded-full border-2 flex-shrink-0 ${active ? 'border-primary bg-primary shadow-[inset_0_0_0_2px_white] dark:shadow-[inset_0_0_0_2px_rgb(38,38,38)]' : 'border-neutral-300 dark:border-neutral-500'}`} />
                                            {title}
                                        </span>
                                        <span className="block text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 pl-[22px]">{desc}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
