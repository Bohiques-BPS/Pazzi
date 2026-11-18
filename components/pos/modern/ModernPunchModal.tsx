import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal } from '../../Modal';
import { timeclockService, type PunchType, type TodayState } from '../../../services/timeclock';
import { ApiError } from '../../../services/api';

/**
 * Ponche de empleado (caja MODERNA, F9). Cada empleado se identifica SOLO con su PIN personal
 * (teclado numérico); no se muestra la lista de empleados ni quién está dentro o fuera.
 *  1) PIN → 2) "Hola, Belys" con su último registro y solo las acciones que le tocan
 *  (Entrada, Iniciar descanso, Terminar descanso, Salida) → 3) confirmación con nombre y hora.
 * Las horas y la nómina se calculan en Asistencia; aquí solo se registra la hora exacta.
 */

const LABEL: Record<PunchType, string> = { IN: 'Entrada', LUNCH_OUT: 'Iniciar descanso', LUNCH_IN: 'Terminar descanso', OUT: 'Salida' };
const PAST: Record<PunchType, string> = { IN: 'Entrada', LUNCH_OUT: 'Inicio de descanso', LUNCH_IN: 'Fin de descanso', OUT: 'Salida' };
const DONE: Record<PunchType, string> = { IN: 'Entrada registrada', LUNCH_OUT: 'Inicio de descanso registrado', LUNCH_IN: 'Fin de descanso registrado', OUT: 'Salida registrada' };
const ORDER: PunchType[] = ['IN', 'LUNCH_OUT', 'LUNCH_IN', 'OUT'];
const fmtTime = (d: Date | string) => new Date(d).toLocaleTimeString('es-PR', { hour: 'numeric', minute: '2-digit', hour12: true });
const AUTO_CLOSE_S = 10;

type Step = 'pin' | 'actions' | 'done';

