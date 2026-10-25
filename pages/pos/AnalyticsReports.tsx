import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { BUTTON_SECONDARY_SM_CLASSES, INPUT_SM_CLASSES } from '../../constants';
import { analyticsService, type AnalyticsGroupBy, type AnalyticsReport, type AnalyticsRow, type AnalyticsScope } from '../../services/reports';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { MiniChart } from '../../components/pm/MiniChart';
import { exportToPDF, exportToExcel, type ExportColumn } from '../../utils/reportExport';
import { clientDocName } from '../../utils/clientName';

/**
 * Reportes de ventas y ganancia: General (POS + facturas) o solo Facturas.
 * Un reporte = una forma de agrupar (por cliente, proyecto, producto…) con sus filtros.
 */

type Period = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'last_month' | 'last_30' | 'last_90' | 'this_year' | 'last_year' | 'custom';
const PERIODS: { key: Period; label: string }[] = [
    { key: 'today', label: 'Hoy' }, { key: 'yesterday', label: 'Ayer' }, { key: 'this_week', label: 'Esta semana' },
    { key: 'this_month', label: 'Este mes' }, { key: 'last_month', label: 'Mes pasado' }, { key: 'last_30', label: 'Últimos 30 días' },
    { key: 'last_90', label: 'Últimos 90 días' }, { key: 'this_year', label: 'Este año' }, { key: 'last_year', label: 'Año pasado' },
    { key: 'custom', label: 'Personalizado' },
];

function periodRange(p: Period, cs: string, ce: string): { start: string; end: string } {
    const t = new Date();
    const day = (d: Date, endOfDay = false) => { const x = new Date(d); if (endOfDay) x.setHours(23, 59, 59, 999); else x.setHours(0, 0, 0, 0); return x; };
    let s = day(t), e = day(t, true);
    switch (p) {
        case 'yesterday': s.setDate(s.getDate() - 1); e.setDate(e.getDate() - 1); break;
        case 'this_week': s.setDate(s.getDate() - s.getDay()); break;
        case 'this_month': s = new Date(t.getFullYear(), t.getMonth(), 1); e = new Date(t.getFullYear(), t.getMonth() + 1, 0, 23, 59, 59, 999); break;
        case 'last_month': s = new Date(t.getFullYear(), t.getMonth() - 1, 1); e = new Date(t.getFullYear(), t.getMonth(), 0, 23, 59, 59, 999); break;
        case 'last_30': s.setDate(s.getDate() - 30); break;
        case 'last_90': s.setDate(s.getDate() - 90); break;
        case 'this_year': s = new Date(t.getFullYear(), 0, 1); e = new Date(t.getFullYear(), 11, 31, 23, 59, 59, 999); break;
        case 'last_year': s = new Date(t.getFullYear() - 1, 0, 1); e = new Date(t.getFullYear() - 1, 11, 31, 23, 59, 59, 999); break;
        case 'custom': if (cs) s = new Date(cs + 'T00:00:00'); if (ce) e = new Date(ce + 'T23:59:59.999'); break;
    }
    return { start: s.toISOString(), end: e.toISOString() };
}

/** Reportes disponibles: cómo se agrupan las ventas. Algunos solo aplican a ventas del POS. */
const REPORTS: { key: AnalyticsGroupBy; label: string; posOnly?: boolean; invoicesOnly?: boolean }[] = [
    { key: 'day', label: 'Por día' },
    { key: 'month', label: 'Por mes' },
    { key: 'client', label: 'Por cliente' },
    { key: 'project', label: 'Por proyecto' },
    { key: 'product', label: 'Por producto', posOnly: true },
    { key: 'category', label: 'Por categoría', posOnly: true },
    { key: 'department', label: 'Por departamento', posOnly: true },
    { key: 'caja', label: 'Por caja', posOnly: true },
    { key: 'branch', label: 'Por sucursal', posOnly: true },
    { key: 'seller', label: 'Por vendedor' },
    { key: 'paymentMethod', label: 'Por método de pago' },
    { key: 'status', label: 'Por estado' },
    { key: 'type', label: 'Por tipo' },
];

