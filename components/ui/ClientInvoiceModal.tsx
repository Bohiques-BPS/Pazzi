import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from '../Modal';
import { Client } from '../../types';
import { invoicesService, type Invoice, type InvoiceItemInput } from '../../services/invoices';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES, BUTTON_CLOSE_SM_CLASSES, INPUT_SM_CLASSES } from '../../constants';
import { useTranslation, useGlobalSettings } from '../../contexts/GlobalSettingsContext';
import { useData } from '../../contexts/DataContext';
import { clientDocName } from '../../utils/clientName';
import { buildInvoiceTaxContext, normalizeTaxRate } from '../../utils/invoiceTax';
import { splitTax } from '../../utils/taxBreakdown';

const money = (n: number) => `$${(Number(n) || 0).toFixed(2)}`;
const publicLink = (token: string) => `${window.location.origin}/pay/${token}`;

type DraftItem = { name: string; quantity: string; unitPrice: string; taxRate?: number | null };
const emptyItem = (): DraftItem => ({ name: '', quantity: '1', unitPrice: '' });

interface ClientInvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    client: Client | null;
    /** Proyecto al que pertenecerá la factura (pestaña Facturación del proyecto). */
    projectId?: string | null;
    /** Nombre del proyecto (solo para mostrarlo en el encabezado). */
    projectName?: string | null;
    /** Descripción precargada (ej. "Proyecto: Remodelación cocina"). */
    initialDescription?: string;
    /** Líneas precargadas (ej. recursos del proyecto). Se leen al abrir el modal. */
    initialItems?: InvoiceItemInput[];
    /** Se llama con la factura recién creada (para refrescar listas). */
    onCreated?: (invoice: Invoice) => void;
}

/**
 * Genera una factura para un cliente concreto (desde la lista de Clientes o desde un Proyecto).
 * Reutiliza invoicesService; al crear muestra el link público + QR de pago.
 */
