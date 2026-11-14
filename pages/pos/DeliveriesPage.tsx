import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BUTTON_SECONDARY_SM_CLASSES, INPUT_SM_CLASSES } from '../../constants';
import { deliveriesService, deliveryAddress, type Delivery } from '../../services/deliveries';
import { DeliveryDetailModal, DeliveryStatusChip, fmtDeliveryDay } from '../../components/pos/DeliveryDetailModal';
import { printRouteSheet } from '../../utils/deliveryPdf';
import { usePermissions } from '../../hooks/usePermissions';
import { useGlobalSettings } from '../../contexts/GlobalSettingsContext';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';

/**
 * Control de Entregas: las ventas del POS marcadas "para entrega", organizadas por fecha.
 * Atrasadas (día programado ya pasado y sin completar) siempre visibles hasta que se entreguen.
 */

type Tab = 'open' | 'overdue' | 'today' | 'tomorrow' | 'upcoming' | 'unscheduled' | 'done' | 'cancelled';
const TABS: { key: Tab; label: string; tone?: 'red' }[] = [
    { key: 'open', label: 'Todas pendientes' },
    { key: 'overdue', label: 'Atrasadas', tone: 'red' },
    { key: 'today', label: 'Hoy' },
    { key: 'tomorrow', label: 'Mañana' },
    { key: 'upcoming', label: 'Próximas' },
    { key: 'unscheduled', label: 'Sin programar' },
    { key: 'done', label: 'Entregadas' },
    { key: 'cancelled', label: 'Canceladas' },
];

