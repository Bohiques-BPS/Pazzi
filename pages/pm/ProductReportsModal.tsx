import React, { useEffect, useMemo, useState } from 'react';
import { Modal, ConfirmationModal } from '../../components/Modal';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import { productsService, type ProductReportRow, type ProductReportType } from '../../services/products';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { DeleteIcon } from '../../components/icons';

interface ProductReportsModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** Se llama tras borrar productos, para refrescar la lista. */
    onProductsDeleted?: () => void;
}

const REPORTS: { id: ProductReportType; label: string; hint: string }[] = [
    { id: 'top-sold', label: '🔥 Más vendidos', hint: 'Los productos con mayor cantidad vendida.' },
    { id: 'least-sold', label: '🐢 Menos vendidos', hint: 'Productos que sí se vendieron, pero muy poco.' },
    { id: 'no-sales', label: '🚫 Sin ventas', hint: 'Productos que nunca se han vendido.' },
    { id: 'oldest-sale', label: '🕰️ Venta más lejana', hint: 'Productos cuya última venta fue hace más tiempo.' },
    { id: 'top-profit', label: '💰 Mayor ganancia', hint: 'Productos que más ganancia han generado (ingreso − costo).' },
    { id: 'unused', label: '🧹 Análisis: posibles sin uso', hint: 'Productos creados hace tiempo que nunca se vendieron. Selecciónalos para eliminarlos.' },
];

const money = (n: number | null | undefined) => `$${(n ?? 0).toFixed(2)}`;
const dateStr = (d: string | null) => (d ? new Date(d).toLocaleDateString() : '—');

