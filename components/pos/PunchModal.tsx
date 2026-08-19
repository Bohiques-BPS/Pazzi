import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { timeclockService } from '../../services/timeclock';
import { ApiError } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { BUTTON_PRIMARY_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';

interface PunchModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type PunchDone = { type: 'IN' | 'OUT'; employeeName: string; punchedAt: string };

/** Ponche (F9): por defecto poncha automáticamente al usuario conectado; permite ponchar a otro por PIN. */
export const PunchModal: React.FC<PunchModalProps> = ({ isOpen, onClose }) => {
    const { currentUser } = useAuth();
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<PunchDone | null>(null);

    // Modo "otro empleado" (terminal compartida): nombre/número + PIN.
    const [otherMode, setOtherMode] = useState(false);
    const [identifier, setIdentifier] = useState('');
    const [pin, setPin] = useState('');

    useEffect(() => {
        if (isOpen) { setSubmitting(false); setError(null); setResult(null); setOtherMode(false); setIdentifier(''); setPin(''); }
    }, [isOpen]);

    const finishWith = (r: PunchDone) => {
        setResult(r);
        setTimeout(() => onClose(), 2200);
    };

    const punchSelf = async () => {
        setError(null); setSubmitting(true);
        try {
            const r = await timeclockService.punchSelf();
            finishWith({ type: r.type, employeeName: r.employeeName, punchedAt: r.punchedAt });
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'No se pudo registrar el ponche.');
        } finally { setSubmitting(false); }
    };

    const punchOther = async () => {
        setError(null);
        if (!identifier.trim()) return setError('Ingresa el nombre o número de empleado.');
        if (pin.trim().length < 3) return setError('Ingresa el PIN.');
        setSubmitting(true);
        try {
            const r = await timeclockService.punch(identifier.trim(), pin.trim());
            finishWith({ type: r.type, employeeName: r.employeeName, punchedAt: r.punchedAt });
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'No se pudo registrar el ponche.');
        } finally { setSubmitting(false); }
    };

    const connectedName = currentUser ? `${currentUser.name} ${currentUser.lastName || ''}`.trim() : '';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Ponche de Empleado (F9)" size="md">
            {result ? (
                <div className="text-center py-6 space-y-2">
                    <div className={`text-5xl ${result.type === 'IN' ? 'text-green-500' : 'text-amber-500'}`}>
                        {result.type === 'IN' ? '🟢' : '🔴'}
                    </div>
                    <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">
                        {result.type === 'IN' ? 'Entrada registrada' : 'Salida registrada'}
                    </p>
                    <p className="text-lg text-neutral-600 dark:text-neutral-300">{result.employeeName}</p>
                    <p className="text-sm text-neutral-500">{new Date(result.punchedAt).toLocaleString()}</p>
                </div>
            ) : otherMode ? (
                <form onSubmit={(e) => { e.preventDefault(); punchOther(); }} className="space-y-4">
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Ponchar a otro empleado con su nombre/número + PIN.</p>
                    <div>
                        <label className="block text-sm font-medium mb-1">Nombre o número de empleado</label>
                        <input
                            type="text" value={identifier} onChange={(e) => setIdentifier(e.target.value)}
                            placeholder="Ej. Juan Pérez" autoFocus
                            className="w-full text-lg px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md dark:bg-neutral-700"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">PIN</label>
                        <input
                            type="password" inputMode="numeric" value={pin}
                            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                            placeholder="••••"
                            className="w-full text-2xl tracking-[0.4em] text-center px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md dark:bg-neutral-700"
                        />
                    </div>
                    {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
                    <div className="flex justify-between gap-2">
                        <button type="button" onClick={() => { setOtherMode(false); setError(null); }} className={BUTTON_SECONDARY_SM_CLASSES}>← Volver</button>
                        <button type="submit" disabled={submitting} className={`${BUTTON_PRIMARY_CLASSES} disabled:opacity-50`}>
                            {submitting ? 'Registrando…' : 'Ponchar (Entrada / Salida)'}
                        </button>
                    </div>
                </form>
            ) : (
                <div className="space-y-5 py-2">
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        Marca tu entrada o salida. No cierra la sesión del cajero en turno.
                    </p>
                    <div className="text-center">
                        <p className="text-xs uppercase tracking-wider text-neutral-400 mb-1">Usuario conectado</p>
                        <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">{connectedName || '—'}</p>
                    </div>
                    {error && <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>}
                    <button
                        onClick={punchSelf} disabled={submitting || !currentUser}
                        className="w-full py-4 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-lg font-bold disabled:opacity-50"
                    >
                        {submitting ? 'Registrando…' : '🕒 Ponchar (Entrada / Salida)'}
                    </button>
                    <div className="flex items-center justify-between">
                        <button type="button" onClick={() => { setOtherMode(true); setError(null); }} className="text-xs text-neutral-500 hover:underline">Ponchar a otro empleado (PIN)</button>
                        <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button>
                    </div>
                </div>
            )}
        </Modal>
    );
};
