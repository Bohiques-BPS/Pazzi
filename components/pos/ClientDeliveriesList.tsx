import React, { useEffect, useMemo, useState } from 'react';
import { deliveriesService, deliveryAddress, type Delivery } from '../../services/deliveries';
import { DeliveryDetailModal, DeliveryStatusChip, fmtDeliveryDay } from './DeliveryDetailModal';
import { INPUT_SM_CLASSES } from '../../constants';

/**
 * Entregas de un cliente (también del cliente "Público General"), para verlas desde la caja.
 * Clic en una fila abre el detalle (estado, artículos, conduce, confirmar…).
 */
export const ClientDeliveriesList: React.FC<{ clientId: string; onCount?: (n: number) => void }> = ({ clientId, onCount }) => {
    const [rows, setRows] = useState<Delivery[]>([]);
    const [loading, setLoading] = useState(true);
    const [onlyOpen, setOnlyOpen] = useState(true);
    const [q, setQ] = useState('');
    const [openId, setOpenId] = useState<string | null>(null);
    const [key, setKey] = useState(0);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        deliveriesService.list({ clientId, bucket: 'all' })
            .then(r => { if (!cancelled) { setRows(r.rows || []); onCount?.((r.rows || []).length); } })
            .catch(() => { if (!cancelled) setRows([]); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [clientId, key]); // eslint-disable-line react-hooks/exhaustive-deps

    const shown = useMemo(() => {
        const s = q.trim().toLowerCase();
        return rows
            .filter(r => !onlyOpen || ['pending', 'in_route', 'partial'].includes(r.status))
            .filter(r => !s || [r.saleNumber ? `#${r.saleNumber}` : '', r.contactName, r.contactPhone, deliveryAddress(r), ...r.items.map(i => i.name)]
                .some(v => String(v || '').toLowerCase().includes(s)));
    }, [rows, onlyOpen, q]);
    const openCount = rows.filter(r => ['pending', 'in_route', 'partial'].includes(r.status)).length;

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex rounded-md border border-neutral-300 dark:border-neutral-600 overflow-hidden text-sm">
                    <button type="button" onClick={() => setOnlyOpen(true)} className={`px-3 py-1.5 ${onlyOpen ? 'bg-primary text-white' : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'}`}>Pendientes ({openCount})</button>
                    <button type="button" onClick={() => setOnlyOpen(false)} className={`px-3 py-1.5 ${!onlyOpen ? 'bg-primary text-white' : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'}`}>Todas ({rows.length})</button>
                </div>
                <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar factura #, dirección, artículo…" className={`${INPUT_SM_CLASSES} flex-1 min-w-[180px]`} />
            </div>

            {loading ? (
                <p className="text-sm text-neutral-500 py-6 text-center">Cargando…</p>
            ) : shown.length === 0 ? (
                <p className="text-sm text-neutral-500 py-6 text-center">{onlyOpen ? 'Este cliente no tiene entregas pendientes.' : 'Este cliente no tiene entregas.'}</p>
            ) : (
                <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-x-auto max-h-[50vh]">
                    <table className="min-w-full text-sm">
                        <thead className="bg-neutral-50 dark:bg-neutral-900/40 text-neutral-500 dark:text-neutral-400 sticky top-0">
                            <tr>
                                <th className="px-3 py-2 text-left font-medium">Fecha</th>
                                <th className="px-3 py-2 text-left font-medium">Factura</th>
                                <th className="px-3 py-2 text-left font-medium">Recibe / dirección</th>
                                <th className="px-3 py-2 text-left font-medium">Pendiente</th>
                                <th className="px-3 py-2 text-left font-medium">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700/60 text-neutral-700 dark:text-neutral-200">
                            {shown.map(r => {
                                const pend = r.items.filter(i => i.pending > 1e-9);
                                return (
                                    <tr key={r.id} onClick={() => setOpenId(r.id)} className={`cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-700/30 ${r.overdue ? 'bg-red-50/60 dark:bg-red-900/10' : ''}`}>
                                        <td className={`px-3 py-2 whitespace-nowrap ${r.overdue ? 'text-red-600 dark:text-red-400 font-semibold' : ''}`}>
                                            {r.status === 'delivered' && r.deliveredAt ? new Date(r.deliveredAt).toLocaleDateString('es', { day: 'numeric', month: 'short' }) : fmtDeliveryDay(r.scheduledDate)}
                                            {r.timeWindow && r.status !== 'delivered' && <div className="text-xs text-neutral-500 font-normal">{r.timeWindow}</div>}
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap font-mono text-xs">{r.saleNumber ? `#${r.saleNumber}` : '—'}</td>
                                        <td className="px-3 py-2">
                                            <div>{r.contactName || r.clientName}{r.contactPhone ? <span className="text-xs text-neutral-500"> · {r.contactPhone}</span> : null}</div>
                                            <div className="text-xs text-neutral-500 dark:text-neutral-400">{deliveryAddress(r) || '—'}</div>
                                        </td>
                                        <td className="px-3 py-2 text-xs max-w-[220px]">{pend.length ? pend.slice(0, 3).map(i => `${i.name} ×${Math.round(i.pending * 100) / 100}`).join(', ') + (pend.length > 3 ? ` y ${pend.length - 3} más` : '') : '—'}</td>
                                        <td className="px-3 py-2"><DeliveryStatusChip d={r} /></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            <DeliveryDetailModal deliveryId={openId} onClose={() => { setOpenId(null); setKey(k => k + 1); }} />
        </div>
    );
};
