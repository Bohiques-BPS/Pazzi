import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { ChartBarIcon, ChartPieIcon, BanknotesIcon, UserGroupIcon, UsersIcon } from '../../components/icons';
import { BUTTON_SECONDARY_SM_CLASSES, INPUT_SM_CLASSES } from '../../constants';
import { useTranslation } from '../../contexts/GlobalSettingsContext';
import { reportsService, cajaReportsService, type SalesReport, type CajaReportFilters } from '../../services/reports';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/Modal';
import { exportToPDF, exportToExcel, type ExportColumn } from '../../utils/reportExport';

type DateFilterKey = 'today' | 'yesterday' | 'this_month' | 'last_month' | 'last_30_days' | 'last_90_days' | 'custom';

const getISODateString = (d: Date): string => d.toISOString().split('T')[0];
const money = (n: number) => `$${(n ?? 0).toFixed(2)}`;

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
    { key: 'resumen', label: 'Resumen de ventas' },
    { key: 'cortes', label: 'Cortes de caja (Z)' },
    { key: 'descuadres', label: 'Descuadres' },
    { key: 'movimientos', label: 'Movimientos de efectivo' },
    { key: 'metodos', label: 'Métodos de pago' },
    { key: 'por_hora', label: 'Ventas por hora' },
    { key: 'por_dia', label: 'Ventas por día' },
    { key: 'por_categoria', label: 'Ventas por categoría' },
    { key: 'por_sucursal', label: 'Ventas por sucursal' },
    { key: 'devoluciones', label: 'Devoluciones' },
    { key: 'anulaciones', label: 'Anulaciones' },
    { key: 'impuestos', label: 'Impuestos (IVU)' },
    { key: 'x', label: 'Reporte X (turno)' },
];

