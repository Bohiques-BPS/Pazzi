import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { usePagination, PaginationFooter } from '../../components/ui/tableTools';
import { invoicesService, type Invoice, type InvoiceItemInput } from '../../services/invoices';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES, INPUT_SM_CLASSES } from '../../constants';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/Modal';
import { useTranslation } from '../../contexts/GlobalSettingsContext';

const money = (n: number) => `$${(Number(n) || 0).toFixed(2)}`;
const publicLink = (token: string) => `${window.location.origin}/pay/${token}`;

const STATUS: Record<string, { label: string; cls: string }> = {
    pending: { label: 'Pendiente', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
    partial: { label: 'Pago parcial', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
    paid: { label: 'Pagada', cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
    cancelled: { label: 'Cancelada', cls: 'bg-neutral-200 text-neutral-500' },
};

const money0 = (n: number) => `$${(Number(n) || 0).toFixed(2)}`;

type DraftItem = { name: string; quantity: string; unitPrice: string };
const emptyItem = (): DraftItem => ({ name: '', quantity: '1', unitPrice: '' });

/** Modal que muestra el link público + QR de una factura. */
const ShareModal: React.FC<{ invoice: Invoice | null; onClose: () => void }> = ({ invoice, onClose }) => {
    const { t } = useTranslation();
    const [qr, setQr] = useState<string>('');
    const link = invoice ? publicLink(invoice.publicToken) : '';

    useEffect(() => {
        let alive = true;
        if (invoice) {
            import('qrcode').then(QR => QR.toDataURL(link, { width: 240, margin: 1 }))
                .then(url => { if (alive) setQr(url); })
                .catch(() => { if (alive) setQr(''); });
        } else { setQr(''); }
        return () => { alive = false; };
    }, [invoice, link]);

    const copy = async () => {
        try { await navigator.clipboard.writeText(link); toast.success(t('posx.invoices.share_copy_ok')); }
        catch { toast.error(t('posx.invoices.share_copy_fail')); }
    };

    return (
        <Modal isOpen={!!invoice} onClose={onClose} title={t('posx.invoices.share_title', { num: invoice?.number ? `#${invoice.number}` : '' })} size="sm">
            <div className="space-y-4 text-center">
                <p className="text-sm text-neutral-500">{t('posx.invoices.share_desc')}</p>
                {qr ? <img src={qr} alt="QR" className="mx-auto rounded-md border border-neutral-200 dark:border-neutral-700" /> : <div className="h-40 flex items-center justify-center text-neutral-400">{t('posx.invoices.generating_qr')}</div>}
                <div className="flex gap-2">
                    <input readOnly value={link} className={`${INPUT_SM_CLASSES} w-full text-xs`} onFocus={e => e.target.select()} />
                    <button onClick={copy} className={BUTTON_PRIMARY_SM_CLASSES}>{t('posx.invoices.copy')}</button>
                </div>
                <a href={link} target="_blank" rel="noreferrer" className="inline-block text-sm text-primary hover:underline">{t('posx.invoices.open_client_view')}</a>
            </div>
        </Modal>
    );
};

export const InvoicesListPage: React.FC = () => {
    const { t } = useTranslation();
    const { clients } = useData();
    const [items, setItems] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(false);
    // Filtros de la lista de facturas.
    const [search, setSearch] = useState('');
    const [statusF, setStatusF] = useState<'all' | 'pending' | 'partial' | 'paid' | 'cancelled'>('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [minAmount, setMinAmount] = useState('');
    const [maxAmount, setMaxAmount] = useState('');
    const [onlyBalance, setOnlyBalance] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [share, setShare] = useState<Invoice | null>(null);

    // Form
    const [clientId, setClientId] = useState('');
    const [clientQuery, setClientQuery] = useState('');
    const [clientOpen, setClientOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [sendOnCreate, setSendOnCreate] = useState(true);
    const [description, setDescription] = useState('');
    const [invType, setInvType] = useState('');
    const [editId, setEditId] = useState<string | null>(null);
    const [lines, setLines] = useState<DraftItem[]>([emptyItem()]);
    // Filtros extra
    const [cashierF, setCashierF] = useState('all');
    const [typeF, setTypeF] = useState('all');
    const [saving, setSaving] = useState(false);

    // Al elegir cliente, autocompleta su correo (si tiene).
    const onSelectClient = (id: string) => {
        setClientId(id);
        const c = clients.find(x => x.id === id);
        if (c?.email) setEmail(c.email);
    };

    const load = useCallback(async () => {
        setLoading(true);
        try { setItems(await invoicesService.list()); }
        catch (err) { if (err instanceof ApiError) toast.error(err.message); }
        finally { setLoading(false); }
    }, []);
    useEffect(() => { load(); }, [load]);

    const resetForm = () => { setClientId(''); setClientQuery(''); setEmail(''); setSendOnCreate(true); setDescription(''); setInvType(''); setEditId(null); setLines([emptyItem()]); };

    // Abrir el formulario en modo EDICIÓN, precargado con la factura (solo pendientes/parciales).
    const openEdit = (inv: Invoice) => {
        setEditId(inv.id);
        setClientId(inv.clientId || '');
        setClientQuery(inv.clientName || '');
        setEmail(inv.clientEmail || '');
        setDescription(inv.description || '');
        setInvType(inv.type || '');
        setLines((inv.items || []).map(it => ({ name: it.name, quantity: String(it.quantity), unitPrice: String(it.unitPrice) })));
        setSendOnCreate(false);
        setShowForm(true);
    };
    const setLine = (i: number, patch: Partial<DraftItem>) => setLines(ls => ls.map((l, idx) => idx === i ? { ...l, ...patch } : l));
    const addLine = () => setLines(ls => [...ls, emptyItem()]);
    const removeLine = (i: number) => setLines(ls => ls.length > 1 ? ls.filter((_, idx) => idx !== i) : ls);

    const draftTotal = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0);

    const create = async () => {
        const parsed: InvoiceItemInput[] = [];
        for (const l of lines) {
            const q = Number(l.quantity), p = Number(l.unitPrice);
            if (!l.name.trim()) return toast.error(t('posx.invoices.err_line_desc'));
            if (!(q > 0)) return toast.error(t('posx.invoices.err_qty'));
            if (!(p >= 0)) return toast.error(t('posx.invoices.err_price'));
            parsed.push({ name: l.name.trim(), quantity: q, unitPrice: p });
        }
        if (parsed.length === 0) return toast.error(t('posx.invoices.err_no_items'));
        setSaving(true);
        try {
            if (editId) {
                // Edición de una factura existente (no pagada).
                await invoicesService.update(editId, {
                    clientId: clientId || null,
                    email: email.trim() || null,
                    items: parsed,
                    description: description || null,
                    type: invType.trim() || null,
                });
                toast.success(t('posx.invoices.updated'));
                setShowForm(false); resetForm(); load();
            } else {
                const created = await invoicesService.create({
                    clientId: clientId || undefined,
                    email: email.trim() || undefined,
                    send: sendOnCreate && !!email.trim(),
                    items: parsed,
                    description: description || undefined,
                    type: invType.trim() || null,
                });
                toast.success(sendOnCreate && email.trim() ? t('posx.invoices.created_sent', { email: email.trim() }) : t('posx.invoices.created'));
                setShowForm(false); resetForm(); load();
                setShare(created); // abre el modal con el link/QR
            }
        } catch (err) {
            toast.error(err instanceof ApiError ? err.message : t('posx.invoices.err_create'));
        } finally { setSaving(false); }
    };

    const sendByEmail = async (inv: Invoice) => {
        try {
            const r = await invoicesService.send(inv.id);
            toast.success(t('posx.invoices.sent_to', { to: r.to }));
        } catch (err) {
            // Si no hay correo del cliente, lo pedimos y reintentamos.
            const to = prompt(t('posx.invoices.prompt_email')) || '';
            if (!to.trim()) return;
            try {
                const r = await invoicesService.send(inv.id, to.trim());
                toast.success(t('posx.invoices.sent_to', { to: r.to }));
            } catch (e) {
                toast.error(e instanceof ApiError ? e.message : t('posx.invoices.err_send'));
            }
        }
    };

    const markPaid = async (inv: Invoice) => {
        const balance = Math.max(0, (inv.total || 0) - (inv.amountPaid || 0));
        const amtStr = prompt(t('posx.invoices.prompt_amount', { balance: money0(balance) }), balance.toFixed(2));
        if (amtStr === null) return;
        const amount = parseFloat(String(amtStr).replace(',', '.'));
        if (!(amount > 0)) return toast.error(t('posx.invoices.err_amount'));
        const reference = prompt(t('posx.invoices.prompt_reference')) ?? '';
        try {
            await invoicesService.markPaid(inv.id, { method: 'ATH Móvil', reference: reference || undefined, amount });
            toast.success(t('posx.invoices.payment_recorded'));
            load();
        } catch (err) { toast.error(err instanceof ApiError ? err.message : t('posx.invoices.err_payment')); }
    };

    const copyLink = async (inv: Invoice) => {
        try { await navigator.clipboard.writeText(publicLink(inv.publicToken)); toast.success(t('posx.invoices.share_copy_ok')); }
        catch { toast.error(t('posx.invoices.share_copy_fail')); }
    };

    // Filtrado (cliente/número/descripción, estado, rango de fechas, rango de montos, solo con saldo).
    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        const min = parseFloat(minAmount); const max = parseFloat(maxAmount);
        const from = dateFrom ? new Date(dateFrom + 'T00:00:00').getTime() : null;
        const to = dateTo ? new Date(dateTo + 'T23:59:59').getTime() : null;
        return items.filter(inv => {
            if (statusF !== 'all' && inv.status !== statusF) return false;
            if (cashierF !== 'all' && (inv.cashierName || '') !== cashierF) return false;
            if (typeF !== 'all' && (inv.type || '') !== typeF) return false;
            const bal = (inv.total || 0) - (inv.amountPaid || 0);
            if (onlyBalance && bal <= 0.001) return false;
            if (!isNaN(min) && (inv.total || 0) < min) return false;
            if (!isNaN(max) && (inv.total || 0) > max) return false;
            const ts = new Date(inv.createdAt).getTime();
            if (from && ts < from) return false;
            if (to && ts > to) return false;
            if (q) {
                const hay = `${inv.number ?? ''} ${inv.clientName ?? ''} ${inv.clientEmail ?? ''} ${inv.description ?? ''} ${inv.type ?? ''} ${inv.cashierName ?? ''}`.toLowerCase();
                if (!hay.includes(q)) return false;
            }
            return true;
        }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [items, search, statusF, cashierF, typeF, dateFrom, dateTo, minAmount, maxAmount, onlyBalance]);
    const pg = usePagination(filtered, 25);
    const hasActiveFilters = !!(statusF !== 'all' || cashierF !== 'all' || typeF !== 'all' || dateFrom || dateTo || minAmount || maxAmount || onlyBalance);
    const clearFilters = () => { setStatusF('all'); setCashierF('all'); setTypeF('all'); setDateFrom(''); setDateTo(''); setMinAmount(''); setMaxAmount(''); setOnlyBalance(false); };
    const cashierOptions = useMemo(() => [...new Set(items.map(i => i.cashierName).filter(Boolean))] as string[], [items]);
    const typeOptions = useMemo(() => [...new Set(items.map(i => i.type).filter(Boolean))] as string[], [items]);

    return (
        <div>
            <div className="flex justify-between items-center mb-2">
                <h1 className="text-2xl font-semibold text-neutral-700 dark:text-neutral-200">{t('posx.invoices.title')}</h1>
                <button onClick={() => { if (showForm) { setShowForm(false); resetForm(); } else { resetForm(); setShowForm(true); } }} className={BUTTON_PRIMARY_SM_CLASSES}>{showForm ? t('posx.invoices.close') : t('posx.invoices.new_invoice_btn')}</button>
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">{t('posx.invoices.intro')}</p>

            {showForm && (
                <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 mb-4 space-y-3">
                    <h3 className="font-semibold text-primary">{editId ? t('posx.invoices.edit_invoice') : t('posx.invoices.new_invoice')}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-neutral-500 mb-1">{t('posx.invoices.client_optional')}</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={clientQuery}
                                    onChange={e => { setClientQuery(e.target.value); setClientOpen(true); if (!e.target.value.trim()) setClientId(''); }}
                                    onFocus={() => setClientOpen(true)}
                                    onBlur={() => setTimeout(() => setClientOpen(false), 150)}
                                    placeholder={t('posx.invoices.no_client')}
                                    className={`${INPUT_SM_CLASSES} w-full`}
                                    autoComplete="off"
                                />
                                {clientOpen && (
                                    <ul className="absolute z-30 w-full mt-1 bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-md shadow-lg max-h-56 overflow-y-auto">
                                        <li onMouseDown={() => { onSelectClient(''); setClientQuery(''); setClientOpen(false); }} className="px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-600 cursor-pointer text-sm text-neutral-500">{t('posx.invoices.no_client')}</li>
                                        {clients.filter(c => !c.isDefault && `${c.name} ${c.lastName} ${c.email || ''}`.toLowerCase().includes(clientQuery.trim().toLowerCase())).slice(0, 50).map(c => (
                                            <li key={c.id} onMouseDown={() => { onSelectClient(c.id); setClientQuery(`${c.name} ${c.lastName || ''}`.trim()); setClientOpen(false); }} className="px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-600 cursor-pointer text-sm">
                                                {c.name} {c.lastName} {c.email ? <span className="text-neutral-400">· {c.email}</span> : ''}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs text-neutral-500 mb-1">{t('posx.invoices.client_email_label')}</label>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="cliente@correo.com" className={`${INPUT_SM_CLASSES} w-full`} />
                            <label className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-300 mt-1">
                                <input type="checkbox" checked={sendOnCreate} onChange={e => setSendOnCreate(e.target.checked)} className="h-3.5 w-3.5" />
                                {t('posx.invoices.send_on_create')}
                            </label>
                        </div>
                        <div>
                            <label className="block text-xs text-neutral-500 mb-1">{t('posx.invoices.desc_note_label')}</label>
                            <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder={t('posx.invoices.desc_placeholder')} className={`${INPUT_SM_CLASSES} w-full`} />
                        </div>
                        <div>
                            <label className="block text-xs text-neutral-500 mb-1">{t('posx.invoices.type_label')}</label>
                            <input type="text" value={invType} onChange={e => setInvType(e.target.value)} placeholder={t('posx.invoices.type_ph')} className={`${INPUT_SM_CLASSES} w-full`} list="invoice-type-options" />
                            <datalist id="invoice-type-options">
                                {[...new Set(items.map(i => i.type).filter(Boolean))].map(tp => <option key={tp as string} value={tp as string} />)}
                            </datalist>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-xs text-neutral-500">{t('posx.invoices.items')}</label>
                        {lines.map((l, i) => (
                            <div key={i} className="flex gap-2 items-center">
                                <input type="text" value={l.name} onChange={e => setLine(i, { name: e.target.value })} placeholder={t('posx.invoices.item_desc_placeholder')} className={`${INPUT_SM_CLASSES} flex-1`} />
                                <input type="number" value={l.quantity} onChange={e => setLine(i, { quantity: e.target.value })} placeholder={t('posx.invoices.qty_placeholder')} className={`${INPUT_SM_CLASSES} w-20`} />
                                <input type="number" value={l.unitPrice} onChange={e => setLine(i, { unitPrice: e.target.value })} placeholder={t('posx.invoices.price_placeholder')} className={`${INPUT_SM_CLASSES} w-28`} />
                                <span className="w-24 text-right text-sm text-neutral-500">{money((Number(l.quantity) || 0) * (Number(l.unitPrice) || 0))}</span>
                                <button onClick={() => removeLine(i)} className="text-red-500 hover:text-red-700 px-1" title={t('posx.invoices.remove')}>✕</button>
                            </div>
                        ))}
                        <button onClick={addLine} className="text-sm text-primary hover:underline">{t('posx.invoices.add_item')}</button>
                    </div>

                    <div className="flex items-center justify-between border-t border-neutral-100 dark:border-neutral-700 pt-3">
                        <span className="text-sm text-neutral-500">{t('posx.invoices.subtotal_note')}</span>
                        <span className="font-semibold text-neutral-800 dark:text-neutral-100">{money(draftTotal)}</span>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button onClick={() => { setShowForm(false); resetForm(); }} className={BUTTON_SECONDARY_SM_CLASSES}>{t('common.cancel')}</button>
                        <button onClick={create} disabled={saving} className={`${BUTTON_PRIMARY_SM_CLASSES} disabled:opacity-50`}>{saving ? t('posx.invoices.creating') : editId ? t('posx.invoices.save_changes') : t('posx.invoices.create_invoice')}</button>
                    </div>
                </div>
            )}

            {/* Barra de filtros */}
            {!loading && items.length > 0 && (
                <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-3 mb-3 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder={t('posx.invoices.search_ph')}
                            className={`${INPUT_SM_CLASSES} flex-grow min-w-[200px]`}
                        />
                        <select value={statusF} onChange={e => setStatusF(e.target.value as any)} className={INPUT_SM_CLASSES}>
                            <option value="all">{t('posx.invoices.filter.all_status')}</option>
                            <option value="pending">{STATUS.pending.label}</option>
                            <option value="partial">{STATUS.partial.label}</option>
                            <option value="paid">{STATUS.paid.label}</option>
                            <option value="cancelled">{STATUS.cancelled.label}</option>
                        </select>
                        <button type="button" onClick={() => setShowFilters(s => !s)} className={`${BUTTON_SECONDARY_SM_CLASSES} ${(showFilters || hasActiveFilters) ? 'ring-1 ring-primary text-primary' : ''}`}>
                            {t('posx.invoices.filter.more')}{hasActiveFilters ? ' •' : ''}
                        </button>
                        {hasActiveFilters && <button type="button" onClick={clearFilters} className="text-sm text-neutral-500 hover:text-red-500 underline">{t('posx.invoices.filter.clear')}</button>}
                    </div>
                    {showFilters && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-1 border-t border-neutral-100 dark:border-neutral-700">
                            <div><label className="block text-xs text-neutral-500 mb-1">{t('posx.invoices.filter.cashier')}</label>
                                <select value={cashierF} onChange={e => setCashierF(e.target.value)} className={`${INPUT_SM_CLASSES} w-full`}>
                                    <option value="all">{t('posx.invoices.filter.all_cashiers')}</option>
                                    {cashierOptions.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div><label className="block text-xs text-neutral-500 mb-1">{t('posx.invoices.type_label')}</label>
                                <select value={typeF} onChange={e => setTypeF(e.target.value)} className={`${INPUT_SM_CLASSES} w-full`}>
                                    <option value="all">{t('posx.invoices.filter.all_types')}</option>
                                    {typeOptions.map(tp => <option key={tp} value={tp}>{tp}</option>)}
                                </select>
                            </div>
                            <div><label className="block text-xs text-neutral-500 mb-1">{t('posx.invoices.filter.date_from')}</label><input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={`${INPUT_SM_CLASSES} w-full`} /></div>
                            <div><label className="block text-xs text-neutral-500 mb-1">{t('posx.invoices.filter.date_to')}</label><input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={`${INPUT_SM_CLASSES} w-full`} /></div>
                            <div><label className="block text-xs text-neutral-500 mb-1">{t('posx.invoices.filter.min')}</label><input type="number" value={minAmount} onChange={e => setMinAmount(e.target.value)} placeholder="0" className={`${INPUT_SM_CLASSES} w-full`} /></div>
                            <div><label className="block text-xs text-neutral-500 mb-1">{t('posx.invoices.filter.max')}</label><input type="number" value={maxAmount} onChange={e => setMaxAmount(e.target.value)} placeholder="∞" className={`${INPUT_SM_CLASSES} w-full`} /></div>
                            <label className="flex items-end gap-2 text-sm text-neutral-700 dark:text-neutral-200 pb-1"><input type="checkbox" checked={onlyBalance} onChange={e => setOnlyBalance(e.target.checked)} className="h-4 w-4" />{t('posx.invoices.filter.only_balance')}</label>
                        </div>
                    )}
                </div>
            )}

            {loading ? <LoadingSkeleton variant="list" rows={4} /> : items.length === 0 ? (
                <EmptyState title={t('posx.invoices.empty_title')} description={t('posx.invoices.empty_desc')} />
            ) : filtered.length === 0 ? (
                <EmptyState title={t('posx.invoices.no_results')} description={t('posx.invoices.no_results_desc')} />
            ) : (
                <div className="space-y-2">
                    {pg.paged.map(inv => {
                        const st = STATUS[inv.status] || STATUS.pending;
                        return (
                            <div key={inv.id} className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-3">
                                <div className="flex items-center gap-3 flex-wrap">
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                                    <span className="font-semibold text-neutral-800 dark:text-neutral-100">{t('posx.invoices.invoice_num', { num: inv.number ? `#${inv.number}` : '' })}</span>
                                    {inv.clientName && <span className="text-neutral-500">· {inv.clientName}</span>}
                                    <span className="text-neutral-500">· {money(inv.total)}</span>
                                    {inv.type && <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-700 text-neutral-500">{inv.type}</span>}
                                    {inv.status === 'partial' && <span className="text-blue-600 dark:text-blue-400 text-xs">{t('posx.invoices.partial_info', { paid: money(inv.amountPaid || 0), balance: money((inv.total || 0) - (inv.amountPaid || 0)) })}</span>}
                                    <span className="text-xs text-neutral-400 ml-auto">{new Date(inv.createdAt).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-neutral-500">
                                    {inv.cashierName && <span>{t('posx.invoices.cashier_label')}: {inv.cashierName}</span>}
                                    {inv.clientEmail && <span>· ✉ {inv.clientEmail}</span>}
                                    {inv.description && <span>· {inv.description}</span>}
                                </div>
                                <div className="flex items-center gap-3 mt-2 flex-wrap">
                                    <button onClick={() => setShare(inv)} className="text-xs text-primary hover:underline">{t('posx.invoices.view_link_qr')}</button>
                                    <button onClick={() => copyLink(inv)} className="text-xs text-neutral-500 hover:underline">{t('posx.invoices.copy_link')}</button>
                                    <button onClick={() => sendByEmail(inv)} className="text-xs text-blue-600 hover:underline">{t('posx.invoices.send_email')}</button>
                                    {(inv.status === 'pending' || inv.status === 'partial') && <button onClick={() => openEdit(inv)} className="text-xs text-amber-600 hover:underline">{t('common.edit')}</button>}
                                    {(inv.status === 'pending' || inv.status === 'partial') && <button onClick={() => markPaid(inv)} className="text-xs text-green-600 hover:underline">{t('posx.invoices.register_payment')}</button>}
                                    {inv.status === 'paid' && inv.paidMethod && <span className="text-xs text-neutral-400 ml-auto">{t('posx.invoices.paid_with', { method: inv.paidMethod })}{inv.paidReference ? t('posx.invoices.ref_suffix', { ref: inv.paidReference }) : ''}</span>}
                                </div>
                            </div>
                        );
                    })}
                    <PaginationFooter
                        total={pg.total} page={pg.page} pageCount={pg.pageCount}
                        pageSize={pg.pageSize} from={pg.from} to={pg.to}
                        onPage={pg.setPage} onPageSize={pg.setPageSize}
                    />
                </div>
            )}

            <ShareModal invoice={share} onClose={() => setShare(null)} />
        </div>
    );
};
