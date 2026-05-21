import React, { useState, useEffect, useCallback } from 'react';
import { useData } from '../../contexts/DataContext';
import { ChartBarIcon, ChartPieIcon, BanknotesIcon, UserGroupIcon, UsersIcon } from '../../components/icons';
import { BUTTON_SECONDARY_SM_CLASSES, INPUT_SM_CLASSES } from '../../constants';
import { useTranslation } from '../../contexts/GlobalSettingsContext';
import { reportsService, type SalesReport } from '../../services/reports';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { EmptyState } from '../../components/ui/EmptyState';

type DateFilterKey = 'today' | 'yesterday' | 'this_month' | 'last_month' | 'last_30_days' | 'last_90_days' | 'custom';

const getISODateString = (date: Date): string => date.toISOString().split('T')[0];

const getDateRange = (key: DateFilterKey, customStart?: string, customEnd?: string): { start: string; end: string } => {
    const today = new Date();
    let start = new Date(today);
    let end = new Date(today);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    switch (key) {
        case 'today':
            break;
        case 'yesterday':
            start.setDate(today.getDate() - 1);
            end.setDate(today.getDate() - 1);
            break;
        case 'this_month':
            start = new Date(today.getFullYear(), today.getMonth(), 1);
            end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
            break;
        case 'last_month':
            start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            end = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
            break;
        case 'last_30_days':
            start.setDate(today.getDate() - 30);
            break;
        case 'last_90_days':
            start.setDate(today.getDate() - 90);
            break;
        case 'custom':
            if (customStart) start = new Date(customStart + 'T00:00:00');
            if (customEnd) end = new Date(customEnd + 'T23:59:59');
            break;
    }
    return { start: start.toISOString(), end: end.toISOString() };
};

const Card: React.FC<{ icon: React.ReactNode; title: string; value: string; sub?: string }> = ({ icon, title, value, sub }) => (
    <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 flex items-start gap-3">
        <div className="text-primary">{icon}</div>
        <div className="flex-1">
            <div className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{title}</div>
            <div className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">{value}</div>
            {sub && <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{sub}</div>}
        </div>
    </div>
);

