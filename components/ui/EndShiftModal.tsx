import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from '../Modal';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES, inputFormStyle } from '../../constants';
import { cajasService, type CajaSession, type SessionTotals } from '../../services/cajas';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';
import { ExclamationTriangleIcon } from '../icons';
import { LoadingSkeleton } from './LoadingSkeleton';

interface EndShiftModalProps {
    isOpen: boolean;
    onClose: () => void;
    cajaId: string;
    cajaName?: string;
    /** Diferencia (en valor absoluto) por encima de la cual se considera "alta" y requiere confirmación. */
    differenceThreshold?: number;
    onClosed?: (session: CajaSession, totals: SessionTotals) => void;
}

export const EndShiftModal: React.FC<EndShiftModalProps> = ({
    isOpen,
    onClose,
    cajaId,
    cajaName,
    differenceThreshold = 5,
    onClosed,
}) => {
    const [loading, setLoading] = useState(true);
    const [session, setSession] = useState<CajaSession | null>(null);
    const [totals, setTotals] = useState<SessionTotals | null>(null);
    const [countedCash, setCountedCash] = useState<string>('');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [confirmHighDiff, setConfirmHighDiff] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        let cancelled = false;
        setLoading(true);
        setError(null);
        setCountedCash('');
        setNotes('');
        setConfirmHighDiff(false);
        cajasService.getCurrentSession(cajaId)
            .then(({ session, totals }) => {
                if (cancelled) return;
                if (!session) {
                    setError('Esta caja no tiene un turno abierto.');
                } else {
                    setSession(session);
                    setTotals(totals);
                }
            })
            .catch(err => {
                if (cancelled) return;
                setError(err instanceof ApiError ? err.message : 'Error al cargar el turno');
            })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [isOpen, cajaId]);

    const counted = parseFloat(countedCash || '0');
    const expected = totals?.expectedCash ?? 0;
    const difference = useMemo(() => {
        if (!totals) return 0;
        return Math.round((counted - expected) * 100) / 100;
    }, [counted, expected, totals]);

    const isHighDifference = Math.abs(difference) >= differenceThreshold;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!session || !totals) return;
        if (countedCash === '' || isNaN(counted) || counted < 0) {
            setError('Ingrese el efectivo contado (un número ≥ 0).');
            return;
        }
        if (isHighDifference && !confirmHighDiff) {
            setError(`Hay una diferencia de $${Math.abs(difference).toFixed(2)}. Marque la confirmación para cerrar de todos modos.`);
            return;
        }
        setSubmitting(true);
        setError(null);
        try {
            const result = await cajasService.closeSession(cajaId, {
                countedCash: counted,
                closingNotes: notes.trim() || undefined,
                forceWithDifference: isHighDifference,
            });
            toast.success(
                difference === 0
                    ? 'Turno cerrado sin diferencia ✓'
                    : `Turno cerrado con diferencia de $${Math.abs(difference).toFixed(2)}`
            );
            onClosed?.(result.session, result.totals);
            onClose();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Error al cerrar el turno');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Cierre de turno${cajaName ? ` — ${cajaName}` : ''}`} size="md">
            {loading && <LoadingSkeleton variant="form" rows={5} />}

            {!loading && error && !session && (
                <div className="p-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm flex items-start">
                    <ExclamationTriangleIcon className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                    {error}
                </div>
            )}

            {!loading && session && totals && (
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="text-sm space-y-1 p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-md">
                        <h4 className="text-xs uppercase tracking-wide font-semibold text-neutral-600 dark:text-neutral-300 mb-1">Resumen del turno</h4>
                        <Row label="Ventas totales" value={totals.totalSales} />
                        <Row label="En efectivo" value={totals.cashSales} sub />
                        <Row label="En tarjeta" value={totals.cardSales} sub />
                        <Row label="Otros métodos" value={totals.otherSales} sub />
                        {totals.cashRefunds > 0 && <Row label="Devoluciones en efectivo" value={totals.cashRefunds} sub />}
                    </div>

                    <div className="text-sm space-y-1 p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-md">
                        <h4 className="text-xs uppercase tracking-wide font-semibold text-neutral-600 dark:text-neutral-300 mb-1">Efectivo</h4>
                        <Row label="Fondo inicial" value={totals.openingFloat} />
                        <Row label="Ventas en efectivo" value={totals.cashSales} prefix="+" />
                        {totals.cashIn > 0 && <Row label="Depósitos / cash-in" value={totals.cashIn} prefix="+" />}
                        <Row label="Retiros (payouts)" value={totals.payouts} prefix="-" />
                        {totals.cashRefunds > 0 && <Row label="Devoluciones" value={totals.cashRefunds} prefix="-" />}
                        <div className="flex justify-between font-semibold border-t pt-1 mt-1 border-neutral-300 dark:border-neutral-600">
                            <span>Efectivo esperado:</span>
                            <span className="text-lg text-primary">${totals.expectedCash.toFixed(2)}</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium">Efectivo contado físicamente</label>
                        <div className="relative mt-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">$</span>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={countedCash}
                                onChange={(e) => setCountedCash(e.target.value)}
                                className={`${inputFormStyle} pl-7`}
                                placeholder="0.00"
                                required
                                autoFocus
                            />
                        </div>
                    </div>

                    {countedCash !== '' && (
                        <div className={`p-3 rounded-md text-sm ${
                            difference === 0
                                ? 'bg-green-50 border border-green-200 text-green-700'
                                : Math.abs(difference) < differenceThreshold
                                  ? 'bg-amber-50 border border-amber-200 text-amber-700'
                                  : 'bg-red-50 border border-red-200 text-red-700'
                        }`}>
                            <div className="flex justify-between font-semibold">
                                <span>Diferencia:</span>
                                <span>{difference >= 0 ? '+' : '-'}${Math.abs(difference).toFixed(2)}</span>
                            </div>
                            {difference !== 0 && (
                                <p className="text-xs mt-1">
                                    {difference > 0 ? 'Sobra' : 'Falta'} ${Math.abs(difference).toFixed(2)} respecto al esperado.
                                </p>
                            )}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium">Notas de cierre (opcional)</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={2}
                            className={inputFormStyle}
                            placeholder="Explica diferencias o incidencias..."
                        />
                    </div>

                    {isHighDifference && countedCash !== '' && (
                        <label className="flex items-start gap-2 p-2 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 text-sm">
                            <input
                                type="checkbox"
                                checked={confirmHighDiff}
                                onChange={(e) => setConfirmHighDiff(e.target.checked)}
                                className="mt-0.5"
                            />
                            <span className="text-red-700 dark:text-red-300">
                                Confirmo que verifiqué el conteo y autorizo el cierre con una diferencia de
                                <strong> ${Math.abs(difference).toFixed(2)}</strong>.
                            </span>
                        </label>
                    )}

                    {error && (
                        <div className="p-2 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="flex justify-end space-x-2 pt-2">
                        <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>Continuar turno</button>
                        <button type="submit" className={BUTTON_PRIMARY_SM_CLASSES} disabled={submitting}>
                            {submitting ? 'Cerrando...' : 'Cerrar turno'}
                        </button>
                    </div>
                </form>
            )}
        </Modal>
    );
};

const Row: React.FC<{ label: string; value: number; sub?: boolean; prefix?: string }> = ({ label, value, sub, prefix }) => (
    <div className={`flex justify-between ${sub ? 'pl-4 text-neutral-500 dark:text-neutral-400' : ''}`}>
        <span>{label}:</span>
        <span>{prefix ? `${prefix} ` : ''}${value.toFixed(2)}</span>
    </div>
);