const Card: React.FC<{ icon?: React.ReactNode; title: string; value: string; sub?: string }> = ({ icon, title, value, sub }) => (
    <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 flex items-start gap-3">
        {icon && <div className="text-primary">{icon}</div>}
        <div className="flex-1">
            <div className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{title}</div>
            <div className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">{value}</div>
            {sub && <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{sub}</div>}
        </div>
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
const ReportTable: React.FC<{ title: string; columns: Col[]; rows: any[]; empty?: string }> = ({ title, columns, rows, empty }) => (
    <section className="space-y-2">
        <div className="flex items-center justify-between">
            <h3 className="text-md font-semibold text-primary">{title}</h3>
            <ExportButtons title={title} columns={columns} rows={rows} />
        </div>
        {rows.length === 0 ? (
            <p className="text-sm text-neutral-500">{empty || 'Sin datos para el período seleccionado.'}</p>
        ) : (
            <div className="overflow-x-auto border border-neutral-200 dark:border-neutral-700 rounded-md">
                <table className="min-w-full text-sm">
                    <thead className="bg-neutral-100 dark:bg-neutral-700/50">
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
            else toast.error('Error al cargar el reporte.');
        } finally { setLoading(false); }
    }, [activeTab, filters, cajaId]);

    useEffect(() => { load(); }, [load]);

    const openSessionDetail = async (sessionId: string) => {
        try { setDetailSession(await cajaReportsService.sessionDetail(sessionId)); }
        catch { toast.error('No se pudo cargar el detalle de la sesión.'); }
    };

    return (
        <div>
            <h1 className="text-2xl font-semibold text-neutral-700 dark:text-neutral-200 mb-4">Centro de Reportes de Caja</h1>

            {/* Filtros compartidos */}
            <div className="flex flex-wrap gap-2 mb-4 items-end bg-neutral-50 dark:bg-neutral-700/50 p-3 rounded-md">
                <div>
                    <label className="block text-xs text-neutral-500 mb-1">Período</label>
                    <select value={dateKey} onChange={e => setDateKey(e.target.value as DateFilterKey)} className={INPUT_SM_CLASSES}>
                        <option value="today">Hoy</option>
                        <option value="yesterday">Ayer</option>
                        <option value="this_month">Mes actual</option>
                        <option value="last_month">Mes anterior</option>
                        <option value="last_30_days">Últimos 30 días</option>
                        <option value="last_90_days">Últimos 90 días</option>
                        <option value="custom">Personalizado</option>
                    </select>
                </div>
                {dateKey === 'custom' && (
                    <>
                        <div><label className="block text-xs text-neutral-500 mb-1">Desde</label><input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className={INPUT_SM_CLASSES} /></div>
                        <div><label className="block text-xs text-neutral-500 mb-1">Hasta</label><input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className={INPUT_SM_CLASSES} /></div>
                    </>
                )}
                <div>
                    <label className="block text-xs text-neutral-500 mb-1">Sucursal</label>
                    <select value={branchId} onChange={e => setBranchId(e.target.value)} className={INPUT_SM_CLASSES}>
                        <option value="">Todas</option>
                        {branches.filter(b => b.isActive).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs text-neutral-500 mb-1">Caja</label>
                    <select value={cajaId} onChange={e => setCajaId(e.target.value)} className={INPUT_SM_CLASSES}>
                        <option value="">Todas</option>
                        {cajas.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <button onClick={load} className={BUTTON_SECONDARY_SM_CLASSES}>Refrescar</button>
            </div>

            {/* Pestañas */}
            <div className="flex flex-wrap gap-1 border-b border-neutral-200 dark:border-neutral-700 mb-4">
                {TABS.map(tab => (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                        className={`px-3 py-2 text-sm font-medium rounded-t-md -mb-px border-b-2 ${activeTab === tab.key ? 'border-primary text-primary' : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}>
                        {tab.label}
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
                    {activeTab === 'por_hora' && <ReportTable title="Ventas por hora" columns={[{ header: 'Hora', key: 'hourLabel' }, { header: 'Transacciones', key: 'count', align: 'right' }, { header: 'Total', key: 'total', money: true, align: 'right' }]} rows={(data.rows || []).map((r: any) => ({ ...r, hourLabel: `${String(r.hour).padStart(2, '0')}:00` }))} />}
                    {activeTab === 'por_dia' && <ReportTable title="Ventas por día" columns={[{ header: 'Día', key: 'day' }, { header: 'Transacciones', key: 'count', align: 'right' }, { header: 'Total', key: 'total', money: true, align: 'right' }]} rows={data.rows || []} />}
                    {activeTab === 'por_categoria' && <ReportTable title="Ventas por categoría" columns={[{ header: 'Categoría', key: 'category' }, { header: 'Cantidad', key: 'qty', align: 'right' }, { header: 'Ingreso', key: 'revenue', money: true, align: 'right' }]} rows={data.rows || []} />}
                    {activeTab === 'por_sucursal' && <ReportTable title="Ventas por sucursal" columns={[{ header: 'Sucursal', key: 'name' }, { header: 'Transacciones', key: 'count', align: 'right' }, { header: 'Total', key: 'total', money: true, align: 'right' }]} rows={data.rows || []} />}
                    {activeTab === 'devoluciones' && <>
                        <Card icon={<BanknotesIcon className="w-6 h-6" />} title="Total devuelto" value={money(data.total)} sub={`${data.count} devoluciones`} />
                        <ReportTable title="Devoluciones" columns={[{ header: 'Fecha', key: 'date' }, { header: 'Sucursal', key: 'branchName' }, { header: 'Empleado', key: 'employee' }, { header: 'Método', key: 'paymentMethod' }, { header: 'Monto', key: 'amount', money: true, align: 'right' }]} rows={data.rows || []} />
                    </>}
                    {activeTab === 'anulaciones' && <>
                        <Card icon={<BanknotesIcon className="w-6 h-6" />} title="Total anulado" value={money(data.total)} sub={`${data.count} anulaciones`} />
                        <ReportTable title="Anulaciones" columns={[{ header: 'Fecha', key: 'date' }, { header: 'Sucursal', key: 'branchName' }, { header: 'Empleado', key: 'employee' }, { header: 'Método', key: 'paymentMethod' }, { header: 'Monto', key: 'amount', money: true, align: 'right' }]} rows={data.rows || []} />
                    </>}
                    {activeTab === 'impuestos' && <ImpuestosTab data={data} />}
                    {activeTab === 'x' && <XTab data={data} cajaSelected={!!cajaId} />}
                </div>
            )}

            {!loading && !data && activeTab !== 'x' && <EmptyState title="Sin datos" description="No se pudo cargar el reporte. Cambia los filtros y refresca." />}
            {!loading && activeTab === 'x' && !cajaId && <EmptyState title="Selecciona una caja" description="El reporte X muestra el turno abierto de una caja específica. Elige una caja en el filtro." />}

            {/* Detalle Z reimprimible */}
            {detailSession && <SessionDetailModal detail={detailSession} onClose={() => setDetailSession(null)} />}
        </div>
    );
};

// ─── Renderers de pestañas ───────────────────────

const ResumenTab: React.FC<{ report: SalesReport }> = ({ report }) => (
    <>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Card icon={<BanknotesIcon className="w-6 h-6" />} title="Ingresos totales" value={money(report.totalRevenue)} />
            <Card icon={<ChartBarIcon className="w-6 h-6" />} title="Transacciones" value={String(report.totalTransactions)} />
            <Card icon={<ChartPieIcon className="w-6 h-6" />} title="Ticket promedio" value={money(report.avgTicket)} />
            <Card icon={<BanknotesIcon className="w-6 h-6" />} title="IVU recaudado" value={money(report.totalTax || 0)} sub="en ventas nuevas" />
        </div>
        <ReportTable title="Top productos" columns={[{ header: '#', key: 'rank' }, { header: 'Producto', key: 'name' }, { header: 'Unidades', key: 'totalQuantity', align: 'right' }]} rows={report.topProducts.map((p, i) => ({ ...p, rank: i + 1 }))} />
        <ReportTable title="Top clientes" columns={[{ header: 'Cliente', key: 'name' }, { header: 'Ventas', key: 'salesCount', align: 'right' }, { header: 'Total', key: 'totalRevenue', money: true, align: 'right' }]} rows={report.topClients} />
        <ReportTable title="Ventas por empleado" columns={[{ header: 'Empleado', key: 'name' }, { header: 'Ventas', key: 'salesCount', align: 'right' }, { header: 'Total', key: 'totalRevenue', money: true, align: 'right' }]} rows={report.salesByEmployee} />
    </>
);

const MetodosTab: React.FC<{ report: SalesReport }> = ({ report }) => {
    const rows = report.byPaymentMethod.map(m => ({
        paymentMethod: m.paymentMethod,
        count: m._count,
        total: m._sum.totalAmount || 0,
        pct: report.totalRevenue > 0 ? ((m._sum.totalAmount || 0) / report.totalRevenue) * 100 : 0,
    }));
    return <ReportTable title="Ventas por método de pago" columns={[{ header: 'Método', key: 'paymentMethod' }, { header: 'Transacciones', key: 'count', align: 'right' }, { header: 'Total', key: 'total', money: true, align: 'right' }, { header: '% del total', key: 'pctLabel', align: 'right' }]} rows={rows.map(r => ({ ...r, pctLabel: `${r.pct.toFixed(1)}%` }))} />;
};

const CortesTab: React.FC<{ data: any; onDetail: (id: string) => void }> = ({ data, onDetail }) => (
    <>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card title="Cierres" value={String(data.count)} />
            <Card title="Sobrantes (total)" value={money(data.totalOver)} />
            <Card title="Faltantes (total)" value={money(data.totalShort)} />
        </div>
        <section className="space-y-2">
            <div className="flex items-center justify-between">
                <h3 className="text-md font-semibold text-primary">Cortes de caja (Z)</h3>
                <ExportButtons title="Cortes de caja" columns={[{ header: 'Caja', key: 'cajaName' }, { header: 'Sucursal', key: 'branchName' }, { header: 'Cerró', key: 'closedBy' }, { header: 'Cierre', key: 'closedAt' }, { header: 'Fondo', key: 'openingFloat', money: true }, { header: 'Esperado', key: 'expectedCash', money: true }, { header: 'Contado', key: 'countedCash', money: true }, { header: 'Diferencia', key: 'difference', money: true }]} rows={data.rows} />
            </div>
            {data.rows.length === 0 ? <p className="text-sm text-neutral-500">Sin cierres en el período.</p> : (
                <div className="overflow-x-auto border border-neutral-200 dark:border-neutral-700 rounded-md">
                    <table className="min-w-full text-sm">
                        <thead className="bg-neutral-100 dark:bg-neutral-700/50"><tr>
                            {['Caja', 'Sucursal', 'Cerró', 'Cierre', 'Fondo', 'Esperado', 'Contado', 'Diferencia', ''].map((h, i) => <th key={i} className={`p-2 ${i >= 4 ? 'text-right' : 'text-left'}`}>{h}</th>)}
                        </tr></thead>
                        <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                            {data.rows.map((r: any) => (
                                <tr key={r.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/40">
                                    <td className="p-2">{r.cajaName}</td><td className="p-2">{r.branchName}</td><td className="p-2">{r.closedBy}</td>
                                    <td className="p-2">{r.closedAt ? new Date(r.closedAt).toLocaleString() : '—'}</td>
                                    <td className="p-2 text-right tabular-nums">{money(r.openingFloat)}</td>
                                    <td className="p-2 text-right tabular-nums">{money(r.expectedCash)}</td>
                                    <td className="p-2 text-right tabular-nums">{money(r.countedCash)}</td>
                                    <td className={`p-2 text-right tabular-nums font-semibold ${r.difference < 0 ? 'text-red-600' : r.difference > 0 ? 'text-amber-600' : 'text-green-600'}`}>{money(r.difference)}</td>
                                    <td className="p-2 text-right"><button onClick={() => onDetail(r.id)} className="text-primary hover:underline text-xs">Ver / Imprimir</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    </>
);

const DescuadresTab: React.FC<{ data: any }> = ({ data }) => (
    <>
        <ReportTable title="Ranking de descuadres por cajero" columns={[{ header: 'Cajero', key: 'name' }, { header: 'Nº descuadres', key: 'count', align: 'right' }, { header: 'Neto', key: 'net', money: true, align: 'right' }, { header: '|Desviación|', key: 'absTotal', money: true, align: 'right' }]} rows={data.byUser} empty="Sin descuadres en el período." />
        <ReportTable title="Sesiones con descuadre" columns={[{ header: 'Caja', key: 'cajaName' }, { header: 'Sucursal', key: 'branchName' }, { header: 'Cerró', key: 'closedBy' }, { header: 'Cierre', key: 'closedAt' }, { header: 'Esperado', key: 'expectedCash', money: true, align: 'right' }, { header: 'Contado', key: 'countedCash', money: true, align: 'right' }, { header: 'Diferencia', key: 'difference', money: true, align: 'right' }]} rows={data.rows} />
    </>
);

const MOVEMENT_LABEL: Record<string, string> = { PAYOUT: 'Retiro (payout)', CASH_DROP: 'Depósito a bóveda', CASH_IN: 'Ingreso de efectivo', REFUND: 'Reembolso' };

const MovimientosTab: React.FC<{ data: any }> = ({ data }) => (
    <>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(MOVEMENT_LABEL).map(([k, label]) => <Card key={k} title={label} value={money(data.byType?.[k] || 0)} />)}
        </div>
        <ReportTable title="Movimientos de efectivo" columns={[{ header: 'Fecha', key: 'createdAt' }, { header: 'Caja', key: 'cajaName' }, { header: 'Tipo', key: 'typeLabel' }, { header: 'Motivo', key: 'reason' }, { header: 'Creado por', key: 'createdBy' }, { header: 'Autorizó', key: 'authorizedBy' }, { header: 'Monto', key: 'amount', money: true, align: 'right' }]} rows={(data.rows || []).map((r: any) => ({ ...r, typeLabel: MOVEMENT_LABEL[r.type] || r.type, authorizedBy: r.authorizedBy || '—' }))} />
    </>
);

const ImpuestosTab: React.FC<{ data: any }> = ({ data }) => (
    <>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Card title="IVU recaudado" value={money(data.totalTax)} />
            <Card title="Subtotal (base)" value={money(data.totalSubtotal)} />
            <Card title="Descuentos" value={money(data.totalDiscount)} />
            <Card title="Total con IVU" value={money(data.totalWithTax)} sub={`${data.count} ventas`} />
        </div>
        <ReportTable title="Impuestos por día" columns={[{ header: 'Día', key: 'day' }, { header: 'Subtotal', key: 'subtotal', money: true, align: 'right' }, { header: 'IVU', key: 'tax', money: true, align: 'right' }, { header: 'Total', key: 'total', money: true, align: 'right' }]} rows={data.byDay || []} empty="No hay ventas con impuesto registrado en el período (solo aplica a ventas nuevas)." />
    </>
);

const XTab: React.FC<{ data: any; cajaSelected: boolean }> = ({ data }) => {
    if (!data?.session) return <EmptyState title="Sin turno abierto" description={`La caja ${data?.cajaName || ''} no tiene un turno abierto ahora.`} />;
    const t = data.totals;
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-md font-semibold text-primary">Reporte X — {data.cajaName} (turno en vivo)</h3>
                <button onClick={() => window.print()} className={BUTTON_SECONDARY_SM_CLASSES}>🖨️ Imprimir</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Card title="Fondo inicial" value={money(t.openingFloat)} />
                <Card title="Ventas totales" value={money(t.totalSales)} />
                <Card title="Efectivo esperado" value={money(t.expectedCash)} />
                <Card title="Ventas efectivo" value={money(t.cashSales)} />
                <Card title="Ventas tarjeta" value={money(t.cardSales)} />
                <Card title="Otros métodos" value={money(t.otherSales)} />
                <Card title="Retiros/payouts" value={money(t.payouts)} />
                <Card title="Ingresos de efectivo" value={money(t.cashIn)} />
                <Card title="Devoluciones efectivo" value={money(t.cashRefunds)} />
            </div>
        </div>
    );
};

const SessionDetailModal: React.FC<{ detail: any; onClose: () => void }> = ({ detail, onClose }) => {
    const s = detail.session; const t = detail.totals;
    return (
        <Modal isOpen onClose={onClose} title={`Corte Z — ${s.caja?.name || ''}`} size="lg">
            <div className="space-y-4">
                <div className="flex justify-end"><button onClick={() => window.print()} className={BUTTON_SECONDARY_SM_CLASSES}>🖨️ Imprimir</button></div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-neutral-500">Sucursal:</span> {s.caja?.branch?.name || '—'}</div>
                    <div><span className="text-neutral-500">Estado:</span> {s.status}</div>
                    <div><span className="text-neutral-500">Abrió:</span> {s.openedByUser?.name} · {new Date(s.openedAt).toLocaleString()}</div>
                    <div><span className="text-neutral-500">Cerró:</span> {s.closedByUser?.name || '—'} · {s.closedAt ? new Date(s.closedAt).toLocaleString() : '—'}</div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <Card title="Fondo" value={money(t.openingFloat)} />
                    <Card title="Ventas efectivo" value={money(t.cashSales)} />
                    <Card title="Esperado" value={money(t.expectedCash)} />
                    <Card title="Contado" value={money(s.countedCash ?? 0)} />
                    <Card title="Diferencia" value={money(s.difference ?? 0)} />
                    <Card title="Ventas totales" value={money(t.totalSales)} />
                </div>
                <div>
                    <h4 className="font-semibold text-sm mb-1">Por método de pago</h4>
                    <table className="min-w-full text-sm border border-neutral-200 dark:border-neutral-700 rounded">
                        <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                            {detail.byMethod.map((m: any) => (
                                <tr key={m.paymentMethod}><td className="p-2">{m.paymentMethod}</td><td className="p-2 text-right">{m._count}</td><td className="p-2 text-right">{money(m._sum.totalAmount || 0)}</td></tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {s.movements?.length > 0 && (
                    <div>
                        <h4 className="font-semibold text-sm mb-1">Movimientos de efectivo</h4>
                        <table className="min-w-full text-sm border border-neutral-200 dark:border-neutral-700 rounded">
                            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                                {s.movements.map((m: any) => (
                                    <tr key={m.id}><td className="p-2">{MOVEMENT_LABEL[m.type] || m.type}</td><td className="p-2">{m.reason}</td><td className="p-2 text-right">{money(m.amount)}</td></tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </Modal>
    );
};
