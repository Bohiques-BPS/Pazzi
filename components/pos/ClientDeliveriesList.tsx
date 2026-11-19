import React, { useEffect, useMemo, useState } from 'react';
import { deliveriesService, deliveryAddress, type Delivery } from '../../services/deliveries';
import { DeliveryDetailModal, DeliveryStatusChip, fmtDeliveryDay } from './DeliveryDetailModal';
import { INPUT_SM_CLASSES } from '../../constants';

/** "YYYY-MM-DD" de hoy (hora local) y de una fecha ISO. */
const ymd = (d: Date) => d.toLocaleDateString('en-CA');
const OPEN_ST = ['pending', 'in_route', 'partial'];

/**
 * Entregas para ver desde la caja: TODAS las de la tienda (informe del día sin escoger cliente) o
 * solo las del cliente seleccionado. Filtro Hoy / Pendientes / Todas (empieza en Todas).
 * Clic en una fila abre el detalle (estado, artículos, conduce, confirmar…).
 * Sin `allClients` (estado de cuenta del cliente) lista solo las de ese cliente.
 */
export const ClientDeliveriesList: React.FC<{ clientId?: string; clientLabel?: string; allClients?: boolean; onCount?: (n: number) => void }> = ({ clientId, clientLabel, allClients = false, onCount }) => {
    const [rows, setRows] = useState<Delivery[]>([]);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<'today' | 'open' | 'all'>('all');
    // Ámbito: todas las entregas de la tienda o solo las del cliente seleccionado.
    const [scope, setScope] = useState<'all' | 'client'>(allClients || !clientId ? 'all' : 'client');
    const byClient = scope === 'client' && !!clientId;
    const [q, setQ] = useState('');
    const [openId, setOpenId] = useState<string | null>(null);
    const [key, setKey] = useState(0);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        deliveriesService.list(byClient ? { clientId, bucket: 'all' } : { bucket: 'all', scope: 'pos' })
            .then(r => { if (!cancelled) { setRows(r.rows || []); onCount?.((r.rows || []).length); } })
            .catch(() => { if (!cancelled) setRows([]); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [clientId, key, byClient]); // eslint-disable-line react-hooks/exhaustive-deps

    // Del día: programadas para hoy, atrasadas sin completar y las entregadas hoy.
    const today = ymd(new Date());
    const isToday = (r: Delivery) =>
        r.scheduledDate === today || (r.overdue && OPEN_ST.includes(r.status)) || (!!r.deliveredAt && ymd(new Date(r.deliveredAt)) === today);
    const todayCount = rows.filter(isToday).length;
    const shown = useMemo(() => {
        const s = q.trim().toLowerCase();
        return rows
            .filter(r => period === 'all' || (period === 'open' ? OPEN_ST.includes(r.status) : isToday(r)))
            .filter(r => !s || [r.saleNumber ? `#${r.saleNumber}` : '', r.number ? `${r.number}` : '', r.clientName, r.contactName, r.contactPhone, r.assignedName, deliveryAddress(r), ...r.items.map(i => i.name)]
                .some(v => String(v || '').toLowerCase().includes(s)));
    }, [rows, period, q]); // eslint-disable-line react-hooks/exhaustive-deps
    const openCount = rows.filter(r => OPEN_ST.includes(r.status)).length;
    const seg = (on: boolean) => `px-3 py-1.5 ${on ? 'bg-primary text-white' : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'}`;
    const emptyMsg = period === 'today' ? 'No hay entregas para hoy.' : period === 'open' ? 'No hay entregas pendientes.' : 'No hay entregas.';

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
                {allClients && clientId && (
                    <div className="inline-flex rounded-md border border-neutral-300 dark:border-neutral-600 overflow-hidden text-sm">
                        <button type="button" onClick={() => setScope('all')} className={seg(scope === 'all')}>Todos los clientes</button>
                        <button type="button" onClick={() => setScope('client')} className={`${seg(scope === 'client')} max-w-[200px] truncate`}>{clientLabel || 'Este cliente'}</button>
                    </div>
                )}
                <div className="inline-flex rounded-md border border-neutral-300 dark:border-neutral-600 overflow-hidden text-sm">
                    <button type="button" onClick={() => setPeriod('all')} className={seg(period === 'all')}>Todas ({rows.length})</button>
                    <button type="button" onClick={() => setPeriod('today')} className={seg(period === 'today')}>Hoy ({todayCount})</button>
                    <button type="button" onClick={() => setPeriod('open')} className={seg(period === 'open')}>Pendientes ({openCount})</button>
                </div>
                <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar cliente, factura #, dirección, artículo…" className={`${INPUT_SM_CLASSES} flex-1 min-w-[180px]`} />
            </div>

            {loading ? (
                <p className="text-sm text-neutral-500 py-6 text-center">Cargando…</p>
            ) : shown.length === 0 ? (
                <p className="text-sm text-neutral-500 py-6 text-center">{emptyMsg}</p>
            ) : (
                <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-x-auto max-h-[50vh]">
                    <table className="min-w-full text-sm">
                        <thead className="bg-neutral-50 dark:bg-neutral-900/40 text-neutral-500 dark:text-neutral-400 sticky top-0">
                            <tr>
                                <th className="px-3 py-2 text-left font-medium">Fecha</th>
                                <th className="px-3 py-2 text-left font-medium">Factura</th>
                                <th className="px-3 py-2 text-left font-medium">{byClient ? 'Recibe / dirección' : 'Cliente / dirección'}</th>
                                <th className="px-3 py-2 text-left font-medium">Pendiente</th>
                                <th className="px-3 py-2 text-left font-medium">Repartidor</th>
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
                                            {!byClient && <div className="font-medium">{r.clientName}</div>}
                                            <div className={byClient ? '' : 'text-xs'}>{r.contactName || (byClient ? r.clientName : '')}{r.contactPhone ? <span className="text-xs text-neutral-500"> · {r.contactPhone}</span> : null}</div>
                                            <div className="text-xs text-neutral-500 dark:text-neutral-400">{deliveryAddress(r) || '—'}</div>
                                        </td>
                                        <td className="px-3 py-2 text-xs max-w-[220px]">{pend.length ? pend.slice(0, 3).map(i => `${i.name} ×${Math.round(i.pending * 100) / 100}`).join(', ') + (pend.length > 3 ? ` y ${pend.length - 3} más` : '') : '—'}</td>
                                        <td className="px-3 py-2 text-xs whitespace-nowrap">{r.assignedName || <span className="text-neutral-400">Sin asignar</span>}</td>
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
