import React, { useMemo, useState, useEffect } from 'react';
import { useData } from '../../contexts/DataContext'; 
import { Sale, Product as ProductType, Client, Employee } from '../../types'; 
import { ChartBarIcon, ChartPieIcon, ArrowUpIcon, ArrowDownIcon } from '../../components/icons'; 
import { ClientPOSReportModal } from '../../components/ui/ClientPOSReportModal';
import { BUTTON_SECONDARY_SM_CLASSES, INPUT_SM_CLASSES } from '../../constants';
import { DataTable, TableColumn } from '../../components/DataTable';

type DateFilterOption = "Hoy" | "Ayer" | "Este Mes" | "Mes Anterior" | "Personalizado";
type ReportTypeOption = "Resumen de Ventas" | "Ventas por Método de Pago" | "Ventas por Cliente" | "Ventas por Producto" | "Ventas por Hora" | "Categorías Populares";

const getISODateString = (date: Date): string => date.toISOString().split('T')[0];

const getDateRange = (option: DateFilterOption, customStart?: Date, customEnd?: Date): { start: Date, end: Date } => {
    const today = new Date();
    let start = new Date(today);
    let end = new Date(today);

    start.setHours(0,0,0,0);
    end.setHours(23,59,59,999);

    switch (option) {
        case 'Hoy': break;
        case 'Ayer':
            start.setDate(today.getDate() - 1);
            end.setDate(today.getDate() - 1);
            break;
        case 'Este Mes':
            start = new Date(today.getFullYear(), today.getMonth(), 1);
            end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
            break;
        case 'Mes Anterior':
            start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            end = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
            break;
        case 'Personalizado':
            if (customStart && customEnd) {
                start = new Date(customStart);
                start.setHours(0, 0, 0, 0);
                end = new Date(customEnd);
                end.setHours(23, 59, 59, 999);
            } else {
                start = new Date(today.getFullYear(), today.getMonth(), 1);
                end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
            }
            break;
        default:
             start = new Date(today.getFullYear(), today.getMonth(), 1);
             end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
            break;
    }
    return { start, end };
};

interface SortConfig<T> {
  key: keyof T | null;
  direction: 'ascending' | 'descending';
}

const ITEMS_PER_PAGE = 10;

const PaginationControls: React.FC<{currentPage: number, totalPages: number, onPageChange: (page: number) => void}> = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null;
    return (
        <div className="mt-4 flex justify-center items-center space-x-2">
            <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className={BUTTON_SECONDARY_SM_CLASSES}>Anterior</button>
            <span className="text-sm text-neutral-600 dark:text-neutral-300">Página {currentPage} de {totalPages}</span>
            <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className={BUTTON_SECONDARY_SM_CLASSES}>Siguiente</button>
        </div>
    );
};

// Define specific types for table data
interface PaymentMethodReportItem { id: string; method: string; transactionCount: number; totalAmount: number; }
interface ClientReportItem { id: string; clientId: string; clientName: string; salesCount: number; totalSpent: number; averageTicket: number; }
interface ProductReportItem { id: string; productId: string; name: string; category?: string; quantitySold: number; revenueGenerated: number; percentageOfTotalRevenue: number; }
interface HourlyReportItem { id: string; hour: number; transactionCount: number; totalSales: number; }
interface CategoryReportItem { id: string; name: string; productsSold: number; revenueGenerated: number; }


