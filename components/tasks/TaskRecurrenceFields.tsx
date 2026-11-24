import React, { useState } from 'react';
import { inputFormStyle } from '../../constants';
import { TaskRecurrence, defaultRecurrence, describeRecurrence, WEEKDAY_SHORT, WEEKDAY_NAMES, MONTH_NAMES } from '../../utils/taskRecurrence';

/**
 * "Repetir esta tarea": diario, X veces por semana (días), X veces por mes (días del mes) o
 * X veces al año (fechas). Cada repetición es una tarea nueva que se crea al completar la actual
 * (o, si se elige, sola al llegar su fecha).
 */
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
    const unit = { daily: ['día', 'días'], weekly: ['semana', 'semanas'], monthly: ['mes', 'meses'], yearly: ['año', 'años'] }[r.freq];
    const chip = (active: boolean) => `h-8 min-w-[2rem] px-1.5 rounded-md text-xs font-semibold border transition ${active
        ? 'bg-primary text-white border-primary'
        : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300 border-neutral-300 dark:border-neutral-600 hover:border-primary'}`;

    return (
        <div className="rounded-md border border-neutral-200 dark:border-neutral-700 p-3">
            <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-200 cursor-pointer">
                <input type="checkbox" checked={on} onChange={e => toggle(e.target.checked)} className="h-4 w-4" />
                🔁 Repetir esta tarea
            </label>
            {on && (
                <div className="mt-3 space-y-3">
                    <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-700 dark:text-neutral-200">
                        <select value={r.freq} onChange={e => onChange({ ...defaultRecurrence(e.target.value as any, dueDate), mode: r.mode, until: r.until, interval: 1 })} className={inputFormStyle + ' !w-auto'}>
                            <option value="daily">Diario</option>
                            <option value="weekly">Semanal</option>
                            <option value="monthly">Mensual</option>
                            <option value="yearly">Anual</option>
                        </select>
                        <span>cada</span>
                        <input type="number" min={1} max={365} value={r.interval} onChange={e => set({ interval: Math.max(1, Math.min(365, parseInt(e.target.value) || 1)) })} className={inputFormStyle + ' !w-20'} />
                        <span>{r.interval === 1 ? unit[0] : unit[1]}</span>
                    </div>

                    {r.freq === 'weekly' && (
                        <div>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Qué días de la semana</p>
                            <div className="flex flex-wrap gap-1">
                                {WEEKDAY_SHORT.map((d, i) => (
                                    <button key={i} type="button" title={WEEKDAY_NAMES[i]} onClick={() => toggleNum('weekdays', i)} className={chip((r.weekdays || []).includes(i))}>{d}</button>
                                ))}
                            </div>
                        </div>
                    )}

                    {r.freq === 'monthly' && (
                        <div>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Qué días del mes <span className="text-neutral-400">(si el mes no tiene ese día, cae el último)</span></p>
                            <div className="grid grid-cols-7 gap-1 max-w-xs">
                                {Array.from({ length: 31 }, (_, i) => i + 1).map(n => (
                                    <button key={n} type="button" onClick={() => toggleNum('monthDays', n)} className={chip((r.monthDays || []).includes(n))}>{n}</button>
                                ))}
                            </div>
                        </div>
                    )}

                    {r.freq === 'yearly' && (
                        <div>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Qué fechas del año</p>
                            <div className="flex flex-wrap gap-1 mb-2">
                                {(r.yearDates || []).map(md => {
                                    const [m, d] = md.split('-').map(Number);
                                    return (
                                        <span key={md} className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md bg-primary/10 text-primary">
                                            {d} de {MONTH_NAMES[m - 1]}
                                            {(r.yearDates || []).length > 1 && (
                                                <button type="button" onClick={() => set({ yearDates: (r.yearDates || []).filter(x => x !== md) })} className="hover:text-red-600" aria-label="Quitar">×</button>
                                            )}
                                        </span>
                                    );
                                })}
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <select value={yDay} onChange={e => setYDay(Number(e.target.value))} className={inputFormStyle + ' !w-auto'}>
                                    {Array.from({ length: 31 }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}</option>)}
                                </select>
                                <select value={yMonth} onChange={e => setYMonth(Number(e.target.value))} className={inputFormStyle + ' !w-auto'}>
                                    {MONTH_NAMES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                                </select>
                                <button type="button" onClick={() => {
                                    const md = `${String(yMonth).padStart(2, '0')}-${String(yDay).padStart(2, '0')}`;
                                    if (!(r.yearDates || []).includes(md)) set({ yearDates: [...(r.yearDates || []), md].sort() });
                                }} className="text-sm font-medium text-primary hover:underline">+ Agregar fecha</button>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-700 dark:text-neutral-200">
                        <span>Hasta</span>
                        <input type="date" value={r.until || ''} onChange={e => set({ until: e.target.value || null })} className={inputFormStyle + ' !w-auto'} />
                        {!r.until && <span className="text-xs text-neutral-400">(sin fecha de fin)</span>}
                    </div>

                    <div className="space-y-1 text-sm text-neutral-700 dark:text-neutral-200">
                        <label className="flex items-start gap-2 cursor-pointer">
                            <input type="radio" checked={(r.mode || 'on_complete') === 'on_complete'} onChange={() => set({ mode: 'on_complete' })} className="mt-1" />
                            <span>Crear la siguiente al completar esta <span className="block text-xs text-neutral-500 dark:text-neutral-400">Cuando la pases a la última columna, aparece la próxima con su fecha.</span></span>
                        </label>
                        <label className="flex items-start gap-2 cursor-pointer">
                            <input type="radio" checked={r.mode === 'schedule'} onChange={() => set({ mode: 'schedule' })} className="mt-1" />
                            <span>Crear la siguiente sola cuando llegue su fecha <span className="block text-xs text-neutral-500 dark:text-neutral-400">Aunque esta no se haya completado.</span></span>
                        </label>
                    </div>

                    <p className="text-xs font-medium text-primary">{describeRecurrence(r)}</p>
                </div>
            )}
        </div>
    );
};
