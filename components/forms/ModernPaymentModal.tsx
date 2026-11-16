import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from '../Modal';
import { AthMovilButton } from '../pos/AthMovilButton';
import { AgilPayCardForm } from '../pos/AgilPayCardForm';
import { invoicesService, type Invoice, type PublicInvoice } from '../../services/invoices';
import { parseAmount, round2, computeBalance, evaluatePayment, coversBalance, suggestCashAmounts } from './paymentMath';
import { getPrintFormat, setPrintFormat, type PrintFormat } from '../../services/receiptPrinter';
import { toast } from 'react-hot-toast';
import type { PaymentMethodOption } from './PaymentModal';

/**
 * Pago de la caja MODERNA (evaluación UX). Misma lógica de cobro que PaymentModal (pago dividido,
 * vuelto, ATH Móvil por QR con sondeo, AgilPay, referencias), con estos cambios:
 *  - Tecla FIJA por método (F1 Efectivo, F2 Tarjeta, F3 ATH Móvil, F4 AgilPay, F5 Cuenta del cliente,
 *    F6 Cheque), igual que en la pantalla de la caja.
 *  - Efectivo: "Exacto" + billetes sugeridos según lo que falta ($484 → $485, $490, $500, $600).
 *  - F12 = "Cobrar y finalizar": si el monto cubre lo que falta, registra el pago y finaliza en un paso.
 *    Enter solo agrega el pago (se usa al escribir montos y referencias; no cierra la venta por error).
 *  - "Cuenta del cliente" (antes "Crédito C."): línea de crédito, balance, disponible y cómo queda.
 *  - Resumen a la derecha: Total, Pagado, Falta y Cambio, cada uno con su color.
 */

const publicLink = (token: string) => `${window.location.origin}/pay/${token}`;
const money = (n: number) => `$${(Number(n) || 0).toFixed(2)}`;

interface Payment { method: string; amount: number; reference?: string }

export const FIXED_METHOD_KEYS: Record<string, string> = { cash: 'F1', card: 'F2', ath_movil: 'F3', agilpay: 'F4', credit: 'F5', check: 'F6' };
const TYPE_ORDER = ['cash', 'card', 'ath_movil', 'agilpay', 'credit', 'check'];
export const methodDisplayName = (m: { type?: string; name: string }) => (m.type === 'credit' ? 'Cuenta del cliente' : m.name);

export interface ModernPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    totalAmount: number;
    subtotalAmount?: number;
    taxAmount?: number;
    athItems?: { name: string; quantity: number; price: number }[];
    customerName?: string;
    customerEmail?: string;
    /** "Visitante" o el nombre del cliente, y cuántos artículos lleva (subtítulo). */
    customerLabel: string;
    itemsCount: number;
    /** Cliente general (Visitante): no puede cargar a su cuenta. */
    isGeneralClient: boolean;
    /** Crédito del cliente (para "Cuenta del cliente"). */
    credit?: { limit: number; balance: number; terms?: string | null };
    initialMethod: string;
    methods: PaymentMethodOption[];
    onFinalizeSale: (payments: Payment[], changeDue?: number) => void;
    completed?: { saleNumber: string; total: number; received: number; change: number; methods: string } | null;
    processing?: boolean;
}

const Kbd: React.FC<{ k: string }> = ({ k }) => (
    <span className="ml-1.5 rounded px-1 py-px text-[10px] font-bold leading-none border border-current opacity-60">{k}</span>
);

