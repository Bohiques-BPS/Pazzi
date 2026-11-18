import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from '../Modal';
import { authService } from '../../services/auth';
import { ApiError } from '../../services/api';
import { PasswordInput } from '../ui/PasswordInput';

/**
 * Descuento de la caja MODERNA (evaluación UX). Sirve para una línea y para toda la orden:
 *  - Botones % / $ (las sugerencias cambian solas: 5/10/15 % o $5/$10/$20/$50).
 *  - Siempre se ve el resultado antes de aplicar: precio tachado, precio nuevo y cuánto se ahorra.
 *  - Motivo opcional (Cliente frecuente, Defecto/Promoción, Igualar precio, Otro → texto).
 *  - PIN de supervisor o gerente obligatorio; se guarda quién lo autorizó.
 *  - Límites: no más del 100 % ni más que el precio.
 */

export interface DiscountValue {
    type: 'percentage' | 'fixed';
    value: number;
    reason?: string | null;
    authorizedBy?: string | null;
}

const money = (n: number) => `$${(Number(n) || 0).toFixed(2)}`;
const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

export const ModernDiscountModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    /** 'line': un artículo (base = precio por unidad). 'order': toda la venta (base = subtotal). */
    mode: 'line' | 'order';
    /** Nombre del artículo (línea) o "Visitante · 9 artículos" (orden). */
    label: string;
    /** Precio por unidad (línea) o subtotal (orden). */
    base: number;
    /** Cantidad de la línea (para el ahorro total) — solo en línea. */
    quantity?: number;
    /** Total actual de la venta (orden): para mostrar el nuevo total con IVU recalculado. */
    orderTotal?: number;
    current?: DiscountValue | null;
    onApply: (d: DiscountValue) => void;
    onRemove?: () => void;
}> = ({ isOpen, onClose, mode, label, base, quantity = 1, orderTotal, current, onApply, onRemove }) => {
    const [type, setType] = useState<'percentage' | 'fixed'>('percentage');
    const [value, setValue] = useState('');
    const [reason, setReason] = useState<string | null>(null);
    const [otherText, setOtherText] = useState('');
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const valueRef = useRef<HTMLInputElement>(null);

    const REASONS = mode === 'line'
        ? ['Cliente frecuente', 'Defecto', 'Igualar precio', 'Otro']
        : ['Cliente frecuente', 'Promoción', 'Igualar precio', 'Otro'];
    const SUGGEST = type === 'percentage' ? [5, 10, 15] : [5, 10, 20, 50];

    useEffect(() => {
        if (!isOpen) return;
        setType(current?.type || 'percentage');
        setValue(current ? String(current.value) : '');
        const r = current?.reason || null;
        const known = r && REASONS.includes(r);
        setReason(r ? (known ? r : 'Otro') : null);
        setOtherText(r && !known ? r : '');
        setPin(''); setError('');
        setTimeout(() => valueRef.current?.focus(), 50);
    }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

    const v = parseFloat(value);
    const discountPerUnit = useMemo(() => {
        if (!(v > 0)) return 0;
        return round2(type === 'percentage' ? base * Math.min(v, 100) / 100 : Math.min(v, base));
    }, [v, type, base]);
    const newPrice = round2(base - discountPerUnit);
    const savings = mode === 'line' ? round2(discountPerUnit * quantity) : discountPerUnit;
    const pctEquivalent = base > 0 ? (discountPerUnit / base) * 100 : 0;
    // Orden: el IVU se recalcula sobre el subtotal rebajado (proporcional al total actual).
    const newOrderTotal = mode === 'order' && orderTotal != null && base > 0 ? round2(orderTotal * (newPrice / base)) : null;

    const finalReason = reason === 'Otro' ? (otherText.trim() || 'Otro') : reason;

    const apply = async () => {
        setError('');
        if (!(v > 0)) { setError('Escriba el descuento.'); return; }
        if (type === 'percentage' && v > 100) { setError('El descuento no puede pasar del 100 %.'); return; }
        if (type === 'fixed' && v > base + 0.001) { setError(`El descuento no puede ser mayor que ${money(base)}.`); return; }
        if (!pin.trim()) { setError('Escriba el PIN del supervisor o gerente.'); return; }
        setBusy(true);
        try {
            const r = await authService.verifySupervisorPin(pin.trim());
            const who = r?.manager ? `${r.manager.name || ''} ${r.manager.lastName || ''}`.trim() || r.manager.email : null;
            onApply({ type, value: round2(v), reason: finalReason || null, authorizedBy: who });
            onClose();
        } catch (err) {
            setError(err instanceof ApiError && err.status === 401 ? 'PIN incorrecto.' : (err instanceof ApiError ? err.message : 'No se pudo verificar el PIN.'));
        } finally { setBusy(false); }
    };

    const title = mode === 'line' ? `Descuento · ${label}` : 'Descuento general · Toda la orden';
    const subtitle = mode === 'line' ? 'Rebaje el precio de este artículo.' : `Rebaje el total de esta venta. ${label}`;
    const applyLabel = savings > 0 ? `Aplicar −${money(savings)}${mode === 'order' ? ' a la orden' : ''}` : 'Aplicar';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} size="lg"
            footer={
                <div className="flex items-center justify-between gap-2">
                    {current && onRemove
                        ? <button type="button" onClick={() => { onRemove(); onClose(); }} className="h-11 px-3 text-sm font-semibold text-red-600 dark:text-red-400 hover:underline">Quitar descuento</button>
                        : <span />}
                    <div className="flex gap-2">
                        <button type="button" onClick={onClose} className="h-11 px-5 rounded-lg font-semibold bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-700 dark:hover:bg-neutral-600">Cancelar</button>
                        <button type="button" onClick={apply} disabled={busy || !(v > 0)}
                            className="h-11 px-5 rounded-lg font-bold bg-primary hover:bg-secondary text-white disabled:bg-neutral-300 disabled:text-neutral-500 dark:disabled:bg-neutral-700 disabled:cursor-not-allowed">
                            {busy ? 'Verificando…' : applyLabel}
                        </button>
                    </div>
                </div>
            }>
            <form onSubmit={e => { e.preventDefault(); apply(); }} className="space-y-4">
                <p className="text-sm text-neutral-600 dark:text-neutral-300 -mt-2">{subtitle}</p>

                {current && mode === 'order' && (
                    <p className="text-xs rounded-md bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 px-3 py-2">
                        Ya hay un descuento general ({current.type === 'percentage' ? `${current.value}%` : money(current.value)}). Al aplicar, este lo reemplaza.
                    </p>
                )}

                {/* % / $ y sugerencias */}
                <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex rounded-lg ring-1 ring-inset ring-neutral-200 dark:ring-neutral-700 p-0.5">
                        {(['percentage', 'fixed'] as const).map(tp => (
                            <button key={tp} type="button" onClick={() => { setType(tp); setValue(''); valueRef.current?.focus(); }}
                                className={`h-9 w-12 rounded-md text-base font-bold ${type === tp ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900' : 'text-neutral-600 dark:text-neutral-300'}`}>
                                {tp === 'percentage' ? '%' : '$'}
                            </button>
                        ))}
                    </div>
                    {SUGGEST.map(sv => (
                        <button key={sv} type="button" onClick={() => setValue(String(sv))}
                            className={`h-10 px-3.5 rounded-lg text-sm font-semibold ring-1 ring-inset ${String(sv) === value ? 'ring-primary text-primary bg-primary/5' : 'ring-neutral-200 dark:ring-neutral-700 hover:ring-primary'}`}>
                            {type === 'percentage' ? `${sv}%` : `$${sv}`}
                        </button>
                    ))}
                </div>

                <div className="flex items-center h-16 rounded-xl border-2 border-primary bg-white dark:bg-neutral-900 px-4 focus-within:ring-4 focus-within:ring-primary/20">
                    {type === 'fixed' && <span className="text-2xl font-bold text-neutral-400 mr-2">$</span>}
                    <input ref={valueRef} type="text" inputMode="decimal" value={value} onChange={e => setValue(e.target.value.replace(/[^\d.]/g, ''))} placeholder="0"
                        className="flex-1 min-w-0 bg-transparent text-4xl font-bold tabular-nums focus:outline-none placeholder:text-neutral-300 dark:placeholder:text-neutral-600" />
                    {type === 'percentage' && <span className="text-2xl font-bold text-neutral-400 ml-2">%</span>}
                </div>

                {/* Resultado antes de aplicar */}
                <div className="rounded-xl bg-neutral-50 dark:bg-neutral-900 ring-1 ring-inset ring-neutral-200 dark:ring-neutral-800 p-4">
                    {mode === 'line' ? (
                        <div className="flex items-baseline justify-between gap-3 flex-wrap">
                            <div className="flex items-baseline gap-3">
                                <span className={`text-lg tabular-nums ${discountPerUnit > 0 ? 'line-through text-neutral-400' : 'font-bold'}`}>{money(base)}</span>
                                {discountPerUnit > 0 && <span className="text-2xl font-extrabold tabular-nums">{money(newPrice)}</span>}
                                <span className="text-xs text-neutral-500">c/u</span>
                            </div>
                            {discountPerUnit > 0 && (
                                <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                                    Ahorro: {money(savings)}{quantity > 1 ? ` (${quantity} u.)` : ''}{type === 'fixed' ? ` · equivale a ${Math.round(pctEquivalent)}%` : ''}
                                </span>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-1 text-sm">
                            <div className="flex justify-between"><span className="text-neutral-500">Subtotal</span><span className="tabular-nums">{money(base)}</span></div>
                            <div className="flex justify-between text-emerald-700 dark:text-emerald-400"><span>Descuento{type === 'percentage' && v > 0 ? ` ${v}%` : ''}</span><span className="tabular-nums">−{money(discountPerUnit)}</span></div>
                            {newOrderTotal != null && (
                                <div className="flex justify-between items-baseline pt-1.5 border-t border-neutral-200 dark:border-neutral-800">
                                    <span className="font-semibold">Nuevo total <span className="text-xs font-normal text-neutral-500">(IVU recalculado)</span></span>
                                    <span className="tabular-nums">
                                        {discountPerUnit > 0 && <span className="line-through text-neutral-400 mr-2">{money(orderTotal!)}</span>}
                                        <span className="text-xl font-extrabold">{money(newOrderTotal)}</span>
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Motivo (opcional) */}
                <div>
                    <div className="text-sm font-medium mb-1.5">Motivo <span className="text-neutral-400 font-normal">(opcional)</span></div>
                    <div className="flex flex-wrap gap-2">
                        {REASONS.map(r => (
                            <button key={r} type="button" onClick={() => setReason(prev => prev === r ? null : r)}
                                className={`h-9 px-3.5 rounded-full text-sm font-medium ring-1 ring-inset ${reason === r ? 'bg-neutral-900 text-white ring-neutral-900 dark:bg-white dark:text-neutral-900 dark:ring-white' : 'ring-neutral-200 dark:ring-neutral-700 hover:ring-neutral-400'}`}>
                                {r}
                            </button>
                        ))}
                    </div>
                    {reason === 'Otro' && (
                        <input type="text" value={otherText} onChange={e => setOtherText(e.target.value)} maxLength={150} placeholder="Ej. igualar precio de la competencia"
                            className="mt-2 w-full h-10 px-3 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900" />
                    )}
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Sale en la venta para saber por qué se dio el descuento.</p>
                </div>

                {/* Autorización */}
                <div className="rounded-xl ring-1 ring-inset ring-neutral-200 dark:ring-neutral-800 p-3">
                    <label className="block text-sm font-medium mb-1">PIN de supervisor o gerente <span className="text-red-600">*</span></label>
                    <PasswordInput value={pin} onChange={e => setPin(e.target.value)} placeholder="••••" inputMode="numeric" maxLength={6}
                        className="w-full h-11 px-3 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 tracking-widest" />
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Requerido para aplicar. Queda registrado quién lo autorizó.</p>
                </div>

                {error && <p className="text-sm font-medium text-red-600 dark:text-red-400" role="alert">{error}</p>}
                <button type="submit" className="hidden" aria-hidden />
            </form>
        </Modal>
    );
};
