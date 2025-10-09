import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../Modal';
import { BanknotesIcon, CreditCardIcon, AthMovilIcon, DocumentTextIcon, ClipboardDocumentListIcon } from '../icons';
import { BUTTON_PRIMARY_CLASSES, BUTTON_SECONDARY_CLASSES } from '../../constants';

export type PaymentMethod = 'Efectivo' | 'Tarjeta' | 'ATH Móvil' | 'Crédito C.' | 'Cheque' | 'Factura';

interface Payment {
  method: PaymentMethod;
  amount: number;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalAmount: number;
  initialMethod: PaymentMethod;
  onFinalizeSale: (paymentMethods: Payment[]) => void;
}

const paymentButtons: { name: PaymentMethod; icon: React.ReactNode }[] = [
    { name: 'Efectivo', icon: <BanknotesIcon /> },
    { name: 'Tarjeta', icon: <CreditCardIcon /> },
    { name: 'ATH Móvil', icon: <AthMovilIcon /> },
    { name: 'Crédito C.', icon: <ClipboardDocumentListIcon /> },
    { name: 'Cheque', icon: <DocumentTextIcon /> },
];

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, totalAmount, initialMethod, onFinalizeSale }) => {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(initialMethod);
    const [amountInput, setAmountInput] = useState('');

    const totalPaid = useMemo(() => payments.reduce((sum, p) => sum + p.amount, 0), [payments]);
    const balance = totalAmount - totalPaid;
    const isFullyPaid = balance <= 0.001; // Using a small epsilon for float comparison

    useEffect(() => {
        if (isOpen) {
            setPayments([]);
            setSelectedMethod(initialMethod);
        }
    }, [isOpen, initialMethod]);

    useEffect(() => {
        if (isOpen) {
            setAmountInput(balance > 0 ? balance.toFixed(2) : '0.00');
        }
    }, [balance, isOpen]);

    const handleAddPayment = () => {
        const amount = parseFloat(amountInput);
        if (isNaN(amount) || amount <= 0 || amount > balance + 0.001) {
            alert('Monto inválido.');
            return;
        }

        setPayments(prev => [...prev, { method: selectedMethod, amount }]);
    };
    
    const handleRemovePayment = (index: number) => {
        setPayments(prev => prev.filter((_, i) => i !== index));
    };

    const handleFinalize = () => {
        if (!isFullyPaid) {
            // As a fallback, if the remaining amount is small, add it automatically with the selected method.
            const remaining = parseFloat(balance.toFixed(2));
            if (remaining > 0) {
                 onFinalizeSale([...payments, { method: selectedMethod, amount: remaining }]);
            } else {
                 onFinalizeSale(payments);
            }
        } else {
            onFinalizeSale(payments);
        }
    };
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Procesar Venta" size="3xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Panel: Totals & Applied Payments */}
                <div className="flex flex-col space-y-4">
                    <div className="bg-red-50 dark:bg-red-900/30 text-center p-4 rounded-lg">
                        <p className="text-sm font-medium text-red-700 dark:text-red-300">Saldo Pendiente</p>
                        <p className="text-4xl font-bold text-red-600 dark:text-red-400">${balance.toFixed(2)}</p>
                    </div>
                    <div>
                        <h3 className="font-semibold text-neutral-700 dark:text-neutral-200">Pagos Aplicados:</h3>
                        <div className="mt-2 space-y-2 text-sm max-h-40 overflow-y-auto pr-2">
                           {payments.length === 0 ? (
                                <p className="text-neutral-500 dark:text-neutral-400">Ningún pago aplicado.</p>
                           ) : (
                                payments.map((p, i) => (
                                    <div key={i} className="flex justify-between items-center bg-neutral-100 dark:bg-neutral-700 p-2 rounded">
                                        <span>{p.method}:</span>
                                        <span className="font-semibold">${p.amount.toFixed(2)}</span>
                                        <button onClick={() => handleRemovePayment(i)} className="text-red-500 hover:text-red-700 ml-2">&times;</button>
                                    </div>
                                ))
                           )}
                        </div>
                    </div>
                    <div className="border-t dark:border-neutral-600 pt-3 mt-auto">
                        <div className="flex justify-between items-center text-lg font-bold">
                            <span>Total Pagado:</span>
                            <span>${totalPaid.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Payment Methods & Input */}
                <div className="space-y-4">
                    <h3 className="font-semibold text-neutral-700 dark:text-neutral-200">Seleccione Método y Monto:</h3>
                    <div className="grid grid-cols-2 gap-2">
                        {paymentButtons.map(({ name }) => (
                            <button
                                key={name}
                                type="button"
                                onClick={() => setSelectedMethod(name)}
                                className={`p-2 border rounded-md text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-neutral-800 ${
                                    selectedMethod === name
                                        ? 'border-teal-500 ring-2 ring-teal-300 dark:ring-teal-600 bg-teal-50 dark:bg-teal-900/50'
                                        : 'border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                                }`}
                            >
                                {name}
                            </button>
                        ))}
                    </div>

                    <div className="space-y-1">
                        <label htmlFor="paymentAmount" className="text-sm font-medium">
                            Monto para {selectedMethod}
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                id="paymentAmount"
                                type="number"
                                value={amountInput}
                                onChange={(e) => setAmountInput(e.target.value)}
                                className="w-full text-lg px-3 py-1.5 border-teal-400 border-2 rounded-md focus:ring-teal-500 focus:border-teal-500 dark:bg-neutral-700"
                                step="0.01"
                                min="0.01"
                            />
                            <button
                                type="button"
                                onClick={handleAddPayment}
                                className="px-4 py-2 bg-neutral-200 dark:bg-neutral-600 rounded-md text-sm font-semibold hover:bg-neutral-300 dark:hover:bg-neutral-500 disabled:opacity-50"
                                disabled={isFullyPaid}
                            >
                                Agregar Pago
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t dark:border-neutral-600">
                <button type="button" onClick={onClose} className={BUTTON_SECONDARY_CLASSES}>
                    Cancelar
                </button>
                <button
                    type="button"
                    onClick={handleFinalize}
                    className={`${BUTTON_PRIMARY_CLASSES} bg-green-600 hover:bg-green-700 disabled:bg-gray-400`}
                    disabled={balance > 0.001}
                >
                    Finalizar Venta
                </button>
            </div>
        </Modal>
    );
};