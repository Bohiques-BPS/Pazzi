import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { ChartBarIcon, ChartPieIcon, BanknotesIcon, UserGroupIcon, UsersIcon } from '../../components/icons';
import { BUTTON_SECONDARY_SM_CLASSES, INPUT_SM_CLASSES } from '../../constants';
import { useTranslation, useGlobalSettings } from '../../contexts/GlobalSettingsContext';
import { reportsService, cajaReportsService, type SalesReport, type CajaReportFilters } from '../../services/reports';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/Modal';
import { exportToPDF, exportToExcel, type ExportColumn } from '../../utils/reportExport';

type DateFilterKey = 'today' | 'yesterday' | 'this_month' | 'last_month' | 'last_30_days' | 'last_90_days' | 'custom';

const getISODateString = (d: Date): string => d.toISOString().split('T')[0];
// Robusto: coacciona a número (evita crash si llega string/undefined/null).
const money = (n: any) => `$${(Number(n) || 0).toFixed(2)}`;
const arr = (v: any): any[] => (Array.isArray(v) ? v : []);

const getDateRange = (key: DateFilterKey, cs?: string, ce?: string): { start: string; end: string } => {
    const today = new Date();
    let start = new Date(today); let end = new Date(today);
    start.setHours(0, 0, 0, 0); end.setHours(23, 59, 59, 999);
    switch (key) {
        case 'today': break;
        case 'yesterday': start.setDate(today.getDate() - 1); end.setDate(today.getDate() - 1); break;
        case 'this_month': start = new Date(today.getFullYear(), today.getMonth(), 1); end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999); break;
        case 'last_month': start = new Date(today.getFullYear(), today.getMonth() - 1, 1); end = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999); break;
        case 'last_30_days': start.setDate(today.getDate() - 30); break;
        case 'last_90_days': start.setDate(today.getDate() - 90); break;
        case 'custom': if (cs) start = new Date(cs + 'T00:00:00'); if (ce) end = new Date(ce + 'T23:59:59'); break;
    }
    return { start: start.toISOString(), end: end.toISOString() };
};

type TabKey = 'resumen' | 'cortes' | 'descuadres' | 'movimientos' | 'metodos' | 'por_hora' | 'por_dia' | 'por_categoria' | 'por_sucursal' | 'devoluciones' | 'anulaciones' | 'impuestos' | 'x';

const TABS: { key: TabKey; label: string }[] = [
    { key: 'resumen', label: 'posx.reports.tab.resumen' },
    { key: 'cortes', label: 'posx.reports.tab.cortes' },
    { key: 'descuadres', label: 'posx.reports.tab.descuadres' },
    { key: 'movimientos', label: 'posx.reports.tab.movimientos' },
    { key: 'metodos', label: 'posx.reports.tab.metodos' },
    { key: 'por_hora', label: 'posx.reports.tab.por_hora' },
    { key: 'por_dia', label: 'posx.reports.tab.por_dia' },
    { key: 'por_categoria', label: 'posx.reports.tab.por_categoria' },
    { key: 'por_sucursal', label: 'posx.reports.tab.por_sucursal' },
    { key: 'devoluciones', label: 'posx.reports.tab.devoluciones' },
    { key: 'anulaciones', label: 'posx.reports.tab.anulaciones' },
    { key: 'impuestos', label: 'posx.reports.tab.impuestos' },
    { key: 'x', label: 'posx.reports.tab.x' },
];