export const ModernPunchModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const [step, setStep] = useState<Step>('pin');
    const [pin, setPin] = useState('');
    const [identifier, setIdentifier] = useState('');
    const [needId, setNeedId] = useState(false);
    const [state, setState] = useState<(TodayState & { firstName: string }) | null>(null);
    const [done, setDone] = useState<{ type: PunchType; at: string; name: string } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [now, setNow] = useState(new Date());
    const [left, setLeft] = useState(AUTO_CLOSE_S);
    const idRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!isOpen) return;
        setStep('pin'); setPin(''); setIdentifier(''); setNeedId(false); setState(null); setDone(null); setError(null); setBusy(false);
        setNow(new Date());
        const t = window.setInterval(() => setNow(new Date()), 15000);
        return () => window.clearInterval(t);
    }, [isOpen]);

    // Pasos 2 y 3 se cierran solos (para no dejar la sesión de otro empleado abierta en la caja).
    useEffect(() => {
        if (!isOpen || step === 'pin') return;
        setLeft(step === 'done' ? 4 : AUTO_CLOSE_S);
        const t = window.setInterval(() => setLeft(s => {
            if (s <= 1) { window.clearInterval(t); onClose(); return 0; }
            return s - 1;
        }), 1000);
        return () => window.clearInterval(t);
    }, [isOpen, step]); // eslint-disable-line react-hooks/exhaustive-deps

    const lookup = useCallback(async () => {
        if (busy) return;
        if (pin.length < 3) { setError('Escriba su PIN.'); return; }
        setBusy(true); setError(null);
        try {
            const r = await timeclockService.state(pin, identifier.trim() || undefined);
            setState(r); setStep('actions');
        } catch (err) {
            if (err instanceof ApiError && (err as any).code === 'NEED_IDENTIFIER') {
                setNeedId(true); setError('Hay más de un empleado con ese PIN. Escriba su nombre o número de empleado.');
                setTimeout(() => idRef.current?.focus(), 50);
            } else {
                setError(err instanceof ApiError ? err.message : 'No se pudo verificar el PIN.');
                setPin('');
            }
        } finally { setBusy(false); }
    }, [pin, identifier, busy]);

    const punch = async (type: PunchType) => {
        if (busy) return;
        setBusy(true); setError(null);
        try {
            const r = await timeclockService.punch(identifier.trim(), pin, type);
            setDone({ type: r.type, at: r.punchedAt, name: state?.firstName || r.employeeName });
            setStep('done');
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'No se pudo registrar el ponche.');
        } finally { setBusy(false); }
    };

    const press = (k: string) => {
        setError(null);
        if (k === 'back') setPin(p => p.slice(0, -1));
        else if (k === 'ok') lookup();
        else setPin(p => (p.length < 8 ? p + k : p));
    };

    // Teclado físico en el paso del PIN.
    useEffect(() => {
        if (!isOpen || step !== 'pin') return;
        const h = (e: KeyboardEvent) => {
            if ((e.target as HTMLElement)?.tagName === 'INPUT') return; // escribiendo el nombre
            if (/^\d$/.test(e.key)) { e.preventDefault(); press(e.key); }
            else if (e.key === 'Backspace') { e.preventDefault(); press('back'); }
            else if (e.key === 'Enter') { e.preventDefault(); press('ok'); }
        };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [isOpen, step, lookup]); // eslint-disable-line react-hooks/exhaustive-deps

    const last = state?.punches?.[state.punches.length - 1];
    const dateLabel = (() => { const d = now.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'short' }); return d.charAt(0).toUpperCase() + d.slice(1); })();

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Ponche de empleado (F9)" size="md">
            <p className="text-sm text-neutral-600 dark:text-neutral-300 -mt-2 mb-4">Registre su entrada, descanso o salida.</p>

            {step === 'pin' && (
                <div className="flex flex-col items-center">
                    <div className="text-5xl font-extrabold tabular-nums tracking-tight">{fmtTime(now)}</div>
                    <div className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">{dateLabel} · Escriba su PIN personal</div>
                    <div className="flex gap-3 my-5" aria-label={`${pin.length} dígitos escritos`}>
                        {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
                            <span key={i} className={`w-3.5 h-3.5 rounded-full ${i < pin.length ? 'bg-neutral-900 dark:bg-white' : 'ring-2 ring-inset ring-neutral-300 dark:ring-neutral-600'}`} />
                        ))}
                    </div>
                    {needId && (
                        <input ref={idRef} value={identifier} onChange={e => setIdentifier(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); lookup(); } }}
                            placeholder="Nombre o número de empleado" className="w-full max-w-xs h-11 px-3 mb-4 rounded-lg ring-1 ring-inset ring-neutral-300 dark:ring-neutral-700 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary" />
                    )}
                    <div className="grid grid-cols-3 gap-2.5 w-full max-w-xs">
                        {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'back', '0', 'ok'].map(k => (
                            <button key={k} type="button" onClick={() => press(k)} disabled={busy}
                                aria-label={k === 'back' ? 'Borrar' : k === 'ok' ? 'Continuar' : k}
                                className={`h-16 rounded-2xl text-2xl font-semibold transition-colors disabled:opacity-50 ${k === 'ok' ? 'bg-primary hover:bg-secondary text-white' : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700'}`}>
                                {k === 'back' ? '⌫' : k === 'ok' ? (busy ? '…' : '✓') : k}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {step === 'actions' && state && (
                <div>
                    <div className="text-2xl font-bold">Hola, {state.firstName}</div>
                    <div className="text-sm text-neutral-600 dark:text-neutral-300 mt-0.5">
                        {fmtTime(now)} · {last ? `Su último registro: ${PAST[last.type]} ${fmtTime(last.punchedAt)}` : 'Aún no tiene registros hoy'}
                    </div>
                    {state.complete ? (
                        <div className="mt-5 rounded-xl bg-neutral-100 dark:bg-neutral-800 p-4 text-center font-medium">Su jornada de hoy ya está completa.</div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3 mt-5">
                            {ORDER.map(tp => {
                                const allowed = state.nextActions.includes(tp);
                                const tone = tp === 'IN' ? 'bg-emerald-600 hover:bg-emerald-700' : tp === 'OUT' ? 'bg-neutral-900 hover:bg-black dark:bg-white dark:text-neutral-900' : 'bg-amber-500 hover:bg-amber-600';
                                return (
                                    <button key={tp} type="button" disabled={!allowed || busy} onClick={() => punch(tp)}
                                        className={`h-16 rounded-2xl text-lg font-bold transition-colors ${allowed ? `${tone} text-white` : 'bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-600 cursor-not-allowed'}`}>
                                        {LABEL[tp]}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-4 text-center">Solo se habilita lo que corresponde. Se cierra solo en {left} s.</p>
                </div>
            )}

            {step === 'done' && done && (
                <div className="text-center py-4">
                    <div className="mx-auto w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-3xl">✓</div>
                    <div className="text-xl font-bold mt-3">{DONE[done.type]}</div>
                    <div className="text-neutral-600 dark:text-neutral-300">{done.name} · {fmtTime(done.at)}</div>
                </div>
            )}

            {error && <p className="mt-4 text-sm font-medium text-center text-red-600 dark:text-red-400" role="alert">{error}</p>}
        </Modal>
    );
};
