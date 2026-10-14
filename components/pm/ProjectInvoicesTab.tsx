import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Project } from '../../types';
import { salesService } from '../../services/sales';
import { invoicesService, type Invoice, type InvoiceItemInput } from '../../services/invoices';
import { recurringService, type RecurringPayment } from '../../services/recurring';
import { ApiError } from '../../services/api';
import { useTranslation, useGlobalSettings } from '../../contexts/GlobalSettingsContext';
import { useData } from '../../contexts/DataContext';
import { usePermissions } from '../../hooks/usePermissions';
import { LoadingSkeleton } from '../ui/LoadingSkeleton';
import { DataTable, type TableColumn } from '../DataTable';
import { RowActionsMenu } from '../ui/RowActionsMenu';
import { Modal } from '../Modal';
import { ClientInvoiceModal } from '../ui/ClientInvoiceModal';
import { ShareModal, PaymentsModal, PayModal, INVOICE_STATUS, money, invoicePdfBusinessFromSettings, useInvoiceEmailSender, copyInvoiceLink } from '../pos/InvoiceModals';
import { openInvoicePdf } from '../../utils/invoiceClientPdf';
import { getEffectiveUnitPrice } from '../../utils/pricing';
import { productTaxRate } from '../../utils/invoiceTax';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import { DocumentTextIcon, BanknotesIcon, ClockIcon, ArrowPathIcon, PlusIcon } from '../icons';

/** Fila unificada de la tabla: factura (módulo Facturas) o venta POS vinculada al proyecto. */
interface BillingRow {
    id: string;
    kind: 'invoice' | 'sale';
    number: number | null;
    date: string;
    concept: string;
    total: number;
    paid: number;
    balance: number;
    statusLabel: string;
    statusCls: string;
    dueDate: string | null;
    cancelled: boolean;
    invoice?: Invoice;
}

const SALE_STATUS_CLS = {
    paid: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    cancelled: 'bg-neutral-200 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-300',
};
const PLAN_STATUS_CLS: Record<string, string> = {
    active: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    paused: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    pending_card: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    cancelled: 'bg-neutral-200 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-300',
};

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString() : '—');

/** Tarjeta KPI (mismo diseño que el tablero de Proyectos). */
const KpiCard: React.FC<{ label: string; value: string; sub?: string; icon: React.ReactNode; tone?: 'neutral' | 'green' | 'amber' }> = ({ label, value, sub, icon, tone = 'neutral' }) => {
    const valueCls = tone === 'green' ? 'text-green-600 dark:text-green-400' : tone === 'amber' ? 'text-amber-600 dark:text-amber-400' : 'text-neutral-800 dark:text-neutral-100';
    return (
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 shadow-sm">
            <div className="flex items-start justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{label}</p>
                <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">{icon}</span>
            </div>
            <div className={`text-2xl font-bold mt-1 tabular-nums ${valueCls}`}>{value}</div>
            {sub && <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{sub}</p>}
        </div>
    );
};

