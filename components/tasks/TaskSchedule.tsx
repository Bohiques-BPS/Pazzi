import React, { useCallback, useState } from 'react';
import { Modal } from '../Modal';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES, inputFormStyle } from '../../constants';
import { tasksService, type ScheduleCheckResult, type ScheduleClash, type ScheduleMove } from '../../services/tasks';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';
import type { Task } from '../../types';

/**
 * Horario de una tarea (inicio/fin) y aviso de choques con lo que ya tiene el colaborador.
 * El servidor revisa tareas con horario, visitas y seguimientos; si el usuario acepta, las tareas
 * siguientes que chocan se corren en cadena.
 */

/** ISO → valor de <input type="datetime-local"> en la hora del navegador. */
export const isoToLocalDT = (iso?: string | null): string => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
export const localDTToIso = (v: string): string | null => (v ? new Date(v).toISOString() : null);

/** Campos "Empieza" / "Termina". Al poner el inicio sin fin, propone una hora de duración. */
export const TaskScheduleFields: React.FC<{
    start: string; end: string;
    onChange: (start: string, end: string) => void;
    labelClassName?: string;
}> = ({ start, end, onChange, labelClassName = 'block text-sm font-medium text-neutral-700 dark:text-neutral-300' }) => {
    const invalid = !!start && !!end && new Date(end) <= new Date(start);
    const setStart = (v: string) => {
        if (!v) return onChange('', end);
        if (!end && v) {
            const e = new Date(v); e.setHours(e.getHours() + 1);
            return onChange(v, isoToLocalDT(e.toISOString()));
        }
        // Si se mueve el inicio, el fin conserva la duración.
        if (start && end && new Date(end) > new Date(start)) {
            const dur = new Date(end).getTime() - new Date(start).getTime();
            return onChange(v, isoToLocalDT(new Date(new Date(v).getTime() + dur).toISOString()));
        }
        onChange(v, end);
    };
    return (
        <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <label className={labelClassName}>Empieza <span className="text-neutral-400 font-normal">(opcional)</span></label>
                    <input type="datetime-local" value={start} onChange={e => setStart(e.target.value)} className={inputFormStyle} />
                </div>
                <div>
                    <label className={labelClassName}>Termina</label>
                    <input type="datetime-local" value={end} min={start || undefined} onChange={e => onChange(start, e.target.value)} className={inputFormStyle} />
                </div>
            </div>
            {invalid && <p className="text-xs text-red-600 dark:text-red-400 mt-1">La hora de fin debe ser después de la de inicio.</p>}
            {(start || end) && (
                <button type="button" onClick={() => onChange('', '')} className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1">Quitar horario</button>
            )}
        </div>
    );
};

const fmtDay = (d: Date) => d.toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' });
const fmtTime = (d: Date) => d.toLocaleTimeString('es', { hour: 'numeric', minute: '2-digit' });
const fmtRange = (s: string, e: string) => {
    const a = new Date(s), b = new Date(e);
    return a.toDateString() === b.toDateString()
        ? `${fmtDay(a)}, ${fmtTime(a)} – ${fmtTime(b)}`
        : `${fmtDay(a)} ${fmtTime(a)} – ${fmtDay(b)} ${fmtTime(b)}`;
};
const KIND: Record<ScheduleClash['kind'], string> = { task: 'Tarea', visit: 'Visita', meeting: 'Seguimiento' };

const ClashRow: React.FC<{ c: ScheduleClash }> = ({ c }) => (
    <li className="py-2">
        <div className="text-sm text-neutral-800 dark:text-neutral-100">
            <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mr-2">{KIND[c.kind]}</span>
            {c.title}{c.projectName && <span className="text-neutral-500 dark:text-neutral-400"> · {c.projectName}</span>}
        </div>
        <div className="text-xs text-neutral-500 dark:text-neutral-400">{fmtRange(c.start, c.end)}{c.userNames.length ? ` · ${c.userNames.join(', ')}` : ''}</div>
    </li>
);

type Decision = 'shift' | 'keep' | null;

