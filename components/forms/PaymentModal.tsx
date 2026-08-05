import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Modal } from '../Modal';
import { BUTTON_PRIMARY_CLASSES, BUTTON_SECONDARY_CLASSES } from '../../constants';
import { AthMovilButton } from '../pos/AthMovilButton';
import { AgilPayCardForm } from '../pos/AgilPayCardForm';
import { invoicesService, type Invoice } from '../../services/invoices';
import { parseAmount, round2, computeBalance, evaluatePayment, coversBalance } from './paymentMath';
import { toast } from 'react-hot-toast';

const publicLink = (token: string) => `${window.location.origin}/#/pay/${token}`;

// Métodos dinámicos: string libre (viene de la config de Métodos de Pago).
export type PaymentMethod = string;

/** Opción de método de pago que recibe el modal (derivada de la config del negocio). */
export interface PaymentMethodOption {
  name: string;
  type: string;               // cash | card | ath_movil | credit | check | invoice | custom
  requiresReference: boolean; // pide un dato (Nº cheque, confirmación ATH…)
  referenceLabel: string;
  config?: Record<string, string>; // keys (ej. tokens ATH Móvil)
}

interface Payment {
  method: string;
  amount: number;
  /** Referencia opcional (ej. número de cheque / confirmación ATH). */
  reference?: string;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalAmount: number;
  subtotalAmount?: number;
  taxAmount?: number;
  athItems?: { name: string; quantity: number; price: number }[];
  customerName?: string;
  customerEmail?: string;
  initialMethod: string;
  /** Métodos habilitados (en orden); el índice define el atajo F1, F2, … */
  methods: PaymentMethodOption[];
  onFinalizeSale: (paymentMethods: Payment[], changeDue?: number) => void;
}