export const ProductReportsModal: React.FC<ProductReportsModalProps> = ({ isOpen, onClose, onProductsDeleted }) => {
    const [active, setActive] = useState<ProductReportType>('top-sold');
    const [rows, setRows] = useState<ProductReportRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);
    // Umbral configurable para "posibles sin uso": productos creados hace ≥ N días sin ventas.
    const [unusedDays, setUnusedDays] = useState(90);

    const isUnused = active === 'unused';

    useEffect(() => {
        if (!isOpen) return;
        let cancelled = false;
        setLoading(true);
        setSelected(new Set());
        // Debounce corto: evita refetch en cada tecla del umbral de días y en cambios rápidos de pestaña.
        const timer = setTimeout(() => {
            productsService.getReports(active, active === 'unused' ? unusedDays : undefined)
                .then(data => { if (!cancelled) setRows(data); })
                .catch(err => { if (!cancelled && err instanceof ApiError) toast.error(err.message); })
                .finally(() => { if (!cancelled) setLoading(false); });
        }, 250);
        return () => { cancelled = true; clearTimeout(timer); };
    }, [isOpen, active, unusedDays]);

    const allSelected = rows.length > 0 && selected.size === rows.length;
    const toggleAll = () => setSelected(allSelected ? new Set() : new Set(rows.map(r => r.id)));
    const toggleOne = (id: string) => setSelected(prev => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
    });

    const handleDelete = async () => {
        setConfirmDelete(false);
        if (selected.size === 0) return;
        setDeleting(true);
        try {
            const res = await productsService.bulkDelete(Array.from(selected));
            let msg = `${res.deleted} producto(s) eliminado(s).`;
            if (res.skippedCount > 0) msg += ` ${res.skippedCount} omitido(s) (tienen ventas).`;
            toast.success(msg);
            setRows(prev => prev.filter(r => !selected.has(r.id) || res.skipped.some(s => s.id === r.id)));
            setSelected(new Set());
            onProductsDeleted?.();
        } catch (err) {
            toast.error(err instanceof ApiError ? err.message : 'Error al eliminar.');
        } finally {
            setDeleting(false);
        }
    };

    const currentHint = useMemo(() => REPORTS.find(r => r.id === active)?.hint, [active]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Reportes de productos" size="6xl">
            {/* Pestañas */}
            <div className="flex gap-1 flex-wrap border-b border-neutral-200 dark:border-neutral-700 mb-3 pb-2">
                {REPORTS.map(r => (
                    <button
                        key={r.id}
                        type="button"
                        onClick={() => setActive(r.id)}
                        className={`px-3 py-1.5 text-sm rounded-md whitespace-nowrap ${active === r.id ? 'bg-primary text-white' : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}
                    >
                        {r.label}
                    </button>
                ))}
            </div>

            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">{currentHint}</p>

            {/* Barra de acción para el análisis (borrar) */}
            {isUnused && (
                <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                    <div className="flex items-center gap-3 flex-wrap">
                        <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-4 w-4" />
                            Seleccionar todos ({selected.size} de {rows.length})
                        </label>
                        <label className="flex items-center gap-1.5 text-sm text-neutral-600 dark:text-neutral-300">
                            Sin venta y creados hace ≥
                            <input
                                type="number"
                                min={1}
                                value={unusedDays}
                                onChange={e => setUnusedDays(Math.max(1, Number(e.target.value) || 1))}
                                className="w-16 px-2 py-1 text-sm border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700"
                            />
                            días
                        </label>
                    </div>
                    <button
                        type="button"
                        onClick={() => setConfirmDelete(true)}
                        disabled={selected.size === 0 || deleting}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                    >
                        <DeleteIcon className="w-4 h-4" /> {deleting ? 'Eliminando…' : `Eliminar seleccionados (${selected.size})`}
                    </button>
                </div>
            )}

            {loading ? (
                <LoadingSkeleton variant="table" rows={6} />
            ) : rows.length === 0 ? (
                <p className="text-center text-neutral-500 py-8">No hay datos para este reporte.</p>
            ) : (
                <div className="max-h-[55vh] overflow-y-auto border rounded-md dark:border-neutral-700">
                    <table className="min-w-full text-sm">
                        <thead className="bg-neutral-100 dark:bg-neutral-700/50 sticky top-0">
                            <tr>
                                {isUnused && <th className="p-2 w-10"></th>}
                                <th className="text-left p-2">Producto</th>
                                <th className="text-right p-2">Vendidos</th>
                                <th className="text-right p-2">Ingresos</th>
                                <th className="text-right p-2">Ganancia</th>
                                <th className="text-left p-2">Última venta</th>
                                <th className="text-left p-2">Creado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                            {rows.map(r => (
                                <tr key={r.id} className={`hover:bg-neutral-50 dark:hover:bg-neutral-700/30 ${selected.has(r.id) ? 'bg-primary/5' : ''}`}>
                                    {isUnused && (
                                        <td className="p-2 text-center">
                                            <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleOne(r.id)} className="h-4 w-4" />
                                        </td>
                                    )}
                                    <td className="p-2 font-medium">
                                        {r.name}
                                        {!r.isActive && <span className="ml-2 text-[10px] px-1 rounded bg-neutral-200 dark:bg-neutral-600 text-neutral-600 dark:text-neutral-300">Inactivo</span>}
                                    </td>
                                    <td className="p-2 text-right">{r.qtySold}</td>
                                    <td className="p-2 text-right">{money(r.revenue)}</td>
                                    <td className={`p-2 text-right ${r.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{money(r.profit)}</td>
                                    <td className="p-2">{dateStr(r.lastSale)}</td>
                                    <td className="p-2">{dateStr(r.createdAt)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="flex justify-end pt-3">
                <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>Cerrar</button>
            </div>

            <ConfirmationModal
                isOpen={confirmDelete}
                onClose={() => setConfirmDelete(false)}
                onConfirm={handleDelete}
                title="Eliminar productos"
                message={`¿Eliminar ${selected.size} producto(s) seleccionado(s)? Esta acción no se puede deshacer. Los que tengan ventas se omitirán automáticamente.`}
                confirmButtonText="Sí, eliminar"
            />
        </Modal>
    );
};