/** Opción seleccionable (estilo radio) para elegir cómo crear la factura. */
const ChoiceCard: React.FC<{ selected: boolean; disabled?: boolean; onClick: () => void; title: string; desc: string }> = ({ selected, disabled, onClick, title, desc }) => (
    <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        aria-pressed={selected}
        className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${selected ? 'border-primary bg-primary/10' : 'border-neutral-200 dark:border-neutral-700 hover:border-primary/50'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
        <div className="flex items-start gap-2">
            <span className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded-full border-2 ${selected ? 'border-primary bg-primary' : 'border-neutral-300 dark:border-neutral-600'}`} />
            <div className="min-w-0">
                <div className={`font-medium text-sm ${selected ? 'text-primary' : 'text-neutral-700 dark:text-neutral-200'}`}>{title}</div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{desc}</div>
            </div>
        </div>
    </button>
);

/**
 * Pestaña "Facturación" del proyecto: resumen (facturado / cobrado / pendiente), facturas del
 * proyecto + ventas POS vinculadas, creación de facturas (desde los recursos o en blanco) y
 * mensualidades (pago recurrente vinculado al proyecto).
 */
export const ProjectInvoicesTab: React.FC<{ project: Project }> = ({ project }) => {
    const { t } = useTranslation();
    const { settings } = useGlobalSettings();
    const { clients, products } = useData();
    const { canAny } = usePermissions();
    const navigate = useNavigate();
    // Facturas y pagos recurrentes viven en el módulo POS (mismo permiso que el backend).
    const canBill = canAny('pos.access', 'branches.manage');

    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [sales, setSales] = useState<any[]>([]);
    const [plans, setPlans] = useState<RecurringPayment[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadErrors, setLoadErrors] = useState<string[]>([]);

    // Modales
    const [chooser, setChooser] = useState(false);
    const [source, setSource] = useState<'resources' | 'blank'>('resources');
    const [invoiceModal, setInvoiceModal] = useState<null | { items: InvoiceItemInput[] }>(null);
    const [recurringInfo, setRecurringInfo] = useState(false);
    const [share, setShare] = useState<Invoice | null>(null);
    const [viewPayments, setViewPayments] = useState<Invoice | null>(null);
    const [payFor, setPayFor] = useState<Invoice | null>(null);
    const emailSender = useInvoiceEmailSender();
    const pdfBiz = useMemo(() => invoicePdfBusinessFromSettings(settings), [settings]);

    const client = useMemo(() => clients.find(c => c.id === project.clientId) || null, [clients, project.clientId]);
    const hasClient = !!project.clientId;

    const load = useCallback(async () => {
        setLoading(true);
        const [inv, sal, rec] = await Promise.allSettled([
            canBill ? invoicesService.listByProject(project.id) : Promise.resolve([] as Invoice[]),
            salesService.getAll({ projectId: project.id }),
            canBill ? recurringService.listByProject(project.id) : Promise.resolve([] as RecurringPayment[]),
        ]);
        const errs: string[] = [];
        if (inv.status === 'fulfilled') setInvoices(Array.isArray(inv.value) ? inv.value : []);
        else { setInvoices([]); errs.push(inv.reason instanceof ApiError ? inv.reason.message : t('pm2x.projinv.err_invoices')); }
        if (sal.status === 'fulfilled') setSales(Array.isArray(sal.value) ? sal.value : []);
        else { setSales([]); errs.push(sal.reason instanceof ApiError ? sal.reason.message : t('pm2x.projinv.err_sales')); }
        if (rec.status === 'fulfilled') setPlans(Array.isArray(rec.value) ? rec.value : []);
        else setPlans([]); // los planes son informativos: si falla no se bloquea la pestaña
        setLoadErrors(errs);
        setLoading(false);
    }, [project.id, canBill, t]);
    useEffect(() => { load(); }, [load]);

    // ── Líneas desde los recursos del proyecto (catálogo a precio vigente + recursos personalizados) ──
    const resourceItems = useMemo<InvoiceItemInput[]>(() => {
        const out: InvoiceItemInput[] = [];
        for (const ap of project.assignedProducts || []) {
            const p: any = products.find(x => x.id === ap.productId);
            if (!p) continue;
            const rate = productTaxRate(p);
            out.push({ name: p.name, quantity: Number(ap.quantity) || 1, unitPrice: getEffectiveUnitPrice(p), ...(rate != null ? { taxRate: rate } : {}) });
        }
        for (const cp of project.customProducts || []) {
            if (!cp?.name) continue;
            out.push({ name: cp.name, quantity: Number(cp.quantity) || 1, unitPrice: Number(cp.unitPrice) || 0 });
        }
        return out;
    }, [project.assignedProducts, project.customProducts, products]);
    const resourcesSubtotal = resourceItems.reduce((s, it) => s + it.quantity * it.unitPrice, 0);

    // ── Filas unificadas ──
    const rows = useMemo<BillingRow[]>(() => {
        const invRows: BillingRow[] = invoices.map(inv => {
            const paid = Number(inv.amountPaid) || 0;
            const st = INVOICE_STATUS[inv.status] || INVOICE_STATUS.pending;
            const firstItem = (inv.items || [])[0]?.name;
            return {
                id: `inv-${inv.id}`, kind: 'invoice', number: inv.number ?? null, date: inv.createdAt,
                concept: inv.description || (firstItem ? `${firstItem}${(inv.items || []).length > 1 ? ` +${inv.items.length - 1}` : ''}` : '—'),
                total: Number(inv.total) || 0, paid, balance: Math.max(0, (Number(inv.total) || 0) - paid),
                statusLabel: t(`pm2x.projinv.status.${inv.status}`) || st.label, statusCls: st.cls,
                dueDate: inv.dueDate || null, cancelled: inv.status === 'cancelled', invoice: inv,
            };
        });
        const saleRows: BillingRow[] = sales.map(s => {
            const total = Number(s.totalAmount) || 0;
            const status = String(s.paymentStatus || '');
            const lower = status.toLowerCase();
            const cancelled = lower.includes('anulad');
            const fullyPaid = lower === 'pagado';
            const paidSum = (Array.isArray(s.payments) ? s.payments : []).reduce((acc: number, p: any) => acc + (Number(p.amountPaid) || 0), 0);
            const paid = cancelled ? 0 : (fullyPaid ? total : Math.min(total, paidSum));
            const names = (Array.isArray(s.items) ? s.items : []).map((it: any) => it.product?.name).filter(Boolean) as string[];
            return {
                id: `sale-${s.id}`, kind: 'sale', number: s.saleNumber ?? null, date: s.date || s.createdAt,
                concept: names.length ? `${names[0]}${names.length > 1 ? ` +${names.length - 1}` : ''}` : t('pm2x.projinv.pos_sale'),
                total, paid, balance: cancelled ? 0 : Math.max(0, total - paid),
                statusLabel: status || '—', statusCls: cancelled ? SALE_STATUS_CLS.cancelled : (fullyPaid ? SALE_STATUS_CLS.paid : SALE_STATUS_CLS.pending),
                dueDate: s.dueDate || null, cancelled,
            };
        });
        return [...invRows, ...saleRows].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [invoices, sales, t]);

    const kpis = useMemo(() => {
        const active = rows.filter(r => !r.cancelled);
        return {
            billed: active.reduce((s, r) => s + r.total, 0),
            collected: active.reduce((s, r) => s + r.paid, 0),
            pending: active.reduce((s, r) => s + r.balance, 0),
            invoiceCount: active.filter(r => r.kind === 'invoice').length,
            saleCount: active.filter(r => r.kind === 'sale').length,
            overdue: active.filter(r => r.balance > 0.001 && r.dueDate && new Date(r.dueDate).getTime() < Date.now()).length,
        };
    }, [rows]);
    const activePlans = plans.filter(p => p.status === 'active' || p.status === 'pending_card' || p.status === 'paused');
    const nextPlan = [...plans].filter(p => p.status === 'active').sort((a, b) => new Date(a.nextChargeDate).getTime() - new Date(b.nextChargeDate).getTime())[0];

    // ── Acciones ──
    const openChooser = () => {
        // La 1ª factura del proyecto sale por defecto de sus recursos; las siguientes, en blanco (arreglos, extras).
        setSource(invoices.length === 0 && resourceItems.length > 0 ? 'resources' : 'blank');
        setChooser(true);
    };
    const continueChooser = () => {
        setChooser(false);
        setInvoiceModal({ items: source === 'resources' ? resourceItems : [] });
    };
    const goRecurring = () => {
        setRecurringInfo(false);
        const params = new URLSearchParams({
            new: '1',
            clientId: project.clientId,
            projectId: project.id,
            mode: 'invoice_link',
            description: t('pm2x.projinv.monthly_desc', { name: project.name }),
            returnTo: `/pm/projects/${project.id}?tab=details&sub=billing`,
        });
        navigate(`/pos/recurring?${params.toString()}`);
    };

    const columns: TableColumn<BillingRow>[] = useMemo(() => [
        {
            header: t('pm2x.projinv.col.type'), sortValue: r => r.kind, filterType: 'none',
            accessor: r => r.kind === 'invoice'
                ? <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary whitespace-nowrap">{t('pm2x.projinv.kind.invoice')}</span>
                : <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300 whitespace-nowrap">{t('pm2x.projinv.kind.sale')}</span>,
        },
        { header: '#', sortValue: r => r.number ?? 0, accessor: r => <span className="font-semibold">{r.number ? `#${r.number}` : '—'}</span> },
        { header: t('common.date'), sortValue: r => r.date, accessor: r => <span className="whitespace-nowrap text-neutral-600 dark:text-neutral-300">{fmtDate(r.date)}</span> },
        { header: t('pm2x.projinv.col.concept'), sortValue: r => r.concept, accessor: r => <span className="block max-w-[260px] truncate" title={r.concept}>{r.concept}</span> },
        { header: t('common.total'), sortValue: r => r.total, className: 'text-right', accessor: r => <span className="font-medium tabular-nums">{money(r.total)}</span> },
        {
            header: t('pm2x.projinv.col.paid'), sortValue: r => r.paid, className: 'text-right',
            accessor: r => <span className={`tabular-nums ${r.paid > 0.001 ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-neutral-400'}`}>{money(r.paid)}</span>,
        },
        {
            header: t('pm2x.projinv.col.balance'), sortValue: r => r.balance, className: 'text-right',
            accessor: r => <span className={`tabular-nums ${r.balance > 0.001 ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-neutral-400'}`}>{money(r.balance)}</span>,
        },
        { header: t('common.status'), sortValue: r => r.statusLabel, accessor: r => <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${r.statusCls}`}>{r.statusLabel}</span> },
        {
            header: t('pm2x.projinv.col.due'), sortValue: r => r.dueDate || '',
            accessor: r => {
                const overdue = r.balance > 0.001 && r.dueDate && new Date(r.dueDate).getTime() < Date.now();
                return <span className={`whitespace-nowrap ${overdue ? 'text-red-600 dark:text-red-400 font-medium' : 'text-neutral-600 dark:text-neutral-300'}`}>{fmtDate(r.dueDate)}</span>;
            },
        },
    ], [t]);

    if (loading) return <LoadingSkeleton variant="table" rows={4} />;

    const open = (inv: Invoice) => inv.status === 'pending' || inv.status === 'partial';

    return (
        // La pestaña vive dentro del <form> del proyecto: Enter en un input NO debe guardar el proyecto.
        <div className="space-y-4" onKeyDown={e => { if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') e.preventDefault(); }}>
            {/* Encabezado + acciones */}
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h3 className="text-base font-semibold text-neutral-800 dark:text-neutral-100">{t('pm2x.projinv.title')}</h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{t('pm2x.projinv.subtitle')}</p>
                </div>
                {canBill && (
                    <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => setRecurringInfo(true)} disabled={!hasClient} className={`${BUTTON_SECONDARY_SM_CLASSES} disabled:opacity-50 disabled:cursor-not-allowed`}>
                            <ArrowPathIcon className="w-4 h-4 mr-1" />{t('pm2x.projinv.btn_recurring')}
                        </button>
                        <button type="button" onClick={openChooser} disabled={!hasClient} className={`${BUTTON_PRIMARY_SM_CLASSES} disabled:opacity-50 disabled:cursor-not-allowed`}>
                            <PlusIcon className="w-4 h-4 mr-1" />{t('pm2x.projinv.btn_new')}
                        </button>
                    </div>
                )}
            </div>

            {!hasClient && (
                <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
                    {t('pm2x.projinv.no_client')}
                </div>
            )}
            {!canBill && (
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 px-3 py-2 text-sm text-neutral-600 dark:text-neutral-300">
                    {t('pm2x.projinv.no_permission')}
                </div>
            )}
            {loadErrors.map((e, i) => <p key={i} className="text-sm text-red-600 dark:text-red-400">{e}</p>)}

            {/* Resumen */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KpiCard label={t('pm2x.projinv.kpi_billed')} value={money(kpis.billed)} sub={t('pm2x.projinv.kpi_billed_sub', { invoices: kpis.invoiceCount, sales: kpis.saleCount })} icon={<DocumentTextIcon className="w-4 h-4" />} />
                <KpiCard label={t('pm2x.projinv.kpi_collected')} value={money(kpis.collected)} tone="green" sub={kpis.billed > 0 ? t('pm2x.projinv.kpi_collected_sub', { pct: Math.round((kpis.collected / kpis.billed) * 100) }) : undefined} icon={<BanknotesIcon className="w-4 h-4" />} />
                <KpiCard label={t('pm2x.projinv.kpi_pending')} value={money(kpis.pending)} tone={kpis.pending > 0.001 ? 'amber' : 'neutral'} sub={kpis.overdue > 0 ? t('pm2x.projinv.kpi_overdue', { n: kpis.overdue }) : undefined} icon={<ClockIcon className="w-4 h-4" />} />
                <KpiCard label={t('pm2x.projinv.kpi_recurring')} value={String(activePlans.length)} sub={nextPlan ? t('pm2x.projinv.kpi_recurring_next', { date: fmtDate(nextPlan.nextChargeDate), amount: money(nextPlan.amount) }) : t('pm2x.projinv.kpi_recurring_none')} icon={<ArrowPathIcon className="w-4 h-4" />} />
            </div>

            {/* Tabla de facturas + ventas */}
            {rows.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg">
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('pm2x.projinv.empty')}</p>
                    {canBill && hasClient && (
                        <button type="button" onClick={openChooser} className={`${BUTTON_PRIMARY_SM_CLASSES} mt-3`}>
                            <PlusIcon className="w-4 h-4 mr-1" />{t('pm2x.projinv.btn_first')}
                        </button>
                    )}
                </div>
            ) : (
                <DataTable<BillingRow>
                    data={rows}
                    columns={columns}
                    tableId="project-billing"
                    searchable={false}
                    filterable={false}
                    initialPageSize={10}
                    onRowClick={r => { if (r.invoice) setViewPayments(r.invoice); }}
                    actions={r => r.invoice ? (
                        <RowActionsMenu items={[
                            { label: t('pm2x.projinv.act_payments'), onClick: () => setViewPayments(r.invoice!), className: 'text-green-600 dark:text-green-400' },
                            { label: t('posx.invoices.register_payment'), onClick: () => setPayFor(r.invoice!), className: 'text-green-600 dark:text-green-400', hidden: !open(r.invoice) },
                            { label: t('pm2x.projinv.act_pdf'), onClick: () => openInvoicePdf(r.invoice!, pdfBiz), className: 'text-primary' },
                            { label: t('posx.invoices.view_link_qr'), onClick: () => setShare(r.invoice!), className: 'text-primary' },
                            { label: t('posx.invoices.copy_link'), onClick: () => copyInvoiceLink(r.invoice!, t) },
                            { label: t('posx.invoices.send_email'), onClick: () => emailSender.send(r.invoice!), className: 'text-blue-600 dark:text-blue-400' },
                            { label: t('pm2x.projinv.act_open'), onClick: () => navigate(`/pos/invoices?invoice=${r.invoice!.id}`) },
                        ]} />
                    ) : null}
                />
            )}

            {/* Pagos recurrentes del proyecto */}
            {plans.length > 0 && (
                <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">{t('pm2x.projinv.plans_title')}</h4>
                        <button type="button" onClick={() => navigate('/pos/recurring')} className="text-xs text-primary hover:underline">{t('pm2x.projinv.plans_manage')}</button>
                    </div>
                    <ul className="divide-y divide-neutral-100 dark:divide-neutral-700">
                        {plans.map(p => (
                            <li key={p.id} className="py-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                                <div className="min-w-0">
                                    <p className="font-medium text-neutral-700 dark:text-neutral-200 truncate">{p.description || t('pm2x.projinv.plan_default')}</p>
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                        {t(`posx.recurring.interval.${p.interval}`)} · {p.mode === 'invoice_link' ? t('posx.recurring.mode.invoiceLink') : t('posx.recurring.mode.autoCharge')}
                                        {p.status === 'active' ? ` · ${t('pm2x.projinv.plan_next', { date: fmtDate(p.nextChargeDate) })}` : ''}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold tabular-nums text-neutral-800 dark:text-neutral-100">{money(p.amount)}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${PLAN_STATUS_CLS[p.status] || PLAN_STATUS_CLS.cancelled}`}>{t(`posx.recurring.status.${p.status}`)}</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Elegir cómo crear la factura */}
            <Modal isOpen={chooser} onClose={() => setChooser(false)} title={t('pm2x.projinv.chooser_title')} size="md">
                <div className="space-y-3">
                    <ChoiceCard
                        selected={source === 'resources'}
                        disabled={resourceItems.length === 0}
                        onClick={() => setSource('resources')}
                        title={t('pm2x.projinv.from_resources')}
                        desc={resourceItems.length > 0
                            ? t('pm2x.projinv.from_resources_desc', { n: resourceItems.length, amount: money(resourcesSubtotal) })
                            : t('pm2x.projinv.from_resources_empty')}
                    />
                    <ChoiceCard
                        selected={source === 'blank'}
                        onClick={() => setSource('blank')}
                        title={t('pm2x.projinv.blank')}
                        desc={t('pm2x.projinv.blank_desc')}
                    />
                    {invoices.length > 0 && source === 'resources' && (
                        <p className="text-xs text-amber-600 dark:text-amber-400">{t('pm2x.projinv.resources_again_warning')}</p>
                    )}
                    <div className="flex justify-end gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-700">
                        <button type="button" onClick={() => setChooser(false)} className={BUTTON_SECONDARY_SM_CLASSES}>{t('common.cancel')}</button>
                        <button type="button" onClick={continueChooser} className={BUTTON_PRIMARY_SM_CLASSES}>{t('pm2x.projinv.continue')}</button>
                    </div>
                </div>
            </Modal>

            {/* Mensualidad / pago recurrente: explicación + ir al formulario prellenado */}
            <Modal isOpen={recurringInfo} onClose={() => setRecurringInfo(false)} title={t('pm2x.projinv.recurring_title')} size="md">
                <div className="space-y-3 text-sm text-neutral-600 dark:text-neutral-300">
                    <p>{t('pm2x.projinv.recurring_p1')}</p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>{t('pm2x.projinv.recurring_li_invoice')}</li>
                        <li>{t('pm2x.projinv.recurring_li_card')}</li>
                    </ul>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{t('pm2x.projinv.recurring_p2')}</p>
                    <div className="flex justify-end gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-700">
                        <button type="button" onClick={() => setRecurringInfo(false)} className={BUTTON_SECONDARY_SM_CLASSES}>{t('common.cancel')}</button>
                        <button type="button" onClick={goRecurring} className={BUTTON_PRIMARY_SM_CLASSES}>{t('pm2x.projinv.recurring_go')}</button>
                    </div>
                </div>
            </Modal>

            <ClientInvoiceModal
                isOpen={!!invoiceModal}
                onClose={() => setInvoiceModal(null)}
                client={client}
                projectId={project.id}
                projectName={project.name}
                initialDescription={t('pm2x.projinv.invoice_desc', { name: project.name })}
                initialItems={invoiceModal?.items}
                onCreated={() => load()}
            />
            <ShareModal invoice={share} onClose={() => setShare(null)} />
            <PaymentsModal invoice={viewPayments} onClose={() => setViewPayments(null)} onAddPayment={() => { const inv = viewPayments; setViewPayments(null); if (inv) setPayFor(inv); }} />
            <PayModal invoice={payFor} onClose={() => setPayFor(null)} onDone={load} />
            {emailSender.modal}
        </div>
    );
};
