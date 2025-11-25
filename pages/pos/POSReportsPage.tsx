import React, { useMemo, useState } from 'react';
import { useData } from '../../contexts/DataContext'; 
import { Sale, Client, Employee } from '../../types'; 
import { ChartBarIcon, ChartPieIcon, ArrowUpIcon, ArrowDownIcon, BanknotesIcon, UserGroupIcon, UsersIcon, ClockIcon, EyeIcon, EyeSlashIcon, ExclamationTriangleIcon } from '../../components/icons'; 
import { BUTTON_SECONDARY_SM_CLASSES, INPUT_SM_CLASSES } from '../../constants';
import { DataTable, TableColumn } from '../../components/DataTable';
import { useTranslation } from '../../contexts/GlobalSettingsContext'; 

type DateFilterKey = "today" | "yesterday" | "this_month" | "last_month" | "custom";

const getISODateString = (date: Date): string => date.toISOString().split('T')[0];

const getDateRange = (key: DateFilterKey, customStart?: Date, customEnd?: Date): { start: Date, end: Date } => {
    const today = new Date();
    let start = new Date(today);
    let end = new Date(today);

    start.setHours(0,0,0,0);
    end.setHours(23,59,59,999);

    switch (key) {
        case 'today': break;
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
        case 'custom':
            if (customStart && customEnd) {
                start = new Date(customStart);
                start.setHours(0, 0, 0, 0);
                end = new Date(customEnd);
                end.setHours(23, 59, 59, 999);
            }
            break;
    }
    return { start, end };
};

