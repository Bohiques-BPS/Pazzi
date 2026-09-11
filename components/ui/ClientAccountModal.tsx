import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from '../Modal';
import { Client } from '../../types';
import { clientsService, type ClientSummary } from '../../services/clients';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';
import { LoadingSkeleton } from './LoadingSkeleton';
import { EmptyState } from './EmptyState';
import { useTranslation } from '../../contexts/GlobalSettingsContext';

interface ClientAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    client: Client | null;
}

const money = (n: number) => `$${(Number(n) || 0).toFixed(2)}`;
const shortId = (id: string) => `#${String(id).slice(-6).toUpperCase()}`;
const dateStr = (d?: string | null) => d ? new Date(d).toLocaleDateString() : '—';

const SummaryCard: React.FC<{ label: string; value: string; tone?: 'default' | 'positive' | 'negative' }> = ({ label, value, tone = 'default' }) => (
    <div className="p-2.5 rounded-md border border-neutral-200 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-700/50 min-w-[130px]">
        <div className="text-[10px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{label}</div>
        <div className={`text-base font-bold ${tone === 'positive' ? 'text-green-600 dark:text-green-400' : tone === 'negative' ? 'text-red-600 dark:text-red-400' : 'text-neutral-800 dark:text-neutral-100'}`}>{value}</div>
    </div>
);

// ── Tabla reutilizable: buscador + orden por columna + filtros + paginado ──
interface Col<T> {
    key: string;
    label: string;
    align?: 'left' | 'right' | 'center';
    render: (r: T) => React.ReactNode;
    text: (r: T) => string;                 // para búsqueda y orden (fallback)
    sort?: (r: T) => string | number;       // valor de orden (si difiere del texto)
    sortable?: boolean;
}
interface SelectFilter<T> { key: string; label: string; get: (r: T) => string; }

