import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { ProductFormModal } from '../pm/ProductFormModal';
import { DataTable, type TableColumn } from '../../components/DataTable';
import { invoicesService, type Invoice, type InvoiceItemInput } from '../../services/invoices';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES, INPUT_SM_CLASSES, ADMIN_USER_ID } from '../../constants';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal, ConfirmationModal } from '../../components/Modal';
import { InputModal } from '../../components/InputModal';
import { RowActionsMenu } from '../../components/ui/RowActionsMenu';
import { InvoiceTypeSelect } from '../../components/pos/InvoiceTypeSelect';
import { InvoiceDesignPreview } from '../../components/pos/InvoiceDesignPreview';
import { ClientNameLink, EmployeeNameLink } from '../../components/ui/EntityNameLink';
import { useTranslation, useGlobalSettings } from '../../contexts/GlobalSettingsContext';

const money = (n: number) => `$${(Number(n) || 0).toFixed(2)}`;
const publicLink = (token: string) => `${window.location.origin}/pay/${token}`;

const STATUS: Record<string, { label: string; cls: string }> = {
    pending: { label: 'Pendiente', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
    partial: { label: 'Pago parcial', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
    paid: { label: 'Pagada', cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
    cancelled: { label: 'Cancelada', cls: 'bg-neutral-200 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-300' },
};

type DraftItem = { name: string; quantity: string; unitPrice: string; taxRate?: number };
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

/** Métodos de cobro para registrar un abono manualmente. */
const PAY_METHODS = ['ATH Móvil', 'AgilPay / Tarjeta', 'Efectivo', 'Transferencia', 'Cheque', 'Otro'];

/** Modal con diseño de formulario para registrar un abono/pago a una factura. */
const PayModal: React.FC<{ invoice: Invoice | null; onClose: () => void; onDone: () => void }> = ({ invoice, onClose, onDone }) => {
    const { t } = useTranslation();
    const balance = invoice ? Math.max(0, (invoice.total || 0) - (invoice.amountPaid || 0)) : 0;
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState(PAY_METHODS[0]);
    const [reference, setReference] = useState('');
    const [saving, setSaving] = useState(false);

    // Al abrir, precargar el saldo pendiente y limpiar el resto.
    useEffect(() => {
        if (invoice) { setAmount(balance.toFixed(2)); setMethod(PAY_METHODS[0]); setReference(''); }
    }, [invoice]); // eslint-disable-line

    const submit = async () => {
        if (!invoice) return;
        const amt = parseFloat(String(amount).replace(',', '.'));
        if (!(amt > 0)) return toast.error(t('posx.invoices.err_amount'));
        if (amt > balance + 0.001) return toast.error(t('posx.invoices.err_amount_over', { balance: money(balance) }));
        setSaving(true);
        try {
            await invoicesService.markPaid(invoice.id, { method, reference: reference.trim() || undefined, amount: amt });
            toast.success(t('posx.invoices.payment_recorded'));
            onDone(); onClose();
        } catch (err) { toast.error(err instanceof ApiError ? err.message : t('posx.invoices.err_payment')); }
        finally { setSaving(false); }
    };

    const labelCls = 'block text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-1';

    return (
        <Modal isOpen={!!invoice} onClose={onClose} title={t('posx.invoices.pay_title', { num: invoice?.number ? `#${invoice.number}` : '' })} size="sm">
            <div className="space-y-4">
                {/* Resumen del saldo */}
                <div className="flex items-center justify-between bg-neutral-50 dark:bg-neutral-700/40 rounded-md px-3 py-2 text-sm">
                    <span className="text-neutral-500">{t('pos.receivable.col.balance')}</span>
                    <span className="font-bold text-red-600 dark:text-red-400 tabular-nums">{money(balance)}</span>
                </div>

                <div>
                    <label className={labelCls}>{t('posx.invoices.pay_amount')}</label>
                    <div className="flex gap-2">
                        <input
                            type="text" inputMode="decimal" value={amount} autoFocus
                            onChange={e => setAmount(e.target.value)}
                            className={`${INPUT_SM_CLASSES} w-full text-lg tabular-nums`}
                        />
                        <button type="button" onClick={() => setAmount(balance.toFixed(2))} className={`${BUTTON_SECONDARY_SM_CLASSES} whitespace-nowrap`}>{t('pay.full_balance')}</button>
                    </div>
                </div>

                <div>
                    <label className={labelCls}>{t('posx.invoices.pay_method')}</label>
                    <select value={method} onChange={e => setMethod(e.target.value)} className={`${INPUT_SM_CLASSES} w-full`}>
                        {PAY_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>

                <div>
                    <label className={labelCls}>{t('posx.invoices.pay_reference')} <span className="text-neutral-400 text-xs font-normal">{t('cmp.onb.optional')}</span></label>
                    <input
                        type="text" value={reference} onChange={e => setReference(e.target.value)}
                        placeholder={t('posx.invoices.pay_reference_ph')} className={`${INPUT_SM_CLASSES} w-full`}
                    />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-700">
                    <button type="button" onClick={onClose} disabled={saving} className={BUTTON_SECONDARY_SM_CLASSES}>{t('common.cancel')}</button>
                    <button type="button" onClick={submit} disabled={saving} className={`${BUTTON_PRIMARY_SM_CLASSES} disabled:opacity-50`}>
                        {saving ? t('cmpx.agilpay.processing') : t('posx.invoices.pay_submit')}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export const InvoicesListPage: React.FC = () => {
    const { t } = useTranslation();
    const { settings } = useGlobalSettings();
    const { clients, products } = useData();
    const { currentUser } = useAuth();
    const [openLine, setOpenLine] = useState<number | null>(null);
    // Crear producto desde la factura: modal + flujo de "productos inventados".
    const [productModal, setProductModal] = useState<{ open: boolean; initialName: string }>({ open: false, initialName: '' });
    const [confirmProduct, setConfirmProduct] = useState<string | null>(null);
    const inventedQueueRef = useRef<string[]>([]);
    const pendingParsedRef = useRef<InvoiceItemInput[] | null>(null);
    // El ConfirmationModal llama onClose TANTO al confirmar como al cancelar; este flag
    // evita que "confirmar" dispare el flujo de cancelación (toast de error).
    const confirmingProductRef = useRef(false);
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
    const [showDeleted, setShowDeleted] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [share, setShare] = useState<Invoice | null>(null);
    const [payFor, setPayFor] = useState<Invoice | null>(null);
    const [emailFor, setEmailFor] = useState<Invoice | null>(null);
    const [toDelete, setToDelete] = useState<Invoice | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Form
    const [clientId, setClientId] = useState('');
    const [clientQuery, setClientQuery] = useState('');
    const [clientOpen, setClientOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [sendOnCreate, setSendOnCreate] = useState(true);
    const [allowPartial, setAllowPartial] = useState(true);
    const [description, setDescription] = useState('');
    const [invType, setInvType] = useState('');
    // "Avanzado": personalización del diseño/textos SOLO para esta factura.
    const [advOpen, setAdvOpen] = useState(false);
    const [design, setDesign] = useState<Record<string, any>>({});
    // Abonos ya realizados al crear la factura (efectivo u otro método).
    const [abonos, setAbonos] = useState<{ method: string; amount: string; reference: string }[]>([]);
    const addAbono = () => setAbonos(a => [...a, { method: PAY_METHODS[2], amount: '', reference: '' }]);
    const setAbono = (i: number, patch: Partial<{ method: string; amount: string; reference: string }>) => setAbonos(a => a.map((x, idx) => idx === i ? { ...x, ...patch } : x));
    const removeAbono = (i: number) => setAbonos(a => a.filter((_, idx) => idx !== i));
    const abonosTotal = abonos.reduce((s, a) => s + (Number(a.amount) || 0), 0);
    const gDesign: any = (settings as any)?.receiptConfig?.invoiceDesign || {};
    const setD = (k: string, v: any) => setDesign(d => { const n = { ...d }; if (v === '' || v == null) delete n[k]; else n[k] = v; return n; });
    const setLbl = (k: string, v: string) => setDesign(d => { const labels = { ...(d.labels || {}) }; if (!v) delete labels[k]; else labels[k] = v; const n = { ...d }; if (Object.keys(labels).length) n.labels = labels; else delete n.labels; return n; });
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
        try { setItems(await invoicesService.list(showDeleted)); }
        catch (err) { if (err instanceof ApiError) toast.error(err.message); }
        finally { setLoading(false); }
    }, [showDeleted]);
    useEffect(() => { load(); }, [load]);

    const restore = async (inv: Invoice) => {
        try { await invoicesService.restore(inv.id); toast.success(t('posx.invoices.restored_ok')); load(); }
        catch (err) { toast.error(err instanceof ApiError ? err.message : t('posx.invoices.err_restore')); }
    };

    const resetForm = () => { setClientId(''); setClientQuery(''); setEmail(''); setSendOnCreate(true); setAllowPartial(true); setDescription(''); setInvType(''); setEditId(null); setLines([emptyItem()]); setDesign({}); setAdvOpen(false); setAbonos([]); };

    // Abrir el formulario en modo EDICIÓN, precargado con la factura (solo pendientes/parciales).
    const openEdit = (inv: Invoice) => {
        setEditId(inv.id);
        setClientId(inv.clientId || '');
        setClientQuery(inv.clientName || '');
        setEmail(inv.clientEmail || '');
        setDescription(inv.description || '');
        setInvType(inv.type || '');
        setAllowPartial(inv.allowPartial !== false);
        setLines((inv.items || []).map(it => ({ name: it.name, quantity: String(it.quantity), unitPrice: String(it.unitPrice), taxRate: (it as any).taxRate ?? undefined })));
        setSendOnCreate(false);
        setShowForm(true);
    };
    const setLine = (i: number, patch: Partial<DraftItem>) => setLines(ls => ls.map((l, idx) => idx === i ? { ...l, ...patch } : l));
    const addLine = () => setLines(ls => [...ls, emptyItem()]);
    // Si hay varias líneas, elimina la línea; si es la única, la limpia (deja el form vacío).
    const removeLine = (i: number) => setLines(ls => ls.length > 1 ? ls.filter((_, idx) => idx !== i) : [emptyItem()]);

    const draftTotal = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0);

    // Nombres de productos existentes (normalizados) para detectar líneas "inventadas".
    const productNameSet = useMemo(
        () => new Set((products || []).map(p => p.name.trim().toLowerCase())),
        [products]
    );
    // Producto por nombre → para resolver la tasa de IVU (ivuRate=0 si es exento).
    const productByName = useMemo(() => {
        const m = new Map<string, any>();
        for (const p of (products || [])) m.set(p.name.trim().toLowerCase(), p);
        return m;
    }, [products]);
    // Tasa de IVU de un producto (el BE la llama ivaRate; el público la renombra a ivuRate).
    const prodRate = (p: any): number | undefined => (p?.ivaRate != null ? p.ivaRate : p?.ivuRate);
    // Config del desglose IVU (misma lógica que el POS). Con el desglose activo, la tasa la
    // define la config (Estatal+Municipal), NO el ivuRate del producto → poner 0 = sin IVU.
    const bd = !!settings.taxBreakdownEnabled;
    // Exención de IVU por CLIENTE (ej. dueños de finca): al elegir el cliente, pone estatal/municipal en 0.
    const invClient: any = clients.find(c => c.id === clientId);
    const exemptState = !!invClient?.taxExemptState;
    const exemptMunicipal = !!invClient?.taxExemptMunicipal
        || (invClient?.municipalTaxExemptionUntil && new Date(invClient.municipalTaxExemptionUntil).getTime() > Date.now());
    const clientFullyExempt = exemptState && exemptMunicipal;
    const stateR = exemptState ? 0 : (Number(settings.taxStateRate) || 0);
    const municipalR = exemptMunicipal ? 0 : (Number(settings.taxMunicipalRate) || 0);
    const reducedR = exemptState ? 0 : (Number(settings.taxReducedRate) || 0);
    // Tasa de IVU efectiva de una línea.
    const lineTaxRate = (l: DraftItem): number | undefined => {
        const prod = productByName.get(l.name.trim().toLowerCase());
        const explicit = l.taxRate != null ? l.taxRate : (prod ? prodRate(prod) : undefined);
        // Producto EXENTO (tasa 0) → 0 en cualquier modo.
        if (explicit === 0) return 0;
        if (bd) {
            // Desglose activo: tasa reducida si el producto está marcado; si no, Estatal+Municipal
            // (ya con la exención del cliente aplicada arriba).
            const reduced = prod ? !!(prod as any).reducedTax : false;
            return reduced ? reducedR : (stateR + municipalR);
        }
        // Clásico: cliente exento total → 0; si no, tasa del producto o el default global del server.
        if (clientFullyExempt) return 0;
        return explicit;
    };

    // ── Preview en vivo del diseño de la factura ──
    const previewMergedDesign = { ...gDesign, ...design, labels: { ...(gDesign.labels || {}), ...(design.labels || {}) } };
    const previewRC: any = (settings as any).receiptConfig || {};
    const previewBusiness = { name: previewRC.businessName, logoUrl: previewRC.logoUrl, rnc: previewRC.rnc, address: previewRC.address, phone: previewRC.phone };
    const previewItems = lines.map(l => ({ name: l.name, quantity: Number(l.quantity) || 0, unitPrice: Number(l.unitPrice) || 0 }));
    const normRate = (r?: number) => r == null ? 0 : (r > 1 ? r / 100 : r); // acepta fracción (0.115) o % (11.5)
    const previewTax = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0) * normRate(lineTaxRate(l)), 0);
    const previewClientName = invClient ? `${invClient.name} ${invClient.lastName || ''}`.trim() : (clientQuery.trim() || undefined);

    const create = async () => {
        const parsed: InvoiceItemInput[] = [];
        for (const l of lines) {
            const q = Number(l.quantity), p = Number(l.unitPrice);
            if (!l.name.trim()) return toast.error(t('posx.invoices.err_line_desc'));
            if (!(q > 0)) return toast.error(t('posx.invoices.err_qty'));
            if (!(p >= 0)) return toast.error(t('posx.invoices.err_price'));
            const rate = lineTaxRate(l);
            parsed.push({ name: l.name.trim(), quantity: q, unitPrice: p, ...(rate != null ? { taxRate: rate } : {}) });
        }
        if (parsed.length === 0) return toast.error(t('posx.invoices.err_no_items'));

        // Productos "inventados": líneas cuyo nombre no coincide con ningún producto existente.
        const invented: string[] = [];
        for (const it of parsed) {
            const key = it.name.toLowerCase();
            if (!productNameSet.has(key) && !invented.some(n => n.toLowerCase() === key)) invented.push(it.name);
        }
        if (invented.length > 0) {
            // Guardamos la factura pendiente y pedimos crear cada producto inventado, uno por uno.
            pendingParsedRef.current = parsed;
            inventedQueueRef.current = invented;
            setConfirmProduct(invented[0]);
            return;
        }
        await submitInvoice(parsed);
    };

    // Envío real de la factura (crear/editar), una vez validados los productos.
    const submitInvoice = async (parsed: InvoiceItemInput[]) => {
        setSaving(true);
        try {
            if (editId) {
                // Edición de una factura existente (no pagada).
                await invoicesService.update(editId, {
                    clientId: clientId || null,
                    email: email.trim() || null,
                    items: parsed,
                    description: description || null,
                    allowPartial,
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
                    allowPartial,
                    type: invType.trim() || null,
                    designOverride: Object.keys(design).length ? design : undefined,
                    initialPayments: abonos.map(a => ({ method: a.method, amount: Number(a.amount) || 0, reference: a.reference.trim() || undefined })).filter(a => a.amount > 0),
                });
                toast.success(sendOnCreate && email.trim() ? t('posx.invoices.created_sent', { email: email.trim() }) : t('posx.invoices.created'));
                setShowForm(false); resetForm(); load();
                setShare(created); // abre el modal con el link/QR
            }
        } catch (err) {
            toast.error(err instanceof ApiError ? err.message : t('posx.invoices.err_create'));
        } finally { setSaving(false); }
    };

    // ── Flujo de "productos inventados" ────────────────────────────────
    // El usuario aceptó crear el producto de la línea actual → abrir el modal precargado.
    const onConfirmCreateProduct = () => {
        const name = confirmProduct;
        confirmingProductRef.current = true; // marcamos que este cierre viene de "confirmar"
        setConfirmProduct(null);
        if (name) setProductModal({ open: true, initialName: name });
    };
    // onClose del ConfirmationModal: se dispara al confirmar Y al cancelar. Si venimos de
    // confirmar, no hacemos nada; si es una cancelación real, no se puede crear la factura.
    const onCloseConfirmProduct = () => {
        if (confirmingProductRef.current) { confirmingProductRef.current = false; return; }
        setConfirmProduct(null);
        inventedQueueRef.current = [];
        pendingParsedRef.current = null;
        toast.error(t('posx.invoices.err_invalid_product'));
    };
    // Producto creado en el modal → avanzar la cola; si no quedan inventados, enviar la factura.
    const onProductCreated = (created: { name?: string; unitPrice?: number; ivuRate?: number; ivaRate?: number }) => {
        const createdName = (created?.name || '').trim();
        // Tasa de IVU del producto recién creado (0 = exento). El BE la usa por línea.
        const createdRate = created?.ivuRate != null ? created.ivuRate : created?.ivaRate;
        const key = createdName.toLowerCase();
        if (createdName) {
            // Fijar precio (si faltaba) y la tasa en la línea correspondiente.
            setLines(ls => ls.map(l => {
                if (l.name.trim().toLowerCase() !== key) return l;
                const patch: Partial<DraftItem> = { taxRate: createdRate };
                if (created?.unitPrice != null && !(Number(l.unitPrice) > 0)) patch.unitPrice = String(created.unitPrice);
                return { ...l, ...patch };
            }));
            if (pendingParsedRef.current) {
                pendingParsedRef.current = pendingParsedRef.current.map(it => {
                    if (it.name.toLowerCase() !== key) return it;
                    const next: typeof it = { ...it, ...(createdRate != null ? { taxRate: createdRate } : {}) };
                    if (created?.unitPrice != null && !(it.unitPrice > 0)) next.unitPrice = created.unitPrice;
                    return next;
                });
            }
        }
        // Quitar de la cola el nombre recién creado (por si acaso, todos los que ahora existen).
        const queue = inventedQueueRef.current.filter(n =>
            n.trim().toLowerCase() !== createdName.toLowerCase()
        );
        inventedQueueRef.current = queue;
        if (queue.length > 0) {
            setConfirmProduct(queue[0]);
        } else {
            const parsed = pendingParsedRef.current;
            pendingParsedRef.current = null;
            if (parsed) submitInvoice(parsed);
        }
    };

    const sendByEmail = async (inv: Invoice) => {
        try {
            const r = await invoicesService.send(inv.id);
            toast.success(t('posx.invoices.sent_to', { to: r.to }));
        } catch (err) {
            // Si no hay correo del cliente, lo pedimos con un modal y reintentamos.
            setEmailFor(inv);
        }
    };

    const confirmSendEmail = async (to: string) => {
        if (!emailFor) return;
        const inv = emailFor;
        setEmailFor(null);
        try {
            const r = await invoicesService.send(inv.id, to.trim());
            toast.success(t('posx.invoices.sent_to', { to: r.to }));
        } catch (e) {
            toast.error(e instanceof ApiError ? e.message : t('posx.invoices.err_send'));
        }
    };

    // Abre el modal de abono (reemplaza los prompts nativos).
    const markPaid = (inv: Invoice) => setPayFor(inv);

    // Elimina la factura tras confirmar en el modal.
    const confirmDelete = async () => {
        if (!toDelete) return;
        setDeleting(true);
        try {
            await invoicesService.remove(toDelete.id);
            toast.success(t('posx.invoices.deleted_ok'));
            setToDelete(null);
            load();
        } catch (err) { toast.error(err instanceof ApiError ? err.message : t('posx.invoices.err_delete')); }
        finally { setDeleting(false); }
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
    const hasActiveFilters = !!(statusF !== 'all' || cashierF !== 'all' || typeF !== 'all' || dateFrom || dateTo || minAmount || maxAmount || onlyBalance);
    const clearFilters = () => { setStatusF('all'); setCashierF('all'); setTypeF('all'); setDateFrom(''); setDateTo(''); setMinAmount(''); setMaxAmount(''); setOnlyBalance(false); };
    const cashierOptions = useMemo(() => [...new Set(items.map(i => i.cashierName).filter(Boolean))] as string[], [items]);
    const typeOptions = useMemo(() => [...new Set(items.map(i => i.type).filter(Boolean))] as string[], [items]);

    const columns: TableColumn<Invoice>[] = useMemo(() => [
        {
            header: t('common.status'), sortValue: inv => inv.status, filterType: 'none',
            accessor: (inv) => { const s = STATUS[inv.status] || STATUS.pending; return <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${s.cls}`}>{s.label}</span>; },
        },
        { header: '#', sortValue: inv => inv.number ?? 0, accessor: (inv) => <span className="font-semibold">{inv.number ? `#${inv.number}` : '—'}</span> },
        { header: t('common.name'), sortValue: inv => inv.clientName || '', accessor: (inv) => inv.clientName ? <ClientNameLink clientId={inv.clientId} name={inv.clientName} /> : <span className="text-neutral-400">—</span> },
        { header: t('common.email'), sortValue: inv => inv.clientEmail || '', accessor: (inv) => inv.clientEmail || <span className="text-neutral-400">—</span> },
        { header: t('posx.invoices.cashier_label'), sortValue: inv => inv.cashierName || '', accessor: (inv) => inv.cashierName ? <EmployeeNameLink userId={inv.createdByUserId} name={inv.cashierName} /> : <span className="text-neutral-400">—</span> },
        { header: t('posx.invoices.type_label'), sortValue: inv => inv.type || '', accessor: (inv) => inv.type ? <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-700 text-neutral-500">{inv.type}</span> : <span className="text-neutral-400">—</span> },
        { header: t('common.total'), sortValue: inv => inv.total, className: 'text-right', accessor: (inv) => <span className="font-medium tabular-nums">{money(inv.total)}</span> },
        {
            header: t('posx.invoices.paid_label'), sortValue: inv => inv.amountPaid || 0, className: 'text-right',
            accessor: (inv) => { const paid = inv.amountPaid || 0; return <span className={`tabular-nums ${paid > 0.001 ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-neutral-400'}`}>{money(paid)}</span>; },
        },
        {
            header: t('pos.receivable.col.balance'), sortValue: inv => (inv.total || 0) - (inv.amountPaid || 0), className: 'text-right',
            accessor: (inv) => { const bal = (inv.total || 0) - (inv.amountPaid || 0); return <span className={`tabular-nums ${bal > 0.001 ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-neutral-400'}`}>{money(Math.max(0, bal))}</span>; },
        },
        { header: t('common.date'), sortValue: inv => inv.createdAt, accessor: (inv) => <span className="text-sm text-neutral-600 dark:text-neutral-300 whitespace-nowrap">{new Date(inv.createdAt).toLocaleDateString()}</span> },
    ] as TableColumn<Invoice>[], [t, items]);

    const onRowClick = (inv: Invoice) => {
        if (inv.status === 'pending' || inv.status === 'partial') openEdit(inv);
        else setShare(inv); // pagadas/canceladas: mostrar link/QR (no editables)
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-2">
                <h1 className="text-2xl font-semibold text-neutral-700 dark:text-neutral-200">{t('posx.invoices.title')}</h1>
                <div className="flex items-center gap-2">
                    <button onClick={() => setShowDeleted(s => !s)} className={`${BUTTON_SECONDARY_SM_CLASSES} ${showDeleted ? 'ring-1 ring-primary text-primary' : ''}`}>{showDeleted ? t('common.show_active') : t('common.show_deleted')}</button>
                    {!showDeleted && <button onClick={() => { if (showForm) { setShowForm(false); resetForm(); } else { resetForm(); setShowForm(true); } }} className={BUTTON_PRIMARY_SM_CLASSES}>{showForm ? t('posx.invoices.close') : t('posx.invoices.new_invoice_btn')}</button>}
                </div>
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">{t('posx.invoices.intro')}</p>

            {showForm && (
                <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 mb-4 space-y-3">
                    <h3 className="font-semibold text-primary">{editId ? t('posx.invoices.edit_invoice') : t('posx.invoices.new_invoice')}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">{t('posx.invoices.client_optional')}</label>
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
                            <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">{t('posx.invoices.client_email_label')}</label>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="cliente@correo.com" className={`${INPUT_SM_CLASSES} w-full`} />
                            <label className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-300 mt-1">
                                <input type="checkbox" checked={sendOnCreate} onChange={e => setSendOnCreate(e.target.checked)} className="h-3.5 w-3.5" />
                                {t('posx.invoices.send_on_create')}
                            </label>
                            <label className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-300 mt-1">
                                <input type="checkbox" checked={allowPartial} onChange={e => setAllowPartial(e.target.checked)} className="h-3.5 w-3.5" />
                                {t('posx.invoices.allow_partial')}
                            </label>
                        </div>
                        <div>
                            <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">{t('posx.invoices.desc_note_label')}</label>
                            <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder={t('posx.invoices.desc_placeholder')} className={`${INPUT_SM_CLASSES} w-full`} />
                        </div>
                        <div>
                            <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">{t('posx.invoices.type_label')}</label>
                            <InvoiceTypeSelect value={invType} onChange={setInvType} />
                        </div>
                    </div>

                    {/* AVANZADO: personalizar el diseño/textos de ESTA factura (sobre el diseño global) */}
                    {!editId && (
                        <div className="border border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg">
                            <button type="button" onClick={() => setAdvOpen(o => !o)} className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-200">
                                <span>⚙️ {t('posx.invoices.advanced')}{Object.keys(design).length > 0 && <span className="ml-2 text-xs text-primary">• {t('posx.invoices.advanced_active')}</span>}</span>
                                <span className="text-neutral-400">{advOpen ? '▲' : '▼'}</span>
                            </button>
                            {advOpen && (
                                <div className="px-3 pb-3 pt-1 space-y-3 border-t border-neutral-100 dark:border-neutral-700">
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{t('posx.invoices.advanced_hint')}</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs text-neutral-500 mb-1">{t('posx.invoices.adv_title')}</label>
                                            <input type="text" value={design.title ?? ''} onChange={e => setD('title', e.target.value)} placeholder={gDesign.title || 'FACTURA'} className={`${INPUT_SM_CLASSES} w-full`} />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-neutral-500 mb-1">{t('posx.invoices.adv_footer')}</label>
                                            <input type="text" value={design.footerText ?? ''} onChange={e => setD('footerText', e.target.value)} placeholder={gDesign.footerText || '¡Gracias por su preferencia!'} className={`${INPUT_SM_CLASSES} w-full`} />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-neutral-500 mb-1">{t('posx.invoices.adv_template')}</label>
                                            <select value={design.template ?? ''} onChange={e => setD('template', e.target.value)} className={`${INPUT_SM_CLASSES} w-full`}>
                                                <option value="">{t('posx.invoices.adv_default')} ({gDesign.template || 'modern'})</option>
                                                <option value="modern">Moderno</option>
                                                <option value="banner">Banner</option>
                                                <option value="classic">Clásico</option>
                                            </select>
                                        </div>
                                        <div className="flex gap-3">
                                            <div>
                                                <label className="block text-xs text-neutral-500 mb-1">{t('posx.invoices.adv_header_color')}</label>
                                                <input type="color" value={design.headerColor ?? gDesign.headerColor ?? '#4CAF50'} onChange={e => setD('headerColor', e.target.value)} className="h-9 w-14 rounded border border-neutral-300 dark:border-neutral-600" />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-neutral-500 mb-1">{t('posx.invoices.adv_accent_color')}</label>
                                                <input type="color" value={design.accentColor ?? gDesign.accentColor ?? '#7E57C2'} onChange={e => setD('accentColor', e.target.value)} className="h-9 w-14 rounded border border-neutral-300 dark:border-neutral-600" />
                                            </div>
                                        </div>
                                    </div>
                                    {/* Textos editables de ESTA factura */}
                                    <details>
                                        <summary className="text-xs font-medium cursor-pointer text-primary">✏️ {t('posx.invoices.adv_texts')}</summary>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
                                            {([
                                                ['clientHeading', 'Datos del Cliente'], ['colProduct', 'Producto'], ['colQty', 'Cant'],
                                                ['colPrice', 'Precio Unit.'], ['colTotal', 'Total'], ['subtotal', 'Subtotal'],
                                                ['tax', 'IVU'], ['total', 'Total'], ['paymentMethod', 'Método de pago'],
                                            ] as [string, string][]).map(([k, def]) => (
                                                <div key={k}>
                                                    <label className="block text-[11px] text-neutral-400 mb-0.5">{def}</label>
                                                    <input type="text" value={design.labels?.[k] ?? ''} onChange={e => setLbl(k, e.target.value)} placeholder={gDesign.labels?.[k] || def} className={`${INPUT_SM_CLASSES} w-full`} />
                                                </div>
                                            ))}
                                        </div>
                                    </details>
                                    {Object.keys(design).length > 0 && (
                                        <button type="button" onClick={() => setDesign({})} className="text-xs text-red-500 hover:underline">{t('posx.invoices.adv_reset')}</button>
                                    )}

                                    {/* Vista previa en vivo */}
                                    <div className="pt-3 mt-2 border-t border-dashed border-neutral-300 dark:border-neutral-600">
                                        <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-2">👁️ {t('posx.invoices.adv_preview') || 'Vista previa (cómo va quedando)'}</p>
                                        <div className="flex justify-center bg-neutral-100 dark:bg-neutral-900/40 rounded-lg p-4">
                                            <InvoiceDesignPreview
                                                design={previewMergedDesign}
                                                business={previewBusiness}
                                                clientName={previewClientName}
                                                notes={description}
                                                items={previewItems}
                                                subtotal={draftTotal}
                                                tax={previewTax}
                                                total={draftTotal + previewTax}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="block text-xs text-neutral-500">{t('posx.invoices.items')}</label>
                        {lines.map((l, i) => (
                            <div key={i} className="flex gap-2 items-center">
                                <div className="relative flex-1">
                                    <input
                                        type="text"
                                        value={l.name}
                                        onChange={e => { setLine(i, { name: e.target.value, taxRate: undefined }); setOpenLine(i); }}
                                        onFocus={() => setOpenLine(i)}
                                        onBlur={() => setTimeout(() => setOpenLine(o => (o === i ? null : o)), 150)}
                                        placeholder={t('posx.invoices.item_desc_placeholder')}
                                        className={`${INPUT_SM_CLASSES} w-full`}
                                        autoComplete="off"
                                    />
                                    {openLine === i && l.name.trim() && (() => {
                                        const q = l.name.trim().toLowerCase();
                                        const matches = (products || []).filter(p =>
                                            `${p.name} ${(p.skus || []).join(' ')}`.toLowerCase().includes(q)
                                        ).slice(0, 30);
                                        if (matches.length === 0) return null;
                                        return (
                                            <ul className="absolute z-30 w-full mt-1 bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-md shadow-lg max-h-56 overflow-y-auto">
                                                {matches.map(p => (
                                                    <li
                                                        key={p.id}
                                                        onMouseDown={() => { setLine(i, { name: p.name, unitPrice: String(p.unitPrice ?? ''), taxRate: prodRate(p) }); setOpenLine(null); }}
                                                        className="px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-600 cursor-pointer text-sm flex justify-between gap-2"
                                                    >
                                                        <span className="truncate">{p.name}</span>
                                                        <span className="text-neutral-400 whitespace-nowrap">{money(p.unitPrice || 0)}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        );
                                    })()}
                                </div>
                                <input type="number" value={l.quantity} onChange={e => setLine(i, { quantity: e.target.value })} placeholder={t('posx.invoices.qty_placeholder')} className={`${INPUT_SM_CLASSES} w-20`} />
                                <input type="number" value={l.unitPrice} onChange={e => setLine(i, { unitPrice: e.target.value })} placeholder={t('posx.invoices.price_placeholder')} className={`${INPUT_SM_CLASSES} w-28`} />
                                <span className="w-24 text-right text-sm text-neutral-500">{money((Number(l.quantity) || 0) * (Number(l.unitPrice) || 0))}</span>
                                <button onClick={() => removeLine(i)} className="text-red-500 hover:text-red-700 px-1" title={t('posx.invoices.remove')}>✕</button>
                            </div>
                        ))}
                        <div className="flex items-center gap-4">
                            <button onClick={addLine} className="text-sm text-primary hover:underline">{t('posx.invoices.add_item')}</button>
                            <button
                                type="button"
                                onClick={() => setProductModal({ open: true, initialName: '' })}
                                className="text-sm text-primary hover:underline"
                            >
                                + {t('posx.invoices.create_product')}
                            </button>
                        </div>
                    </div>

                    {/* Abonos ya realizados (opcional): la persona ya pagó parte/total al crear la factura */}
                    {!editId && (
                        <div className="border-t border-neutral-100 dark:border-neutral-700 pt-3 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200">{t('posx.invoices.abonos_title')}</span>
                                {abonosTotal > 0 && <span className="text-xs text-green-600 dark:text-green-400">{t('posx.invoices.abonos_paid')}: {money(abonosTotal)}</span>}
                            </div>
                            {abonos.map((a, i) => (
                                <div key={i} className="flex gap-2 items-center">
                                    <select value={a.method} onChange={e => setAbono(i, { method: e.target.value })} className={`${INPUT_SM_CLASSES} w-40`}>
                                        {PAY_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                    <input type="number" min="0" step="0.01" value={a.amount} onChange={e => setAbono(i, { amount: e.target.value })} placeholder={t('posx.invoices.price_placeholder')} className={`${INPUT_SM_CLASSES} w-28`} />
                                    <input type="text" value={a.reference} onChange={e => setAbono(i, { reference: e.target.value })} placeholder={t('posx.invoices.abonos_ref')} className={`${INPUT_SM_CLASSES} flex-1`} />
                                    <button onClick={() => removeAbono(i)} className="text-red-500 hover:text-red-700 px-1" title={t('posx.invoices.remove')}>✕</button>
                                </div>
                            ))}
                            <button onClick={addAbono} className="text-sm text-primary hover:underline">{t('posx.invoices.abonos_add')}</button>
                        </div>
                    )}

                    <div className="flex items-center justify-between border-t border-neutral-100 dark:border-neutral-700 pt-3">
                        <span className="text-sm text-neutral-500">{t('posx.invoices.subtotal_note')}</span>
                        <span className="font-semibold text-neutral-800 dark:text-neutral-100">{money(draftTotal)}</span>
                    </div>
                    {!editId && abonosTotal > 0 && (
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-green-600 dark:text-green-400">{t('posx.invoices.abonos_paid')}</span>
                            <span className="font-medium text-green-600 dark:text-green-400">−{money(abonosTotal)}</span>
                        </div>
                    )}
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
                            <div><label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">{t('posx.invoices.filter.cashier')}</label>
                                <select value={cashierF} onChange={e => setCashierF(e.target.value)} className={`${INPUT_SM_CLASSES} w-full`}>
                                    <option value="all">{t('posx.invoices.filter.all_cashiers')}</option>
                                    {cashierOptions.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div><label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">{t('posx.invoices.type_label')}</label>
                                <select value={typeF} onChange={e => setTypeF(e.target.value)} className={`${INPUT_SM_CLASSES} w-full`}>
                                    <option value="all">{t('posx.invoices.filter.all_types')}</option>
                                    {typeOptions.map(tp => <option key={tp} value={tp}>{tp}</option>)}
                                </select>
                            </div>
                            <div><label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">{t('posx.invoices.filter.date_from')}</label><input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={`${INPUT_SM_CLASSES} w-full`} /></div>
                            <div><label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">{t('posx.invoices.filter.date_to')}</label><input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={`${INPUT_SM_CLASSES} w-full`} /></div>
                            <div><label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">{t('posx.invoices.filter.min')}</label><input type="number" value={minAmount} onChange={e => setMinAmount(e.target.value)} placeholder="0" className={`${INPUT_SM_CLASSES} w-full`} /></div>
                            <div><label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">{t('posx.invoices.filter.max')}</label><input type="number" value={maxAmount} onChange={e => setMaxAmount(e.target.value)} placeholder="∞" className={`${INPUT_SM_CLASSES} w-full`} /></div>
                            <label className="flex items-end gap-2 text-sm text-neutral-700 dark:text-neutral-200 pb-1"><input type="checkbox" checked={onlyBalance} onChange={e => setOnlyBalance(e.target.checked)} className="h-4 w-4" />{t('posx.invoices.filter.only_balance')}</label>
                        </div>
                    )}
                </div>
            )}

            {loading ? <LoadingSkeleton variant="list" rows={4} /> : items.length === 0 ? (
                <EmptyState title={t('posx.invoices.empty_title')} description={t('posx.invoices.empty_desc')} />
            ) : (
                <DataTable<Invoice>
                    data={filtered}
                    columns={columns}
                    tableId="invoices"
                    onRowClick={showDeleted ? undefined : onRowClick}
                    searchable={false}
                    filterable={false}
                    initialPageSize={25}
                    actions={(inv) => (
                        showDeleted ? (
                            <button onClick={() => restore(inv)} className="text-xs text-green-600 hover:underline whitespace-nowrap">{t('common.restore')}</button>
                        ) : (
                            <RowActionsMenu items={[
                                { label: t('posx.invoices.view_link_qr'), onClick: () => setShare(inv), className: 'text-primary' },
                                { label: t('posx.invoices.copy_link'), onClick: () => copyLink(inv) },
                                { label: t('posx.invoices.send_email'), onClick: () => sendByEmail(inv), className: 'text-blue-600 dark:text-blue-400' },
                                { label: t('common.edit'), onClick: () => openEdit(inv), className: 'text-amber-600 dark:text-amber-400', hidden: !(inv.status === 'pending' || inv.status === 'partial') },
                                { label: t('posx.invoices.register_payment'), onClick: () => markPaid(inv), className: 'text-green-600 dark:text-green-400', hidden: !(inv.status === 'pending' || inv.status === 'partial') },
                                { label: t('common.delete'), onClick: () => setToDelete(inv), className: 'text-red-600 dark:text-red-400' },
                            ]} />
                        )
                    )}
                />
            )}

            <ShareModal invoice={share} onClose={() => setShare(null)} />
            <PayModal invoice={payFor} onClose={() => setPayFor(null)} onDone={load} />
            <InputModal
                isOpen={!!emailFor}
                title={t('posx.invoices.send_email_title') || 'Enviar factura por correo'}
                label={t('posx.invoices.prompt_email') || 'Correo del cliente:'}
                placeholder="cliente@correo.com"
                inputType="email"
                confirmText={t('posx.invoices.send') || 'Enviar'}
                cancelText={t('common.cancel') || 'Cancelar'}
                onConfirm={confirmSendEmail}
                onClose={() => setEmailFor(null)}
            />
            <ConfirmationModal
                isOpen={!!toDelete}
                onClose={() => { if (!deleting) setToDelete(null); }}
                onConfirm={confirmDelete}
                title={t('posx.invoices.delete_title')}
                confirmButtonText={t('common.delete')}
                message={
                    <div className="space-y-2">
                        <p>{t('posx.invoices.delete_confirm', { num: toDelete?.number ? `#${toDelete.number}` : '', total: money(toDelete?.total || 0) })}</p>
                        {(toDelete?.amountPaid || 0) > 0 ? (
                            <p className="text-sm text-amber-600 dark:text-amber-400">{t('posx.invoices.delete_soft_note', { paid: money(toDelete?.amountPaid || 0) })}</p>
                        ) : (
                            <p className="text-sm text-neutral-500">{t('posx.invoices.delete_irreversible')}</p>
                        )}
                    </div>
                }
            />

            {/* ¿Crear producto inventado? (uno por cada línea sin producto válido) */}
            <ConfirmationModal
                isOpen={!!confirmProduct}
                onClose={onCloseConfirmProduct}
                onConfirm={onConfirmCreateProduct}
                title={t('posx.invoices.create_product_title')}
                confirmButtonText={t('posx.invoices.create_product')}
                message={<p>{t('posx.invoices.create_product_confirm', { name: confirmProduct || '' })}</p>}
            />

            {/* Modal de creación de producto (precargado con el nombre inventado) */}
            <ProductFormModal
                isOpen={productModal.open}
                onClose={() => setProductModal({ open: false, initialName: '' })}
                productToEdit={null}
                storeOwnerIdForNewProduct={currentUser?.id || ADMIN_USER_ID}
                initialName={productModal.initialName}
                onCreated={onProductCreated}
            />
        </div>
    );
};
