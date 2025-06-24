
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
interface PaymentMethodReportItem {
    id: string; // Added for DataTable
    method: string;
    transactionCount: number;
    totalAmount: number;
}
interface ClientReportItem {
    id: string; // Added for DataTable (can be clientId)
    clientId: string;
    clientName: string;
    salesCount: number;
    totalSpent: number;
    averageTicket: number;
}
interface ProductReportItem {
    id: string; // Added for DataTable (can be productId)
    productId: string;
    name: string;
    category?: string;
    quantitySold: number;
    revenueGenerated: number;
    percentageOfTotalRevenue: number;
}
interface HourlyReportItem {
    id: string; // Added for DataTable (can be hour as string)
    hour: number;
    transactionCount: number;
    totalSales: number;
}
interface CategoryReportItem {
    id: string; // Added for DataTable (can be category name)
    name: string;
    productsSold: number;
    revenueGenerated: number;
}


export const POSReportsPage: React.FC = () => {
    const { sales, products, employees, getClientById, getProductById } = useData();

    const [dateFilter, setDateFilter] = useState<DateFilterOption>('Este Mes');
    const [customStartDate, setCustomStartDate] = useState<string>(getISODateString(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
    const [customEndDate, setCustomEndDate] = useState<string>(getISODateString(new Date()));
    const [selectedReportType, setSelectedReportType] = useState<ReportTypeOption>('Resumen de Ventas');

    // State for pagination, sorting, and filtering for each report type
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
    // No specific filter for hourly yet, could be by min transactions/sales

    const [categoryReportPage, setCategoryReportPage] = useState(1);
    const [categoryReportSort, setCategoryReportSort] = useState<SortConfig<CategoryReportItem>>({ key: 'revenueGenerated', direction: 'descending' });
    const [categoryReportFilter, setCategoryReportFilter] = useState('');


    const filteredSales = useMemo(() => {
        const { start, end } = getDateRange(dateFilter, dateFilter === 'Personalizado' ? new Date(customStartDate) : undefined, dateFilter === 'Personalizado' ? new Date(customEndDate) : undefined);
        return sales.filter(s => {
            const saleDate = new Date(s.date);
            return saleDate >= start && saleDate <= end;
        });
    }, [sales, dateFilter, customStartDate, customEndDate]);
    
    const totalRevenue = useMemo(() => filteredSales.reduce((sum, sale) => sum + sale.totalAmount, 0), [filteredSales]);
    const totalTransactions = useMemo(() => filteredSales.length, [filteredSales]);
    const averageTransactionValue = useMemo(() => totalTransactions > 0 ? totalRevenue / totalTransactions : 0, [totalRevenue, totalTransactions]);
    
    // --- Data Processing for Each Report Type ---
    const paymentMethodData = useMemo(() => {
        const breakdown: { [method: string]: { transactionCount: number, totalAmount: number } } = {};
        filteredSales.forEach(sale => {
            if (!breakdown[sale.paymentMethod]) {
                breakdown[sale.paymentMethod] = { transactionCount: 0, totalAmount: 0 };
            }
            breakdown[sale.paymentMethod].transactionCount += 1;
            breakdown[sale.paymentMethod].totalAmount += sale.totalAmount;
        });
        let data = Object.entries(breakdown).map(([method, data]) => ({ id: method, method, ...data }));
        if (paymentMethodFilter) {
            data = data.filter(item => item.method.toLowerCase().includes(paymentMethodFilter.toLowerCase()));
        }
        if (paymentMethodSort.key) {
            data.sort((a, b) => {
                if (a[paymentMethodSort.key!] < b[paymentMethodSort.key!]) return paymentMethodSort.direction === 'ascending' ? -1 : 1;
                if (a[paymentMethodSort.key!] > b[paymentMethodSort.key!]) return paymentMethodSort.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return data;
    }, [filteredSales, paymentMethodFilter, paymentMethodSort]);

    const clientData = useMemo(() => {
        const clientSales: { [clientId: string]: { clientName: string, salesCount: number, totalSpent: number } } = {};
        filteredSales.forEach(sale => {
            const clientId = sale.clientId || 'N/A'; // Handle sales without a client
            if (!clientSales[clientId]) {
                const clientInfo = sale.clientId ? getClientById(sale.clientId) : null;
                clientSales[clientId] = { 
                    clientName: clientInfo ? `${clientInfo.name} ${clientInfo.lastName}` : (sale.clientId ? `ID: ${sale.clientId}`: 'Cliente Contado'),
                    salesCount: 0, 
                    totalSpent: 0 
                };
            }
            clientSales[clientId].salesCount += 1;
            clientSales[clientId].totalSpent += sale.totalAmount;
        });
        let data = Object.entries(clientSales).map(([clientId, data]) => ({ 
            id: clientId, clientId, ...data, averageTicket: data.salesCount > 0 ? data.totalSpent / data.salesCount : 0 
        }));
        if (clientReportFilter) {
            data = data.filter(item => item.clientName.toLowerCase().includes(clientReportFilter.toLowerCase()) || item.clientId.includes(clientReportFilter));
        }
        if (clientReportSort.key) {
            data.sort((a, b) => {
                if (a[clientReportSort.key!] < b[clientReportSort.key!]) return clientReportSort.direction === 'ascending' ? -1 : 1;
                if (a[clientReportSort.key!] > b[clientReportSort.key!]) return clientReportSort.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return data;
    }, [filteredSales, getClientById, clientReportFilter, clientReportSort]);

    const productData = useMemo(() => {
        const productStats: { [productId: string]: { name: string, category?: string, quantitySold: number, revenueGenerated: number } } = {};
        filteredSales.forEach(sale => {
            sale.items.forEach(item => {
                const productInfo = getProductById(item.id);
                if(productInfo){
                    if (!productStats[item.id]) {
                        productStats[item.id] = { name: productInfo.name, category: productInfo.category, quantitySold: 0, revenueGenerated: 0 };
                    }
                    productStats[item.id].quantitySold += item.quantity;
                    productStats[item.id].revenueGenerated += item.quantity * item.unitPrice;
                }
            });
        });
        let data = Object.entries(productStats).map(([productId, data]) => ({ 
            id: productId, productId, ...data, percentageOfTotalRevenue: totalRevenue > 0 ? (data.revenueGenerated / totalRevenue) * 100 : 0
        }));
        if (productReportFilter) {
            data = data.filter(item => item.name.toLowerCase().includes(productReportFilter.toLowerCase()) || (item.category && item.category.toLowerCase().includes(productReportFilter.toLowerCase())));
        }
        if (productReportSort.key) {
            data.sort((a, b) => {
                if (a[productReportSort.key!] < b[productReportSort.key!]) return productReportSort.direction === 'ascending' ? -1 : 1;
                if (a[productReportSort.key!] > b[productReportSort.key!]) return productReportSort.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return data;
    }, [filteredSales, getProductById, totalRevenue, productReportFilter, productReportSort]);

     const hourlyData = useMemo(() => {
        const hourlySales: { [hour: number]: { transactionCount: number, totalSales: number } } = {};
        for (let i = 0; i < 24; i++) hourlySales[i] = { transactionCount: 0, totalSales: 0 };
        filteredSales.forEach(sale => {
            const hour = new Date(sale.date).getHours();
            hourlySales[hour].transactionCount +=1;
            hourlySales[hour].totalSales += sale.totalAmount;
        });
        let data = Object.entries(hourlySales).map(([hour, data]) => ({ id: hour, hour: parseInt(hour), ...data }));
        // No filter for hourly yet
        if (hourlyReportSort.key) {
            data.sort((a, b) => {
                if (a[hourlyReportSort.key!] < b[hourlyReportSort.key!]) return hourlyReportSort.direction === 'ascending' ? -1 : 1;
                if (a[hourlyReportSort.key!] > b[hourlyReportSort.key!]) return hourlyReportSort.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return data;
    }, [filteredSales, hourlyReportSort]);

    const categoryData = useMemo(() => {
        const categoryStats: { [categoryName: string]: { productsSold: number, revenueGenerated: number } } = {};
        filteredSales.forEach(sale => {
            sale.items.forEach(item => {
                const productInfo = getProductById(item.id);
                if (productInfo && productInfo.category) {
                    if (!categoryStats[productInfo.category]) {
                        categoryStats[productInfo.category] = { productsSold: 0, revenueGenerated: 0 };
                    }
                    categoryStats[productInfo.category].productsSold += item.quantity;
                    categoryStats[productInfo.category].revenueGenerated += (item.unitPrice * item.quantity);
                }
            });
        });
        let data = Object.entries(categoryStats).map(([name, data]) => ({ id: name, name, ...data }));
        if (categoryReportFilter) {
            data = data.filter(item => item.name.toLowerCase().includes(categoryReportFilter.toLowerCase()));
        }
        if (categoryReportSort.key) {
            data.sort((a, b) => {
                if (a[categoryReportSort.key!] < b[categoryReportSort.key!]) return categoryReportSort.direction === 'ascending' ? -1 : 1;
                if (a[categoryReportSort.key!] > b[categoryReportSort.key!]) return categoryReportSort.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return data;
    }, [filteredSales, getProductById, categoryReportFilter, categoryReportSort]);

    // --- Pagination Logic ---
    const getPaginatedData = <T,>(data: T[], currentPage: number): T[] => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return data.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    };
    
    const paginatedPaymentMethodData = getPaginatedData(paymentMethodData, paymentMethodPage);
    const paymentMethodTotalPages = Math.ceil(paymentMethodData.length / ITEMS_PER_PAGE);

    const paginatedClientData = getPaginatedData(clientData, clientReportPage);
    const clientTotalPages = Math.ceil(clientData.length / ITEMS_PER_PAGE);

    const paginatedProductData = getPaginatedData(productData, productReportPage);
    const productTotalPages = Math.ceil(productData.length / ITEMS_PER_PAGE);

    const paginatedHourlyData = getPaginatedData(hourlyData, hourlyReportPage);
    const hourlyTotalPages = Math.ceil(hourlyData.length / ITEMS_PER_PAGE);

    const paginatedCategoryData = getPaginatedData(categoryData, categoryReportPage);
    const categoryTotalPages = Math.ceil(categoryData.length / ITEMS_PER_PAGE);


    // --- Column Definitions ---
    const createSortableHeader = <T,>(
        title: string, 
        columnKey: keyof T, 
        currentSort: SortConfig<T>, 
        setSort: React.Dispatch<React.SetStateAction<SortConfig<T>>>
    ) => (
        <button className="flex items-center space-x-1" onClick={() => setSort(prev => ({ key: columnKey, direction: prev.key === columnKey && prev.direction === 'ascending' ? 'descending' : 'ascending' }))}>
            <span>{title}</span>
            {currentSort.key === columnKey && (currentSort.direction === 'ascending' ? <ArrowUpIcon /> : <ArrowDownIcon />)}
        </button>
    );

    const paymentMethodColumns: TableColumn<PaymentMethodReportItem>[] = [
        { header: createSortableHeader('Método de Pago', 'method', paymentMethodSort, setPaymentMethodSort), accessor: 'method' },
        { header: createSortableHeader('# Transacciones', 'transactionCount', paymentMethodSort, setPaymentMethodSort), accessor: 'transactionCount', className: 'text-right' },
        { header: createSortableHeader('Monto Total', 'totalAmount', paymentMethodSort, setPaymentMethodSort), accessor: item => `$${item.totalAmount.toFixed(2)}`, className: 'text-right' },
    ];
    const clientColumns: TableColumn<ClientReportItem>[] = [
        { header: createSortableHeader('Cliente', 'clientName', clientReportSort, setClientReportSort), accessor: 'clientName' },
        { header: createSortableHeader('# Ventas', 'salesCount', clientReportSort, setClientReportSort), accessor: 'salesCount', className: 'text-right' },
        { header: createSortableHeader('Total Gastado', 'totalSpent', clientReportSort, setClientReportSort), accessor: item => `$${item.totalSpent.toFixed(2)}`, className: 'text-right' },
        { header: createSortableHeader('Ticket Promedio', 'averageTicket', clientReportSort, setClientReportSort), accessor: item => `$${item.averageTicket.toFixed(2)}`, className: 'text-right' },
    ];
    const productColumns: TableColumn<ProductReportItem>[] = [
        { header: createSortableHeader('Producto', 'name', productReportSort, setProductReportSort), accessor: 'name' },
        { header: createSortableHeader('Categoría', 'category', productReportSort, setProductReportSort), accessor: 'category' },
        { header: createSortableHeader('Cant. Vendida', 'quantitySold', productReportSort, setProductReportSort), accessor: 'quantitySold', className: 'text-right' },
        { header: createSortableHeader('Ingresos', 'revenueGenerated', productReportSort, setProductReportSort), accessor: item => `$${item.revenueGenerated.toFixed(2)}`, className: 'text-right' },
        { header: createSortableHeader('% Ing. Total', 'percentageOfTotalRevenue', productReportSort, setProductReportSort), accessor: item => `${item.percentageOfTotalRevenue.toFixed(2)}%`, className: 'text-right' },
    ];
    const hourlyColumns: TableColumn<HourlyReportItem>[] = [
        { header: createSortableHeader('Hora', 'hour', hourlyReportSort, setHourlyReportSort), accessor: item => `${item.hour.toString().padStart(2, '0')}:00` },
        { header: createSortableHeader('# Transacciones', 'transactionCount', hourlyReportSort, setHourlyReportSort), accessor: 'transactionCount', className: 'text-right' },
        { header: createSortableHeader('Ventas Totales', 'totalSales', hourlyReportSort, setHourlyReportSort), accessor: item => `$${item.totalSales.toFixed(2)}`, className: 'text-right' },
    ];
    const categoryColumns: TableColumn<CategoryReportItem>[] = [
        { header: createSortableHeader('Categoría', 'name', categoryReportSort, setCategoryReportSort), accessor: 'name' },
        { header: createSortableHeader('Prods. Vendidos', 'productsSold', categoryReportSort, setCategoryReportSort), accessor: 'productsSold', className: 'text-right' },
        { header: createSortableHeader('Ingresos', 'revenueGenerated', categoryReportSort, setCategoryReportSort), accessor: item => `$${item.revenueGenerated.toFixed(2)}`, className: 'text-right' },
    ];

    const [isClientReportModalOpen, setIsClientReportModalOpen] = useState(false);
    const [selectedClientIdForReport, setSelectedClientIdForReport] = useState<string | null>(null);

    const openClientReportModal = (clientId: string) => {
        setSelectedClientIdForReport(clientId);
        setIsClientReportModalOpen(true);
    };

    const StatCard: React.FC<{ title: string; value: string; icon?: React.ReactNode }> = ({ title, value, icon }) => (
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg shadow-lg">
            {icon && <div className="text-primary text-2xl mb-2">{icon}</div>}
            <h3 className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{title}</h3>
            <p className="text-xl font-semibold text-neutral-800 dark:text-neutral-100 mt-1">{value}</p>
        </div>
    );
    
    const reportTypes: ReportTypeOption[] = ["Resumen de Ventas", "Ventas por Método de Pago", "Ventas por Cliente", "Ventas por Producto", "Ventas por Hora", "Categorías Populares"];
    const dateFilterOptions: DateFilterOption[] = ["Hoy", "Ayer", "Este Mes", "Mes Anterior", "Personalizado"];

    const renderReportTable = () => {
        switch(selectedReportType) {
            case "Ventas por Método de Pago":
                return (
                    <div>
                        <input type="text" placeholder="Filtrar método..." value={paymentMethodFilter} onChange={e => setPaymentMethodFilter(e.target.value)} className={`${INPUT_SM_CLASSES} mb-2 w-full sm:w-1/3`} />
                        <DataTable data={paginatedPaymentMethodData} columns={paymentMethodColumns} />
                        <PaginationControls currentPage={paymentMethodPage} totalPages={paymentMethodTotalPages} onPageChange={setPaymentMethodPage} />
                    </div>
                );
            case "Ventas por Cliente":
                return (
                    <div>
                        <input type="text" placeholder="Filtrar cliente..." value={clientReportFilter} onChange={e => setClientReportFilter(e.target.value)} className={`${INPUT_SM_CLASSES} mb-2 w-full sm:w-1/3`} />
                        <DataTable 
                            data={paginatedClientData} 
                            columns={clientColumns} 
                            onRowClick={(item) => item.id !== 'N/A' && openClientReportModal(item.id)}
                        />
                        <PaginationControls currentPage={clientReportPage} totalPages={clientTotalPages} onPageChange={setClientReportPage} />
                    </div>
                );
            case "Ventas por Producto":
                 return (
                    <div>
                        <input type="text" placeholder="Filtrar producto/categoría..." value={productReportFilter} onChange={e => setProductReportFilter(e.target.value)} className={`${INPUT_SM_CLASSES} mb-2 w-full sm:w-1/3`} />
                        <DataTable data={paginatedProductData} columns={productColumns} />
                        <PaginationControls currentPage={productReportPage} totalPages={productTotalPages} onPageChange={setProductReportPage} />
                    </div>
                );
            case "Ventas por Hora":
                 return (
                    <div>
                        {/* No filter for hourly yet */}
                        <DataTable data={paginatedHourlyData} columns={hourlyColumns} />
                        <PaginationControls currentPage={hourlyReportPage} totalPages={hourlyTotalPages} onPageChange={setHourlyReportPage} />
                    </div>
                );
            case "Categorías Populares":
                 return (
                    <div>
                        <input type="text" placeholder="Filtrar categoría..." value={categoryReportFilter} onChange={e => setCategoryReportFilter(e.target.value)} className={`${INPUT_SM_CLASSES} mb-2 w-full sm:w-1/3`} />
                        <DataTable data={paginatedCategoryData} columns={categoryColumns} />
                        <PaginationControls currentPage={categoryReportPage} totalPages={categoryTotalPages} onPageChange={setCategoryReportPage} />
                    </div>
                );
            default: return null;
        }
    }

    return (
        <div className="p-4 md:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-2">
                <h1 className="text-xl sm:text-2xl font-semibold text-neutral-700 dark:text-neutral-200">Reportes de Punto de Venta</h1>
                 <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <select value={dateFilter} onChange={e => setDateFilter(e.target.value as DateFilterOption)} className={`${INPUT_SM_CLASSES} w-full sm:w-auto`}>
                        {dateFilterOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                    <select value={selectedReportType} onChange={e => setSelectedReportType(e.target.value as ReportTypeOption)} className={`${INPUT_SM_CLASSES} w-full sm:w-auto`}>
                        {reportTypes.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                 </div>
            </div>
            
            {dateFilter === 'Personalizado' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4 p-3 bg-neutral-100 dark:bg-neutral-800/50 rounded-md">
                    <div>
                        <label htmlFor="customStartDate" className="block text-xs font-medium text-neutral-600 dark:text-neutral-300">Fecha Inicio:</label>
                        <input type="date" id="customStartDate" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} className={INPUT_SM_CLASSES + " w-full"} />
                    </div>
                    <div>
                        <label htmlFor="customEndDate" className="block text-xs font-medium text-neutral-600 dark:text-neutral-300">Fecha Fin:</label>
                        <input type="date" id="customEndDate" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} className={INPUT_SM_CLASSES + " w-full"} />
                    </div>
                </div>
            )}

            {selectedReportType === "Resumen de Ventas" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    <StatCard title="Ventas Netas" value={`$${totalRevenue.toFixed(2)}`} icon={<ChartBarIcon />} />
                    <StatCard title="Transacciones" value={totalTransactions.toString()} />
                    <StatCard title="Ticket Promedio" value={`$${averageTransactionValue.toFixed(2)}`} />
                </div>
            )}

            {selectedReportType !== "Resumen de Ventas" && renderReportTable()}
            
            {selectedClientIdForReport && (
                <ClientPOSReportModal
                    isOpen={isClientReportModalOpen}
                    onClose={() => setIsClientReportModalOpen(false)}
                    clientId={selectedClientIdForReport}
                    monthSales={filteredSales.filter(s => s.clientId === selectedClientIdForReport)}
                />
            )}
        </div>
    );
};