export const POSReportsPage: React.FC = () => {
    const { t } = useTranslation();
    const { branches } = useData();

    const [dateKey, setDateKey] = useState<DateFilterKey>('this_month');
    const [customStart, setCustomStart] = useState(getISODateString(new Date()));
    const [customEnd, setCustomEnd] = useState(getISODateString(new Date()));
    const [branchId, setBranchId] = useState('');
    const [report, setReport] = useState<SalesReport | null>(null);
    const [loading, setLoading] = useState(false);

    const loadReport = useCallback(async () => {
        setLoading(true);
        try {
            const { start, end } = getDateRange(dateKey, customStart, customEnd);
            const data = await reportsService.getSalesReport({
                startDate: start,
                endDate: end,
                branchId: branchId || undefined,
            });
            setReport(data);
        } catch (err) {
            if (err instanceof ApiError) toast.error(err.message);
        } finally {
            setLoading(false);
        }
    }, [dateKey, customStart, customEnd, branchId]);

    useEffect(() => { loadReport(); }, [loadReport]);

    return (
        <div>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-3">
                <h1 className="text-2xl font-semibold text-neutral-700 dark:text-neutral-200">
                    {t('pos.reports.title') || 'Reportes POS'}
                </h1>
            </div>

            {/* Filtros */}
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
                        <div>
                            <label className="block text-xs text-neutral-500 mb-1">Desde</label>
                            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className={INPUT_SM_CLASSES} />
                        </div>
                        <div>
                            <label className="block text-xs text-neutral-500 mb-1">Hasta</label>
                            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className={INPUT_SM_CLASSES} />
                        </div>
                    </>
                )}
                <div>
                    <label className="block text-xs text-neutral-500 mb-1">Sucursal</label>
                    <select value={branchId} onChange={e => setBranchId(e.target.value)} className={INPUT_SM_CLASSES}>
                        <option value="">Todas</option>
                        {branches.filter(b => b.isActive).map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                    </select>
                </div>
                <button onClick={loadReport} className={BUTTON_SECONDARY_SM_CLASSES}>Refrescar</button>
            </div>

            {loading && <LoadingSkeleton variant="cards" count={4} />}

            {!loading && report && (
                <div className="space-y-6">
                    {/* Cards principales */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <Card icon={<BanknotesIcon className="w-6 h-6" />} title="Ingresos totales" value={`$${report.totalRevenue.toFixed(2)}`} />
                        <Card icon={<ChartBarIcon className="w-6 h-6" />} title="Transacciones" value={report.totalTransactions.toString()} />
                        <Card icon={<ChartPieIcon className="w-6 h-6" />} title="Ticket promedio" value={`$${report.avgTicket.toFixed(2)}`} />
                        <Card icon={<UsersIcon className="w-6 h-6" />} title="Métodos de pago" value={report.byPaymentMethod.length.toString()} sub="distintos usados" />
                    </div>

                    {/* Por método de pago */}
                    <section>
                        <h3 className="text-md font-semibold text-primary border-b dark:border-neutral-600 mb-2">Por método de pago</h3>
                        {report.byPaymentMethod.length === 0 ? (
                            <p className="text-sm text-neutral-500">Sin datos.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-neutral-100 dark:bg-neutral-700/50">
                                        <tr>
                                            <th className="text-left p-2">Método</th>
                                            <th className="text-right p-2">Ventas</th>
                                            <th className="text-right p-2">Total</th>
                                            <th className="text-right p-2">% del total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                                        {report.byPaymentMethod.map(m => {
                                            const sum = m._sum.totalAmount || 0;
                                            const pct = report.totalRevenue > 0 ? (sum / report.totalRevenue) * 100 : 0;
                                            return (
                                                <tr key={m.paymentMethod}>
                                                    <td className="p-2">{m.paymentMethod}</td>
                                                    <td className="p-2 text-right">{m._count}</td>
                                                    <td className="p-2 text-right">${sum.toFixed(2)}</td>
                                                    <td className="p-2 text-right">
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex-1 bg-neutral-200 dark:bg-neutral-700 rounded-full h-1.5">
                                                                <div className="bg-primary h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                                                            </div>
                                                            <span className="text-xs w-12 text-right">{pct.toFixed(1)}%</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>

                    {/* Top productos */}
                    <section>
                        <h3 className="text-md font-semibold text-primary border-b dark:border-neutral-600 mb-2 flex items-center gap-2">
                            <ChartBarIcon className="w-4 h-4" /> Top productos
                        </h3>
                        {report.topProducts.length === 0 ? (
                            <p className="text-sm text-neutral-500">Sin datos.</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {report.topProducts.map((p, i) => (
                                    <div key={p.productId} className="p-2 border border-neutral-200 dark:border-neutral-600 rounded flex items-center gap-3">
                                        <span className="text-lg font-bold text-neutral-400 w-6">{i + 1}</span>
                                        <span className="flex-1 truncate">{p.name}</span>
                                        <span className="font-bold text-primary">{p.totalQuantity}u</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Top clientes */}
                    <section>
                        <h3 className="text-md font-semibold text-primary border-b dark:border-neutral-600 mb-2 flex items-center gap-2">
                            <UserGroupIcon className="w-4 h-4" /> Top clientes
                        </h3>
                        {report.topClients.length === 0 ? (
                            <p className="text-sm text-neutral-500">Sin datos.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-neutral-100 dark:bg-neutral-700/50">
                                        <tr>
                                            <th className="text-left p-2">#</th>
                                            <th className="text-left p-2">Cliente</th>
                                            <th className="text-right p-2">Ventas</th>
                                            <th className="text-right p-2">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                                        {report.topClients.map((c, i) => (
                                            <tr key={c.clientId || i}>
                                                <td className="p-2 text-neutral-400">{i + 1}</td>
                                                <td className="p-2">{c.name}</td>
                                                <td className="p-2 text-right">{c.salesCount}</td>
                                                <td className="p-2 text-right font-semibold">${c.totalRevenue.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>

                    {/* Ventas por empleado */}
                    <section>
                        <h3 className="text-md font-semibold text-primary border-b dark:border-neutral-600 mb-2 flex items-center gap-2">
                            <UsersIcon className="w-4 h-4" /> Ventas por empleado
                        </h3>
                        {report.salesByEmployee.length === 0 ? (
                            <p className="text-sm text-neutral-500">Sin datos.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-neutral-100 dark:bg-neutral-700/50">
                                        <tr>
                                            <th className="text-left p-2">Empleado</th>
                                            <th className="text-right p-2">Ventas</th>
                                            <th className="text-right p-2">Total</th>
                                            <th className="text-right p-2">Ticket promedio</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                                        {report.salesByEmployee.map(e => {
                                            const avg = e.salesCount > 0 ? e.totalRevenue / e.salesCount : 0;
                                            return (
                                                <tr key={e.employeeId}>
                                                    <td className="p-2">{e.name}</td>
                                                    <td className="p-2 text-right">{e.salesCount}</td>
                                                    <td className="p-2 text-right font-semibold">${e.totalRevenue.toFixed(2)}</td>
                                                    <td className="p-2 text-right text-neutral-500">${avg.toFixed(2)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </div>
            )}

            {!loading && !report && (
                <EmptyState title="Sin datos del reporte" description="No se pudo cargar el reporte. Intenta cambiar los filtros." />
            )}
        </div>
    );
};
