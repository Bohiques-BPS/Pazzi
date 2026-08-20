import React, { useEffect, useState } from 'react';
import { Modal } from '../Modal';
import { Client } from '../../types';
import { invoicesService, type Invoice, type InvoiceItemInput } from '../../services/invoices';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES, INPUT_SM_CLASSES } from '../../constants';
import { useTranslation } from '../../contexts/GlobalSettingsContext';

const money = (n: number) => `$${(Number(n) || 0).toFixed(2)}`;
const publicLink = (token: string) => `${window.location.origin}/#/pay/${token}`;

type DraftItem = { name: string; quantity: string; unitPrice: string };
const emptyItem = (): DraftItem => ({ name: '', quantity: '1', unitPrice: '' });

interface ClientInvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    client: Client | null;
}

/**
 * Genera una factura para un cliente concreto (desde la lista de Clientes).
 * Reutiliza invoicesService; al crear muestra el link público + QR de pago.
 */
export const ClientInvoiceModal: React.FC<ClientInvoiceModalProps> = ({ isOpen, onClose, client }) => {
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [sendOnCreate, setSendOnCreate] = useState(true);
    const [description, setDescription] = useState('');
    const [lines, setLines] = useState<DraftItem[]>([emptyItem()]);
    const [saving, setSaving] = useState(false);
    const [created, setCreated] = useState<Invoice | null>(null);
    const [qr, setQr] = useState('');

    // Al abrir con un cliente, precarga su correo y limpia el formulario.
    useEffect(() => {
        if (isOpen) {
            setEmail(client?.email || '');
            setSendOnCreate(!!client?.email);
            setDescription('');
            setLines([emptyItem()]);
            setCreated(null);
            setQr('');
        }
    }, [isOpen, client]);

    // Genera el QR una vez creada la factura.
    useEffect(() => {
        let alive = true;
        if (created) {
            import('qrcode')
                .then(QR => QR.toDataURL(publicLink(created.publicToken), { width: 220, margin: 1 }))
                .then(url => { if (alive) setQr(url); })
                .catch(() => { if (alive) setQr(''); });
        }
        return () => { alive = false; };
    }, [created]);

    const setLine = (i: number, patch: Partial<DraftItem>) => setLines(ls => ls.map((l, idx) => idx === i ? { ...l, ...patch } : l));
    const addLine = () => setLines(ls => [...ls, emptyItem()]);
    const removeLine = (i: number) => setLines(ls => ls.length > 1 ? ls.filter((_, idx) => idx !== i) : ls);
    const draftTotal = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0);

    const create = async () => {
        const parsed: InvoiceItemInput[] = [];
        for (const l of lines) {
            const q = Number(l.quantity), p = Number(l.unitPrice);
            if (!l.name.trim()) return toast.error(t('cmpx.invoice.line_desc_required'));
            if (!(q > 0)) return toast.error(t('cmpx.invoice.qty_gt0'));
            if (!(p >= 0)) return toast.error(t('cmpx.invoice.price_not_negative'));
            parsed.push({ name: l.name.trim(), quantity: q, unitPrice: p });
        }
        if (parsed.length === 0) return toast.error(t('cmpx.invoice.add_one_item'));
        setSaving(true);
        try {
            const inv = await invoicesService.create({
                clientId: client?.id || undefined,
                email: email.trim() || undefined,
                send: sendOnCreate && !!email.trim(),
                items: parsed,
                description: description || undefined,
            });
            toast.success(sendOnCreate && email.trim() ? t('cmpx.invoice.created_sent', { email: email.trim() }) : t('cmpx.invoice.created'));
            setCreated(inv);
        } catch (err) {
            toast.error(err instanceof ApiError ? err.message : t('cmpx.invoice.create_error'));
        } finally {
            setSaving(false);
        }
    };

    const copyLink = async () => {
        if (!created) return;
        try { await navigator.clipboard.writeText(publicLink(created.publicToken)); toast.success(t('cmpx.invoice.link_copied')); }
        catch { toast.error(t('cmpx.invoice.copy_error')); }
    };

    const clientName = client ? `${client.name} ${client.lastName || ''}`.trim() : '';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('cmpx.invoice.title', { name: clientName })} size="lg">
            {created ? (
                <div className="space-y-4 text-center">
                    <p className="text-sm text-neutral-600 dark:text-neutral-300">
                        {t('cmpx.invoice.invoice_word')} {created.number ? `#${created.number}` : ''} {t('cmpx.invoice.created_for')} <b>{money(created.total)}</b>.
                        {' '}{t('cmpx.invoice.scan_hint')}
                    </p>
                    {qr
                        ? <img src={qr} alt={t('cmpx.invoice.qr_alt')} className="mx-auto rounded-md border border-neutral-200 dark:border-neutral-700" />
                        : <div className="h-40 flex items-center justify-center text-neutral-400">{t('cmpx.invoice.generating_qr')}</div>}
                    <div className="flex gap-2">
                        <input readOnly value={publicLink(created.publicToken)} className={`${INPUT_SM_CLASSES} w-full text-xs`} onFocus={e => e.target.select()} />
                        <button onClick={copyLink} className={BUTTON_PRIMARY_SM_CLASSES}>{t('cmpx.invoice.copy')}</button>
                    </div>
                    <a href={publicLink(created.publicToken)} target="_blank" rel="noreferrer" className="inline-block text-sm text-primary hover:underline">{t('cmpx.invoice.open_client_view')}</a>
                    <div className="flex justify-end pt-2">
                        <button onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>{t('pmx.common.close')}</button>
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-neutral-500 mb-1">{t('cmpx.invoice.client_email')}</label>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="cliente@correo.com" className={`${INPUT_SM_CLASSES} w-full`} />
                            <label className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-300 mt-1">
                                <input type="checkbox" checked={sendOnCreate} onChange={e => setSendOnCreate(e.target.checked)} className="h-3.5 w-3.5" />
                                {t('cmpx.invoice.send_on_create')}
                            </label>
                        </div>
                        <div>
                            <label className="block text-xs text-neutral-500 mb-1">{t('cmpx.invoice.description_label')}</label>
                            <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder={t('cmpx.invoice.description_ph')} className={`${INPUT_SM_CLASSES} w-full`} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-xs text-neutral-500">{t('cmpx.invoice.items')}</label>
                        {lines.map((l, i) => (
                            <div key={i} className="flex gap-2 items-center">
                                <input type="text" value={l.name} onChange={e => setLine(i, { name: e.target.value })} placeholder={t('cmpx.invoice.item_desc_ph')} className={`${INPUT_SM_CLASSES} flex-1`} />
                                <input type="number" value={l.quantity} onChange={e => setLine(i, { quantity: e.target.value })} placeholder={t('cmpx.invoice.item_qty_ph')} className={`${INPUT_SM_CLASSES} w-20`} />
                                <input type="number" value={l.unitPrice} onChange={e => setLine(i, { unitPrice: e.target.value })} placeholder={t('cmpx.invoice.item_price_ph')} className={`${INPUT_SM_CLASSES} w-28`} />
                                <span className="w-24 text-right text-sm text-neutral-500">{money((Number(l.quantity) || 0) * (Number(l.unitPrice) || 0))}</span>
                                <button onClick={() => removeLine(i)} className="text-red-500 hover:text-red-700 px-1" title={t('cmpx.invoice.remove')}>✕</button>
                            </div>
                        ))}
                        <button onClick={addLine} className="text-sm text-primary hover:underline">{t('cmpx.invoice.add_item')}</button>
                    </div>

                    <div className="flex items-center justify-between border-t border-neutral-100 dark:border-neutral-700 pt-3">
                        <span className="text-sm text-neutral-500">{t('cmpx.invoice.subtotal_hint')}</span>
                        <span className="font-semibold text-neutral-800 dark:text-neutral-100">{money(draftTotal)}</span>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>{t('common.cancel')}</button>
                        <button onClick={create} disabled={saving} className={`${BUTTON_PRIMARY_SM_CLASSES} disabled:opacity-50`}>{saving ? t('cmpx.invoice.creating') : t('cmpx.invoice.create_btn')}</button>
                    </div>
                </div>
            )}
        </Modal>
    );
};
