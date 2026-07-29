import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Modal } from '../Modal';
import { BanknotesIcon, CreditCardIcon, AthMovilIcon, DocumentTextIcon, ClipboardDocumentListIcon } from '../icons';
import { BUTTON_PRIMARY_CLASSES, BUTTON_SECONDARY_CLASSES } from '../../constants';
import { toast } from 'react-hot-toast';

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

// El orden define el atajo: índice 0 → F1, 1 → F2, etc.
const paymentButtons: { name: PaymentMethod; icon: React.ReactNode; shortcut: string }[] = [
    { name: 'Efectivo', icon: <BanknotesIcon />, shortcut: 'F1' },
    { name: 'Tarjeta', icon: <CreditCardIcon />, shortcut: 'F2' },
    { name: 'ATH Móvil', icon: <AthMovilIcon />, shortcut: 'F3' },
    { name: 'Crédito C.', icon: <ClipboardDocumentListIcon />, shortcut: 'F4' },
    { name: 'Cheque', icon: <DocumentTextIcon />, shortcut: 'F5' },
];

// Denominaciones rápidas de efectivo (billetes comunes).
const CASH_QUICK_AMOUNTS = [5, 10, 20, 50, 100];

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, totalAmount, initialMethod, onFinalizeSale }) => {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(initialMethod);
    const [amountInput, setAmountInput] = useState('');
    // Vuelto a devolver: el efectivo entregado por encima del saldo. Es solo informativo
    // (NO se registra como pago; el cajón solo retiene el monto de la venta).
    const [changeDue, setChangeDue] = useState(0);
    const amountInputRef = useRef<HTMLInputElement>(null);
    // Siempre apunta a la acción actual de Enter (evita closures obsoletos en el listener global).
    const onEnterRef = useRef<() => void>(() => {});
    // F12: finaliza SOLO si la venta ya está totalmente pagada (atajo de "cobro terminado").
    const finalizeIfPaidRef = useRef<() => void>(() => {});

    const totalPaid = useMemo(() => payments.reduce((sum, p) => sum + p.amount, 0), [payments]);
    const balance = totalAmount - totalPaid;
    const isFullyPaid = balance <= 0.001; // Using a small epsilon for float comparison
    const isCash = selectedMethod === 'Efectivo';

    // Vuelto en vivo mientras se escribe el monto de efectivo (antes de "Agregar Pago").
    const previewChange = isCash ? Math.max(0, (parseFloat(amountInput) || 0) - balance) : 0;

    const focusAmount = () => {
        setTimeout(() => {
            amountInputRef.current?.focus();
            amountInputRef.current?.select();
        }, 0);
    };

    useEffect(() => {
        if (isOpen) {
            setPayments([]);
            setSelectedMethod(initialMethod);
            setChangeDue(0);
        }
    }, [isOpen, initialMethod]);

    useEffect(() => {
        if (isOpen) {
            setAmountInput(balance > 0 ? balance.toFixed(2) : '0.00');
        }
    }, [balance, isOpen]);

    // Atajos de teclado: F1..F5 seleccionan método; Enter agrega el pago o finaliza la venta.
    // F12 finaliza la venta SOLO cuando ya está totalmente pagada.
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: KeyboardEvent) => {
            const idx = paymentButtons.findIndex(b => b.shortcut === e.key);
            if (idx >= 0) {
                e.preventDefault();
                setSelectedMethod(paymentButtons[idx].name);
                focusAmount();
                return;
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                onEnterRef.current();
                return;
            }
            if (e.key === 'F12') {
                e.preventDefault();
                finalizeIfPaidRef.current();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen]);

    const handleAddPayment = () => {
        const amount = parseFloat(amountInput);
        if (isNaN(amount) || amount <= 0) {
            toast.error('Monto inválido. Verifique el valor ingresado.');
            return;
        }
        // El efectivo puede exceder el saldo (se devuelve vuelto). Otros métodos no.
        if (!isCash && amount > balance + 0.001) {
            toast.error('El monto no puede superar el saldo pendiente para este método.');
            return;
        }

        // El monto registrado nunca excede el saldo: el excedente en efectivo es vuelto,
        // no dinero que quede en la caja. Así la conciliación de caja cuadra.
        const applied = isCash ? Math.min(amount, balance) : amount;
        const change = isCash ? Math.max(0, amount - balance) : 0;

        setPayments(prev => [...prev, { method: selectedMethod, amount: applied }]);
        setChangeDue(change);
    };

    const handleRemovePayment = (index: number) => {
        setPayments(prev => prev.filter((_, i) => i !== index));
        setChangeDue(0);
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

    // Enter: si aún falta saldo, agrega el pago; si ya está pagado, finaliza la venta.
    onEnterRef.current = () => {
        if (isFullyPaid) {
            handleFinalize();
        } else {
            handleAddPayment();
        }
    };
    // F12: finaliza solo cuando ya no queda saldo (cobro completado).
    finalizeIfPaidRef.current = () => {
        if (isFullyPaid) handleFinalize();
        else toast.error('Aún falta saldo por pagar.');
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Procesar Venta" size="3xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Panel: Totals & Applied Payments */}
                <div className="flex flex-col space-y-4">
                    {changeDue > 0.001 ? (
                        <div className="bg-green-50 dark:bg-green-900/30 text-center p-4 rounded-lg">
                            <p className="text-sm font-medium text-green-700 dark:text-green-300">Cambio a devolver</p>
                            <p className="text-4xl font-bold text-green-600 dark:text-green-400">${changeDue.toFixed(2)}</p>
                        </div>
                    ) : (
                        <div className="bg-red-50 dark:bg-red-900/30 text-center p-4 rounded-lg">
                            <p className="text-sm font-medium text-red-700 dark:text-red-300">Saldo Pendiente</p>
                            <p className="text-4xl font-bold text-red-600 dark:text-red-400">${Math.max(0, balance).toFixed(2)}</p>
                        </div>
                    )}
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
                        {paymentButtons.map(({ name, shortcut }) => (
                            <button
                                key={name}
                                type="button"
                                onClick={() => { setSelectedMethod(name); focusAmount(); }}
                                title={`Atajo: ${shortcut}`}
                                className={`relative p-2 border rounded-md text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-neutral-800 ${
                                    selectedMethod === name
                                        ? 'border-teal-500 ring-2 ring-teal-300 dark:ring-teal-600 bg-teal-50 dark:bg-teal-900/50'
                                        : 'border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                                }`}
                            >
                                <span className="absolute top-1 left-1.5 text-[10px] font-bold text-neutral-400 dark:text-neutral-500">{shortcut}</span>
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
                                ref={amountInputRef}
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

                        {/* Efectivo: montos rápidos (billetes) + vuelto en vivo */}
                        {isCash && (
                            <div className="pt-2 space-y-2">
                                <div className="flex flex-wrap gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => setAmountInput(balance > 0 ? balance.toFixed(2) : '0.00')}
                                        className="px-2.5 py-1 text-xs font-semibold rounded-md border border-teal-400 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-900/40"
                                    >
                                        Exacto
                                    </button>
                                    {CASH_QUICK_AMOUNTS.map(amt => (
                                        <button
                                            key={amt}
                                            type="button"
                                            onClick={() => setAmountInput(String(amt))}
                                            className="px-2.5 py-1 text-xs font-semibold rounded-md border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                                        >
                                            ${amt}
                                        </button>
                                    ))}
                                </div>
                                {previewChange > 0.001 && (
                                    <p className="text-sm font-medium text-green-600 dark:text-green-400">
                                        Vuelto: ${previewChange.toFixed(2)}
                                    </p>
                                )}
                            </div>
                        )}
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
                    Finalizar Venta <span className="ml-1 text-xs opacity-80">(Enter / F12)</span>
                </button>
            </div>
        </Modal>
    );
};