export const ClientInvoiceModal: React.FC<ClientInvoiceModalProps> = ({ isOpen, onClose, client, projectId, projectName, initialDescription, initialItems, onCreated }) => {
    const { t } = useTranslation();
    const { settings } = useGlobalSettings();
    const { products } = useData();
    const [email, setEmail] = useState('');
    const [sendOnCreate, setSendOnCreate] = useState(true);
    const [description, setDescription] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [lines, setLines] = useState<DraftItem[]>([emptyItem()]);
    const [saving, setSaving] = useState(false);
    const [created, setCreated] = useState<Invoice | null>(null);
    const [qr, setQr] = useState('');

    // Al abrir con un cliente, precarga su correo y el borrador (líneas/descripción iniciales si vienen).
    useEffect(() => {
        if (isOpen) {
            setEmail(client?.email || '');
            setSendOnCreate(!!client?.email);
            setDescription(initialDescription || '');
            setDueDate('');
            setLines(initialItems && initialItems.length
                ? initialItems.map(it => ({ name: it.name, quantity: String(it.quantity), unitPrice: String(it.unitPrice), taxRate: it.taxRate ?? undefined }))
                : [emptyItem()]);
            setCreated(null);
            setQr('');
        }
        // Las props iniciales se leen solo al abrir (no se resetea el borrador si el padre re-renderiza).
        // eslint-disable-next-line react-hooks/exhaustive-deps
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

    // IVU por línea con la misma lógica que Facturas (desglose, productos exentos, cliente exento).
    const { lineTaxRate, bd, stateR, municipalR } = useMemo(() => buildInvoiceTaxContext(settings, client, products), [settings, client, products]);

    const setLine = (i: number, patch: Partial<DraftItem>) => setLines(ls => ls.map((l, idx) => idx === i ? { ...l, ...patch } : l));
    const addLine = () => setLines(ls => [...ls, emptyItem()]);
    const removeLine = (i: number) => setLines(ls => ls.length > 1 ? ls.filter((_, idx) => idx !== i) : ls);
    const draftTotal = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0);
    const draftTax = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0) * normalizeTaxRate(lineTaxRate(l)), 0);

    const create = async () => {
        const parsed: InvoiceItemInput[] = [];
        for (const l of lines) {
            const q = Number(l.quantity), p = Number(l.unitPrice);
            if (!l.name.trim()) return toast.error(t('cmpx.invoice.line_desc_required'));
            if (!(q > 0)) return toast.error(t('cmpx.invoice.qty_gt0'));
            if (!(p >= 0)) return toast.error(t('cmpx.invoice.price_not_negative'));
            // La tasa se envía como FRACCIÓN por línea para que el total del servidor coincida con el mostrado.
            const raw = lineTaxRate(l);
            parsed.push({ name: l.name.trim(), quantity: q, unitPrice: p, ...(raw != null ? { taxRate: normalizeTaxRate(raw) } : {}) });
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
                dueDate: dueDate || undefined,
                projectId: projectId || undefined,
            });
            toast.success(sendOnCreate && email.trim() ? t('cmpx.invoice.created_sent', { email: email.trim() }) : t('cmpx.invoice.created'));
            if (inv?.warning) toast.warning(inv.warning);
            setCreated(inv);
            onCreated?.(inv);
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

    const clientName = client ? clientDocName(client) : '';

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
                        <button type="button" onClick={copyLink} className={BUTTON_PRIMARY_SM_CLASSES}>{t('cmpx.invoice.copy')}</button>
                    </div>
                    <a href={publicLink(created.publicToken)} target="_blank" rel="noreferrer" className="inline-block text-sm text-primary hover:underline">{t('cmpx.invoice.open_client_view')}</a>
                    <div className="flex justify-end pt-2">
                        <button type="button" onClick={onClose} className={BUTTON_CLOSE_SM_CLASSES}>{t('pmx.common.close')}</button>
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    {projectId && (
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                            {t('cmpx.invoice.project_label')}: <span className="font-medium text-primary">{projectName || '—'}</span>
                        </p>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">{t('cmpx.invoice.client_email')}</label>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="cliente@correo.com" className={`${INPUT_SM_CLASSES} w-full`} />
                            <label className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-300 mt-1">
                                <input type="checkbox" checked={sendOnCreate} onChange={e => setSendOnCreate(e.target.checked)} className="h-3.5 w-3.5" />
                                {t('cmpx.invoice.send_on_create')}
                            </label>
                        </div>
                        <div>
                            <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">{t('cmpx.invoice.description_label')}</label>
                            <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder={t('cmpx.invoice.description_ph')} className={`${INPUT_SM_CLASSES} w-full`} />
                        </div>
                        <div>
                            <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">{t('cmpx.invoice.due_date')}</label>
                            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={`${INPUT_SM_CLASSES} w-full`} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-xs text-neutral-500 dark:text-neutral-400">{t('cmpx.invoice.items')}</label>
                        {lines.map((l, i) => (
                            <div key={i} className="flex gap-2 items-center">
                                {/* Al cambiar el nombre se descarta la tasa precargada: se resuelve por el producto del catálogo. */}
                                <input type="text" value={l.name} onChange={e => setLine(i, { name: e.target.value, taxRate: undefined })} placeholder={t('cmpx.invoice.item_desc_ph')} className={`${INPUT_SM_CLASSES} flex-1`} />
                                <input type="number" value={l.quantity} onChange={e => setLine(i, { quantity: e.target.value })} placeholder={t('cmpx.invoice.item_qty_ph')} className={`${INPUT_SM_CLASSES} w-20`} />
                                <input type="number" value={l.unitPrice} onChange={e => setLine(i, { unitPrice: e.target.value })} placeholder={t('cmpx.invoice.item_price_ph')} className={`${INPUT_SM_CLASSES} w-28`} />
                                <span className="w-24 text-right text-sm text-neutral-500 dark:text-neutral-400 tabular-nums">{money((Number(l.quantity) || 0) * (Number(l.unitPrice) || 0))}</span>
                                <button type="button" onClick={() => removeLine(i)} className="text-red-500 hover:text-red-700 px-1" title={t('cmpx.invoice.remove')}>✕</button>
                            </div>
                        ))}
                        <button type="button" onClick={addLine} className="text-sm text-primary hover:underline">{t('cmpx.invoice.add_item')}</button>
                    </div>

                    <div className="border-t border-neutral-100 dark:border-neutral-700 pt-3 space-y-1">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-neutral-500 dark:text-neutral-400">{t('posx.invoices.subtotal')}</span>
                            <span className="text-neutral-700 dark:text-neutral-200 tabular-nums">{money(draftTotal)}</span>
                        </div>
                        {(() => {
                            // Gral 1: desglosar IVU Estatal / Municipal cuando el desglose está activo
                            // (igual que Facturas/factura pública/PDF). Si no, una sola línea de IVU.
                            const sp = bd ? splitTax(draftTax, stateR, municipalR) : null;
                            if (sp && sp.municipal > 0) {
                                return (
                                    <>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-neutral-500 dark:text-neutral-400">{t('posx.cashier.sut_state')}</span>
                                            <span className="text-neutral-700 dark:text-neutral-200 tabular-nums">{money(sp.state)}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-neutral-500 dark:text-neutral-400">{t('posx.cashier.sut_municipal')}</span>
                                            <span className="text-neutral-700 dark:text-neutral-200 tabular-nums">{money(sp.municipal)}</span>
                                        </div>
                                    </>
                                );
                            }
                            return (
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-neutral-500 dark:text-neutral-400">{t('posx.invoices.tax_ivu')}</span>
                                    <span className="text-neutral-700 dark:text-neutral-200 tabular-nums">{money(draftTax)}</span>
                                </div>
                            );
                        })()}
                        <div className="flex items-center justify-between pt-1 border-t border-neutral-100 dark:border-neutral-700">
                            <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">{t('posx.invoices.total')}</span>
                            <span className="font-bold text-neutral-800 dark:text-neutral-100 tabular-nums">{money(draftTotal + draftTax)}</span>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>{t('common.cancel')}</button>
                        <button type="button" onClick={create} disabled={saving} className={`${BUTTON_PRIMARY_SM_CLASSES} disabled:opacity-50`}>{saving ? t('cmpx.invoice.creating') : t('cmpx.invoice.create_btn')}</button>
                    </div>
                </div>
            )}
        </Modal>
    );
};
