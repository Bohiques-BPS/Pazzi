import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES, INPUT_SM_CLASSES } from '../../constants';
import { useData } from '../../contexts/DataContext';
import { usePermissions } from '../../hooks/usePermissions';
import { supplierReturnsService, SR_STATUS_CLS, SR_STATUS_LABEL, type SupplierReturn, type SupplierReturnStatus } from '../../services/supplierReturns';
import { SupplierReturnModal } from '../../components/pos/SupplierReturnModal';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';

/**
 * Devoluciones a proveedor: hojas de mercancía dañada para pedir crédito. Muestra cuánto falta por
 * cobrar en créditos, lo ya acreditado y el estado de cada hoja. Solo constancia (no toca inventario).
 */

const money = (n: number) => `$${(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
type Filter = 'open' | 'all' | SupplierReturnStatus;
const FILTERS: { key: Filter; label: string }[] = [
    { key: 'open', label: 'Pendientes de crédito' },
    { key: 'pending', label: 'Por enviar' },
    { key: 'sent', label: 'Enviadas' },
    { key: 'credited', label: 'Crédito recibido' },
    { key: 'partial', label: 'Crédito parcial' },
    { key: 'rejected', label: 'Rechazadas' },
    { key: 'all', label: 'Todas' },
];

export const SupplierReturnsPage: React.FC = () => {
    const { suppliers } = useData();
    const { can } = usePermissions();
    const canManage = can('supplierOrders.manage') || can('suppliers.manage');
    const [params, setParams] = useSearchParams();
    const [rows, setRows] = useState<SupplierReturn[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<Filter>('open');
    const [supplierId, setSupplierId] = useState('');
    const [q, setQ] = useState('');
    const target = params.get('id');

    const load = useCallback(async () => {
        setLoading(true);
        try { setRows(await supplierReturnsService.list()); }
        catch (err) { toast.error(err instanceof ApiError ? err.message : 'No se pudieron cargar las devoluciones.'); }
        finally { setLoading(false); }
    }, []);
    useEffect(() => { load(); }, [load]);

    const open = (id: string | null) => { if (id) params.set('id', id); else params.delete('id'); setParams(params, { replace: true }); };
    const upsert = (r: SupplierReturn) => setRows(prev => prev.some(x => x.id === r.id) ? prev.map(x => x.id === r.id ? r : x) : [r, ...prev]);

    const isOpen = (r: SupplierReturn) => r.status === 'pending' || r.status === 'sent';
    const shown = useMemo(() => {
        const s = q.trim().toLowerCase();
        return rows
            .filter(r => filter === 'all' ? true : filter === 'open' ? isOpen(r) : r.status === filter)
            .filter(r => !supplierId || r.supplierId === supplierId)
            .filter(r => !s || [`#${r.number}`, r.supplierName, r.supplierInvoiceNumber, r.authorizationNumber, ...r.items.map(i => i.name)].some(v => String(v || '').toLowerCase().includes(s)));
    }, [rows, filter, supplierId, q]);

    const kpi = useMemo(() => ({
        pendingAmount: rows.filter(isOpen).reduce((a, r) => a + r.totalCost, 0),
        pendingCount: rows.filter(isOpen).length,
        credited: rows.reduce((a, r) => a + (r.creditAmount || 0), 0),
        toSend: rows.filter(r => r.status === 'pending').length,
    }), [rows]);
    const counts = useMemo(() => {
        const c: Record<string, number> = { all: rows.length, open: kpi.pendingCount };
        for (const r of rows) c[r.status] = (c[r.status] || 0) + 1;
        return c;
    }, [rows, kpi.pendingCount]);

    return (
        <div>
            <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
                <h1 className="text-2xl font-semibold text-neutral-700 dark:text-neutral-200">Devoluciones a proveedor</h1>
                {canManage && <button type="button" onClick={() => open('new')} className={BUTTON_PRIMARY_SM_CLASSES}>+ Nueva hoja de devolución</button>}
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                Constancia de la mercancía dañada o defectuosa que se le devuelve a cada proveedor para pedir crédito. No cambia el inventario ni las cuentas por pagar.
            </p>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                <Kpi title="Por cobrar en créditos" value={money(kpi.pendingAmount)} sub={`${kpi.pendingCount} hoja${kpi.pendingCount === 1 ? '' : 's'} abierta${kpi.pendingCount === 1 ? '' : 's'}`} tone="amber" />
                <Kpi title="Por enviar al proveedor" value={String(kpi.toSend)} sub="Hojas sin enviar" />
                <Kpi title="Créditos recibidos" value={money(kpi.credited)} tone="green" />
                <Kpi title="Hojas en total" value={String(rows.length)} />
            </div>

            <div className="flex flex-wrap gap-1.5 mb-3">
                {FILTERS.map(f => (
                    <button key={f.key} type="button" onClick={() => setFilter(f.key)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${filter === f.key ? 'bg-primary text-white border-primary' : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700'}`}>
                        {f.label}<span className={`ml-1.5 text-xs px-1.5 rounded-full ${filter === f.key ? 'bg-white/25' : 'bg-neutral-100 dark:bg-neutral-700'}`}>{counts[f.key] || 0}</span>
                    </button>
                ))}
            </div>

            <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-3 mb-3 flex flex-wrap items-center gap-2">
                <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por #, proveedor, factura, autorización o artículo…" className={`${INPUT_SM_CLASSES} flex-1 min-w-[220px]`} />
                <select value={supplierId} onChange={e => setSupplierId(e.target.value)} className={INPUT_SM_CLASSES}>
                    <option value="">Todos los proveedores</option>
                    {[...suppliers].sort((a, b) => a.name.localeCompare(b.name)).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <button type="button" onClick={load} className={BUTTON_SECONDARY_SM_CLASSES}>Actualizar</button>
            </div>

            {loading && !rows.length ? <LoadingSkeleton variant="table" rows={6} /> : shown.length === 0 ? (
                <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-6">
                    <EmptyState title="No hay hojas de devolución aquí" description={canManage ? 'Cree una hoja cuando le devuelvan mercancía dañada para pedirle crédito al proveedor.' : 'Todavía no hay hojas de devolución.'} />
                </div>
            ) : (
                <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-neutral-50 dark:bg-neutral-900/40 text-neutral-500 dark:text-neutral-400">
                            <tr>
                                <th className="px-3 py-2 text-left font-medium">#</th>
                                <th className="px-3 py-2 text-left font-medium">Fecha</th>
                                <th className="px-3 py-2 text-left font-medium">Proveedor</th>
                                <th className="px-3 py-2 text-left font-medium">Artículos</th>
                                <th className="px-3 py-2 text-right font-medium">A reclamar</th>
                                <th className="px-3 py-2 text-right font-medium">Crédito</th>
                                <th className="px-3 py-2 text-left font-medium">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700/60 text-neutral-700 dark:text-neutral-200">
                            {shown.map(r => {
                                const units = r.items.reduce((a, i) => a + i.quantity, 0);
                                return (
                                    <tr key={r.id} onClick={() => open(r.id)} className="cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-700/30">
                                        <td className="px-3 py-2 font-mono text-xs">#{r.number}</td>
                                        <td className="px-3 py-2 whitespace-nowrap">{new Date(r.createdAt).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                                        <td className="px-3 py-2">
                                            <div className="font-medium">{r.supplierName}</div>
                                            {(r.supplierInvoiceNumber || r.authorizationNumber) && <div className="text-xs text-neutral-500">{[r.supplierInvoiceNumber && `Fact. ${r.supplierInvoiceNumber}`, r.authorizationNumber && `Aut. ${r.authorizationNumber}`].filter(Boolean).join(' · ')}</div>}
                                        </td>
                                        <td className="px-3 py-2 text-xs max-w-[280px]">{r.items.slice(0, 2).map(i => `${i.name} ×${i.quantity}`).join(', ')}{r.items.length > 2 ? ` y ${r.items.length - 2} más` : ''}<div className="text-neutral-400">{units} unidad{units === 1 ? '' : 'es'}</div></td>
                                        <td className="px-3 py-2 text-right tabular-nums font-semibold">{money(r.totalCost)}</td>
                                        <td className="px-3 py-2 text-right tabular-nums">{r.creditAmount != null ? <span className="text-emerald-700 dark:text-emerald-400 font-semibold">{money(r.creditAmount)}</span> : <span className="text-neutral-400">—</span>}</td>
                                        <td className="px-3 py-2"><span className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${SR_STATUS_CLS[r.status]}`}>{SR_STATUS_LABEL[r.status]}</span></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            <SupplierReturnModal
                target={target}
                onClose={() => open(null)}
                onSaved={r => { upsert(r); if (target === 'new') open(r.id); }}
                onDeleted={id => setRows(prev => prev.filter(x => x.id !== id))}
            />
        </div>
    );
};

const Kpi: React.FC<{ title: string; value: string; sub?: string; tone?: 'green' | 'amber' }> = ({ title, value, sub, tone }) => (
    <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{title}</p>
        <div className={`text-2xl font-bold mt-1 tabular-nums ${tone === 'green' ? 'text-emerald-600 dark:text-emerald-400' : tone === 'amber' ? 'text-amber-600 dark:text-amber-400' : 'text-neutral-800 dark:text-neutral-100'}`}>{value}</div>
        {sub && <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{sub}</p>}
    </div>
);

export default SupplierReturnsPage;