const ScheduleConflictModal: React.FC<{ result: ScheduleCheckResult; onDecide: (d: Decision) => void }> = ({ result, onDecide }) => {
    const { conflicts, moves, blocked } = result;
    return (
        <Modal
            isOpen
            onClose={() => onDecide(null)}
            title="Choque de horario"
            size="lg"
            footer={
                <div className="flex flex-wrap justify-end gap-2">
                    <button type="button" onClick={() => onDecide(null)} className={BUTTON_SECONDARY_SM_CLASSES}>Volver</button>
                    <button type="button" onClick={() => onDecide('keep')} className={BUTTON_SECONDARY_SM_CLASSES}>Guardar sin mover</button>
                    {moves.length > 0 && (
                        <button type="button" onClick={() => onDecide('shift')} className={BUTTON_PRIMARY_SM_CLASSES}>
                            Correr {moves.length === 1 ? '1 tarea' : `${moves.length} tareas`} y guardar
                        </button>
                    )}
                </div>
            }
        >
            <div className="space-y-4 text-neutral-700 dark:text-neutral-200">
                {conflicts.length > 0 && (
                    <div>
                        <p className="text-sm font-medium">Este horario choca con:</p>
                        <ul className="divide-y divide-neutral-200 dark:divide-neutral-700">{conflicts.map(c => <ClashRow key={c.kind + c.id} c={c} />)}</ul>
                    </div>
                )}
                {moves.length > 0 && (
                    <div>
                        <p className="text-sm font-medium">Si aceptas, estas tareas se corren en cadena (misma duración):</p>
                        <ul className="divide-y divide-neutral-200 dark:divide-neutral-700">
                            {moves.map((m: ScheduleMove) => (
                                <li key={m.taskId} className="py-2">
                                    <div className="text-sm text-neutral-800 dark:text-neutral-100">{m.title}{m.projectName && <span className="text-neutral-500 dark:text-neutral-400"> · {m.projectName}</span>}</div>
                                    <div className="text-xs text-neutral-500 dark:text-neutral-400">
                                        <span className="line-through">{fmtRange(m.from.start, m.from.end)}</span>
                                        <span className="mx-1">→</span>
                                        <span className="text-primary font-medium">{fmtRange(m.to.start, m.to.end)}</span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                {blocked.length > 0 && (
                    <div className="rounded-md border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-3">
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Esto no se mueve solo (visitas, seguimientos o tareas que empiezan antes); revísalo a mano:</p>
                        <ul className="divide-y divide-amber-200 dark:divide-amber-800">{blocked.map(c => <ClashRow key={c.kind + c.id} c={c} />)}</ul>
                    </div>
                )}
            </div>
        </Modal>
    );
};

/**
 * Antes de guardar: revisa el horario y, si choca, pregunta. Devuelve
 * 'keep' (guardar sin mover), 'shift' (guardar y correr las siguientes) o null (no guardar).
 */
export function useScheduleGuard() {
    const [pending, setPending] = useState<{ result: ScheduleCheckResult; resolve: (d: Decision) => void } | null>(null);

    const guard = useCallback(async (args: { taskId?: string; title?: string; startAt: string | null; endAt: string | null; userIds: string[] }): Promise<Decision> => {
        if (!args.startAt || !args.endAt || !args.userIds.length) return 'keep';
        let result: ScheduleCheckResult;
        try {
            result = await tasksService.scheduleCheck({ taskId: args.taskId, title: args.title, startAt: args.startAt, endAt: args.endAt, userIds: args.userIds });
        } catch (err) {
            if (err instanceof ApiError && err.status === 400) { toast.error(err.message); return null; }
            return 'keep'; // si la revisión falla, no se bloquea el guardado
        }
        if (!result.conflicts.length && !result.blocked.length && !result.moves.length) return 'keep';
        return new Promise<Decision>(resolve => setPending({ result, resolve }));
    }, []);

    const modal = pending ? (
        <ScheduleConflictModal result={pending.result} onDecide={d => { pending.resolve(d); setPending(null); }} />
    ) : null;

    return { guard, modal };
}

/** Refleja en la lista local las tareas que el servidor corrió. */
export function applyScheduleMoves(setTasks: React.Dispatch<React.SetStateAction<Task[]>>, moves?: ScheduleMove[] | null) {
    if (!moves?.length) return;
    const byId = new Map(moves.map(m => [m.taskId, m]));
    setTasks(prev => prev.map(t => {
        const m = byId.get(t.id);
        return m ? { ...t, startAt: m.to.start, endAt: m.to.end } as Task : t;
    }));
    toast.success(moves.length === 1 ? `Se corrió el horario de "${moves[0].title}".` : `Se corrió el horario de ${moves.length} tareas.`);
}

/** Texto corto del horario para tarjetas y listas ("jue 12 nov, 2:00 p. m. – 5:00 p. m."). */
export const taskScheduleLabel = (t: { startAt?: string | null; endAt?: string | null }): string | null =>
    t.startAt && t.endAt ? fmtRange(t.startAt, t.endAt) : null;