// Denominaciones rápidas de efectivo (billetes comunes).
// Denominaciones de billetes (como el POS de referencia). Al tocarlas se SUMAN al efectivo
// recibido, para que el cajero cuente el dinero que entrega el cliente.
const CASH_DENOMINATIONS = [100, 50, 20, 10, 5, 1];

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, totalAmount, subtotalAmount, taxAmount, athItems, customerName, customerEmail, initialMethod, methods, onFinalizeSale }) => {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [selectedMethod, setSelectedMethod] = useState<string>(initialMethod);
    const [amountInput, setAmountInput] = useState('');
    const [referenceInput, setReferenceInput] = useState(''); // dato requerido (cheque/ATH/etc.)
    // Vuelto a devolver: el efectivo entregado por encima del saldo. Es solo informativo
    // (NO se registra como pago; el cajón solo retiene el monto de la venta).
    const [changeDue, setChangeDue] = useState(0);
    // ATH Móvil por QR/link: se genera una factura pública con el monto exacto del saldo.
    const [athInvoice, setAthInvoice] = useState<Invoice | null>(null);
    const [athQr, setAthQr] = useState('');
    const [athGenerating, setAthGenerating] = useState(false);
    const amountInputRef = useRef<HTMLInputElement>(null);
    // Siempre apunta a la acción actual de Enter (evita closures obsoletos en el listener global).
    const onEnterRef = useRef<() => void>(() => {});
    // F12: finaliza SOLO si la venta ya está totalmente pagada (atajo de "cobro terminado").
    const finalizeIfPaidRef = useRef<() => void>(() => {});

    const totalPaid = useMemo(() => payments.reduce((sum, p) => sum + p.amount, 0), [payments]);
    // El saldo se redondea a centavos: el total con IVU puede tener >2 decimales (ej. 120.38655),
    // y la pantalla muestra 120.39. Sin redondear, pagar "120.39" se rechazaba por "superar el saldo".
    const balance = computeBalance(totalAmount, totalPaid);
    const isFullyPaid = balance <= 0.001; // Using a small epsilon for float comparison
    const selectedConfig = useMemo(() => methods.find(m => m.name === selectedMethod), [methods, selectedMethod]);
    const isCash = selectedConfig?.type === 'cash';
    const needsRef = !!selectedConfig?.requiresReference;
    const refLabel = selectedConfig?.referenceLabel || 'Referencia';

    // Vuelto en vivo mientras se escribe el monto de efectivo (antes de "Agregar Pago").
    const previewChange = isCash ? Math.max(0, (parseAmount(amountInput) || 0) - balance) : 0;
    // Métodos que se pueden confirmar con un solo Enter (sin referencia ni pasarela externa).
    const isDirectMethod = !needsRef && selectedConfig?.type !== 'agilpay' && selectedConfig?.type !== 'ath_movil';

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
            setReferenceInput('');
            setAthInvoice(null);
            setAthQr('');
        }
    }, [isOpen, initialMethod]);

    useEffect(() => {
        if (!isOpen) return;
        // Efectivo: arranca en 0 para que el cajero cuente el efectivo recibido (billetes).
        // Otros métodos: prellenar con el saldo exacto (un Enter finaliza de una).
        setAmountInput(isCash ? '0.00' : (balance > 0 ? balance.toFixed(2) : '0.00'));
    }, [balance, isOpen, isCash]);

    // Atajos de teclado: F1..F5 seleccionan método; Enter agrega el pago o finaliza la venta.
    // F12 finaliza la venta SOLO cuando ya está totalmente pagada.
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: KeyboardEvent) => {
            const fk = /^F([1-9])$/.exec(e.key);
            if (fk) {
                const idx = Number(fk[1]) - 1;
                if (idx < methods.length) {
                    e.preventDefault();
                    setSelectedMethod(methods[idx].name);
                    focusAmount();
                }
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
        const res = evaluatePayment({ amountInput, balance, isCash, needsRef, hasReference: !!referenceInput.trim() });
        if (!res.ok) {
            if (res.error === 'invalid') toast.error('Monto inválido. Verifique el valor ingresado.');
            else if (res.error === 'exceeds') toast.error('El monto no puede superar el saldo pendiente para este método.');
            else toast.error(`Ingresa: ${refLabel}.`);
            return;
        }
        setPayments(prev => [...prev, {
            method: selectedMethod,
            amount: res.applied,
            ...(needsRef && referenceInput.trim() ? { reference: referenceInput.trim() } : {}),
        }]);
        setChangeDue(res.change);
        setReferenceInput('');
    };

    // Éxito de un cobro por gateway (ATH Móvil / AgilPay): registra el pago del saldo con la referencia.
    const handleGatewaySuccess = (ref: string) => {
        setReferenceInput(ref);
        const remaining = parseFloat(balance.toFixed(2));
        if (remaining > 0) {
            setPayments(prev => [...prev, { method: selectedMethod, amount: remaining, reference: ref }]);
        }
        toast.success('Pago recibido.');
    };

    // Genera un link/QR de pago ATH Móvil para el saldo actual (factura pública con monto exacto).
    const generateAthQr = async () => {
        const amount = parseFloat(balance.toFixed(2));
        if (amount <= 0) { toast.error('No hay saldo por cobrar.'); return; }
        setAthGenerating(true);
        try {
            const inv = await invoicesService.create({
                items: [{ name: 'Pago en caja', quantity: 1, unitPrice: amount }],
                taxRate: 0, // el monto ya es el total del saldo; no recalcular impuesto
                description: 'Cobro por ATH Móvil (caja)',
            });
            const QR = await import('qrcode');
            const url = await QR.toDataURL(publicLink(inv.publicToken), { width: 220, margin: 1 });
            setAthInvoice(inv);
            setAthQr(url);
        } catch {
            toast.error('No se pudo generar el link de pago.');
        } finally {
            setAthGenerating(false);
        }
    };

    const copyAthLink = async () => {
        if (!athInvoice) return;
        try { await navigator.clipboard.writeText(publicLink(athInvoice.publicToken)); toast.success('Link copiado'); }
        catch { toast.error('No se pudo copiar'); }
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
                 onFinalizeSale([...payments, { method: selectedMethod, amount: remaining }], changeDue);
            } else {
                 onFinalizeSale(payments, changeDue);
            }
        } else {
            onFinalizeSale(payments, changeDue);
        }
    };

    // Enter con un método directo (efectivo/tarjeta/crédito/factura) que ya cubre el saldo:
    // aplica el pago y finaliza la venta en un solo paso (muestra el cambio en el recibo).
    const tryQuickFinalize = (): boolean => {
        if (isFullyPaid || !isDirectMethod) return false;
        if (!coversBalance(amountInput, balance)) return false; // no cubre el saldo aún
        const amount = round2(parseAmount(amountInput));
        const applied = Math.min(amount, balance);
        const change = Math.max(0, amount - balance);
        onFinalizeSale([...payments, { method: selectedMethod, amount: applied }], change);
        return true;
    };

    // Enter: si un método directo cubre el saldo → aplica y finaliza de una;
    // si ya está pagado → finaliza; si no → agrega el pago.
    onEnterRef.current = () => {
        if (isFullyPaid) {
            handleFinalize();
        } else if (!tryQuickFinalize()) {
            handleAddPayment();
        }
    };
    // F12: finaliza solo cuando ya no queda saldo (cobro completado).
    finalizeIfPaidRef.current = () => {
        if (isFullyPaid) handleFinalize();
        else toast.error('Aún falta saldo por pagar.');
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Procesar Venta" size="full">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                {/* Left Panel: Totals & Applied Payments */}
                <div className="flex flex-col space-y-4">
                    {changeDue > 0.001 ? (
                        <div className="bg-green-50 dark:bg-green-900/30 text-center p-6 rounded-lg">
                            <p className="text-base font-medium text-green-700 dark:text-green-300">Cambio a devolver</p>
                            <p className="text-6xl sm:text-7xl font-bold text-green-600 dark:text-green-400">${changeDue.toFixed(2)}</p>
                        </div>
                    ) : (
                        <div className="bg-red-50 dark:bg-red-900/30 text-center p-6 rounded-lg">
                            <p className="text-base font-medium text-red-700 dark:text-red-300">Saldo Pendiente</p>
                            <p className="text-6xl sm:text-7xl font-bold text-red-600 dark:text-red-400">${Math.max(0, balance).toFixed(2)}</p>
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
                                        <span>{p.method}{p.reference ? ` (${p.reference})` : ''}:</span>
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
                    <h3 className="text-lg font-semibold text-neutral-700 dark:text-neutral-200">Seleccione Método y Monto:</h3>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {methods.map((m, i) => (
                            <button
                                key={m.name}
                                type="button"
                                onClick={() => { setSelectedMethod(m.name); focusAmount(); }}
                                title={`Atajo: F${i + 1}`}
                                className={`relative p-4 border rounded-lg text-lg font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-neutral-800 ${
                                    selectedMethod === m.name
                                        ? 'border-teal-500 ring-2 ring-teal-300 dark:ring-teal-600 bg-teal-50 dark:bg-teal-900/50'
                                        : 'border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                                }`}
                            >
                                {i < 9 && <span className="absolute top-1 left-1.5 text-xs font-bold text-neutral-400 dark:text-neutral-500">F{i + 1}</span>}
                                {m.name}
                            </button>
                        ))}
                    </div>

                    <div className="space-y-1">
                        <label htmlFor="paymentAmount" className="text-base font-medium">
                            Monto para {selectedMethod}
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                id="paymentAmount"
                                ref={amountInputRef}
                                type="text"
                                inputMode="decimal"
                                value={amountInput}
                                onChange={(e) => setAmountInput(e.target.value)}
                                className="w-full text-2xl px-3 py-2.5 border-teal-400 border-2 rounded-md focus:ring-teal-500 focus:border-teal-500 dark:bg-neutral-700"
                                autoComplete="off"
                            />
                            <button
                                type="button"
                                onClick={handleAddPayment}
                                className="px-5 py-2.5 whitespace-nowrap bg-neutral-200 dark:bg-neutral-600 rounded-md text-base font-semibold hover:bg-neutral-300 dark:hover:bg-neutral-500 disabled:opacity-50"
                                disabled={isFullyPaid}
                            >
                                Agregar Pago
                            </button>
                        </div>

                        {/* ATH Móvil en vivo (si hay token configurado): botón oficial de pago. */}
                        {selectedConfig?.type === 'ath_movil' && selectedConfig?.config?.publicToken && !isFullyPaid && (
                            <div className="pt-2">
                                <AthMovilButton
                                    publicToken={selectedConfig.config.publicToken}
                                    environment={selectedConfig.config.environment || 'production'}
                                    total={parseFloat(balance.toFixed(2))}
                                    subtotal={subtotalAmount}
                                    tax={taxAmount}
                                    items={athItems}
                                    onSuccess={handleGatewaySuccess}
                                    onFail={(m) => toast.error(m)}
                                />
                                <p className="text-xs text-neutral-400">O ingresa el número de confirmación manualmente abajo.</p>
                            </div>
                        )}

                        {/* ATH Móvil por QR/link: el cliente escanea, paga y el cajero confirma manualmente. */}
                        {selectedConfig?.type === 'ath_movil' && !isFullyPaid && (
                            <div className="pt-2 border border-neutral-200 dark:border-neutral-600 rounded-md p-3 space-y-2">
                                {!athInvoice ? (
                                    <button
                                        type="button"
                                        onClick={generateAthQr}
                                        disabled={athGenerating || balance <= 0}
                                        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold py-2 rounded-md"
                                    >
                                        {athGenerating ? 'Generando…' : `Generar QR / link de pago · $${Math.max(0, balance).toFixed(2)}`}
                                    </button>
                                ) : (
                                    <div className="text-center space-y-2">
                                        <p className="text-xs text-neutral-500">El cliente escanea el QR o abre el link para pagar. Luego confirma el número abajo.</p>
                                        {athQr && <img src={athQr} alt="QR de pago" className="mx-auto rounded-md border border-neutral-200 dark:border-neutral-700" />}
                                        <div className="flex gap-2">
                                            <input readOnly value={publicLink(athInvoice.publicToken)} onFocus={e => e.currentTarget.select()} className="w-full text-xs px-2 py-1.5 border border-neutral-300 dark:border-neutral-600 rounded-md dark:bg-neutral-700" />
                                            <button type="button" onClick={copyAthLink} className="px-3 py-1.5 text-xs font-semibold bg-neutral-200 dark:bg-neutral-600 rounded-md hover:bg-neutral-300 dark:hover:bg-neutral-500">Copiar</button>
                                        </div>
                                        <a href={publicLink(athInvoice.publicToken)} target="_blank" rel="noreferrer" className="inline-block text-xs text-teal-600 dark:text-teal-400 hover:underline">Abrir vista del cliente ↗</a>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* AgilPay (Dynamics Payments): cobro real con tarjeta si está configurado. */}
                        {selectedConfig?.type === 'agilpay' && selectedConfig?.config?.merchantKey && selectedConfig?.config?.clientId && !isFullyPaid && (
                            <AgilPayCardForm
                                amount={parseFloat(balance.toFixed(2))}
                                tax={taxAmount}
                                customerName={customerName}
                                customerEmail={customerEmail}
                                onSuccess={handleGatewaySuccess}
                            />
                        )}

                        {/* Métodos con referencia (cheque, confirmación ATH Móvil, etc.) */}
                        {needsRef && (
                            <div className="pt-2">
                                <label htmlFor="paymentReference" className="block text-sm font-medium mb-1">{refLabel}</label>
                                <input
                                    id="paymentReference"
                                    type="text"
                                    value={referenceInput}
                                    onChange={(e) => setReferenceInput(e.target.value)}
                                    placeholder={refLabel}
                                    autoComplete="off"
                                    className="w-full text-base px-3 py-1.5 border border-neutral-300 dark:border-neutral-600 rounded-md focus:ring-teal-500 focus:border-teal-500 dark:bg-neutral-700"
                                />
                            </div>
                        )}

                        {/* Efectivo: billetes que SE SUMAN (contar el recibido) + Exacto/Limpiar + vuelto en vivo */}
                        {isCash && (
                            <div className="pt-2 space-y-2">
                                <div className="flex flex-wrap gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => setAmountInput(balance > 0 ? balance.toFixed(2) : '0.00')}
                                        className="px-4 py-2 text-base font-semibold rounded-md border border-teal-400 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-900/40"
                                    >
                                        Exacto
                                    </button>
                                    {CASH_DENOMINATIONS.map(amt => (
                                        <button
                                            key={amt}
                                            type="button"
                                            onClick={() => setAmountInput(prev => round2((parseAmount(prev) || 0) + amt).toFixed(2))}
                                            className="px-4 py-2 text-base font-semibold rounded-md border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                                        >
                                            +${amt}
                                        </button>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={() => setAmountInput('0.00')}
                                        className="px-4 py-2 text-base font-semibold rounded-md border border-red-300 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
                                    >
                                        Limpiar
                                    </button>
                                </div>
                                {previewChange > 0.001 && (
                                    <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                                        Vuelto: ${previewChange.toFixed(2)}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            <div className="flex justify-end items-stretch space-x-3 mt-6 pt-4 border-t dark:border-neutral-600">
                <button type="button" onClick={onClose} className={`${BUTTON_SECONDARY_CLASSES} !text-lg !px-8`}>
                    Cancelar
                </button>
                <button
                    type="button"
                    onClick={handleFinalize}
                    className={`${BUTTON_PRIMARY_CLASSES} bg-green-600 hover:bg-green-700 disabled:bg-gray-400 !text-2xl !px-10 !py-4`}
                    disabled={balance > 0.001}
                >
                    Finalizar Venta <span className="ml-2 text-sm opacity-80">(Enter / F12)</span>
                </button>
            </div>
        </Modal>
    );
};