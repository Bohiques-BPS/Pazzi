import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Product } from '../../types';
import { useData } from '../../contexts/DataContext';
import { DataTable, TableColumn } from '../../components/DataTable';
import { BranchStockAdjustmentModal } from '../../components/forms/BranchStockAdjustmentModal';
import { TransferStockModal } from '../../components/forms/TransferStockModal';
import { InventoryHistoryModal } from '../../components/ui/InventoryHistoryModal';
import { ListBulletIcon, Cog6ToothIcon, EyeIcon } from '../../components/icons';
import { INPUT_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import { useTranslation } from '../../contexts/GlobalSettingsContext';
import {
    inventoryService,
    type InventoryLog,
    type InventoryLogType,
    type CurrentStockItem,
    type CurrentStockSummary,
} from '../../services/inventory';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { PermissionGate } from '../../components/PermissionGate';

type Tab = 'stock' | 'logs';

const LOG_TYPE_LABELS: Record<InventoryLogType, string> = {
    SALE_POS: 'Venta POS',
    RETURN: 'Devolución',
    SUPPLIER_RECEPTION: 'Recepción proveedor',
    ADJUSTMENT_MANUAL: 'Ajuste manual',
    TRANSFER_OUT: 'Transferencia (salida)',
    TRANSFER_IN: 'Transferencia (entrada)',
    INITIAL_STOCK: 'Stock inicial',
};

export const POSInventoryPage: React.FC = () => {
    const { t } = useTranslation();
    const { branches, categories } = useData();

    const [tab, setTab] = useState<Tab>('stock');

    // Stock actual
    const [stockItems, setStockItems] = useState<CurrentStockItem[]>([]);
    const [stockSummary, setStockSummary] = useState<CurrentStockSummary | null>(null);
    const [stockLoading, setStockLoading] = useState(false);

    // Logs
    const [logs, setLogs] = useState<InventoryLog[]>([]);
    const [logsTotal, setLogsTotal] = useState(0);
    const [logsLoading, setLogsLoading] = useState(false);

    // Filtros
    const [searchTerm, setSearchTerm] = useState('');
    const [filterBranchId, setFilterBranchId] = useState('');
    const [filterCategoryId, setFilterCategoryId] = useState('');
    const [filterLogType, setFilterLogType] = useState<InventoryLogType | ''>('');
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');
    const [lowStockThreshold, setLowStockThreshold] = useState('5');

    // Modales
    const [productForAdjust, setProductForAdjust] = useState<Product | null>(null);
    const [productForTransfer, setProductForTransfer] = useState<Product | null>(null);
    const [productForHistory, setProductForHistory] = useState<Product | null>(null);

    // ─── Carga de stock actual ──────────────────────────────
    const loadStock = useCallback(async () => {
        setStockLoading(true);
        try {
            const threshold = parseInt(lowStockThreshold, 10);
            const res = await inventoryService.getCurrentStock({
                branchId: filterBranchId || undefined,
                lowStockThreshold: !isNaN(threshold) ? threshold : undefined,
            });
            setStockItems(res.items);
            setStockSummary(res.summary);
        } catch (err) {
            if (err instanceof ApiError) toast.error(err.message);
        } finally {
            setStockLoading(false);
        }
    }, [filterBranchId, lowStockThreshold]);

    useEffect(() => {
        if (tab === 'stock') loadStock();
    }, [tab, loadStock]);

    // ─── Carga de logs ──────────────────────────────────────
    const loadLogs = useCallback(async () => {
        setLogsLoading(true);
        try {
            const res = await inventoryService.getLogs({
                branchId: filterBranchId || undefined,
                type: filterLogType || undefined,
                startDate: filterStartDate || undefined,
                endDate: filterEndDate || undefined,
                limit: 500,
            });
            setLogs(res.items);
            setLogsTotal(res.total);
        } catch (err) {
            if (err instanceof ApiError) toast.error(err.message);
        } finally {
            setLogsLoading(false);
        }
    }, [filterBranchId, filterLogType, filterStartDate, filterEndDate]);

    useEffect(() => {
        if (tab === 'logs') loadLogs();
    }, [tab, loadLogs]);

    // ─── Búsqueda local ──────────────────────────────────────
    const filteredStock = useMemo(() => {
        const term = searchTerm.toLowerCase().trim();
        return stockItems.filter(item => {
            if (filterCategoryId && item.category?.id !== filterCategoryId) return false;
            if (!term) return true;
            return item.name.toLowerCase().includes(term);
        });
    }, [stockItems, searchTerm, filterCategoryId]);

    const filteredLogs = useMemo(() => {
        const term = searchTerm.toLowerCase().trim();
        if (!term) return logs;
        return logs.filter(log =>
            log.product?.name?.toLowerCase().includes(term) ||
            log.branch?.name?.toLowerCase().includes(term) ||
            log.notes?.toLowerCase().includes(term)
        );
    }, [logs, searchTerm]);

    const findProductInStock = (id: string): Product | null => {
        const item = stockItems.find(i => i.id === id);
        if (!item) return null;
        return {
            id: item.id,
            name: item.name,
            unitPrice: item.unitPrice,
            stockByBranch: item.stockByBranch.map(sb => ({ branchId: sb.branchId, quantity: sb.quantity })),
        } as Product;
    };

    // ─── Columnas ────────────────────────────────────────────
    const stockColumns: TableColumn<CurrentStockItem>[] = useMemo(() => [
        { header: 'Producto', accessor: 'name' },
        { header: 'Categoría', accessor: (i) => i.category?.name || '—' },
        {
            header: 'Stock total',
            accessor: (i) => (
                <span className={`font-bold ${i.isLowStock ? 'text-red-600 dark:text-red-400' : ''}`}>
                    {i.totalStock}{i.isLowStock && ' ⚠'}
                </span>
            ),
            className: 'text-center',
        },
        { header: 'Costo unit.', accessor: (i) => `$${(i.costPrice ?? 0).toFixed(2)}`, className: 'text-right' },
        { header: 'Valor inventario', accessor: (i) => `$${i.inventoryValue.toFixed(2)}`, className: 'text-right' },
    ], []);

    const logColumns: TableColumn<InventoryLog>[] = useMemo(() => [
        { header: 'Fecha', accessor: (l) => new Date(l.date).toLocaleString() },
        { header: 'Producto', accessor: (l) => l.product?.name || 'N/A' },
        { header: 'Sucursal', accessor: (l) => l.branch?.name || 'N/A' },
        {
            header: 'Tipo',
            accessor: (l) => (
                <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-700">
                    {LOG_TYPE_LABELS[l.type as InventoryLogType] || l.type}
                </span>
            ),
        },
        {
            header: 'Cambio',
            accessor: (l) => (
                <span className={l.quantityChange > 0 ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                    {l.quantityChange > 0 ? '+' : ''}{l.quantityChange}
                </span>
            ),
            className: 'text-center',
        },
        { header: 'Stock final', accessor: (l) => l.stockAfter, className: 'text-center font-semibold' },
        { header: 'Por', accessor: (l) => l.employee ? `${l.employee.name} ${l.employee.lastName || ''}`.trim() : 'Sistema' },
        { header: 'Notas', accessor: 'notes', className: 'text-xs max-w-xs truncate' },
    ], []);

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                <h1 className="text-2xl font-semibold text-neutral-700 dark:text-neutral-200">Inventario</h1>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <input
                        type="text"
                        placeholder={(t('common.search') || 'Buscar') + '...'}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`${INPUT_SM_CLASSES} flex-grow`}
                    />
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-neutral-200 dark:border-neutral-700 mb-4 -mx-4 px-4">
                <button
                    type="button"
                    onClick={() => setTab('stock')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        tab === 'stock' ? 'border-primary text-primary' : 'border-transparent text-neutral-500 hover:text-neutral-700'
                    }`}
                >
                    <ListBulletIcon className="w-4 h-4 inline mr-1" /> Stock actual
                </button>
                <button
                    type="button"
                    onClick={() => setTab('logs')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        tab === 'logs' ? 'border-primary text-primary' : 'border-transparent text-neutral-500 hover:text-neutral-700'
                    }`}
                >
                    <Cog6ToothIcon className="w-4 h-4 inline mr-1" /> Bitácora ({logsTotal})
                </button>
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap gap-2 mb-4 items-end">
                <div>
                    <label className="block text-xs text-neutral-500">Sucursal</label>
                    <select value={filterBranchId} onChange={e => setFilterBranchId(e.target.value)} className={INPUT_SM_CLASSES}>
                        <option value="">Todas</option>
                        {branches.filter(b => b.isActive).map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                    </select>
                </div>

                {tab === 'stock' && (
                    <>
                        <div>
                            <label className="block text-xs text-neutral-500">Categoría</label>
                            <select value={filterCategoryId} onChange={e => setFilterCategoryId(e.target.value)} className={INPUT_SM_CLASSES}>
                                <option value="">Todas</option>
                                {categories.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-neutral-500">Umbral stock bajo</label>
                            <input
                                type="number"
                                min="0"
                                value={lowStockThreshold}
                                onChange={e => setLowStockThreshold(e.target.value)}
                                className={INPUT_SM_CLASSES}
                            />
                        </div>
                    </>
                )}

                {tab === 'logs' && (
                    <>
                        <div>
                            <label className="block text-xs text-neutral-500">Tipo</label>
                            <select value={filterLogType} onChange={e => setFilterLogType(e.target.value as any)} className={INPUT_SM_CLASSES}>
                                <option value="">Todos</option>
                                {(Object.keys(LOG_TYPE_LABELS) as InventoryLogType[]).map(t => (
                                    <option key={t} value={t}>{LOG_TYPE_LABELS[t]}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-neutral-500">Desde</label>
                            <input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} className={INPUT_SM_CLASSES} />
                        </div>
                        <div>
                            <label className="block text-xs text-neutral-500">Hasta</label>
                            <input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} className={INPUT_SM_CLASSES} />
                        </div>
                    </>
                )}

                <button
                    type="button"
                    onClick={() => (tab === 'stock' ? loadStock() : loadLogs())}
                    className={BUTTON_SECONDARY_SM_CLASSES}
                >
                    Refrescar
                </button>
            </div>

            {/* Summary card (solo en tab stock) */}
            {tab === 'stock' && stockSummary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <SummaryCard title="Productos" value={stockSummary.totalProducts.toString()} />
                    <SummaryCard title="Unidades totales" value={stockSummary.totalUnits.toString()} />
                    <SummaryCard title="Valor inventario" value={`$${stockSummary.totalValue.toFixed(2)}`} />
                    <SummaryCard title="Stock bajo" value={stockSummary.lowStockCount.toString()} highlight={stockSummary.lowStockCount > 0} />
                </div>
            )}

            {/* Tabla */}
            {tab === 'stock' && (
                <>
                    {stockLoading && <LoadingSkeleton variant="table" rows={6} />}
                    {!stockLoading && filteredStock.length === 0 && (
                        <EmptyState title="Sin productos" description="No hay productos que coincidan con los filtros." />
                    )}
                    {!stockLoading && filteredStock.length > 0 && (
                        <DataTable<CurrentStockItem>
                            data={filteredStock}
                            columns={stockColumns}
                            actions={(item) => {
                                const product = findProductInStock(item.id);
                                return (
                                    <div className="flex gap-1">
                                        <PermissionGate require={['inventory.adjust', 'products.adjustStock']}>
                                            <button
                                                onClick={() => product && setProductForAdjust(product)}
                                                className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-300"
                                                title="Ajustar stock"
                                            >
                                                Ajustar
                                            </button>
                                        </PermissionGate>
                                        <PermissionGate require="inventory.transfer">
                                            <button
                                                onClick={() => product && setProductForTransfer(product)}
                                                className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-300"
                                                title="Transferir entre sucursales"
                                            >
                                                Transferir
                                            </button>
                                        </PermissionGate>
                                        <PermissionGate require={['inventory.viewHistory', 'inventory.view']}>
                                            <button
                                                onClick={() => product && setProductForHistory(product)}
                                                className="text-neutral-500 hover:text-neutral-700 p-1"
                                                title="Ver historial"
                                            >
                                                <EyeIcon className="w-4 h-4" />
                                            </button>
                                        </PermissionGate>
                                    </div>
                                );
                            }}
                        />
                    )}
                </>
            )}

            {tab === 'logs' && (
                <>
                    {logsLoading && <LoadingSkeleton variant="table" rows={6} />}
                    {!logsLoading && filteredLogs.length === 0 && (
                        <EmptyState title="Sin movimientos" description="No hay registros con los filtros aplicados." />
                    )}
                    {!logsLoading && filteredLogs.length > 0 && (
                        <DataTable<InventoryLog> data={filteredLogs} columns={logColumns} />
                    )}
                </>
            )}

            {/* Modales */}
            <BranchStockAdjustmentModal
                isOpen={!!productForAdjust}
                onClose={() => { setProductForAdjust(null); loadStock(); }}
                product={productForAdjust}
            />
            <TransferStockModal
                isOpen={!!productForTransfer}
                onClose={() => { setProductForTransfer(null); loadStock(); }}
                product={productForTransfer}
                defaultFromBranchId={filterBranchId || undefined}
            />
            <InventoryHistoryModal
                isOpen={!!productForHistory}
                onClose={() => setProductForHistory(null)}
                productId={productForHistory?.id || null}
            />
        </div>
    );
};

const SummaryCard: React.FC<{ title: string; value: string; highlight?: boolean }> = ({ title, value, highlight }) => (
    <div className={`p-3 rounded-md border ${highlight ? 'bg-red-50 border-red-200 dark:bg-red-900/20' : 'bg-neutral-50 border-neutral-200 dark:bg-neutral-700/50 dark:border-neutral-600'}`}>
        <div className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{title}</div>
        <div className={`text-xl font-bold ${highlight ? 'text-red-700 dark:text-red-300' : ''}`}>{value}</div>
    </div>
);
