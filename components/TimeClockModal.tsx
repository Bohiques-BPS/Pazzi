import React, { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../constants';
import { toast } from '../hooks/useToast';
import { timeclockService, PUNCH_LABELS, type PunchType, type TodayState } from '../services/timeclock';
import { ApiError } from '../services/api';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

const PHASES: PunchType[] = ['IN', 'LUNCH_OUT', 'LUNCH_IN', 'OUT'];
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/**
 * Modal de ponche de asistencia (4 fases del día: Entrada → Salida a almuerzo → Regreso de
 * almuerzo → Salida). La secuencia es obligatoria y no se puede repetir ni editar: solo se
 * muestra el estado del día y el/los botón(es) de la próxima acción permitida.
 */
export const TimeClockModal: React.FC<Props> = ({ isOpen, onClose }) => {
    const [state, setState] = useState<TodayState | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState<PunchType | null>(null);
    const [error, setError] = useState<string | null>(null);

    const load = async () => {
        setLoading(true); setError(null);
        try {
            setState(await timeclockService.selfToday());
        } catch (e: any) {
            setError(e instanceof ApiError ? e.message : 'No se pudo cargar tu ponche.');
            setState(null);
        } finally { setLoading(false); }
    };

    useEffect(() => { if (isOpen) load(); }, [isOpen]);

    const doPunch = async (type: PunchType) => {
        setSaving(type); setError(null);
        try {
            const res = await timeclockService.punchSelf(type);
            toast.success(`${PUNCH_LABELS[type]} registrada a las ${fmtTime(res.punchedAt)}`);
            await load();
        } catch (e: any) {
            // Si el servidor rechazó por secuencia, recargamos para mostrar el estado real.
            setError(e instanceof ApiError ? e.message : 'No se pudo registrar el ponche.');
            await load();
        } finally { setSaving(null); }
    };

    const timeOf = (t: PunchType) => state?.punches.find(p => p.type === t)?.punchedAt;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Ponche de asistencia" size="sm">
            {loading && !state ? (
                <div className="py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">Cargando…</div>
            ) : (
                <div className="space-y-4">
                    {state && (
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center">
                            {state.employeeName} · {state.businessDay}
                        </p>
                    )}

                    {/* Línea de tiempo de las 4 fases del día */}
                    <ul className="space-y-2">
                        {PHASES.map(phase => {
                            const time = timeOf(phase);
                            const done = !!time;
                            const isNext = !!state?.nextActions.includes(phase);
                            return (
                                <li key={phase} className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg border ${done ? 'border-emerald-200 dark:border-emerald-700/50 bg-emerald-50 dark:bg-emerald-900/20' : isNext ? 'border-primary/40 bg-primary/5' : 'border-neutral-200 dark:border-neutral-700'}`}>
                                    <span className="flex items-center gap-2 text-sm">
                                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${done ? 'bg-emerald-500 text-white' : isNext ? 'bg-primary text-white' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-500'}`}>
                                            {done ? '✓' : PHASES.indexOf(phase) + 1}
                                        </span>
                                        <span className={done ? 'text-neutral-700 dark:text-neutral-200' : 'text-neutral-500 dark:text-neutral-400'}>{PUNCH_LABELS[phase]}</span>
                                    </span>
                                    <span className={`text-sm tabular-nums ${done ? 'font-semibold text-neutral-800 dark:text-neutral-100' : 'text-neutral-400'}`}>
                                        {done ? fmtTime(time!) : '—'}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>

                    {error && (
                        <p className="text-sm text-center text-red-600 dark:text-red-400">{error}</p>
                    )}

                    {/* Acción permitida */}
                    {state && (state.complete || state.nextActions.length === 0) ? (
                        <p className="text-sm text-center font-medium text-emerald-600 dark:text-emerald-400">✓ Jornada de hoy completa. ¡Nos vemos mañana!</p>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {state?.nextActions.map(action => (
                                <button
                                    key={action}
                                    type="button"
                                    onClick={() => doPunch(action)}
                                    disabled={!!saving}
                                    className={`${BUTTON_PRIMARY_SM_CLASSES} w-full justify-center disabled:opacity-50`}
                                >
                                    {saving === action ? 'Registrando…' : `Registrar: ${PUNCH_LABELS[action]}`}
                                </button>
                            ))}
                        </div>
                    )}

                    <p className="text-[11px] text-center text-neutral-400">Los ponches no se pueden editar.</p>

                    <div className="flex justify-end">
                        <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>Cerrar</button>
                    </div>
                </div>
            )}
        </Modal>
    );
};