const Card: React.FC<{ icon?: React.ReactNode; title: string; value: string; sub?: string }> = ({ icon, title, value, sub }) => (
    <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-5 shadow-sm">
        <div className="flex items-start justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{title}</p>
            {icon && <span className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">{icon}</span>}
        </div>
        <div className="text-3xl font-bold text-neutral-800 dark:text-neutral-100 mt-2">{value}</div>
        {sub && <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{sub}</p>}
    </div>
);

interface Col extends ExportColumn { money?: boolean; align?: 'left' | 'right' }

const ExportButtons: React.FC<{ title: string; columns: Col[]; rows: any[] }> = ({ title, columns, rows }) => (
    <div className="flex gap-2">
        <button onClick={() => exportToPDF(title, columns, rows)} disabled={!rows.length} className={`${BUTTON_SECONDARY_SM_CLASSES} disabled:opacity-40`}>📄 PDF</button>
        <button onClick={() => exportToExcel(title, columns, rows)} disabled={!rows.length} className={`${BUTTON_SECONDARY_SM_CLASSES} disabled:opacity-40`}>📊 Excel</button>
    </div>
);

/** Tabla genérica con encabezado, export y formato de dinero. */
const ReportTable: React.FC<{ title: string; columns: Col[]; rows: any[]; empty?: string }> = ({ title, columns, rows: rawRows, empty }) => {
    const { t } = useTranslation();
    const rows = arr(rawRows);
    return (
    <section className="space-y-2">
        <div className="flex items-center justify-between">
            <h3 className="text-md font-semibold text-primary">{title}</h3>
            <ExportButtons title={title} columns={columns} rows={rows} />
        </div>
        {rows.length === 0 ? (
            <p className="text-sm text-neutral-500">{empty || t('posx.reports.noDataPeriod')}</p>
        ) : (
            <div className="overflow-x-auto border border-neutral-200 dark:border-neutral-700 rounded-md">
                <table className="min-w-full text-sm">
                    <thead className="bg-neutral-100 dark:bg-neutral-900">
                        <tr>{columns.map(c => <th key={c.key} className={`p-2 ${c.align === 'right' ? 'text-right' : 'text-left'}`}>{c.header}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                        {rows.map((r, i) => (
                            <tr key={r.id || i} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/40">
                                {columns.map(c => {
                                    const v = r[c.key];
                                    const display = c.money ? money(Number(v)) : (v instanceof Date || (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) ? new Date(v).toLocaleString() : v ?? '');
                                    return <td key={c.key} className={`p-2 ${c.align === 'right' ? 'text-right tabular-nums' : ''}`}>{display}</td>;
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
    </section>
    );
};

export const POSReportsPage: React.FC = () => {
    const { t } = useTranslation();
    const { branches, cajas } = useData();

    const [dateKey, setDateKey] = useState<DateFilterKey>('this_month');
    const [customStart, setCustomStart] = useState(getISODateString(new Date()));
    const [customEnd, setCustomEnd] = useState(getISODateString(new Date()));
    const [branchId, setBranchId] = useState('');
    const [cajaId, setCajaId] = useState('');
    const [activeTab, setActiveTab] = useState<TabKey>('resumen');

    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<any>(null);
    const [detailSession, setDetailSession] = useState<any>(null);

    const filters: CajaReportFilters = useMemo(() => {
        const { start, end } = getDateRange(dateKey, customStart, customEnd);
        return { startDate: start, endDate: end, branchId: branchId || undefined, cajaId: cajaId || undefined };
    }, [dateKey, customStart, customEnd, branchId, cajaId]);

    const load = useCallback(async () => {
        setLoading(true); setData(null);
        try {
            let res: any;
            switch (activeTab) {
                case 'resumen':
                case 'metodos': res = await reportsService.getSalesReport(filters as any); break;
                case 'cortes': res = await cajaReportsService.sessions(filters); break;
                case 'descuadres': res = await cajaReportsService.discrepancies(filters); break;
                case 'movimientos': res = await cajaReportsService.cashMovements(filters); break;
                case 'por_hora': res = await cajaReportsService.salesByHour(filters); break;
                case 'por_dia': res = await cajaReportsService.salesByDay(filters); break;
                case 'por_categoria': res = await cajaReportsService.byCategory(filters); break;
                case 'por_sucursal': res = await cajaReportsService.byBranch(filters); break;
                case 'devoluciones': res = await cajaReportsService.returns(filters); break;
                case 'anulaciones': res = await cajaReportsService.voids(filters); break;
                case 'impuestos': res = await cajaReportsService.tax(filters); break;
                case 'x': res = cajaId ? await cajaReportsService.xReport(cajaId) : null; break;
            }
            setData(res);
        } catch (err) {
            if (err instanceof ApiError) toast.error(err.message);
            else toast.error(t('posx.reports.loadError'));
        } finally { setLoading(false); }
    }, [activeTab, filters, cajaId]);

    useEffect(() => { load(); }, [load]);

    const openSessionDetail = async (sessionId: string) => {
        try { setDetailSession(await cajaReportsService.sessionDetail(sessionId)); }
        catch { toast.error(t('posx.reports.sessionDetailError')); }
    };

    return (
        <div>
            <h1 className="text-2xl font-semibold text-neutral-700 dark:text-neutral-200 mb-4">{t('posx.reports.title')}</h1>

            {/* Filtros compartidos */}
            <div className="flex flex-wrap gap-2 mb-4 items-end bg-neutral-50 dark:bg-neutral-700/50 p-3 rounded-md">
                <div>
                    <label className="block text-xs text-neutral-500 mb-1">{t('posx.reports.period')}</label>
                    <select value={dateKey} onChange={e => setDateKey(e.target.value as DateFilterKey)} className={INPUT_SM_CLASSES}>
                        <option value="today">{t('posx.reports.periodToday')}</option>
                        <option value="yesterday">{t('posx.reports.periodYesterday')}</option>
                        <option value="this_month">{t('posx.reports.periodThisMonth')}</option>
                        <option value="last_month">{t('posx.reports.periodLastMonth')}</option>
                        <option value="last_30_days">{t('posx.reports.periodLast30')}</option>
                        <option value="last_90_days">{t('posx.reports.periodLast90')}</option>
                        <option value="custom">{t('posx.reports.periodCustom')}</option>
                    </select>
                </div>
                {dateKey === 'custom' && (
                    <>
                        <div><label className="block text-xs text-neutral-500 mb-1">{t('posx.reports.from')}</label><input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className={INPUT_SM_CLASSES} /></div>
                        <div><label className="block text-xs text-neutral-500 mb-1">{t('posx.reports.to')}</label><input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className={INPUT_SM_CLASSES} /></div>
                    </>
                )}
                <div>
                    <label className="block text-xs text-neutral-500 mb-1">{t('posx.reports.branch')}</label>
                    <select value={branchId} onChange={e => setBranchId(e.target.value)} className={INPUT_SM_CLASSES}>
                        <option value="">{t('posx.reports.all')}</option>
                        {branches.filter(b => b.isActive).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs text-neutral-500 mb-1">{t('posx.reports.register')}</label>
                    <select value={cajaId} onChange={e => setCajaId(e.target.value)} className={INPUT_SM_CLASSES}>
                        <option value="">{t('posx.reports.all')}</option>
                        {cajas.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <button onClick={load} className={BUTTON_SECONDARY_SM_CLASSES}>{t('posx.reports.refresh')}</button>
            </div>

            {/* Pestañas */}
            <div className="flex flex-wrap gap-1 border-b border-neutral-200 dark:border-neutral-700 mb-4">
                {TABS.map(tab => (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                        className={`px-3 py-2 text-sm font-medium rounded-t-md -mb-px border-b-2 ${activeTab === tab.key ? 'border-primary text-primary' : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}>
                        {t(tab.label)}
                    </button>
                ))}
            </div>

            {loading && <LoadingSkeleton variant="cards" count={4} />}

            {!loading && data && (
                <div className="space-y-6">
                    {activeTab === 'resumen' && <ResumenTab report={data as SalesReport} />}
                    {activeTab === 'metodos' && <MetodosTab report={data as SalesReport} />}
                    {activeTab === 'cortes' && <CortesTab data={data} onDetail={openSessionDetail} />}
                    {activeTab === 'descuadres' && <DescuadresTab data={data} />}
                    {activeTab === 'movimientos' && <MovimientosTab data={data} />}
                    {activeTab === 'por_hora' && <ReportTable title={t('posx.reports.salesByHour')} columns={[{ header: t('posx.reports.colHour'), key: 'hourLabel' }, { header: t('posx.reports.colTransactions'), key: 'count', align: 'right' }, { header: t('posx.reports.colTotal'), key: 'total', money: true, align: 'right' }]} rows={(data.rows || []).map((r: any) => ({ ...r, hourLabel: `${String(r.hour).padStart(2, '0')}:00` }))} />}
                    {activeTab === 'por_dia' && <ReportTable title={t('posx.reports.salesByDay')} columns={[{ header: t('posx.reports.colDay'), key: 'day' }, { header: t('posx.reports.colTransactions'), key: 'count', align: 'right' }, { header: t('posx.reports.colTotal'), key: 'total', money: true, align: 'right' }]} rows={data.rows || []} />}
                    {activeTab === 'por_categoria' && <ReportTable title={t('posx.reports.salesByCategory')} columns={[{ header: t('posx.reports.colCategory'), key: 'category' }, { header: t('posx.reports.colQty'), key: 'qty', align: 'right' }, { header: t('posx.reports.colRevenue'), key: 'revenue', money: true, align: 'right' }]} rows={data.rows || []} />}
                    {activeTab === 'por_sucursal' && <ReportTable title={t('posx.reports.salesByBranch')} columns={[{ header: t('posx.reports.colBranch'), key: 'name' }, { header: t('posx.reports.colTransactions'), key: 'count', align: 'right' }, { header: t('posx.reports.colTotal'), key: 'total', money: true, align: 'right' }]} rows={data.rows || []} />}
                    {activeTab === 'devoluciones' && <>
                        <Card icon={<BanknotesIcon className="w-6 h-6" />} title={t('posx.reports.totalReturned')} value={money(data.total)} sub={t('posx.reports.returnsCount', { count: data.count })} />
                        <ReportTable title={t('posx.reports.returns')} columns={[{ header: t('posx.reports.colDate'), key: 'date' }, { header: t('posx.reports.colBranch'), key: 'branchName' }, { header: t('posx.reports.colEmployee'), key: 'employee' }, { header: t('posx.reports.colMethod'), key: 'paymentMethod' }, { header: t('posx.reports.colAmount'), key: 'amount', money: true, align: 'right' }]} rows={data.rows || []} />
                    </>}
                    {activeTab === 'anulaciones' && <>
                        <Card icon={<BanknotesIcon className="w-6 h-6" />} title={t('posx.reports.totalVoided')} value={money(data.total)} sub={t('posx.reports.voidsCount', { count: data.count })} />
                        <ReportTable title={t('posx.reports.voids')} columns={[{ header: t('posx.reports.colDate'), key: 'date' }, { header: t('posx.reports.colBranch'), key: 'branchName' }, { header: t('posx.reports.colEmployee'), key: 'employee' }, { header: t('posx.reports.colMethod'), key: 'paymentMethod' }, { header: t('posx.reports.colAmount'), key: 'amount', money: true, align: 'right' }]} rows={data.rows || []} />
                    </>}
                    {activeTab === 'impuestos' && <ImpuestosTab data={data} />}
                    {activeTab === 'x' && <XTab data={data} cajaSelected={!!cajaId} />}
                </div>
            )}

            {!loading && !data && activeTab !== 'x' && <EmptyState title={t('posx.reports.noDataTitle')} description={t('posx.reports.noDataDesc')} />}
            {!loading && activeTab === 'x' && !cajaId && <EmptyState title={t('posx.reports.selectRegisterTitle')} description={t('posx.reports.selectRegisterDesc')} />}

            {/* Detalle Z reimprimible */}
            {detailSession && <SessionDetailModal detail={detailSession} onClose={() => setDetailSession(null)} />}
        </div>
    );
};

// ─── Renderers de pestañas ───────────────────────

const ResumenTab: React.FC<{ report: SalesReport }> = ({ report }) => {
    const { t } = useTranslation();
    const { settings } = useGlobalSettings();
    const anyBreakdown = (report.totalTaxState || 0) + (report.totalTaxMunicipal || 0) + (report.totalTaxReduced || 0) > 0;
    const showBreakdown = !!settings.taxBreakdownEnabled && anyBreakdown;
    return (
    <>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Card icon={<BanknotesIcon className="w-6 h-6" />} title={t('posx.reports.totalRevenue')} value={money(report.totalRevenue)} />
            <Card icon={<ChartBarIcon className="w-6 h-6" />} title={t('posx.reports.colTransactions')} value={String(report.totalTransactions)} />
            <Card icon={<ChartPieIcon className="w-6 h-6" />} title={t('posx.reports.avgTicket')} value={money(report.avgTicket)} />
            <Card icon={<BanknotesIcon className="w-6 h-6" />} title={t('posx.reports.taxCollected')} value={money(report.totalTax || 0)} sub={t('posx.reports.inNewSales')} />
        </div>
        {showBreakdown && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Card title={t('posx.reports.taxState')} value={money(report.totalTaxState || 0)} />
                <Card title={t('posx.reports.taxMunicipal')} value={money(report.totalTaxMunicipal || 0)} />
                <Card title={t('posx.reports.taxReduced')} value={money(report.totalTaxReduced || 0)} />
            </div>
        )}
        <ReportTable title={t('posx.reports.topProducts')} columns={[{ header: '#', key: 'rank' }, { header: t('posx.reports.colProduct'), key: 'name' }, { header: t('posx.reports.colUnits'), key: 'totalQuantity', align: 'right' }]} rows={arr(report.topProducts).map((p, i) => ({ ...p, rank: i + 1 }))} />
        <ReportTable title={t('posx.reports.topClients')} columns={[{ header: t('posx.reports.colClient'), key: 'name' }, { header: t('posx.reports.colSales'), key: 'salesCount', align: 'right' }, { header: t('posx.reports.colTotal'), key: 'totalRevenue', money: true, align: 'right' }]} rows={arr(report.topClients)} />
        <ReportTable title={t('posx.reports.salesByEmployee')} columns={[{ header: t('posx.reports.colEmployee'), key: 'name' }, { header: t('posx.reports.colSales'), key: 'salesCount', align: 'right' }, { header: t('posx.reports.colTotal'), key: 'totalRevenue', money: true, align: 'right' }]} rows={arr(report.salesByEmployee)} />
    </>
    );
};

const MetodosTab: React.FC<{ report: SalesReport }> = ({ report }) => {
    const { t } = useTranslation();
    const rows = arr(report.byPaymentMethod).map(m => ({
        paymentMethod: m.paymentMethod,
        count: m._count,
        total: m._sum?.totalAmount || 0,
        pct: report.totalRevenue > 0 ? ((m._sum?.totalAmount || 0) / report.totalRevenue) * 100 : 0,
    }));
    return <ReportTable title={t('posx.reports.salesByMethod')} columns={[{ header: t('posx.reports.colMethod'), key: 'paymentMethod' }, { header: t('posx.reports.colTransactions'), key: 'count', align: 'right' }, { header: t('posx.reports.colTotal'), key: 'total', money: true, align: 'right' }, { header: t('posx.reports.colPctTotal'), key: 'pctLabel', align: 'right' }]} rows={rows.map(r => ({ ...r, pctLabel: `${r.pct.toFixed(1)}%` }))} />;
};

const CortesTab: React.FC<{ data: any; onDetail: (id: string) => void }> = ({ data, onDetail }) => {
    const { t } = useTranslation();
    const rows = arr(data?.rows);
    return (
    <>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card title={t('posx.reports.closures')} value={String(data?.count ?? rows.length)} />
            <Card title={t('posx.reports.totalOver')} value={money(data?.totalOver)} />
            <Card title={t('posx.reports.totalShort')} value={money(data?.totalShort)} />
        </div>
        <section className="space-y-2">
            <div className="flex items-center justify-between">
                <h3 className="text-md font-semibold text-primary">{t('posx.reports.cashCutsZ')}</h3>
                <ExportButtons title={t('posx.reports.cashCuts')} columns={[{ header: t('posx.reports.colRegister'), key: 'cajaName' }, { header: t('posx.reports.colBranch'), key: 'branchName' }, { header: t('posx.reports.colClosedBy'), key: 'closedBy' }, { header: t('posx.reports.colClosing'), key: 'closedAt' }, { header: t('posx.reports.colFloat'), key: 'openingFloat', money: true }, { header: t('posx.reports.colExpected'), key: 'expectedCash', money: true }, { header: t('posx.reports.colCounted'), key: 'countedCash', money: true }, { header: t('posx.reports.colDifference'), key: 'difference', money: true }]} rows={rows} />
            </div>
            {rows.length === 0 ? <p className="text-sm text-neutral-500">{t('posx.reports.noClosures')}</p> : (
                <div className="overflow-x-auto border border-neutral-200 dark:border-neutral-700 rounded-md">
                    <table className="min-w-full text-sm">
                        <thead className="bg-neutral-100 dark:bg-neutral-900"><tr>
                            {[t('posx.reports.colRegister'), t('posx.reports.colBranch'), t('posx.reports.colClosedBy'), t('posx.reports.colClosing'), t('posx.reports.colFloat'), t('posx.reports.colExpected'), t('posx.reports.colCounted'), t('posx.reports.colDifference'), ''].map((h, i) => <th key={i} className={`p-2 ${i >= 4 ? 'text-right' : 'text-left'}`}>{h}</th>)}
                        </tr></thead>
                        <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                            {rows.map((r: any) => (
                                <tr key={r.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/40">
                                    <td className="p-2">{r.cajaName}</td><td className="p-2">{r.branchName}</td><td className="p-2">{r.closedBy}</td>
                                    <td className="p-2">{r.closedAt ? new Date(r.closedAt).toLocaleString() : '—'}</td>
                                    <td className="p-2 text-right tabular-nums">{money(r.openingFloat)}</td>
                                    <td className="p-2 text-right tabular-nums">{money(r.expectedCash)}</td>
                                    <td className="p-2 text-right tabular-nums">{money(r.countedCash)}</td>
                                    <td className={`p-2 text-right tabular-nums font-semibold ${r.difference < 0 ? 'text-red-600' : r.difference > 0 ? 'text-amber-600' : 'text-green-600'}`}>{money(r.difference)}</td>
                                    <td className="p-2 text-right"><button onClick={() => onDetail(r.id)} className="text-primary hover:underline text-xs">{t('posx.reports.viewPrint')}</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    </>
    );
};

const DescuadresTab: React.FC<{ data: any }> = ({ data }) => {
    const { t } = useTranslation();
    return (
    <>
        <ReportTable title={t('posx.reports.discrepancyRanking')} columns={[{ header: t('posx.reports.colCashier'), key: 'name' }, { header: t('posx.reports.colDiscrepancyCount'), key: 'count', align: 'right' }, { header: t('posx.reports.colNet'), key: 'net', money: true, align: 'right' }, { header: t('posx.reports.colDeviation'), key: 'absTotal', money: true, align: 'right' }]} rows={arr(data?.byUser)} empty={t('posx.reports.noDiscrepancies')} />
        <ReportTable title={t('posx.reports.sessionsWithDiscrepancy')} columns={[{ header: t('posx.reports.colRegister'), key: 'cajaName' }, { header: t('posx.reports.colBranch'), key: 'branchName' }, { header: t('posx.reports.colClosedBy'), key: 'closedBy' }, { header: t('posx.reports.colClosing'), key: 'closedAt' }, { header: t('posx.reports.colExpected'), key: 'expectedCash', money: true, align: 'right' }, { header: t('posx.reports.colCounted'), key: 'countedCash', money: true, align: 'right' }, { header: t('posx.reports.colDifference'), key: 'difference', money: true, align: 'right' }]} rows={arr(data?.rows)} />
    </>
    );
};

const MOVEMENT_LABEL: Record<string, string> = { PAYOUT: 'Retiro (payout)', CASH_DROP: 'Depósito a bóveda', CASH_IN: 'Ingreso de efectivo', REFUND: 'Reembolso' };

const MovimientosTab: React.FC<{ data: any }> = ({ data }) => {
    const { t } = useTranslation();
    const movLabel = (type: string) => MOVEMENT_LABEL[type] ? t('posx.reports.movement.' + type) : type;
    return (
    <>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.keys(MOVEMENT_LABEL).map((k) => <Card key={k} title={movLabel(k)} value={money(data.byType?.[k] || 0)} />)}
        </div>
        <ReportTable title={t('posx.reports.cashMovements')} columns={[{ header: t('posx.reports.colDate'), key: 'createdAt' }, { header: t('posx.reports.colRegister'), key: 'cajaName' }, { header: t('posx.reports.colType'), key: 'typeLabel' }, { header: t('posx.reports.colReason'), key: 'reason' }, { header: t('posx.reports.colCreatedBy'), key: 'createdBy' }, { header: t('posx.reports.colAuthorizedBy'), key: 'authorizedBy' }, { header: t('posx.reports.colAmount'), key: 'amount', money: true, align: 'right' }]} rows={(data.rows || []).map((r: any) => ({ ...r, typeLabel: movLabel(r.type), authorizedBy: r.authorizedBy || '—' }))} />
    </>
    );
};

const ImpuestosTab: React.FC<{ data: any }> = ({ data }) => {
    const { t } = useTranslation();
    return (
    <>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Card title={t('posx.reports.taxCollected')} value={money(data.totalTax)} />
            <Card title={t('posx.reports.subtotalBase')} value={money(data.totalSubtotal)} />
            <Card title={t('posx.reports.discounts')} value={money(data.totalDiscount)} />
            <Card title={t('posx.reports.totalWithTax')} value={money(data.totalWithTax)} sub={t('posx.reports.salesCount', { count: data.count })} />
        </div>
        <ReportTable title={t('posx.reports.taxByDay')} columns={[{ header: t('posx.reports.colDay'), key: 'day' }, { header: t('posx.reports.colSubtotal'), key: 'subtotal', money: true, align: 'right' }, { header: t('posx.reports.colTax'), key: 'tax', money: true, align: 'right' }, { header: t('posx.reports.colTotal'), key: 'total', money: true, align: 'right' }]} rows={data.byDay || []} empty={t('posx.reports.noTaxSales')} />
    </>
    );
};

const XTab: React.FC<{ data: any; cajaSelected: boolean }> = ({ data }) => {
    const { t: tr } = useTranslation();
    if (!data?.session) return <EmptyState title={tr('posx.reports.noOpenShift')} description={tr('posx.reports.noOpenShiftDesc', { caja: data?.cajaName || '' })} />;
    const t = data.totals || {};
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-md font-semibold text-primary">{tr('posx.reports.xReportLive', { caja: data.cajaName })}</h3>
                <button onClick={() => window.print()} className={BUTTON_SECONDARY_SM_CLASSES}>{tr('posx.reports.print')}</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Card title={tr('posx.reports.openingFloat')} value={money(t.openingFloat)} />
                <Card title={tr('posx.reports.totalSales')} value={money(t.totalSales)} />
                <Card title={tr('posx.reports.expectedCash')} value={money(t.expectedCash)} />
                <Card title={tr('posx.reports.cashSales')} value={money(t.cashSales)} />
                <Card title={tr('posx.reports.cardSales')} value={money(t.cardSales)} />
                <Card title={tr('posx.reports.otherMethods')} value={money(t.otherSales)} />
                <Card title={tr('posx.reports.payouts')} value={money(t.payouts)} />
                <Card title={tr('posx.reports.cashIn')} value={money(t.cashIn)} />
                <Card title={tr('posx.reports.cashRefunds')} value={money(t.cashRefunds)} />
            </div>
        </div>
    );
};

const SessionDetailModal: React.FC<{ detail: any; onClose: () => void }> = ({ detail, onClose }) => {
    const { t: tr } = useTranslation();
    const s = detail?.session || {}; const t = detail?.totals || {};
    return (
        <Modal isOpen onClose={onClose} title={tr('posx.reports.zCut', { caja: s.caja?.name || '' })} size="lg">
            <div className="space-y-4">
                <div className="flex justify-end"><button onClick={() => window.print()} className={BUTTON_SECONDARY_SM_CLASSES}>{tr('posx.reports.print')}</button></div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-neutral-500">{tr('posx.reports.branchLabel')}</span> {s.caja?.branch?.name || '—'}</div>
                    <div><span className="text-neutral-500">{tr('posx.reports.statusLabel')}</span> {s.status}</div>
                    <div><span className="text-neutral-500">{tr('posx.reports.openedLabel')}</span> {s.openedByUser?.name} · {new Date(s.openedAt).toLocaleString()}</div>
                    <div><span className="text-neutral-500">{tr('posx.reports.closedLabel')}</span> {s.closedByUser?.name || '—'} · {s.closedAt ? new Date(s.closedAt).toLocaleString() : '—'}</div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <Card title={tr('posx.reports.float')} value={money(t.openingFloat)} />
                    <Card title={tr('posx.reports.cashSales')} value={money(t.cashSales)} />
                    <Card title={tr('posx.reports.expected')} value={money(t.expectedCash)} />
                    <Card title={tr('posx.reports.counted')} value={money(s.countedCash ?? 0)} />
                    <Card title={tr('posx.reports.difference')} value={money(s.difference ?? 0)} />
                    <Card title={tr('posx.reports.totalSales')} value={money(t.totalSales)} />
                </div>
                <div>
                    <h4 className="font-semibold text-sm mb-1">{tr('posx.reports.byPaymentMethod')}</h4>
                    <table className="min-w-full text-sm border border-neutral-200 dark:border-neutral-700 rounded">
                        <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                            {arr(detail?.byMethod).map((m: any) => (
                                <tr key={m.paymentMethod}><td className="p-2">{m.paymentMethod}</td><td className="p-2 text-right">{m._count}</td><td className="p-2 text-right">{money(m._sum?.totalAmount || 0)}</td></tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {s.movements?.length > 0 && (
                    <div>
                        <h4 className="font-semibold text-sm mb-1">{tr('posx.reports.cashMovements')}</h4>
                        <table className="min-w-full text-sm border border-neutral-200 dark:border-neutral-700 rounded">
                            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                                {s.movements.map((m: any) => (
                                    <tr key={m.id}><td className="p-2">{MOVEMENT_LABEL[m.type] ? tr('posx.reports.movement.' + m.type) : m.type}</td><td className="p-2">{m.reason}</td><td className="p-2 text-right">{money(m.amount)}</td></tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </Modal>
    );
};