export const POSReportsPage: React.FC = () => {
    const { t } = useTranslation(); 
    const { sales, cajas, employees, getClientById, getEmployeeById } = useData();

    const [dateFilterKey, setDateFilterKey] = useState<DateFilterKey>('this_month');
    const [customStartDate, setCustomStartDate] = useState<string>(getISODateString(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
    const [customEndDate, setCustomEndDate] = useState<string>(getISODateString(new Date()));
    const [includeExternalSales, setIncludeExternalSales] = useState(false); // Default to excluding external sales
    const [showLossReport, setShowLossReport] = useState(false); // New filter for Loss

    const filteredSales = useMemo(() => {
        const { start, end } = getDateRange(dateFilterKey, dateFilterKey === 'custom' ? new Date(customStartDate) : undefined, dateFilterKey === 'custom' ? new Date(customEndDate) : undefined);
        return sales.filter(s => {
            const inDateRange = new Date(s.date) >= start && new Date(s.date) <= end;
            const externalCheck = includeExternalSales ? true : !s.isExternal; // Filter external unless toggled
            
            // Loss Check
            const client = s.clientId ? getClientById(s.clientId) : null;
            const isClientLoss = client?.isLoss || false;
            const lossCheck = showLossReport ? isClientLoss : !isClientLoss; // If showing loss report, only show loss clients. If not, exclude them.

            return inDateRange && externalCheck && lossCheck;
        });
    }, [sales, dateFilterKey, customStartDate, customEndDate, includeExternalSales, showLossReport, getClientById]);
    
    // Basic Stats
    const totalRevenue = useMemo(() => filteredSales.reduce((sum, sale) => sum + sale.totalAmount, 0), [filteredSales]);
    const totalTransactions = useMemo(() => filteredSales.length, [filteredSales]);
    const averageTicket = useMemo(() => totalTransactions > 0 ? totalRevenue / totalTransactions : 0, [totalRevenue, totalTransactions]);
    
    // Returns Calculation
    const returnsData = useMemo(() => {
        const returns = filteredSales.filter(s => s.totalAmount < 0 || s.isReturn);
        const totalAmount = returns.reduce((sum, s) => sum + Math.abs(s.totalAmount), 0);
        
        const byCaja: { [cajaId: string]: number } = {};
        returns.forEach(r => {
            byCaja[r.cajaId] = (byCaja[r.cajaId] || 0) + Math.abs(r.totalAmount);
        });

        return { totalAmount, count: returns.length, byCaja };
    }, [filteredSales]);

    // Sales By Register (Caja) - Serves as Rollover/Cash Flow indicator per box
    const salesByCajaData = useMemo(() => {
        const data: { [cajaId: string]: { name: string, total: number, cashTotal: number, isExternal: boolean } } = {};
        
        cajas.forEach(c => {
            // Only include external cajas in the list if the filter is on
            if (!c.isExternal || includeExternalSales) {
                data[c.id] = { name: c.name, total: 0, cashTotal: 0, isExternal: !!c.isExternal };
            }
        });

        filteredSales.forEach(s => {
            if (!data[s.cajaId]) {
                 // If sale exists but caja not in initial list (maybe deleted or strict filter), add if valid
                 const cajaInfo = cajas.find(c => c.id === s.cajaId);
                 if (cajaInfo && (!cajaInfo.isExternal || includeExternalSales)) {
                     data[s.cajaId] = { name: cajaInfo.name, total: 0, cashTotal: 0, isExternal: !!cajaInfo.isExternal };
                 } else if (!cajaInfo) {
                     data[s.cajaId] = { name: s.cajaId, total: 0, cashTotal: 0, isExternal: false }; // Fallback
                 }
            }
            
            if (data[s.cajaId]) {
                data[s.cajaId].total += s.totalAmount;
                if (s.paymentMethod === 'Efectivo') {
                    data[s.cajaId].cashTotal += s.totalAmount;
                }
            }
        });

        return Object.values(data);
    }, [filteredSales, cajas, includeExternalSales]);

    // Top Clients
    const topClientsData = useMemo(() => {
        const clientSales: { [clientId: string]: { name: string, total: number, count: number } } = {};
        filteredSales.forEach(s => {
            if (!s.clientId) return; 
            if (!clientSales[s.clientId]) {
                const client = getClientById(s.clientId);
                clientSales[s.clientId] = { name: client ? `${client.name} ${client.lastName}` : 'N/A', total: 0, count: 0 };
            }
            clientSales[s.clientId].total += s.totalAmount;
            clientSales[s.clientId].count++;
        });
        return Object.values(clientSales).sort((a, b) => b.total - a.total).slice(0, 5);
    }, [filteredSales, getClientById]);

    // Top Employees
    const topEmployeesData = useMemo(() => {
        const empSales: { [empId: string]: { name: string, total: number, count: number } } = {};
        filteredSales.forEach(s => {
            if (!empSales[s.employeeId]) {
                const emp = getEmployeeById(s.employeeId);
                empSales[s.employeeId] = { name: emp ? `${emp.name} ${emp.lastName}` : 'N/A', total: 0, count: 0 };
            }
            empSales[s.employeeId].total += s.totalAmount;
            empSales[s.employeeId].count++;
        });
        return Object.values(empSales).sort((a, b) => b.total - a.total).slice(0, 5);
    }, [filteredSales, getEmployeeById]);

    // Highest Value Transactions
    const topTransactionsData = useMemo(() => {
        return [...filteredSales]
            .sort((a, b) => b.totalAmount - a.totalAmount)
            .slice(0, 5);
    }, [filteredSales]);


    const StatCard: React.FC<{ title: string; value: string; icon?: React.ReactNode; subValue?: string }> = ({ title, value, icon, subValue }) => (
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{title}</h3>
                {icon && <div className="text-primary dark:text-accent">{icon}</div>}
            </div>
            <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">{value}</p>
            {subValue && <p className="text-xs text-neutral-500 mt-1">{subValue}</p>}
        </div>
    );
    
    const filterOptions: DateFilterKey[] = ['today', 'yesterday', 'this_month', 'last_month'];

    return (
        <div className="p-4 md:p-6 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-2xl font-semibold text-neutral-700 dark:text-neutral-200">
                    {showLossReport ? 'Reporte de Pérdidas / Cuentas Incobrables' : t('reports.pos.title')}
                </h1>
                
                <div className="flex flex-wrap gap-2 items-center">
                    {/* Loss Report Toggle */}
                    <button
                        onClick={() => setShowLossReport(!showLossReport)}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center ${
                            showLossReport 
                                ? 'bg-red-600 text-white border border-red-700' 
                                : 'bg-white dark:bg-neutral-800 text-red-600 border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-900/20'
                        }`}
                        title="Ver reporte de clientes marcados como pérdida"
                    >
                        <ExclamationTriangleIcon className="w-4 h-4 mr-1.5"/>
                        {showLossReport ? 'Viendo Reporte de Pérdidas' : 'Ver Reporte de Pérdidas'}
                    </button>

                    <div className="h-6 w-px bg-neutral-300 dark:bg-neutral-600 mx-1 hidden sm:block"></div>

                    {/* External Sales Toggle */}
                    <button
                        onClick={() => setIncludeExternalSales(!includeExternalSales)}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center ${
                            includeExternalSales 
                                ? 'bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800' 
                                : 'bg-white dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700'
                        }`}
                        title="Incluir ventas de cajas externas"
                    >
                        {includeExternalSales ? <EyeIcon className="w-4 h-4 mr-1.5"/> : <EyeSlashIcon className="w-4 h-4 mr-1.5"/>}
                        {includeExternalSales ? 'Cajas Externas Incluidas' : 'Cajas Externas Ocultas'}
                    </button>

                    <div className="h-6 w-px bg-neutral-300 dark:bg-neutral-600 mx-1 hidden sm:block"></div>

                    {filterOptions.map(key => (
                        <button 
                            key={key}
                            onClick={() => setDateFilterKey(key)}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${dateFilterKey === key ? 'bg-primary text-white shadow-sm' : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700'}`}
                        >
                            {t(`reports.filter.${key}`)}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title={showLossReport ? "Total Pérdida" : t('reports.pos.net_sales')} value={`$${totalRevenue.toFixed(2)}`} icon={<ChartBarIcon className="w-5 h-5" />} />
                <StatCard title={t('reports.pos.total_returns')} value={`$${returnsData.totalAmount.toFixed(2)}`} subValue={`${returnsData.count} transacciones`} icon={<ArrowDownIcon className="w-5 h-5 text-red-500" />} />
                <StatCard title={t('reports.pos.transactions')} value={totalTransactions.toString()} icon={<ChartPieIcon className="w-5 h-5" />} />
                <StatCard title={t('reports.pos.avg_ticket')} value={`$${averageTicket.toFixed(2)}`} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Sales & Returns by Register */}
                <div className="bg-white dark:bg-neutral-800 p-5 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700">
                    <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100 mb-4">{t('reports.pos.sales_by_register')}</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="text-neutral-500 dark:text-neutral-400 border-b dark:border-neutral-700">
                                    <th className="text-left py-2 font-medium">Caja</th>
                                    <th className="text-right py-2 font-medium">Ventas Totales</th>
                                    <th className="text-right py-2 font-medium">Efectivo (Rollover)</th>
                                    <th className="text-right py-2 font-medium text-red-500">Devoluciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y dark:divide-neutral-700">
                                {salesByCajaData.map(item => {
                                    const cajaReturns = returnsData.byCaja[item.name] || 0;
                                    return (
                                        <tr key={item.name} className={item.isExternal ? 'bg-amber-50 dark:bg-amber-900/10' : ''}>
                                            <td className="py-2 text-neutral-700 dark:text-neutral-200">
                                                {item.name} {item.isExternal && <span className="text-xs text-amber-600 font-semibold ml-1">(Ext)</span>}
                                            </td>
                                            <td className="py-2 text-right font-medium">${item.total.toFixed(2)}</td>
                                            <td className="py-2 text-right text-green-600 dark:text-green-400">${item.cashTotal.toFixed(2)}</td>
                                            <td className="py-2 text-right text-red-600 dark:text-red-400">-${cajaReturns.toFixed(2)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Top Employees */}
                <div className="bg-white dark:bg-neutral-800 p-5 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700">
                    <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100 mb-4 flex items-center"><UsersIcon className="w-5 h-5 mr-2 text-primary"/> {t('reports.pos.top_employees')}</h3>
                    <div className="space-y-3">
                        {topEmployeesData.map((emp, idx) => (
                            <div key={emp.name} className="flex justify-between items-center p-2 bg-neutral-50 dark:bg-neutral-700/30 rounded-md">
                                <div className="flex items-center">
                                    <span className="w-6 h-6 flex items-center justify-center bg-neutral-200 dark:bg-neutral-600 rounded-full text-xs font-bold mr-3 text-neutral-600 dark:text-neutral-300">{idx + 1}</span>
                                    <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200">{emp.name}</span>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-bold text-primary dark:text-accent">${emp.total.toFixed(2)}</div>
                                    <div className="text-xs text-neutral-500">{emp.count} ventas</div>
                                </div>
                            </div>
                        ))}
                        {topEmployeesData.length === 0 && <p className="text-sm text-neutral-500 text-center py-4">No hay datos disponibles.</p>}
                    </div>
                </div>

                {/* Top Clients */}
                <div className="bg-white dark:bg-neutral-800 p-5 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700">
                    <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100 mb-4 flex items-center"><UserGroupIcon className="w-5 h-5 mr-2 text-blue-500"/> {t('reports.pos.top_clients')}</h3>
                    <div className="space-y-3">
                        {topClientsData.map((client, idx) => (
                            <div key={client.name} className="flex justify-between items-center p-2 bg-neutral-50 dark:bg-neutral-700/30 rounded-md">
                                <div className="flex items-center">
                                    <span className="w-6 h-6 flex items-center justify-center bg-neutral-200 dark:bg-neutral-600 rounded-full text-xs font-bold mr-3 text-neutral-600 dark:text-neutral-300">{idx + 1}</span>
                                    <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200">{client.name}</span>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-bold text-blue-600 dark:text-blue-400">${client.total.toFixed(2)}</div>
                                    <div className="text-xs text-neutral-500">{client.count} compras</div>
                                </div>
                            </div>
                        ))}
                        {topClientsData.length === 0 && <p className="text-sm text-neutral-500 text-center py-4">No hay datos disponibles.</p>}
                    </div>
                </div>

                {/* Highest Value Transactions */}
                <div className="bg-white dark:bg-neutral-800 p-5 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700">
                    <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100 mb-4 flex items-center"><BanknotesIcon className="w-5 h-5 mr-2 text-green-600"/> {t('reports.pos.top_transactions')}</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="text-neutral-500 dark:text-neutral-400 border-b dark:border-neutral-700">
                                    <th className="text-left py-2 font-medium">ID Venta</th>
                                    <th className="text-left py-2 font-medium">Fecha</th>
                                    <th className="text-right py-2 font-medium">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y dark:divide-neutral-700">
                                {topTransactionsData.map(sale => (
                                    <tr key={sale.id} className={sale.isExternal ? 'bg-amber-50 dark:bg-amber-900/10' : ''}>
                                        <td className="py-2 font-mono text-xs text-neutral-600 dark:text-neutral-300">
                                            {sale.id.substring(0,8).toUpperCase()}
                                            {sale.isExternal && <span className="ml-1 text-[10px] text-amber-600 font-bold">(EXT)</span>}
                                        </td>
                                        <td className="py-2 text-neutral-700 dark:text-neutral-200">{new Date(sale.date).toLocaleDateString()}</td>
                                        <td className="py-2 text-right font-bold text-green-600 dark:text-green-400">${sale.totalAmount.toFixed(2)}</td>
                                    </tr>
                                ))}
                                {topTransactionsData.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="text-center py-4 text-neutral-500">No hay transacciones.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};