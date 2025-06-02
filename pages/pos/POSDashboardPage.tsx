
import React, { useMemo, useState } from 'react';
import { useData } from '../../contexts/DataContext'; 
import { Sale, Product as ProductType, Client, Employee } from '../../types'; 
import { ChartBarIcon } from '../../components/icons'; 
import { ClientPOSReportModal } from '../../components/ui/ClientPOSReportModal';
import { BUTTON_SECONDARY_SM_CLASSES } from '../../constants';


const getISODateString = (date: Date): string => date.toISOString().split('T')[0];

const getStartOfMonth = (date: Date): Date => {
    return new Date(date.getFullYear(), date.getMonth(), 1);
};

export const POSDashboardPage: React.FC = () => {
    const { sales, products, employees, getClientById, getProductById } = useData();

    const today = new Date();
    const todayStr = getISODateString(today);
    const startOfMonth = getISODateString(getStartOfMonth(today));

    const salesToday = useMemo(() => sales.filter(s => getISODateString(new Date(s.date)) === todayStr), [sales, todayStr]);
    const salesThisMonth = useMemo(() => sales.filter(s => getISODateString(new Date(s.date)) >= startOfMonth), [sales, startOfMonth]);

    const totalRevenue = (salesPeriod: Sale[]) => salesPeriod.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const totalTransactions = (salesPeriod: Sale[]) => salesPeriod.length;

    const averageTransactionValue = (salesPeriod: Sale[]) => {
        const revenue = totalRevenue(salesPeriod);
        const transactions = totalTransactions(salesPeriod);
        return transactions > 0 ? revenue / transactions : 0;
    };
    
    const salesByPaymentMethodThisMonth = useMemo(() => {
        const breakdown: { [method: string]: number } = {};
        salesThisMonth.forEach(sale => {
            breakdown[sale.paymentMethod] = (breakdown[sale.paymentMethod] || 0) + sale.totalAmount;
        });
        return Object.entries(breakdown).map(([method, total]) => ({ method, total })).sort((a,b) => b.total - a.total);
    }, [salesThisMonth]);

    const salesByClientThisMonth = useMemo(() => {
        const clientSales: { [clientId: string]: { clientName: string, totalSpent: number, salesCount: number } } = {};
        salesThisMonth.forEach(sale => {
            if (sale.clientId) {
                if (!clientSales[sale.clientId]) {
                    const clientInfo = getClientById(sale.clientId);
                    clientSales[sale.clientId] = { 
                        clientName: clientInfo ? `${clientInfo.name} ${clientInfo.lastName}` : `Cliente ID: ${sale.clientId}`, // Fallback name
                        totalSpent: 0, 
                        salesCount: 0 
                    };
                }
                clientSales[sale.clientId].totalSpent += sale.totalAmount;
                clientSales[sale.clientId].salesCount += 1;
            }
        });
        return Object.entries(clientSales).map(([clientId, data]) => ({ clientId, ...data })).sort((a,b) => b.totalSpent - a.totalSpent);
    }, [salesThisMonth, getClientById]);

    const reportByProductThisMonth = useMemo(() => {
        const productStats: { [productId: string]: { name: string, quantity: number, revenue: number } } = {};
        salesThisMonth.forEach(sale => {
            sale.items.forEach(item => {
                const productInfo = getProductById(item.id);
                if(productInfo){
                    if (!productStats[item.id]) {
                        productStats[item.id] = { name: productInfo.name, quantity: 0, revenue: 0 };
                    }
                    productStats[item.id].quantity += item.quantity;
                    productStats[item.id].revenue += item.quantity * item.unitPrice;
                }
            });
        });
        return Object.values(productStats).sort((a, b) => b.revenue - a.revenue);
    }, [salesThisMonth, getProductById]);


    const salesByHourToday = useMemo(() => {
        const hourlySales: { [hour: number]: number } = {};
        for (let i = 0; i < 24; i++) hourlySales[i] = 0; // Initialize all hours
        salesToday.forEach(sale => {
            const hour = new Date(sale.date).getHours();
            hourlySales[hour] = (hourlySales[hour] || 0) + sale.totalAmount;
        });
        return Object.entries(hourlySales).map(([hour, total]) => ({ hour: parseInt(hour), total })).filter(h => h.total > 0);
    }, [salesToday]);

    const topSellingCategoriesThisMonth = useMemo(() => {
        const categoryRevenue: { [categoryName: string]: number } = {};
        salesThisMonth.forEach(sale => {
            sale.items.forEach(item => {
                const productInfo = getProductById(item.id);
                if (productInfo && productInfo.category) {
                    categoryRevenue[productInfo.category] = (categoryRevenue[productInfo.category] || 0) + (item.unitPrice * item.quantity);
                }
            });
        });
        return Object.entries(categoryRevenue).map(([name, revenue]) => ({ name, revenue })).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    }, [salesThisMonth, getProductById]);

    const [isClientReportModalOpen, setIsClientReportModalOpen] = useState(false);
    const [selectedClientIdForReport, setSelectedClientIdForReport] = useState<string | null>(null);

    const openClientReportModal = (clientId: string) => {
        setSelectedClientIdForReport(clientId);
        setIsClientReportModalOpen(true);
    };

    const StatCard: React.FC<{ title: string; value: string; icon?: React.ReactNode, period?: string }> = ({ title, value, icon, period }) => (
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg shadow-lg">
            {icon && <div className="text-primary text-2xl mb-2">{icon}</div>}
            <h3 className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{title} {period && `(${period})`}</h3>
            <p className="text-xl font-semibold text-neutral-800 dark:text-neutral-100 mt-1">{value}</p>
        </div>
    );
    
    const ReportListCard: React.FC<{title: string, data: {label: string, value: string | number, subValue?: string}[], onLabelClick?: (id: string) => void, clickableIds?: string[]}> = ({ title, data, onLabelClick, clickableIds }) => (
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg shadow-lg">
            <h2 className="text-md font-semibold text-primary mb-3">{title}</h2>
            {data.length > 0 ? (
                <ul className="space-y-1.5 text-xs max-h-60 overflow-y-auto pr-2">
                    {data.map((item, index) => (
                        <li key={index} className="flex justify-between items-center p-1.5 bg-neutral-50 dark:bg-neutral-700/50 rounded-md">
                            {onLabelClick && clickableIds && clickableIds[index] ? (
                                <button 
                                    onClick={() => onLabelClick(clickableIds[index])} 
                                    className="text-neutral-700 dark:text-neutral-200 hover:text-primary dark:hover:text-primary underline text-left"
                                >
                                    {item.label}
                                </button>
                            ) : (
                                <span className="text-neutral-700 dark:text-neutral-200">{item.label}</span>
                            )}
                            <div className="text-right">
                                <span className="font-semibold text-neutral-800 dark:text-neutral-100">{typeof item.value === 'number' ? `$${item.value.toFixed(2)}` : item.value}</span>
                                {item.subValue && <span className="text-neutral-500 dark:text-neutral-400 ml-1 text-[10px]">({item.subValue})</span>}
                            </div>
                        </li>
                    ))}
                </ul>
            ) : <p className="text-xs text-neutral-500 dark:text-neutral-400">No hay datos disponibles.</p>}
        </div>
    );


    return (
        <div className="p-4 md:p-6 space-y-4">
            <h1 className="text-xl sm:text-2xl font-semibold text-neutral-700 dark:text-neutral-200">Dashboard de Punto de Venta</h1>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Ventas Netas" value={`$${totalRevenue(salesToday).toFixed(2)}`} period="Hoy" icon={<ChartBarIcon />} />
                <StatCard title="Transacciones" value={totalTransactions(salesToday).toString()} period="Hoy" />
                <StatCard title="Ventas Netas" value={`$${totalRevenue(salesThisMonth).toFixed(2)}`} period="Este Mes" icon={<ChartBarIcon />} />
                <StatCard title="Transacciones" value={totalTransactions(salesThisMonth).toString()} period="Este Mes" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Ticket Promedio" value={`$${averageTransactionValue(salesToday).toFixed(2)}`} period="Hoy" />
                <StatCard title="Ticket Promedio" value={`$${averageTransactionValue(salesThisMonth).toFixed(2)}`} period="Este Mes"/>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                 <ReportListCard 
                    title="Ventas por Método de Pago (Mes)"
                    data={salesByPaymentMethodThisMonth.map(item => ({ label: item.method, value: item.total }))}
                />
                <ReportListCard 
                    title="Ventas por Cliente (Mes)"
                    data={salesByClientThisMonth.map(item => ({ label: item.clientName, value: item.totalSpent, subValue: `${item.salesCount} ventas` }))}
                    onLabelClick={openClientReportModal}
                    clickableIds={salesByClientThisMonth.map(item => item.clientId)}
                />
                <ReportListCard 
                    title="Ventas por Producto (Mes)"
                    data={reportByProductThisMonth.map(item => ({ label: item.name, value: item.revenue, subValue: `${item.quantity} uds` }))}
                />
                 <ReportListCard 
                    title="Ventas por Hora (Hoy)"
                    data={salesByHourToday.map(item => ({ label: `${item.hour}:00 - ${item.hour}:59`, value: item.total }))}
                />
                <ReportListCard 
                    title="Categorías Populares (Mes)"
                    data={topSellingCategoriesThisMonth.map(item => ({ label: item.name, value: item.revenue }))}
                />
            </div>
            {selectedClientIdForReport && (
                <ClientPOSReportModal
                    isOpen={isClientReportModalOpen}
                    onClose={() => setIsClientReportModalOpen(false)}
                    clientId={selectedClientIdForReport}
                    monthSales={salesThisMonth.filter(s => s.clientId === selectedClientIdForReport)}
                />
            )}
        </div>
    );
};