export const DeliveriesPage: React.FC = () => {
    const { can } = usePermissions();
    const { settings } = useGlobalSettings();
    const canViewAll = can('deliveries.view') || can('deliveries.manage');
    const canManage = can('deliveries.manage');
    const canDeliver = can('deliveries.deliver') || canManage;
    const [params, setParams] = useSearchParams();

    const [tab, setTab] = useState<Tab>('open');
    const [q, setQ] = useState('');
    const [debouncedQ, setDebouncedQ] = useState('');
    const [assignee, setAssignee] = useState('');
    const [mine, setMine] = useState(!canViewAll);
    const [staff, setStaff] = useState<{ id: string; name: string }[]>([]);
    const [rows, setRows] = useState<Delivery[]>([]);
    const [counts, setCounts] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [bulkBusy, setBulkBusy] = useState(false);
    const openId = params.get('id');

    useEffect(() => { const h = setTimeout(() => setDebouncedQ(q.trim()), 300); return () => clearTimeout(h); }, [q]);
    useEffect(() => { if (canViewAll) deliveriesService.staff().then(setStaff).catch(() => {}); }, [canViewAll]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await deliveriesService.list({ bucket: tab, q: debouncedQ || undefined, assignedUserId: !mine && assignee ? assignee : undefined, mine });
            setRows(res.rows); setCounts(res.counts);
            setSelected(prev => new Set([...prev].filter(id => res.rows.some(r => r.id === id))));
        } catch (err) {
            toast.error(err instanceof ApiError ? err.message : 'No se pudieron cargar las entregas.');
        } finally { setLoading(false); }
    }, [tab, debouncedQ, assignee, mine]);
    useEffect(() => { load(); }, [load]);

    const openDetail = (id: string | null) => {
        if (id) params.set('id', id); else params.delete('id');
        setParams(params, { replace: true });
    };
    const onChanged = (d: Delivery) => setRows(prev => prev.map(r => r.id === d.id ? { ...r, ...d } : r));

    const allChecked = rows.length > 0 && rows.every(r => selected.has(r.id));
    const toggle = (id: string) => setSelected(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
    const chosen = useMemo(() => rows.filter(r => selected.has(r.id)), [rows, selected]);
    const openRows = (list: Delivery[]) => list.filter(r => ['pending', 'in_route', 'partial'].includes(r.status));

    const bulk = async (fn: (d: Delivery) => Promise<Delivery>, msg: string) => {
        const list = openRows(chosen);
        if (!list.length) { toast.error('Selecciona entregas pendientes.'); return; }
        setBulkBusy(true);
        let ok = 0;
        for (const d of list) { try { await fn(d); ok++; } catch { /* sigue con las demás */ } }
        setBulkBusy(false);
        toast.success(`${msg}: ${ok} de ${list.length}.`);
        setSelected(new Set());
        load();
    };

    const routeTitle = `Hoja de ruta — ${TABS.find(t => t.key === tab)?.label || ''}`;
    const printRoute = () => {
        const list = chosen.length ? chosen : openRows(rows);
        if (!list.length) { toast.error('No hay entregas pendientes para imprimir.'); return; }
        printRouteSheet(list, routeTitle, (settings as any)?.receiptConfig?.businessName);
    };

    return (
        <div>
            <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
                <h1 className="text-2xl font-semibold text-neutral-700 dark:text-neutral-200">Control de Entregas</h1>
                <div className="flex gap-2">
                    <button type="button" onClick={printRoute} className={BUTTON_SECONDARY_SM_CLASSES}>Hoja de ruta</button>
                    <button type="button" onClick={load} className={BUTTON_SECONDARY_SM_CLASSES}>Actualizar</button>
                </div>
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                Las ventas de la caja marcadas "para entrega" aparecen aquí solas. Programa el día, asigna el repartidor y confirma lo entregado; el cliente recibe un aviso por correo en cada cambio.
            </p>

            {(counts.overdue || 0) > 0 && tab !== 'overdue' && (
                <button type="button" onClick={() => setTab('overdue')} className="w-full text-left mb-3 rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-2.5 text-sm text-red-700 dark:text-red-300">
                    <span className="font-semibold">{counts.overdue} {counts.overdue === 1 ? 'entrega atrasada' : 'entregas atrasadas'}</span> — su fecha ya pasó y no se han completado. Ver
                </button>
            )}

            {/* Pestañas por fecha */}
            <div className="flex flex-wrap gap-1.5 mb-3">
                {TABS.map(t => {
                    const n = counts[t.key];
                    const active = tab === t.key;
                    return (
                        <button key={t.key} type="button" onClick={() => { setTab(t.key); setSelected(new Set()); }}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${active ? 'bg-primary text-white border-primary' : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700'}`}>
                            {t.label}
                            {n != null && <span className={`ml-1.5 text-xs px-1.5 rounded-full ${active ? 'bg-white/25' : t.tone === 'red' && n > 0 ? 'bg-red-600 text-white' : 'bg-neutral-100 dark:bg-neutral-700'}`}>{n}</span>}
                        </button>
                    );
                })}
            </div>

            {/* Filtros */}
            <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-3 mb-3 flex flex-wrap items-center gap-2">
                <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por cliente, factura #, teléfono o dirección…" className={`${INPUT_SM_CLASSES} flex-1 min-w-[220px]`} />
                {canViewAll && !mine && (
                    <select value={assignee} onChange={e => setAssignee(e.target.value)} className={INPUT_SM_CLASSES}>
                        <option value="">Todos los repartidores</option>
                        <option value="none">Sin asignar</option>
                        {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                )}
                {canViewAll && canDeliver && (
                    <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                        <input type="checkbox" checked={mine} onChange={e => setMine(e.target.checked)} className="h-4 w-4" />
                        Solo mis entregas
                    </label>
                )}
            </div>

            {/* Acciones en lote */}
            {selected.size > 0 && (
                <div className="flex flex-wrap items-center gap-2 mb-3 text-sm">
                    <span className="text-neutral-600 dark:text-neutral-300">{selected.size} seleccionada(s)</span>
                    {canManage && (
                        <select disabled={bulkBusy} defaultValue="" onChange={e => { const v = e.target.value; e.target.value = ''; if (v) bulk(d => deliveriesService.update(d.id, { assignedUserId: v === 'none' ? null : v }), 'Repartidor asignado'); }} className={INPUT_SM_CLASSES}>
                            <option value="">Asignar repartidor…</option>
                            <option value="none">Quitar repartidor</option>
                            {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    )}
                    {canDeliver && <button type="button" disabled={bulkBusy} onClick={() => bulk(d => deliveriesService.setStatus(d.id, 'in_route'), 'Marcadas en ruta')} className={BUTTON_SECONDARY_SM_CLASSES}>Marcar en ruta</button>}
                    <button type="button" onClick={printRoute} className={BUTTON_SECONDARY_SM_CLASSES}>Imprimir hoja de ruta</button>
                    <button type="button" onClick={() => setSelected(new Set())} className="text-blue-600 dark:text-blue-400 hover:underline">Quitar selección</button>
                </div>
            )}

            {loading && !rows.length ? <LoadingSkeleton variant="table" rows={6} /> : rows.length === 0 ? (
                <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-6">
                    <EmptyState title="No hay entregas aquí" description={tab === 'overdue' ? 'No hay entregas atrasadas.' : 'Marca una venta "para entrega" en la caja y aparecerá en esta lista.'} />
                </div>
            ) : (
                <div className={`bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-x-auto ${loading ? 'opacity-60' : ''}`}>
                    <table className="min-w-full text-sm">
                        <thead className="bg-neutral-50 dark:bg-neutral-900/40 text-neutral-500 dark:text-neutral-400">
                            <tr>
                                <th className="px-3 py-2 w-8"><input type="checkbox" checked={allChecked} onChange={() => setSelected(allChecked ? new Set() : new Set(rows.map(r => r.id)))} className="h-4 w-4" aria-label="Seleccionar todas" /></th>
                                <th className="px-3 py-2 text-left font-medium">Fecha</th>
                                <th className="px-3 py-2 text-left font-medium">Cliente</th>
                                <th className="px-3 py-2 text-left font-medium">Factura</th>
                                <th className="px-3 py-2 text-left font-medium">Dirección</th>
                                <th className="px-3 py-2 text-left font-medium">Pendiente</th>
                                <th className="px-3 py-2 text-left font-medium">Repartidor</th>
                                <th className="px-3 py-2 text-left font-medium">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700/60 text-neutral-700 dark:text-neutral-200">
                            {rows.map(r => {
                                const pendingItems = r.items.filter(i => i.pending > 1e-9);
                                return (
                                    <tr key={r.id} onClick={() => openDetail(r.id)} className={`cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-700/30 ${r.overdue ? 'bg-red-50/60 dark:bg-red-900/10' : ''}`}>
                                        <td className="px-3 py-2" onClick={e => e.stopPropagation()}><input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} className="h-4 w-4" /></td>
                                        <td className={`px-3 py-2 whitespace-nowrap ${r.overdue ? 'text-red-600 dark:text-red-400 font-semibold' : ''}`}>
                                            {r.status === 'delivered' && r.deliveredAt ? new Date(r.deliveredAt).toLocaleDateString('es', { day: 'numeric', month: 'short' }) : fmtDeliveryDay(r.scheduledDate)}
                                            {r.timeWindow && r.status !== 'delivered' && <div className="text-xs text-neutral-500 font-normal">{r.timeWindow}</div>}
                                        </td>
                                        <td className="px-3 py-2">
                                            <div className="font-medium">{r.clientName}</div>
                                            {r.contactPhone && <div className="text-xs text-neutral-500 dark:text-neutral-400">{r.contactName && r.contactName !== r.clientName ? `${r.contactName} · ` : ''}{r.contactPhone}</div>}
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap">{r.saleNumber ? `#${r.saleNumber}` : '—'}<div className="text-xs text-neutral-400">Entrega #{r.number}</div></td>
                                        <td className="px-3 py-2 max-w-[260px]">{deliveryAddress(r) || '—'}</td>
                                        <td className="px-3 py-2 text-xs max-w-[240px]">
                                            {pendingItems.length ? pendingItems.slice(0, 3).map(i => `${i.name} ×${Math.round(i.pending * 100) / 100}`).join(', ') + (pendingItems.length > 3 ? ` y ${pendingItems.length - 3} más` : '') : '—'}
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap">{r.assignedName || <span className="text-neutral-400">Sin asignar</span>}</td>
                                        <td className="px-3 py-2"><DeliveryStatusChip d={r} /></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            <DeliveryDetailModal deliveryId={openId} onClose={() => { openDetail(null); load(); }} onChanged={onChanged} />
        </div>
    );
};

export default DeliveriesPage;