export const ModernPaymentModal: React.FC<ModernPaymentModalProps> = ({
    isOpen, onClose, totalAmount, subtotalAmount, taxAmount, athItems, customerName, customerEmail,
    customerLabel, itemsCount, isGeneralClient, credit, initialMethod, methods, onFinalizeSale, completed, processing,
}) => {
    // Métodos en orden de tecla fija; los personalizados al final.
    const ordered = useMemo(() => [...methods].sort((a, b) => {
        const ia = TYPE_ORDER.indexOf(a.type), ib = TYPE_ORDER.indexOf(b.type);
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    }), [methods]);

    const [payments, setPayments] = useState<Payment[]>([]);
    const [selectedMethod, setSelectedMethod] = useState<string>(initialMethod);
    const [amountInput, setAmountInput] = useState('');
    const [referenceInput, setReferenceInput] = useState('');
    const [changeDue, setChangeDue] = useState(0);
    const [printFormat, setPrintFormatState] = useState<PrintFormat>(getPrintFormat());
    const changeFormat = (f: PrintFormat) => { setPrintFormat(f); setPrintFormatState(f); };
    const [athInvoice, setAthInvoice] = useState<Invoice | null>(null);
    const [athQr, setAthQr] = useState('');
    const [athGenerating, setAthGenerating] = useState(false);
    const [athPaidMsg, setAthPaidMsg] = useState<string | null>(null);
    const athHandledRef = useRef(false);
    const athDetectRef = useRef<(pub: PublicInvoice) => void>(() => {});
    const amountInputRef = useRef<HTMLInputElement>(null);
    const keyRef = useRef<(e: KeyboardEvent) => void>(() => {});

    const totalPaid = useMemo(() => payments.reduce((s, p) => s + p.amount, 0), [payments]);
    const balance = computeBalance(totalAmount, totalPaid);
    const isFullyPaid = balance <= 0.001;
    const selectedConfig = useMemo(() => methods.find(m => m.name === selectedMethod), [methods, selectedMethod]);
    const type = selectedConfig?.type || 'custom';
    const isCash = type === 'cash';
    const isAth = type === 'ath_movil';
    const isCredit = type === 'credit';
    const needsRef = !!selectedConfig?.requiresReference && !isAth;
    const showRefField = needsRef || isAth;
    const refLabel = selectedConfig?.referenceLabel || 'Referencia';
    const isDirectMethod = !needsRef && type !== 'agilpay' && type !== 'ath_movil';

    const typedCash = isCash ? (parseAmount(amountInput) || 0) : 0;
    const liveChange = round2(changeDue + Math.max(0, typedCash - balance));
    const livePaid = round2(totalPaid + changeDue + typedCash);
    const livePending = Math.max(0, round2(balance - typedCash));
    const suggestions = isCash ? suggestCashAmounts(balance) : [];

    // Cuenta del cliente: cómo queda con lo que se va a cargar.
    const creditCharge = isCredit ? (parseAmount(amountInput) || 0) : 0;
    const creditLimit = credit?.limit || 0;
    const creditBalance = credit?.balance || 0;
    const creditAvailable = Math.max(0, round2(creditLimit - creditBalance));
    // Sin límite asignado (0) = sin tope, igual que la caja clásica; solo el Visitante no tiene cuenta.
    const creditOver = isCredit && creditLimit > 0 && creditCharge > creditAvailable + 0.001;
    const creditBlocked = isCredit && isGeneralClient;

    const focusAmount = () => setTimeout(() => { amountInputRef.current?.focus(); amountInputRef.current?.select(); }, 0);

    useEffect(() => {
        if (!isOpen) return;
        setPayments([]); setSelectedMethod(initialMethod); setChangeDue(0); setReferenceInput('');
        setAthInvoice(null); setAthQr(''); setAthPaidMsg(null); athHandledRef.current = false;
    }, [isOpen, initialMethod]);

    useEffect(() => {
        if (!isOpen) return;
        // Efectivo arranca vacío (se escribe lo recibido); los demás, con lo que falta.
        setAmountInput(isCash ? '' : (balance > 0 ? balance.toFixed(2) : ''));
    }, [balance, isOpen, isCash]);
    useEffect(() => { if (isOpen) focusAmount(); }, [isOpen, selectedMethod]);

    // ATH Móvil por QR: sondeo del pago cada 4 s (igual que la caja clásica).
    useEffect(() => {
        if (!isOpen || !athInvoice) return;
        athHandledRef.current = false;
        const token = athInvoice.publicToken;
        let stop = false;
        const tick = async () => {
            if (stop || athHandledRef.current) return;
            try {
                const pub = await invoicesService.getPublic(token);
                if (pub.amountPaid > 0 || pub.status === 'paid' || pub.status === 'partial') athDetectRef.current(pub);
            } catch { /* reintenta */ }
        };
        const id = window.setInterval(tick, 4000);
        tick();
        return () => { stop = true; window.clearInterval(id); };
    }, [isOpen, athInvoice?.publicToken]);

    const selectMethod = (name: string) => { setSelectedMethod(name); focusAmount(); };

    const addPayment = (): boolean => {
        if (isCredit && creditBlocked) { toast.error('El Visitante no tiene cuenta. Asigne un cliente para cargar a su cuenta.'); return false; }
        if (creditOver) { toast.error(`No alcanza el crédito: disponible ${money(creditAvailable)}. Divida el pago con otro método.`); return false; }
        const res = evaluatePayment({ amountInput, balance, isCash, needsRef, hasReference: !!referenceInput.trim() });
        if (!res.ok) {
            if (res.error === 'invalid') toast.error('Escriba un monto válido.');
            else if (res.error === 'exceeds') toast.error('El monto no puede ser mayor que lo que falta (solo efectivo da cambio).');
            else toast.error(`Escriba ${refLabel}.`);
            return false;
        }
        setPayments(prev => [...prev, { method: selectedMethod, amount: res.applied!, ...(referenceInput.trim() ? { reference: referenceInput.trim() } : {}) }]);
        setChangeDue(res.change!);
        setReferenceInput('');
        return true;
    };

    const gatewaySuccess = (ref: string) => {
        const remaining = round2(balance);
        if (remaining > 0) setPayments(prev => [...prev, { method: selectedMethod, amount: remaining, reference: ref }]);
        toast.success('Pago recibido.');
    };

    const generateAthQr = async () => {
        const amount = round2(balance);
        if (amount <= 0) return;
        setAthGenerating(true); setAthPaidMsg(null); athHandledRef.current = false;
        try {
            const inv = await invoicesService.create({ items: [{ name: 'Pago en caja', quantity: 1, unitPrice: amount }], taxRate: 0, description: 'Cobro por ATH Móvil (caja)', allowedMethods: 'ath' });
            const QR = await import('qrcode');
            setAthQr(await QR.toDataURL(publicLink(inv.publicToken), { width: 220, margin: 1 }));
            setAthInvoice(inv);
        } catch { toast.error('No se pudo generar el código de ATH Móvil.'); }
        finally { setAthGenerating(false); }
    };
    athDetectRef.current = (pub) => {
        if (athHandledRef.current) return;
        const paid = Math.min(round2(pub.amountPaid || 0), round2(balance));
        if (paid <= 0.001) return;
        athHandledRef.current = true;
        const ref = pub.paidReference || pub.payments?.[pub.payments.length - 1]?.reference || 'ATH Móvil';
        setPayments(prev => [...prev, { method: selectedMethod, amount: paid, reference: ref || undefined }]);
        setAthPaidMsg('Pago de ATH Móvil recibido.');
        toast.success('ATH Móvil: pago recibido.');
    };

    const removePayment = (i: number) => { setPayments(prev => prev.filter((_, k) => k !== i)); setChangeDue(0); };

    /** Cobrar y finalizar (F12 / botón): si lo escrito cubre lo que falta, lo registra y cierra la venta. */
    const chargeAndFinish = () => {
        if (processing) return;
        if (isFullyPaid) { onFinalizeSale(payments, changeDue); return; }
        if (isDirectMethod && coversBalance(amountInput, balance)) {
            if (isCredit && (creditBlocked || creditOver)) { addPayment(); return; }
            const amount = round2(parseAmount(amountInput));
            const applied = Math.min(amount, balance);
            onFinalizeSale([...payments, { method: selectedMethod, amount: applied, ...(referenceInput.trim() ? { reference: referenceInput.trim() } : {}) }], round2(changeDue + Math.max(0, amount - balance)));
            return;
        }
        // No cubre: agrega lo que haya escrito y avisa cuánto falta.
        if (parseAmount(amountInput) > 0 && addPayment()) return;
        toast.error(`Falta ${money(balance)} por cobrar.`);
    };

    keyRef.current = (e: KeyboardEvent) => {
        if (completed) {
            if ((e.key === 'Enter') && Number(document.body.dataset.modalCount || '0') <= 1) { e.preventDefault(); onClose(); }
            return;
        }
        if (processing) { if (e.key === 'Enter' || e.key === 'F12') e.preventDefault(); return; }
        const t = Object.entries(FIXED_METHOD_KEYS).find(([, k]) => k === e.key)?.[0];
        if (t) {
            e.preventDefault();
            const m = methods.find(mm => mm.type === t);
            if (m) selectMethod(m.name); else toast.error('Ese método no está habilitado en esta caja.');
            return;
        }
        if (e.key === 'F12') { e.preventDefault(); chargeAndFinish(); return; }
        if (e.key === 'Enter') {
            // Enter en el monto o la referencia: agrega el pago (no finaliza).
            const el = document.activeElement as HTMLElement | null;
            if (el && (el.id === 'mpAmount' || el.id === 'mpReference')) { e.preventDefault(); if (!isFullyPaid) addPayment(); }
        }
    };
    useEffect(() => {
        if (!isOpen) return;
        const h = (e: KeyboardEvent) => keyRef.current(e);
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [isOpen]);

    const subtitle = `Escoja cómo paga el cliente y finalice la venta. ${customerLabel} · ${itemsCount} artículo${itemsCount === 1 ? '' : 's'}`;

    // ── Venta terminada ──
    if (completed) {
        return (
            <Modal isOpen={isOpen} onClose={onClose} title="Venta completada" size="3xl"
                footer={<div className="flex justify-end"><button type="button" onClick={onClose} className="h-14 px-8 rounded-xl bg-primary hover:bg-secondary text-white text-lg font-bold">Nueva venta <span className="ml-1 text-sm opacity-80">(Enter)</span></button></div>}>
                <div className="space-y-4">
                    <p className="text-neutral-600 dark:text-neutral-300">Venta #{completed.saleNumber} · {completed.methods}</p>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 p-4"><div className="text-sm text-neutral-500">Total</div><div className="text-3xl font-bold tabular-nums">{money(completed.total)}</div></div>
                        <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 p-4"><div className="text-sm text-neutral-500">Recibido</div><div className="text-3xl font-bold tabular-nums">{money(completed.received)}</div></div>
                    </div>
                    <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 p-6 flex items-center justify-between">
                        <span className="text-2xl font-semibold text-emerald-800 dark:text-emerald-300">Cambio</span>
                        <span className="text-7xl font-extrabold tabular-nums text-emerald-700 dark:text-emerald-300">{money(completed.change)}</span>
                    </div>
                </div>
            </Modal>
        );
    }

    const canFinish = !processing && (isFullyPaid || (isDirectMethod && coversBalance(amountInput, balance) && !(isCredit && (creditBlocked || creditOver))));
    const footer = (
        <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-4 text-sm">
                <span className="text-neutral-600 dark:text-neutral-300 font-medium">Imprimir:</span>
                <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" name="mpPrint" checked={printFormat === 'recibo'} onChange={() => changeFormat('recibo')} className="h-4 w-4" />Recibo</label>
                <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" name="mpPrint" checked={printFormat === 'factura'} onChange={() => changeFormat('factura')} className="h-4 w-4" />Factura</label>
            </div>
            <div className="flex gap-2">
                <button type="button" onClick={onClose} className="h-14 px-6 rounded-xl text-base font-semibold bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-700 dark:hover:bg-neutral-600">Cancelar</button>
                <button type="button" onClick={chargeAndFinish} disabled={!canFinish}
                    className="h-14 px-8 rounded-xl text-lg font-bold bg-primary hover:bg-secondary text-white disabled:bg-neutral-300 disabled:text-neutral-500 dark:disabled:bg-neutral-700 dark:disabled:text-neutral-500 disabled:cursor-not-allowed">
                    {processing ? 'Registrando…' : <>Cobrar y finalizar <span className="ml-1 text-sm opacity-80">(F12)</span></>}
                </button>
            </div>
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Procesar pago" size="6xl" footer={footer}>
            <p className="text-sm text-neutral-600 dark:text-neutral-300 -mt-2 mb-4">{subtitle}</p>

            {/* Métodos con tecla fija */}
            <div className="flex flex-wrap gap-2 mb-5">
                {ordered.map(m => {
                    const k = FIXED_METHOD_KEYS[m.type];
                    const active = selectedMethod === m.name;
                    const off = m.type === 'credit' && isGeneralClient;
                    return (
                        <button key={m.name} type="button" onClick={() => selectMethod(m.name)} title={off ? 'Requiere un cliente' : undefined}
                            className={`h-12 px-4 rounded-xl text-base font-semibold border-2 flex items-center transition-colors ${active ? 'border-primary bg-primary text-white' : 'border-neutral-200 dark:border-neutral-700 hover:border-primary'} ${off ? 'opacity-50' : ''}`}>
                            {methodDisplayName(m)}{k && <Kbd k={k} />}
                        </button>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-6">
                {/* Izquierda: lo que se cobra con este método */}
                <div className="space-y-3">
                    {isCredit ? (
                        <>
                            <label htmlFor="mpAmount" className="block text-sm font-semibold text-neutral-700 dark:text-neutral-200">Cargar a la cuenta</label>
                            {creditBlocked ? (
                                <div className="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-4 text-amber-900 dark:text-amber-200">
                                    El Visitante no tiene cuenta. Asigne un cliente (tecla U en la caja) para cargar a su cuenta.
                                </div>
                            ) : (
                                <>
                                    <AmountInput value={amountInput} onChange={setAmountInput} inputRef={amountInputRef} />
                                    <div className="grid grid-cols-3 gap-2">
                                        <Stat label="Línea de crédito" value={creditLimit > 0 ? money(creditLimit) : 'Sin límite'} />
                                        <Stat label="Balance actual" value={money(creditBalance)} />
                                        <Stat label="Disponible" value={creditLimit > 0 ? money(creditAvailable) : '—'} tone={creditOver ? 'red' : 'green'} />
                                    </div>
                                    <p className={`text-sm ${creditOver ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-neutral-600 dark:text-neutral-300'}`}>
                                        {creditOver
                                            ? `No alcanza: faltan ${money(creditCharge - creditAvailable)} de crédito. Cargue hasta ${money(creditAvailable)} y cobre el resto con otro método.`
                                            : `Después de esta venta: balance ${money(creditBalance + creditCharge)}${creditLimit > 0 ? ` · disponible ${money(Math.max(0, creditAvailable - creditCharge))}` : ''}`}
                                        {credit?.terms ? ` · Términos: ${credit.terms}` : ''}
                                    </p>
                                </>
                            )}
                        </>
                    ) : (
                        <>
                            <label htmlFor="mpAmount" className="block text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                                {isCash ? 'Efectivo recibido' : `Monto con ${methodDisplayName(selectedConfig || { name: selectedMethod })}`}
                                {!isFullyPaid && <span className="font-normal text-neutral-500 dark:text-neutral-400"> · falta {money(balance)}</span>}
                            </label>
                            <AmountInput value={amountInput} onChange={setAmountInput} inputRef={amountInputRef} disabled={isFullyPaid} />
                            {isCash && !isFullyPaid && (
                                <div className="flex flex-wrap gap-2 items-center">
                                    <button type="button" onClick={() => setAmountInput(balance.toFixed(2))} className="h-11 px-4 rounded-lg border-2 border-primary text-primary font-semibold hover:bg-primary/5">Exacto {money(balance)}</button>
                                    {suggestions.map(v => (
                                        <button key={v} type="button" onClick={() => setAmountInput(v.toFixed(2))} className="h-11 px-4 rounded-lg border border-neutral-300 dark:border-neutral-600 font-semibold hover:border-primary">${v % 1 ? v.toFixed(2) : v}</button>
                                    ))}
                                    <span className="text-sm text-neutral-500 dark:text-neutral-400">o escriba el monto</span>
                                </div>
                            )}
                        </>
                    )}

                    {showRefField && !isFullyPaid && (
                        <div>
                            <label htmlFor="mpReference" className="block text-sm font-medium mb-1">{refLabel}{!needsRef ? ' (opcional)' : ''}</label>
                            <input id="mpReference" type="text" value={referenceInput} onChange={e => setReferenceInput(e.target.value)} autoComplete="off"
                                className="w-full h-11 px-3 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900" />
                        </div>
                    )}

                    {isAth && selectedConfig?.config?.publicToken && !isFullyPaid && (
                        <AthMovilButton publicToken={selectedConfig.config.publicToken} environment={selectedConfig.config.environment || 'production'}
                            total={round2(balance)} subtotal={subtotalAmount} tax={taxAmount} items={athItems} onSuccess={gatewaySuccess} onFail={m => toast.error(m)} />
                    )}
                    {isAth && !isFullyPaid && (
                        <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 p-3">
                            {!athInvoice ? (
                                <button type="button" onClick={generateAthQr} disabled={athGenerating} className="w-full h-11 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
                                    {athGenerating && <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />}
                                    {athGenerating ? 'Generando código…' : `Generar QR de ATH Móvil por ${money(balance)}`}
                                </button>
                            ) : athPaidMsg ? (
                                <p className="text-center font-semibold text-emerald-700 dark:text-emerald-300 py-3">{athPaidMsg}</p>
                            ) : (
                                <div className="text-center space-y-2">
                                    {athQr && <img src={athQr} alt="Código QR de ATH Móvil" className="mx-auto rounded-md border border-neutral-200 dark:border-neutral-700" />}
                                    <p className="flex items-center justify-center gap-2 text-sm text-indigo-600 dark:text-indigo-400"><span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />Esperando el pago del cliente… se registra solo.</p>
                                    <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(publicLink(athInvoice.publicToken)); toast.success('Enlace copiado.'); } catch { /* */ } }} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Copiar enlace de pago</button>
                                </div>
                            )}
                        </div>
                    )}
                    {type === 'agilpay' && selectedConfig?.config?.merchantKey && selectedConfig?.config?.clientId && !isFullyPaid && (
                        <AgilPayCardForm amount={round2(balance)} tax={taxAmount} customerName={customerName} customerEmail={customerEmail} onSuccess={gatewaySuccess} />
                    )}

                    {!isFullyPaid && !creditBlocked && (
                        <button type="button" onClick={addPayment} className="h-11 px-4 rounded-lg border border-neutral-300 dark:border-neutral-600 text-sm font-semibold hover:border-primary">
                            Agregar este pago y cobrar el resto con otro método <span className="text-xs opacity-60">(Enter)</span>
                        </button>
                    )}
                </div>

                {/* Derecha: resumen */}
                <div className="rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 flex flex-col gap-3">
                    <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-1.5">Pagos aplicados</div>
                        {payments.length === 0 ? (
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">Todavía no hay pagos.</p>
                        ) : (
                            <ul className="space-y-1.5">
                                {payments.map((p, i) => (
                                    <li key={i} className="flex items-center gap-2 text-sm">
                                        <span className="flex-1 truncate">{methodDisplayName(methods.find(m => m.name === p.method) || { name: p.method })}{p.reference ? ` · ${p.reference}` : ''}</span>
                                        <span className="font-semibold tabular-nums">{money(p.amount)}</span>
                                        <button type="button" onClick={() => removePayment(i)} className="w-8 h-8 rounded-md text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30" aria-label="Quitar pago">✕</button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <div className="border-t border-neutral-200 dark:border-neutral-800 pt-3 space-y-1.5">
                        <Row label="Total" value={money(totalAmount)} strong />
                        <Row label="Pagado" value={money(livePaid)} />
                        <Row label="Falta" value={money(livePending)} tone={livePending > 0.001 ? 'red' : undefined} />
                    </div>
                    <div className={`rounded-xl p-3 flex items-center justify-between ${liveChange > 0 ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-white dark:bg-neutral-800'}`}>
                        <span className="font-semibold text-emerald-800 dark:text-emerald-300">Cambio</span>
                        <span className="text-4xl font-extrabold tabular-nums text-emerald-700 dark:text-emerald-300">{money(liveChange)}</span>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

const AmountInput: React.FC<{ value: string; onChange: (v: string) => void; inputRef: React.RefObject<HTMLInputElement>; disabled?: boolean }> = ({ value, onChange, inputRef, disabled }) => (
    <div className="flex items-center h-20 rounded-xl border-2 border-primary bg-white dark:bg-neutral-900 px-4 focus-within:ring-4 focus-within:ring-primary/20">
        <span className="text-3xl font-bold text-neutral-400 mr-2">$</span>
        <input id="mpAmount" ref={inputRef} type="text" inputMode="decimal" value={value} onChange={e => onChange(e.target.value)} placeholder="0.00" autoComplete="off" disabled={disabled}
            className="flex-1 min-w-0 bg-transparent text-5xl font-bold tabular-nums focus:outline-none placeholder:text-neutral-300 dark:placeholder:text-neutral-600 disabled:opacity-40" />
    </div>
);
const Stat: React.FC<{ label: string; value: string; tone?: 'red' | 'green' }> = ({ label, value, tone }) => (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-2.5">
        <div className="text-[11px] text-neutral-500 dark:text-neutral-400">{label}</div>
        <div className={`text-lg font-bold tabular-nums ${tone === 'red' ? 'text-red-600 dark:text-red-400' : tone === 'green' ? 'text-emerald-700 dark:text-emerald-400' : ''}`}>{value}</div>
    </div>
);
const Row: React.FC<{ label: string; value: string; strong?: boolean; tone?: 'red' }> = ({ label, value, strong, tone }) => (
    <div className={`flex justify-between ${strong ? 'text-lg font-bold' : 'text-base'} ${tone === 'red' ? 'text-red-600 dark:text-red-400 font-semibold' : ''}`}>
        <span>{label}</span><span className="tabular-nums">{value}</span>
    </div>
);
