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
        { header: t('posx.inventory.colProduct'), accessor: 'name' },
        { header: t('posx.inventory.colCategory'), accessor: (i) => i.category?.name || '—' },
        {
            header: t('posx.inventory.colTotalStock'),
            accessor: (i) => (
                <span className={`font-bold ${i.isLowStock ? 'text-red-600 dark:text-red-400' : ''}`}>
                    {i.totalStock}{i.isLowStock && ' ⚠'}
                </span>
            ),
            className: 'text-center',
        },
        { header: t('posx.inventory.colUnitCost'), accessor: (i) => `$${(i.costPrice ?? 0).toFixed(2)}`, className: 'text-right' },
        { header: t('posx.inventory.colInventoryValue'), accessor: (i) => `$${i.inventoryValue.toFixed(2)}`, className: 'text-right' },
    ], [t]);

    const logColumns: TableColumn<InventoryLog>[] = useMemo(() => [
        { header: t('posx.inventory.colDate'), accessor: (l) => new Date(l.date).toLocaleString() },
        { header: t('posx.inventory.colProduct'), accessor: (l) => l.product?.name || 'N/A' },
        { header: t('posx.inventory.colBranch'), accessor: (l) => l.branch?.name || 'N/A' },
        {
            header: t('posx.inventory.colType'),
            accessor: (l) => (
                <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-700">
                    {LOG_TYPE_LABELS[l.type as InventoryLogType] ? t('posx.inventory.logType.' + l.type) : l.type}
                </span>
            ),
        },
        {
            header: t('posx.inventory.colChange'),
            accessor: (l) => (
                <span className={l.quantityChange > 0 ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                    {l.quantityChange > 0 ? '+' : ''}{l.quantityChange}
                </span>
            ),
            className: 'text-center',
        },
        { header: t('posx.inventory.colFinalStock'), accessor: (l) => l.stockAfter, className: 'text-center font-semibold' },
        { header: t('posx.inventory.colBy'), accessor: (l) => l.employee ? `${l.employee.name} ${l.employee.lastName || ''}`.trim() : t('posx.inventory.system') },
        { header: t('posx.inventory.colNotes'), accessor: 'notes', className: 'text-xs max-w-xs truncate' },
    ], [t]);

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                <h1 className="text-2xl font-semibold text-neutral-700 dark:text-neutral-200">{t('posx.inventory.title')}</h1>
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
                    <ListBulletIcon className="w-4 h-4 inline mr-1" /> {t('posx.inventory.tabStock')}
                </button>
                <button
                    type="button"
                    onClick={() => setTab('logs')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        tab === 'logs' ? 'border-primary text-primary' : 'border-transparent text-neutral-500 hover:text-neutral-700'
                    }`}
                >
                    <Cog6ToothIcon className="w-4 h-4 inline mr-1" /> {t('posx.inventory.tabLogs', { count: logsTotal })}
                </button>
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap gap-2 mb-4 items-end">
                <div>
                    <label className="block text-xs text-neutral-500">{t('posx.inventory.branch')}</label>
                    <select value={filterBranchId} onChange={e => setFilterBranchId(e.target.value)} className={INPUT_SM_CLASSES}>
                        <option value="">{t('posx.inventory.all')}</option>
                        {branches.filter(b => b.isActive).map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                    </select>
                </div>

                {tab === 'stock' && (
                    <>
                        <div>
                            <label className="block text-xs text-neutral-500">{t('posx.inventory.category')}</label>
                            <select value={filterCategoryId} onChange={e => setFilterCategoryId(e.target.value)} className={INPUT_SM_CLASSES}>
                                <option value="">{t('posx.inventory.all')}</option>
                                {categories.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-neutral-500">{t('posx.inventory.lowStockThreshold')}</label>
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
                            <label className="block text-xs text-neutral-500">{t('posx.inventory.type')}</label>
                            <select value={filterLogType} onChange={e => setFilterLogType(e.target.value as any)} className={INPUT_SM_CLASSES}>
                                <option value="">{t('posx.inventory.allMasc')}</option>
                                {(Object.keys(LOG_TYPE_LABELS) as InventoryLogType[]).map(lt => (
                                    <option key={lt} value={lt}>{t('posx.inventory.logType.' + lt)}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-neutral-500">{t('posx.inventory.from')}</label>
                            <input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} className={INPUT_SM_CLASSES} />
                        </div>
                        <div>
                            <label className="block text-xs text-neutral-500">{t('posx.inventory.to')}</label>
                            <input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} className={INPUT_SM_CLASSES} />
                        </div>
                    </>
                )}

                <button
                    type="button"
                    onClick={() => (tab === 'stock' ? loadStock() : loadLogs())}
                    className={BUTTON_SECONDARY_SM_CLASSES}
                >
                    {t('posx.inventory.refresh')}
                </button>
            </div>

            {/* Summary card (solo en tab stock) */}
            {tab === 'stock' && stockSummary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <SummaryCard title={t('posx.inventory.products')} value={stockSummary.totalProducts.toString()} />
                    <SummaryCard title={t('posx.inventory.totalUnits')} value={stockSummary.totalUnits.toString()} />
                    <SummaryCard title={t('posx.inventory.colInventoryValue')} value={`$${stockSummary.totalValue.toFixed(2)}`} />
                    <SummaryCard title={t('posx.inventory.lowStock')} value={stockSummary.lowStockCount.toString()} highlight={stockSummary.lowStockCount > 0} />
                </div>
            )}

            {/* Tabla */}
            {tab === 'stock' && (
                <>
                    {stockLoading && <LoadingSkeleton variant="table" rows={6} />}
                    {!stockLoading && filteredStock.length === 0 && (
                        <EmptyState title={t('posx.inventory.noProductsTitle')} description={t('posx.inventory.noProductsDesc')} />
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
                                                title={t('posx.inventory.adjustStock')}
                                            >
                                                {t('posx.inventory.adjust')}
                                            </button>
                                        </PermissionGate>
                                        <PermissionGate require="inventory.transfer">
                                            <button
                                                onClick={() => product && setProductForTransfer(product)}
                                                className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-300"
                                                title={t('posx.inventory.transferBetweenBranches')}
                                            >
                                                {t('posx.inventory.transfer')}
                                            </button>
                                        </PermissionGate>
                                        <PermissionGate require={['inventory.viewHistory', 'inventory.view']}>
                                            <button
                                                onClick={() => product && setProductForHistory(product)}
                                                className="text-neutral-500 hover:text-neutral-700 p-1"
                                                title={t('posx.inventory.viewHistory')}
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
                        <EmptyState title={t('posx.inventory.noMovementsTitle')} description={t('posx.inventory.noMovementsDesc')} />
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