function SmartTable<T>({ rows, columns, selectFilters = [], initialSortKey, initialSortDir = 'desc', emptyText }: {
    rows: T[];
    columns: Col<T>[];
    selectFilters?: SelectFilter<T>[];
    initialSortKey?: string;
    initialSortDir?: 'asc' | 'desc';
    emptyText: string;
}) {
    const [q, setQ] = useState('');
    const [sortKey, setSortKey] = useState(initialSortKey || columns[0]?.key);
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>(initialSortDir);
    const [filters, setFilters] = useState<Record<string, string>>({});
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(15);

    useEffect(() => { setPage(1); }, [q, filters, pageSize, rows]);

    const filterOptions = useMemo(() => {
        const m: Record<string, string[]> = {};
        for (const f of selectFilters) m[f.key] = Array.from(new Set(rows.map(r => f.get(r)).filter(Boolean))).sort();
        return m;
    }, [rows, selectFilters]);

    const filtered = useMemo(() => {
        const needle = q.trim().toLowerCase();
        return rows.filter(r => {
            if (needle && !columns.some(c => c.text(r).toLowerCase().includes(needle))) return false;
            for (const f of selectFilters) { const v = filters[f.key]; if (v && f.get(r) !== v) return false; }
            return true;
        });
    }, [rows, q, filters, columns, selectFilters]);

    const sorted = useMemo(() => {
        const col = columns.find(c => c.key === sortKey);
        if (!col) return filtered;
        const val = (r: T) => (col.sort ? col.sort(r) : col.text(r));
        const arr = [...filtered].sort((a, b) => {
            const va = val(a), vb = val(b);
            if (typeof va === 'number' && typeof vb === 'number') return va - vb;
            return String(va).localeCompare(String(vb), undefined, { numeric: true });
        });
        if (sortDir === 'desc') arr.reverse();
        return arr;
    }, [filtered, columns, sortKey, sortDir]);

    const total = sorted.length;
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, pageCount);
    const pageRows = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

    const toggleSort = (key: string) => {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDir('asc'); }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Toolbar: buscador + filtros */}
            <div className="flex flex-wrap items-center gap-2 mb-2">
                <input
                    value={q}
                    onChange={e => setQ(e.target.value)}
                    placeholder="Buscar en esta tabla…"
                    className="px-3 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-sm w-64 max-w-full"
                />
                {selectFilters.map(f => (
                    <select
                        key={f.key}
                        value={filters[f.key] || ''}
                        onChange={e => setFilters(prev => ({ ...prev, [f.key]: e.target.value }))}
                        className="px-2 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-sm"
                    >
                        <option value="">{f.label}: todos</option>
                        {(filterOptions[f.key] || []).map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                ))}
                <span className="ml-auto text-xs text-neutral-500">{total} registro(s)</span>
                <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))} className="px-2 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-sm">
                    {[10, 15, 25, 50, 100].map(n => <option key={n} value={n}>{n}/pág</option>)}
                </select>
            </div>

            {/* Tabla */}
            <div className="flex-1 overflow-auto border border-neutral-200 dark:border-neutral-700 rounded-md">
                <table className="min-w-full text-sm">
                    <thead className="bg-neutral-100 dark:bg-neutral-900 sticky top-0">
                        <tr>
                            {columns.map(c => (
                                <th
                                    key={c.key}
                                    onClick={() => c.sortable !== false && toggleSort(c.key)}
                                    className={`p-2 font-semibold text-neutral-600 dark:text-neutral-300 whitespace-nowrap ${c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left'} ${c.sortable !== false ? 'cursor-pointer select-none hover:text-primary' : ''}`}
                                >
                                    {c.label}{sortKey === c.key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                        {pageRows.length === 0 ? (
                            <tr><td colSpan={columns.length} className="p-6 text-center text-neutral-500">{emptyText}</td></tr>
                        ) : pageRows.map((r, i) => (
                            <tr key={i} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/40">
                                {columns.map(c => (
                                    <td key={c.key} className={`p-2 ${c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left'}`}>{c.render(r)}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Paginado */}
            <div className="flex items-center justify-between mt-2 text-sm">
                <span className="text-neutral-500">Página {safePage} de {pageCount}</span>
                <div className="flex gap-1">
                    <button onClick={() => setPage(1)} disabled={safePage <= 1} className="px-2 py-1 rounded border border-neutral-300 dark:border-neutral-600 disabled:opacity-40">«</button>
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage <= 1} className="px-2 py-1 rounded border border-neutral-300 dark:border-neutral-600 disabled:opacity-40">‹</button>
                    <button onClick={() => setPage(p => Math.min(pageCount, p + 1))} disabled={safePage >= pageCount} className="px-2 py-1 rounded border border-neutral-300 dark:border-neutral-600 disabled:opacity-40">›</button>
                    <button onClick={() => setPage(pageCount)} disabled={safePage >= pageCount} className="px-2 py-1 rounded border border-neutral-300 dark:border-neutral-600 disabled:opacity-40">»</button>
                </div>
            </div>
        </div>
    );
}

type TabKey = 'ar' | 'sales' | 'estimates' | 'layaways' | 'projects' | 'products';

export const ClientAccountModal: React.FC<ClientAccountModalProps> = ({ isOpen, onClose, client }) => {
    const { t } = useTranslation();
    const [data, setData] = useState<ClientSummary | null>(null);
    const [loading, setLoading] = useState(false);
    const [tab, setTab] = useState<TabKey>('ar');

    useEffect(() => {
        if (!isOpen || !client) return;
        let cancelled = false;
        setLoading(true);
        setData(null);
        // period amplio (~10 años) para ver historial completo, no solo 90 días.
        clientsService.getSummary(client.id, { period: 3650 })
            .then(res => { if (!cancelled) { setData(res); setTab(res.accountsReceivable.length ? 'ar' : 'sales'); } })
            .catch(err => { if (!cancelled && err instanceof ApiError) toast.error(err.message); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [isOpen, client]);

    if (!isOpen || !client) return null;

    const s = data?.summary;
    const itemsText = (items: { quantity: number; product?: { name: string } }[]) =>
        (items || []).map(it => `${it.product?.name || 'Producto'} ×${it.quantity}`).join(', ');

    const TABS: { key: TabKey; label: string; count: number }[] = data ? [
        { key: 'ar', label: 'Cuentas por cobrar', count: data.accountsReceivable.length },
        { key: 'sales', label: 'Ventas', count: data.recentSales.length },
        { key: 'estimates', label: 'Cotizaciones', count: data.recentEstimates.length },
        { key: 'layaways', label: 'Apartados', count: data.recentLayaways.length },
        { key: 'projects', label: 'Proyectos', count: data.projects.length },
        { key: 'products', label: 'Top productos', count: data.topProducts.length },
    ] : [];

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Estado de cuenta — ${client.name} ${client.lastName || ''}${client.companyName ? ` (${client.companyName})` : ''}`} size="screen">
            {loading && <LoadingSkeleton variant="form" rows={8} />}

            {!loading && data && s && (
                <div className="flex flex-col h-full gap-3">
                    {/* KPIs */}
                    <div className="flex flex-wrap gap-2">
                        <SummaryCard label="Total facturado" value={money(s.totalRevenue)} />
                        <SummaryCard label="Total pagado" value={money(s.totalPaid)} tone="positive" />
                        <SummaryCard label="Balance pendiente" value={money(s.totalBalance)} tone={s.totalBalance > 0 ? 'negative' : 'positive'} />
                        <SummaryCard label="Ventas" value={String(s.totalSalesCount)} />
                        <SummaryCard label="Cotizaciones" value={String(s.totalEstimates)} />
                        <SummaryCard label="Apartados" value={String(s.totalLayaways)} />
                        <SummaryCard label="Proyectos" value={String(s.totalProjects)} />
                        <SummaryCard label="C×C pendientes" value={`${s.accountsReceivableCount} (${money(s.accountsReceivableTotal)})`} tone={s.accountsReceivableCount > 0 ? 'negative' : 'default'} />
                    </div>

                    {/* Tabs */}
                    <div className="flex flex-wrap gap-1 border-b border-neutral-200 dark:border-neutral-700">
                        {TABS.map(tb => (
                            <button
                                key={tb.key}
                                onClick={() => setTab(tb.key)}
                                className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${tab === tb.key ? 'border-primary text-primary' : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200'}`}
                            >
                                {tb.label} <span className="opacity-60">({tb.count})</span>
                            </button>
                        ))}
                    </div>

                    {/* Contenido del tab */}
                    <div className="flex-1 min-h-0">
                        {tab === 'ar' && (
                            <SmartTable
                                rows={data.accountsReceivable}
                                emptyText="Sin saldos pendientes."
                                initialSortKey="balance" initialSortDir="desc"
                                selectFilters={[{ key: 'st', label: 'Estado', get: r => r.paymentStatus || '' }]}
                                columns={[
                                    { key: 'folio', label: 'Folio', text: r => shortId(r.saleId), render: r => <span className="font-mono text-xs">{shortId(r.saleId)}</span> },
                                    { key: 'date', label: 'Fecha', text: r => dateStr(r.saleDate), sort: r => new Date(r.saleDate).getTime(), render: r => dateStr(r.saleDate) },
                                    { key: 'due', label: 'Vence', text: r => dateStr(r.dueDate), sort: r => r.dueDate ? new Date(r.dueDate).getTime() : 0, render: r => dateStr(r.dueDate) },
                                    { key: 'total', label: 'Total', align: 'right', text: r => String(r.totalAmount), sort: r => r.totalAmount, render: r => money(r.totalAmount) },
                                    { key: 'paid', label: 'Pagado', align: 'right', text: r => String(r.paid), sort: r => r.paid, render: r => money(r.paid) },
                                    { key: 'balance', label: 'Balance', align: 'right', text: r => String(r.balance), sort: r => r.balance, render: r => <span className="font-bold text-red-600 dark:text-red-400">{money(r.balance)}</span> },
                                    { key: 'days', label: 'Atraso', align: 'center', text: r => String(r.daysOverdue), sort: r => r.daysOverdue, render: r => r.daysOverdue > 0 ? `${r.daysOverdue} d` : '—' },
                                    { key: 'st', label: 'Estado', text: r => r.paymentStatus || '', render: r => <span className="text-xs">{r.paymentStatus}</span> },
                                ]}
                            />
                        )}
                        {tab === 'sales' && (
                            <SmartTable
                                rows={data.recentSales}
                                emptyText="Sin ventas."
                                initialSortKey="date" initialSortDir="desc"
                                selectFilters={[
                                    { key: 'st', label: 'Estado', get: r => r.paymentStatus || '' },
                                    { key: 'tipo', label: 'Tipo', get: r => r.isReturn ? 'Devolución' : 'Venta' },
                                ]}
                                columns={[
                                    { key: 'folio', label: 'Folio', text: r => shortId(r.id), render: r => <span className="font-mono text-xs">{shortId(r.id)}</span> },
                                    { key: 'date', label: 'Fecha', text: r => dateStr(r.date), sort: r => new Date(r.date).getTime(), render: r => dateStr(r.date) },
                                    { key: 'method', label: 'Método', text: r => r.paymentMethod || '', render: r => r.paymentMethod },
                                    { key: 'st', label: 'Estado', text: r => r.paymentStatus || '', render: r => <span className="text-xs">{r.paymentStatus}</span> },
                                    { key: 'items', label: 'Productos', text: r => itemsText(r.items), render: r => <span className="text-xs text-neutral-500 line-clamp-1 max-w-[320px] inline-block align-bottom" title={itemsText(r.items)}>{itemsText(r.items) || '—'}</span> },
                                    { key: 'total', label: 'Total', align: 'right', text: r => String(r.totalAmount), sort: r => r.totalAmount, render: r => <span className={`font-bold ${r.isReturn ? 'text-orange-600' : 'text-primary'}`}>{r.isReturn ? '−' : ''}{money(r.totalAmount)}</span> },
                                ]}
                            />
                        )}
                        {tab === 'estimates' && (
                            <SmartTable
                                rows={data.recentEstimates}
                                emptyText="Sin cotizaciones."
                                initialSortKey="date" initialSortDir="desc"
                                selectFilters={[{ key: 'st', label: 'Estado', get: r => r.status || '' }]}
                                columns={[
                                    { key: 'folio', label: 'Folio', text: r => shortId(r.id), render: r => <span className="font-mono text-xs">{shortId(r.id)}</span> },
                                    { key: 'date', label: 'Fecha', text: r => dateStr(r.date), sort: r => new Date(r.date).getTime(), render: r => dateStr(r.date) },
                                    { key: 'st', label: 'Estado', text: r => r.status || '', render: r => <span className="text-xs">{r.status}</span> },
                                    { key: 'items', label: 'Productos', text: r => itemsText(r.items), render: r => <span className="text-xs text-neutral-500 line-clamp-1 max-w-[320px] inline-block align-bottom" title={itemsText(r.items)}>{itemsText(r.items) || '—'}</span> },
                                    { key: 'total', label: 'Total', align: 'right', text: r => String(r.totalAmount), sort: r => r.totalAmount, render: r => money(r.totalAmount) },
                                ]}
                            />
                        )}
                        {tab === 'layaways' && (
                            <SmartTable
                                rows={data.recentLayaways.map(l => ({ ...l, paid: (l.payments || []).reduce((a, p) => a + p.amountPaid, 0) }))}
                                emptyText="Sin apartados."
                                initialSortKey="date" initialSortDir="desc"
                                selectFilters={[{ key: 'st', label: 'Estado', get: r => r.status || '' }]}
                                columns={[
                                    { key: 'folio', label: 'Folio', text: r => shortId(r.id), render: r => <span className="font-mono text-xs">{shortId(r.id)}</span> },
                                    { key: 'date', label: 'Fecha', text: r => dateStr(r.date), sort: r => new Date(r.date).getTime(), render: r => dateStr(r.date) },
                                    { key: 'st', label: 'Estado', text: r => r.status || '', render: r => <span className="text-xs">{r.status}</span> },
                                    { key: 'paid', label: 'Abonado', align: 'right', text: r => String((r as any).paid), sort: r => (r as any).paid, render: r => money((r as any).paid) },
                                    { key: 'total', label: 'Total', align: 'right', text: r => String(r.totalAmount), sort: r => r.totalAmount, render: r => money(r.totalAmount) },
                                    { key: 'bal', label: 'Balance', align: 'right', text: r => String(r.totalAmount - (r as any).paid), sort: r => r.totalAmount - (r as any).paid, render: r => money(r.totalAmount - (r as any).paid) },
                                ]}
                            />
                        )}
                        {tab === 'projects' && (
                            <SmartTable
                                rows={data.projects}
                                emptyText="Sin proyectos."
                                initialSortKey="createdAt" initialSortDir="desc"
                                selectFilters={[{ key: 'st', label: 'Estado', get: r => r.status || '' }]}
                                columns={[
                                    { key: 'name', label: 'Proyecto', text: r => r.name, render: r => r.name },
                                    { key: 'st', label: 'Estado', text: r => r.status || '', render: r => <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-700">{r.status}</span> },
                                    { key: 'createdAt', label: 'Creado', text: r => dateStr(r.createdAt), sort: r => new Date(r.createdAt).getTime(), render: r => dateStr(r.createdAt) },
                                ]}
                            />
                        )}
                        {tab === 'products' && (
                            <SmartTable
                                rows={data.topProducts}
                                emptyText="Sin productos."
                                initialSortKey="qty" initialSortDir="desc"
                                columns={[
                                    { key: 'name', label: 'Producto', text: r => r.name, render: r => r.name },
                                    { key: 'price', label: 'Precio', align: 'right', text: r => String(r.unitPrice), sort: r => r.unitPrice, render: r => money(r.unitPrice) },
                                    { key: 'qty', label: 'Cantidad', align: 'right', text: r => String(r.totalQuantity), sort: r => r.totalQuantity, render: r => <span className="font-bold text-primary">{r.totalQuantity}u</span> },
                                ]}
                            />
                        )}
                    </div>
                </div>
            )}

            {!loading && !data && (
                <EmptyState title={t('cmpx.account.no_data_title')} description={t('cmpx.account.no_data_desc')} />
            )}
        </Modal>
    );
};