const money = (n: number) => `$${(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = (n: number | null) => (n == null ? '—' : `${n.toFixed(1)}%`);

const Kpi: React.FC<{ title: string; value: string; sub?: string; tone?: 'green' | 'red' | 'default' }> = ({ title, value, sub, tone = 'default' }) => (
    <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{title}</p>
        <div className={`text-2xl font-bold mt-1 tabular-nums ${tone === 'green' ? 'text-emerald-600 dark:text-emerald-400' : tone === 'red' ? 'text-red-600 dark:text-red-400' : 'text-neutral-800 dark:text-neutral-100'}`}>{value}</div>
        {sub && <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{sub}</p>}
    </div>
);

type SortKey = keyof AnalyticsRow;

export const AnalyticsReports: React.FC<{ scope: Extract<AnalyticsScope, 'general' | 'invoices'> }> = ({ scope }) => {
    const { branches, cajas, clients, projects, categories, departments, products, employees } = useData();
    const invoicesOnly = scope === 'invoices';
    const available = REPORTS.filter(r => invoicesOnly ? !r.posOnly : !r.invoicesOnly);

    const [groupBy, setGroupBy] = useState<AnalyticsGroupBy>('day');
    const [period, setPeriod] = useState<Period>('this_month');
    const today = new Date().toISOString().slice(0, 10);
    const [customStart, setCustomStart] = useState(today);
    const [customEnd, setCustomEnd] = useState(today);
    const [f, setF] = useState({ branchId: '', cajaId: '', clientId: '', projectId: '', categoryId: '', departmentId: '', productId: '', sellerId: '' });
    const set = (k: keyof typeof f, v: string) => setF(prev => ({ ...prev, [k]: v }));
    const [showFilters, setShowFilters] = useState(false);
    const activeFilters = Object.values(f).filter(Boolean).length;

    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<AnalyticsReport | null>(null);
    const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 } | null>(null);

    // Si cambia el ámbito y el reporte elegido no aplica (p. ej. "Por producto" en Facturas), vuelve a "Por día".
    useEffect(() => { if (!available.some(r => r.key === groupBy)) setGroupBy('day'); }, [scope]); // eslint-disable-line react-hooks/exhaustive-deps

    const load = useCallback(async () => {
        const { start, end } = periodRange(period, customStart, customEnd);
        setLoading(true);
        try {
            const clean = Object.fromEntries(Object.entries(f).filter(([, v]) => v)) as any;
            setData(await analyticsService.get({ scope: invoicesOnly ? 'invoices' : 'general', groupBy, startDate: start, endDate: end, ...clean }));
        } catch (err) {
            toast.error(err instanceof ApiError ? err.message : 'No se pudo generar el reporte.');
        } finally { setLoading(false); }
    }, [period, customStart, customEnd, f, groupBy, invoicesOnly]);
    useEffect(() => { load(); }, [load]);

    const rows = useMemo(() => {
        const r = [...(data?.rows || [])];
        if (sort) r.sort((a, b) => {
            const x = a[sort.key] as any, y = b[sort.key] as any;
            return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x ?? '').localeCompare(String(y ?? ''))) * sort.dir;
        });
        return r;
    }, [data, sort]);

    const reportLabel = available.find(r => r.key === groupBy)?.label || '';
    const dimLabel = reportLabel.replace(/^Por /, '').replace(/^./, c => c.toUpperCase());
    const showQty = !invoicesOnly && ['product', 'category', 'department'].includes(groupBy);
    const columns: { key: SortKey; header: string; money?: boolean; align?: 'right'; fmt?: (r: AnalyticsRow) => string }[] = [
        { key: 'label', header: dimLabel },
        { key: 'count', header: invoicesOnly ? 'Facturas' : 'Transacciones', align: 'right' },
        ...(showQty ? [{ key: 'qty' as SortKey, header: 'Cantidad', align: 'right' as const }] : []),
        { key: 'net', header: 'Ventas netas', money: true, align: 'right' },
        { key: 'tax', header: 'IVU', money: true, align: 'right' },
        { key: 'total', header: 'Total', money: true, align: 'right' },
        ...(!invoicesOnly ? [
            { key: 'cost' as SortKey, header: 'Costo', money: true, align: 'right' as const },
            { key: 'profit' as SortKey, header: 'Ganancia', money: true, align: 'right' as const },
            { key: 'margin' as SortKey, header: 'Margen', align: 'right' as const, fmt: (r: AnalyticsRow) => pct(r.margin) },
        ] : []),
        { key: 'pending', header: 'Por cobrar', money: true, align: 'right' },
    ];

    const fmtCell = (r: AnalyticsRow, c: typeof columns[number]) => c.fmt ? c.fmt(r) : c.money ? money(r[c.key] as number) : String(r[c.key] ?? '');
    const exportCols: ExportColumn[] = columns.map(c => ({ header: c.header, key: c.key }));
    const exportRows = () => rows.map(r => Object.fromEntries(columns.map(c => [c.key, fmtCell(r, c)])));
    const title = `${invoicesOnly ? 'Facturas' : 'Ventas'} — ${reportLabel}`;

    const s = data?.summary;
    const seriesLabels = (data?.series || []).map(p => data?.seriesUnit === 'month' ? p.key : p.key.slice(5));

    return (
        <div className="space-y-4">
            {/* Tipo de reporte */}
            <div className="flex flex-wrap gap-1.5">
                {available.map(r => (
                    <button key={r.key} type="button" onClick={() => { setGroupBy(r.key); setSort(null); }}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${groupBy === r.key ? 'bg-primary text-white border-primary' : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700'}`}>
                        {r.label}
                    </button>
                ))}
            </div>

            {/* Filtros */}
            <div className="bg-neutral-50 dark:bg-neutral-800/60 rounded-lg p-3 space-y-3">
                <div className="flex flex-wrap items-end gap-2">
                    <div>
                        <label className="block text-xs text-neutral-500 mb-1">Período</label>
                        <select value={period} onChange={e => setPeriod(e.target.value as Period)} className={INPUT_SM_CLASSES}>
                            {PERIODS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                        </select>
                    </div>
                    {period === 'custom' && (
                        <>
                            <div><label className="block text-xs text-neutral-500 mb-1">Desde</label><input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className={INPUT_SM_CLASSES} /></div>
                            <div><label className="block text-xs text-neutral-500 mb-1">Hasta</label><input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className={INPUT_SM_CLASSES} /></div>
                        </>
                    )}
                    <div className="min-w-[180px]">
                        <label className="block text-xs text-neutral-500 mb-1">Cliente</label>
                        <select value={f.clientId} onChange={e => set('clientId', e.target.value)} className={`${INPUT_SM_CLASSES} w-full`}>
                            <option value="">Todos</option>
                            {[...clients].sort((a, b) => clientDocName(a).localeCompare(clientDocName(b))).map(c => <option key={c.id} value={c.id}>{clientDocName(c)}</option>)}
                        </select>
                    </div>
                    <div className="min-w-[180px]">
                        <label className="block text-xs text-neutral-500 mb-1">Proyecto</label>
                        <select value={f.projectId} onChange={e => set('projectId', e.target.value)} className={`${INPUT_SM_CLASSES} w-full`}>
                            <option value="">Todos</option>
                            {[...projects].sort((a, b) => a.name.localeCompare(b.name)).map(p => <option key={p.id} value={p.id}>{(p as any).projectKey ? `[${String((p as any).projectKey).toUpperCase()}] ` : ''}{p.name}</option>)}
                        </select>
                    </div>
                    <button type="button" onClick={() => setShowFilters(v => !v)} className={BUTTON_SECONDARY_SM_CLASSES}>
                        {showFilters ? 'Menos filtros' : `Más filtros${activeFilters ? ` (${activeFilters})` : ''}`}
                    </button>
                    {activeFilters > 0 && <button type="button" onClick={() => setF({ branchId: '', cajaId: '', clientId: '', projectId: '', categoryId: '', departmentId: '', productId: '', sellerId: '' })} className={`${BUTTON_SECONDARY_SM_CLASSES} !text-red-600`}>Limpiar filtros</button>}
                    <div className="ml-auto flex gap-2">
                        <button type="button" onClick={load} className={BUTTON_SECONDARY_SM_CLASSES}>Actualizar</button>
                        <button type="button" disabled={!rows.length} onClick={() => exportToExcel(title, exportCols, exportRows())} className={`${BUTTON_SECONDARY_SM_CLASSES} disabled:opacity-50`}>Excel</button>
                        <button type="button" disabled={!rows.length} onClick={() => exportToPDF(title, exportCols, exportRows())} className={`${BUTTON_SECONDARY_SM_CLASSES} disabled:opacity-50`}>PDF</button>
                    </div>
                </div>
                {showFilters && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                        {!invoicesOnly && (
                            <>
                                <div><label className="block text-xs text-neutral-500 mb-1">Sucursal</label>
                                    <select value={f.branchId} onChange={e => set('branchId', e.target.value)} className={`${INPUT_SM_CLASSES} w-full`}><option value="">Todas</option>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
                                <div><label className="block text-xs text-neutral-500 mb-1">Caja</label>
                                    <select value={f.cajaId} onChange={e => set('cajaId', e.target.value)} className={`${INPUT_SM_CLASSES} w-full`}><option value="">Todas</option>{cajas.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                                <div><label className="block text-xs text-neutral-500 mb-1">Categoría</label>
                                    <select value={f.categoryId} onChange={e => set('categoryId', e.target.value)} className={`${INPUT_SM_CLASSES} w-full`}><option value="">Todas</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                                <div><label className="block text-xs text-neutral-500 mb-1">Departamento</label>
                                    <select value={f.departmentId} onChange={e => set('departmentId', e.target.value)} className={`${INPUT_SM_CLASSES} w-full`}><option value="">Todos</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
                                <div><label className="block text-xs text-neutral-500 mb-1">Producto</label>
                                    <select value={f.productId} onChange={e => set('productId', e.target.value)} className={`${INPUT_SM_CLASSES} w-full`}><option value="">Todos</option>{[...products].sort((a, b) => a.name.localeCompare(b.name)).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                            </>
                        )}
                        <div><label className="block text-xs text-neutral-500 mb-1">Vendedor</label>
                            <select value={f.sellerId} onChange={e => set('sellerId', e.target.value)} className={`${INPUT_SM_CLASSES} w-full`}><option value="">Todos</option>{employees.map(e => <option key={e.id} value={(e as any).userId || e.id}>{`${e.name} ${e.lastName || ''}`.trim()}</option>)}</select></div>
                    </div>
                )}
                {data?.notes.invoicesExcluded && (
                    <p className="text-xs text-amber-700 dark:text-amber-400">Con filtro de sucursal, caja, categoría, departamento o producto solo se incluyen ventas del POS (las facturas no tienen esos datos).</p>
                )}
                {data?.truncated && <p className="text-xs text-amber-700 dark:text-amber-400">El período tiene demasiados movimientos; se muestran los primeros 20,000. Reduce el rango de fechas.</p>}
            </div>

            {loading && !data ? <LoadingSkeleton variant="cards" count={4} /> : !s ? null : (
                <>
                    {/* Resumen */}
                    <div className={`grid grid-cols-2 md:grid-cols-3 ${invoicesOnly ? 'lg:grid-cols-5' : 'lg:grid-cols-6'} gap-3 ${loading ? 'opacity-60' : ''}`}>
                        <Kpi title="Total vendido" value={money(s.total)} sub={`Incluye IVU ${money(s.tax)}`} />
                        <Kpi title="Ventas netas" value={money(s.net)} sub="Sin IVU, con descuentos" />
                        {!invoicesOnly && <Kpi title="Ganancia estimada" value={money(s.profit)} sub={`Margen ${pct(s.margin)} · costo ${money(s.cost)}`} tone={s.profit >= 0 ? 'green' : 'red'} />}
                        <Kpi title={invoicesOnly ? 'Facturas' : 'Transacciones'} value={String(invoicesOnly ? s.invoicesCount : s.salesCount + s.invoicesCount)} sub={invoicesOnly ? `Promedio ${money(s.avgTicket)}` : `${s.salesCount} ventas · ${s.invoicesCount} facturas · promedio ${money(s.avgTicket)}`} />
                        <Kpi title="Cobrado" value={money(s.paid)} tone="green" />
                        <Kpi title="Por cobrar" value={money(s.pending)} sub={s.returnsCount ? `Devoluciones ${money(s.returns)} (${s.returnsCount})` : undefined} tone={s.pending > 0 ? 'red' : 'default'} />
                    </div>

                    {/* Tendencia */}
                    {(data?.series.length || 0) > 1 && (
                        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 shadow-sm">
                            <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200 mb-2">Tendencia {data?.seriesUnit === 'month' ? 'por mes' : 'por día'}</h3>
                            <MiniChart
                                labels={seriesLabels}
                                series={[
                                    { label: 'Total vendido', color: '#0D9488', values: data!.series.map(p => p.total) },
                                    ...(!invoicesOnly ? [{ label: 'Ganancia', color: '#7C3AED', values: data!.series.map(p => p.profit) }] : []),
                                ]}
                                area height={220} formatY={n => `$${Math.round(n).toLocaleString('en-US')}`}
                            />
                        </div>
                    )}

                    {/* Detalle */}
                    <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-700">
                            <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">{title}</h3>
                            <span className="text-xs text-neutral-500">{rows.length} {rows.length === 1 ? 'fila' : 'filas'}</span>
                        </div>
                        {rows.length === 0 ? (
                            <div className="p-6"><EmptyState title="Sin ventas en este período" description="Cambia el período o los filtros." /></div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-neutral-50 dark:bg-neutral-900/40 text-neutral-500 dark:text-neutral-400">
                                        <tr>
                                            {columns.map(c => (
                                                <th key={c.key} onClick={() => setSort(prev => ({ key: c.key, dir: prev?.key === c.key ? (prev.dir === 1 ? -1 : 1) : (c.key === 'label' ? 1 : -1) }))}
                                                    className={`px-3 py-2 font-medium whitespace-nowrap cursor-pointer select-none hover:text-neutral-700 dark:hover:text-neutral-200 ${c.align === 'right' ? 'text-right' : 'text-left'}`}>
                                                    {c.header}{sort?.key === c.key ? (sort.dir === 1 ? ' ▲' : ' ▼') : ''}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700/60 text-neutral-700 dark:text-neutral-200">
                                        {rows.map(r => (
                                            <tr key={r.key} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/30">
                                                {columns.map(c => (
                                                    <td key={c.key} className={`px-3 py-2 ${c.align === 'right' ? 'text-right tabular-nums whitespace-nowrap' : ''} ${c.key === 'profit' ? (r.profit < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400') : ''} ${c.key === 'pending' && r.pending > 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
                                                        {fmtCell(r, c)}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-neutral-50 dark:bg-neutral-900/40 font-semibold text-neutral-800 dark:text-neutral-100">
                                        <tr>
                                            {columns.map(c => (
                                                <td key={c.key} className={`px-3 py-2 ${c.align === 'right' ? 'text-right tabular-nums whitespace-nowrap' : ''}`}>
                                                    {c.key === 'label' ? 'Total' : fmtCell(s, c)}
                                                </td>
                                            ))}
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}
                    </div>
                    {!invoicesOnly && <p className="text-xs text-neutral-500 dark:text-neutral-400">La ganancia es estimada: usa el costo actual de cada producto. Las facturas no tienen costo asignado.</p>}
                </>
            )}
        </div>
    );
};
