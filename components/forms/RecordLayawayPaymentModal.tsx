import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../Modal';
import { Layaway } from '../../types';
import { inputFormStyle, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import { layawaysService, type LayawayRecord } from '../../services/layaways';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';
import { ExclamationTriangleIcon } from '../icons';

interface RecordLayawayPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** Acepta tanto Layaway (legacy) como LayawayRecord (servicio) */
    layaway: Layaway | LayawayRecord | null;
    /** Callback al registrar el pago. Recibe el layaway actualizado. */
    onPaymentRecorded?: (updated: LayawayRecord) => void;
}

export const RecordLayawayPaymentModal: React.FC<RecordLayawayPaymentModalProps> = ({
    isOpen,
    onClose,
    layaway,
    onPaymentRecorded,
}) => {
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState('Efectivo');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { amountPaid, balance } = useMemo(() => {
        if (!layaway) return { amountPaid: 0, balance: 0 };
        const payments = (layaway as any).payments || [];
        const paid = payments.reduce((sum: number, p: any) => sum + p.amountPaid, 0);
        return { amountPaid: paid, balance: layaway.totalAmount - paid };
    }, [layaway]);

    useEffect(() => {
        if (isOpen) {
            setAmount('');
            setMethod('Efectivo');
            setNotes('');
            setError(null);
        }
    }, [isOpen]);

    if (!layaway) return null;

    const handleConfirm = async () => {
        setError(null);
        const paymentAmount = parseFloat(amount);
        if (isNaN(paymentAmount) || paymentAmount <= 0) {
            setError('Ingrese un monto válido.');
            return;
        }
        if (paymentAmount > balance + 0.01) {
            setError(`El abono no puede exceder el balance pendiente ($${balance.toFixed(2)}).`);
            return;
        }

        setSubmitting(true);
        try {
            const result = await layawaysService.addPayment(layaway.id, {
                amountPaid: paymentAmount,
                paymentMethodUsed: method,
                notes: notes.trim() || `Abono a apartado #${layaway.id.slice(-6)}`,
            });

            const wasCompleted = result.status === 'Completado';
            toast.success(
                wasCompleted
                    ? `Pago de $${paymentAmount.toFixed(2)} registrado. ¡Apartado completado!`
                    : `Pago de $${paymentAmount.toFixed(2)} registrado. Saldo: $${(layaway.totalAmount - result.totalPaid).toFixed(2)}`
            );
            onPaymentRecorded?.(result.layaway);
            onClose();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Error al registrar el pago');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Registrar abono — Apartado #${layaway.id.slice(-6).toUpperCase()}`} size="md">
            <div className="space-y-4">
                {error && (
                    <div className="p-3 rounded-md bg-red-50 border border-red-200 flex items-center text-red-700 text-sm">
                        <ExclamationTriangleIcon className="w-5 h-5 mr-2 flex-shrink-0" />
                        {error}
                    </div>
                )}

                <div className="text-sm space-y-1 p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-md">
                    <div className="flex justify-between">
                        <span className="text-neutral-500">Total apartado:</span>
                        <span className="font-medium">${layaway.totalAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-neutral-500">Pagado hasta ahora:</span>
                        <span>${amountPaid.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-1 mt-1 border-neutral-300 dark:border-neutral-600">
                        <span>Balance pendiente:</span>
                        <span className="text-lg text-red-500">${balance.toFixed(2)}</span>
                    </div>
                </div>

                <div>
                    <label htmlFor="paymentAmountLayaway" className="block text-sm font-medium">Monto del abono</label>
                    <div className="relative mt-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">$</span>
                        <input
                            type="number"
                            id="paymentAmountLayaway"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className={`${inputFormStyle} pl-7`}
                            placeholder="0.00"
                            min="0.01"
                            step="0.01"
                            max={balance}
                            autoFocus
                        />
                    </div>
                </div>

                <div>
                    <label htmlFor="paymentMethodLayaway" className="block text-sm font-medium">Método de pago</label>
                    <select id="paymentMethodLayaway" value={method} onChange={(e) => setMethod(e.target.value)} className={inputFormStyle}>
                        <option>Efectivo</option>
                        <option>Tarjeta</option>
                        <option>ATH Móvil</option>
                        <option>Cheque</option>
                        <option>Transferencia</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium">Notas (opcional)</label>
                    <input
                        type="text"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className={inputFormStyle}
                        placeholder="Referencia, ej. comprobante #..."
                    />
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                    <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES} disabled={submitting}>
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        className={BUTTON_PRIMARY_SM_CLASSES}
                        disabled={submitting || balance <= 0}
                    >
                        {submitting ? 'Registrando...' : 'Confirmar abono'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};