export const POSReportsPage: React.FC = () => {
    const { sales, products, employees, getClientById, getProductById } = useData();

    const [dateFilter, setDateFilter] = useState<DateFilterOption>('Este Mes');
    const [customStartDate, setCustomStartDate] = useState<string>(getISODateString(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
    const [customEndDate, setCustomEndDate] = useState<string>(getISODateString(new Date()));
    const [selectedReportType, setSelectedReportType] = useState<ReportTypeOption>('Resumen de Ventas');

    // State for pagination, sorting, and filtering
    const [paymentMethodPage, setPaymentMethodPage] = useState(1);
    const [paymentMethodSort, setPaymentMethodSort] = useState<SortConfig<PaymentMethodReportItem>>({ key: 'totalAmount', direction: 'descending' });
    const [paymentMethodFilter, setPaymentMethodFilter] = useState('');
    const [clientReportPage, setClientReportPage] = useState(1);
    const [clientReportSort, setClientReportSort] = useState<SortConfig<ClientReportItem>>({ key: 'totalSpent', direction: 'descending' });
    const [clientReportFilter, setClientReportFilter] = useState('');
    const [productReportPage, setProductReportPage] = useState(1);
    const [productReportSort, setProductReportSort] = useState<SortConfig<ProductReportItem>>({ key: 'revenueGenerated', direction: 'descending' });
    const [productReportFilter, setProductReportFilter] = useState('');
    const [hourlyReportPage, setHourlyReportPage] = useState(1);
    const [hourlyReportSort, setHourlyReportSort] = useState<SortConfig<HourlyReportItem>>({ key: 'hour', direction: 'ascending' });
    const [categoryReportPage, setCategoryReportPage] = useState(1);
    const [categoryReportSort, setCategoryReportSort] = useState<SortConfig<CategoryReportItem>>({ key: 'revenueGenerated', direction: 'descending' });
    const [categoryReportFilter, setCategoryReportFilter] = useState('');


    const filteredSales = useMemo(() => {
        const { start, end } = getDateRange(dateFilter, dateFilter === 'Personalizado' ? new Date(customStartDate) : undefined, dateFilter === 'Personalizado' ? new Date(customEndDate) : undefined);
        return sales.filter(s => new Date(s.date) >= start && new Date(s.date) <= end);
    }, [sales, dateFilter, customStartDate, customEndDate]);
    
    const totalRevenue = useMemo(() => filteredSales.reduce((sum, sale) => sum + sale.totalAmount, 0), [filteredSales]);
    const totalTransactions = useMemo(() => filteredSales.length, [filteredSales]);
    const averageTransactionValue = useMemo(() => totalTransactions > 0 ? totalRevenue / totalTransactions : 0, [totalRevenue, totalTransactions]);
    
    // Data processing with explicit return types in map functions
    const paymentMethodData = useMemo(() => {
        const breakdown: { [method: string]: { transactionCount: number, totalAmount: number } } = {};
        filteredSales.forEach(sale => {
            const method = sale.paymentMethod || 'Desconocido';
            if (!breakdown[method]) breakdown[method] = { transactionCount: 0, totalAmount: 0 };
            breakdown[method].transactionCount++;
            breakdown[method].totalAmount += sale.totalAmount;
        });
        let data: PaymentMethodReportItem[] = Object.entries(breakdown).map(([method, data]): PaymentMethodReportItem => ({ id: method, method, ...data }));
        if (paymentMethodSort.key) data.sort((a, b) => (a[paymentMethodSort.key!] < b[paymentMethodSort.key!] ? -1 : 1) * (paymentMethodSort.direction === 'ascending' ? 1 : -1));
        return data;
    }, [filteredSales, paymentMethodSort]);

    const clientData = useMemo(() => {
        const clientSales: { [clientId: string]: { clientName: string, salesCount: number, totalSpent: number } } = {};
        filteredSales.forEach(sale => {
            const clientId = sale.clientId || 'N/A';
            if (!clientSales[clientId]) {
                const clientInfo = sale.clientId ? getClientById(sale.clientId) : null;
                clientSales[clientId] = { clientName: clientInfo ? `${clientInfo.name} ${clientInfo.lastName}` : 'Cliente Contado', salesCount: 0, totalSpent: 0 };
            }
            clientSales[clientId].salesCount++;
            clientSales[clientId].totalSpent += sale.totalAmount;
        });
        let data: ClientReportItem[] = Object.entries(clientSales).map(([clientId, data]): ClientReportItem => ({ id: clientId, clientId, ...data, averageTicket: data.totalSpent / data.salesCount }));
        if (clientReportSort.key) data.sort((a, b) => (a[clientReportSort.key!] < b[clientReportSort.key!] ? -1 : 1) * (clientReportSort.direction === 'ascending' ? 1 : -1));
        return data;
    }, [filteredSales, getClientById, clientReportSort]);

    const productData = useMemo(() => {
        const productStats: { [productId: string]: { name: string, category?: string, quantitySold: number, revenueGenerated: number } } = {};
        filteredSales.forEach(sale => sale.items.forEach(item => {
            const productInfo = getProductById(item.id);
            if(productInfo){
                if (!productStats[item.id]) productStats[item.id] = { name: productInfo.name, category: productInfo.category, quantitySold: 0, revenueGenerated: 0 };
                productStats[item.id].quantitySold += item.quantity;
                productStats[item.id].revenueGenerated += item.quantity * item.unitPrice;
            }
        }));
        let data: ProductReportItem[] = Object.entries(productStats).map(([productId, data]): ProductReportItem => ({ id: productId, productId, ...data, percentageOfTotalRevenue: totalRevenue > 0 ? (data.revenueGenerated / totalRevenue) * 100 : 0 }));
        if (productReportSort.key) data.sort((a, b) => (a[productReportSort.key!] < b[productReportSort.key!] ? -1 : 1) * (productReportSort.direction === 'ascending' ? 1 : -1));
        return data;
    }, [filteredSales, getProductById, totalRevenue, productReportSort]);

     const hourlyData = useMemo(() => {
        const hourlySales: { [hour: number]: { transactionCount: number, totalSales: number } } = {};
        for (let i = 0; i < 24; i++) hourlySales[i] = { transactionCount: 0, totalSales: 0 };
        filteredSales.forEach(sale => {
            const hour = new Date(sale.date).getHours();
            hourlySales[hour].transactionCount++;
            hourlySales[hour].totalSales += sale.totalAmount;
        });
        let data: HourlyReportItem[] = Object.entries(hourlySales).map(([hour, data]): HourlyReportItem => ({ id: hour, hour: parseInt(hour), ...data }));
        if (hourlyReportSort.key) data.sort((a, b) => (a[hourlyReportSort.key!] < b[hourlyReportSort.key!] ? -1 : 1) * (hourlyReportSort.direction === 'ascending' ? 1 : -1));
        return data;
    }, [filteredSales, hourlyReportSort]);

    const categoryData = useMemo(() => {
        const categoryStats: { [categoryName: string]: { productsSold: number, revenueGenerated: number } } = {};
        filteredSales.forEach(sale => sale.items.forEach(item => {
            const productInfo = getProductById(item.id);
            if (productInfo?.category) {
                if (!categoryStats[productInfo.category]) categoryStats[productInfo.category] = { productsSold: 0, revenueGenerated: 0 };
                categoryStats[productInfo.category].productsSold += item.quantity;
                categoryStats[productInfo.category].revenueGenerated += (item.unitPrice * item.quantity);
            }
        }));
        let data: CategoryReportItem[] = Object.entries(categoryStats).map(([name, data]): CategoryReportItem => ({ id: name, name, ...data }));
        if (categoryReportSort.key) data.sort((a, b) => (a[categoryReportSort.key!] < b[categoryReportSort.key!] ? -1 : 1) * (categoryReportSort.direction === 'ascending' ? 1 : -1));
        return data;
    }, [filteredSales, getProductById, categoryReportSort]);

    // Pagination and Column definitions would go here...
    const StatCard: React.FC<{ title: string; value: string; icon?: React.ReactNode }> = ({ title, value, icon }) => (
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg shadow-lg">
            {icon && <div className="text-primary text-2xl mb-2">{icon}</div>}
            <h3 className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{title}</h3>
            <p className="text-xl font-semibold text-neutral-800 dark:text-neutral-100 mt-1">{value}</p>
        </div>
    );
    
    return (
        <div className="p-4 md:p-6 space-y-4">
            <h1 className="text-2xl font-semibold">Reportes de Punto de Venta</h1>
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <StatCard title="Ventas Netas" value={`$${totalRevenue.toFixed(2)}`} icon={<ChartBarIcon />} />
                <StatCard title="Transacciones" value={totalTransactions.toString()} />
                <StatCard title="Ticket Promedio" value={`$${averageTransactionValue.toFixed(2)}`} />
            </div>
             <p>Más reportes detallados estarán disponibles aquí.</p>
        </div>
    );
};