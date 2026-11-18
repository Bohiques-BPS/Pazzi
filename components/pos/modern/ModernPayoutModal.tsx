import React, { useEffect, useRef, useState } from 'react';
import { Modal } from '../../Modal';
import { cajasService, type CashMovement } from '../../../services/cajas';
import { authService } from '../../../services/auth';
import { ApiError } from '../../../services/api';
import { toast } from '../../../hooks/useToast';
import { PasswordInput } from '../../ui/PasswordInput';
import { useGlobalSettings } from '../../../contexts/GlobalSettingsContext';
import { printPayoutVoucher } from '../../../utils/printPayoutVoucher';

/**
 * Desembolso de efectivo (caja MODERNA). Mismo registro que la clásica (movimiento PAYOUT con PIN
 * de supervisor y comprobante impreso), con:
 *  - Efectivo en caja arriba; si el monto lo supera (o la caja está en $0), se avisa y no se deja registrar.
 *  - Motivos rápidos (Suplidor, Compra menor, Cambio a banco, Otro → texto) para reportes ordenados.
 *  - "Tomar foto del recibo" (abre la cámara en tabletas).
 *  - "Registrado por" muestra el cajero real del turno.
 */

const money = (n: number) => `$${(Number(n) || 0).toFixed(2)}`;
const REASONS = ['Suplidor', 'Compra menor', 'Cambio a banco', 'Otro'];

