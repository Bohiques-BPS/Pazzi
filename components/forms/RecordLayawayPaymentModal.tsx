import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../Modal';
import { Layaway } from '../../types';
import { useData } from '../../contexts/DataContext';
import { inputFormStyle, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';

interface RecordLayawayPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    layaway: Layaway | null;
}

export const RecordLayawayPaymentModal: React.FC<RecordLayawayPaymentModalProps> = ({ isOpen, onClose, layaway }) => {
    const { addSalePayment, salePayments } = useData();
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState('Efectivo');
    const [error, setError] = useState('');

    const { amountPaid, balance } = useMemo(() => {
        if (!layaway) return { amountPaid: 0, balance: 0 };
        const payments = salePayments.filter(p => p.layawayId === layaway.id);
        const paid = payments.reduce((sum, p) => sum + p.amountPaid, 0);
        return { amountPaid: paid, balance: layaway.totalAmount - paid };
    }, [layaway, salePayments]);

    useEffect(() => {
        if (isOpen) {
            setAmount('');
            setMethod('Efectivo');
            setError('');
        }
    }, [isOpen]);

    const handleConfirm = () => {
        const paymentAmount = parseFloat(amount);
        if (isNaN(paymentAmount) || paymentAmount <= 0) {
            setError('Por favor, ingrese un monto válido.');
            return;
        }
        if (paymentAmount > balance) {
            setError(`El abono no puede exceder el balance pendiente de $${balance.toFixed(2)}.`);
            return;
        }

        if (layaway) {
            addSalePayment({
                layawayId: layaway.id,
                paymentDate: new Date().toISOString(),
                amountPaid: paymentAmount,
                paymentMethodUsed: method,
                notes: `Abono a apartado #${layaway.id.slice(-6)}`
            });
        }
        onClose();
    };

    if (!layaway) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Registrar Abono para Apartado #${layaway.id.slice(-6)}`} size="md">
            <div className="space-y-4">
                 <div className="text-sm space-y-1 p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-md">
                    <div className="flex justify-between"><span className="text-neutral-500">Total Apartado:</span> <span className="font-medium">${layaway.totalAmount.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-neutral-500">Pagado hasta ahora:</span> <span>${amountPaid.toFixed(2)}</span></div>
                     <div className="flex justify-between font-semibold border-t pt-1 mt-1 border-neutral-300 dark:border-neutral-600">
                        <span>Balance Pendiente:</span> 
                        <span className="text-lg text-red-500">${balance.toFixed(2)}</span>
                    </div>
                </div>
                <div>
                    <label htmlFor="paymentAmountLayaway" className="block text-sm font-medium">Monto del Abono</label>
                    <input
                        type="number"
                        id="paymentAmountLayaway"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className={inputFormStyle}
                        placeholder="0.00"
                        min="0.01"
                        step="0.01"
                        max={balance}
                        autoFocus
                    />
                </div>
                <div>
                    <label htmlFor="paymentMethodLayaway" className="block text-sm font-medium">Método de Pago</label>
                    <select id="paymentMethodLayaway" value={method} onChange={e => setMethod(e.target.value)} className={inputFormStyle}>
                        <option>Efectivo</option>
                        <option>Tarjeta</option>
                        <option>ATH Móvil</option>
                        <option>Cheque</option>
                    </select>
                </div>
                {error && <p className="text-xs text-red-500">{error}</p>}
                <div className="flex justify-end space-x-2 pt-2">
                    <button onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button>
                    <button onClick={handleConfirm} className={BUTTON_PRIMARY_SM_CLASSES}>Confirmar Abono</button>
                </div>
            </div>
        </Modal>
    );
};