export const ModernPayoutModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    cajaId: string;
    cashInDrawer: number;
    /** Cajero real del turno (operador por PIN o el usuario conectado). */
    recordedBy: string;
    onRecorded?: (m: CashMovement) => void;
}> = ({ isOpen, onClose, cajaId, cashInDrawer, recordedBy, onRecorded }) => {
    const { settings } = useGlobalSettings();
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState<string | null>(null);
    const [other, setOther] = useState('');
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [attachment, setAttachment] = useState<string | undefined>();
    const [attachmentName, setAttachmentName] = useState<string | undefined>();
    const [pin, setPin] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);
    const amountRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!isOpen) return;
        setAmount(''); setReason(null); setOther(''); setInvoiceNumber(''); setAttachment(undefined); setAttachmentName(undefined); setPin(''); setError(null);
        setTimeout(() => amountRef.current?.focus(), 150);
    }, [isOpen]);

    const value = parseFloat(amount);
    const noCash = cashInDrawer <= 0.001;
    const over = value > cashInDrawer + 0.001;
    const finalReason = reason === 'Otro' ? other.trim() : reason;

    const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        if (f.size > 3 * 1024 * 1024) { setError('La foto no puede pasar de 3 MB.'); return; }
        const r = new FileReader();
        r.onloadend = () => { setAttachment(r.result as string); setAttachmentName(f.name); };
        r.readAsDataURL(f);
    };

    const save = async () => {
        setError(null);
        if (!(value > 0)) { setError('Escriba el monto.'); return; }
        if (over) { setError(`No hay suficiente efectivo en la caja (${money(cashInDrawer)}).`); return; }
        if (!finalReason) { setError(reason === 'Otro' ? 'Escriba el motivo.' : 'Escoja el motivo.'); return; }
        if (!pin.trim()) { setError('Escriba el PIN del supervisor.'); return; }
        setBusy(true);
        try {
            const { manager } = await authService.verifySupervisorPin(pin.trim());
            const movement = await cajasService.recordCashMovement(cajaId, {
                type: 'PAYOUT', amount: value, reason: finalReason,
                invoiceNumber: invoiceNumber.trim() || undefined, attachment, authorizedByUserId: manager?.id,
            });
            try {
                const rc: any = (settings as any)?.receiptConfig || {};
                printPayoutVoucher({
                    amount: value, reason: finalReason, receiptCount: attachment ? '1' : '0', invoiceNumber: invoiceNumber.trim(),
                    recordedBy, authorizedBy: manager ? `${manager.name || ''} ${(manager as any).lastName || ''}`.trim() : undefined, date: new Date(),
                }, { businessName: rc.businessName, address: rc.address, phone: rc.phone });
            } catch { /* la impresión no bloquea */ }
            toast.success(`Desembolso de ${money(value)} registrado.`);
            onRecorded?.(movement);
            onClose();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'No se pudo registrar el desembolso.');
        } finally { setBusy(false); }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Desembolso de efectivo" size="lg"
            footer={
                <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">Registrado por: <b className="text-neutral-700 dark:text-neutral-200">{recordedBy}</b></span>
                    <div className="flex gap-2">
                        <button type="button" onClick={onClose} className="h-11 px-5 rounded-lg font-semibold bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-700 dark:hover:bg-neutral-600">Cancelar</button>
                        <button type="button" onClick={save} disabled={busy || noCash || over || !(value > 0)}
                            className="h-11 px-5 rounded-lg font-bold bg-primary hover:bg-secondary text-white disabled:bg-neutral-300 disabled:text-neutral-500 dark:disabled:bg-neutral-700 disabled:cursor-not-allowed">
                            {busy ? 'Registrando…' : value > 0 ? `Registrar ${money(value)}` : 'Registrar desembolso'}
                        </button>
                    </div>
                </div>
            }>
            <form onSubmit={e => { e.preventDefault(); save(); }} className="space-y-4">
                <p className="text-sm text-neutral-600 dark:text-neutral-300 -mt-2">Saque efectivo de la caja para un pago o gasto.</p>

                <div className={`flex items-center justify-between rounded-xl px-4 py-3 ring-1 ring-inset ${noCash ? 'bg-red-50 ring-red-200 dark:bg-red-900/20 dark:ring-red-800' : 'bg-neutral-50 ring-neutral-200 dark:bg-neutral-900 dark:ring-neutral-800'}`}>
                    <span className="text-sm font-medium">Efectivo en caja</span>
                    <span className={`text-2xl font-extrabold tabular-nums ${noCash ? 'text-red-600 dark:text-red-400' : ''}`}>{money(cashInDrawer)}</span>
                </div>
                {noCash && <p className="text-sm font-medium text-red-600 dark:text-red-400 -mt-2">No hay efectivo en la caja: no se puede hacer un desembolso.</p>}

                <div>
                    <label className="block text-sm font-medium mb-1">Monto</label>
                    <div className={`flex items-center h-14 rounded-xl border-2 px-4 bg-white dark:bg-neutral-900 ${over ? 'border-red-500' : 'border-primary'} ${noCash ? 'opacity-50' : ''}`}>
                        <span className="text-2xl font-bold text-neutral-400 mr-2">$</span>
                        <input ref={amountRef} autoFocus type="text" inputMode="decimal" disabled={noCash} value={amount} onChange={e => setAmount(e.target.value.replace(/[^\d.]/g, ''))} placeholder="0.00"
                            className="flex-1 min-w-0 bg-transparent text-3xl font-bold tabular-nums focus:outline-none placeholder:text-neutral-300 dark:placeholder:text-neutral-600" />
                    </div>
                    {over && !noCash && <p className="text-sm font-medium text-red-600 dark:text-red-400 mt-1">No hay suficiente efectivo en la caja (disponible {money(cashInDrawer)}).</p>}
                </div>

                <div>
                    <div className="text-sm font-medium mb-1.5">Motivo</div>
                    <div className="flex flex-wrap gap-2">
                        {REASONS.map(r => (
                            <button key={r} type="button" onClick={() => setReason(r)}
                                className={`h-10 px-4 rounded-full text-sm font-medium ring-1 ring-inset ${reason === r ? 'bg-neutral-900 text-white ring-neutral-900 dark:bg-white dark:text-neutral-900 dark:ring-white' : 'ring-neutral-200 dark:ring-neutral-700 hover:ring-neutral-400'}`}>
                                {r}{r === 'Otro' ? '…' : ''}
                            </button>
                        ))}
                    </div>
                    {reason === 'Otro' && (
                        <input autoFocus value={other} onChange={e => setOther(e.target.value)} maxLength={150} placeholder="Escriba el motivo"
                            className="mt-2 w-full h-10 px-3 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900" />
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-medium mb-1">Recibo / factura</label>
                        <input ref={fileRef} type="file" accept="image/*,application/pdf" capture="environment" onChange={onFile} className="hidden" />
                        <button type="button" onClick={() => fileRef.current?.click()}
                            className="w-full h-11 rounded-lg ring-1 ring-inset ring-neutral-300 dark:ring-neutral-700 text-sm font-semibold hover:ring-primary truncate px-3">
                            {attachmentName ? `Foto: ${attachmentName}` : 'Tomar foto del recibo'}
                        </button>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Núm. de factura <span className="text-neutral-400 font-normal">(opcional)</span></label>
                        <input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} className="w-full h-11 px-3 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900" />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">PIN de supervisor <span className="text-red-600">*</span></label>
                    <PasswordInput value={pin} onChange={e => setPin(e.target.value)} placeholder="••••" inputMode="numeric" maxLength={6}
                        className="w-full h-11 px-3 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 tracking-widest" />
                </div>

                {error && <p className="text-sm font-medium text-red-600 dark:text-red-400" role="alert">{error}</p>}
                <button type="submit" className="hidden" aria-hidden />
            </form>
        </Modal>
    );
};
