import React, { useEffect, useMemo, useState } from 'react';
import { Modal, ConfirmationModal } from '../Modal';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES, inputFormStyle } from '../../constants';
import { deliveriesService, deliveryAddress, DELIVERY_STATUS_CLS, DELIVERY_STATUS_LABEL, type Delivery, type DeliveryInput } from '../../services/deliveries';
import { DeliverySetupModal } from './DeliverySetupModal';
import { printDeliveryNote } from '../../utils/deliveryPdf';
import { usePermissions } from '../../hooks/usePermissions';
import { useGlobalSettings } from '../../contexts/GlobalSettingsContext';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';

export const fmtDeliveryDay = (ymd: string | null) =>
    ymd ? new Date(`${ymd}T12:00:00Z`).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }) : 'Sin programar';
const fmtDateTime = (iso: string) => new Date(iso).toLocaleString('es', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const fmtQty = (n: number) => String(Math.round(n * 100) / 100);

export const DeliveryStatusChip: React.FC<{ d: Pick<Delivery, 'status' | 'overdue'> }> = ({ d }) => (
    <span className="inline-flex items-center gap-1 flex-wrap">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${DELIVERY_STATUS_CLS[d.status]}`}>{DELIVERY_STATUS_LABEL[d.status]}</span>
        {d.overdue && <span className="text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap bg-red-600 text-white">Atrasada</span>}
    </span>
);

const EVENT_LABEL: Record<string, string> = {
    created: 'Entrega registrada', updated: 'Actualizada', assigned: 'Repartidor', in_route: 'Salió en ruta',
    partial: 'Entrega parcial', delivered: 'Entregada', cancelled: 'Cancelada', reopened: 'Reabierta',
};

/** Enlace público de seguimiento (el mismo del correo al cliente). */
export const deliveryPublicLink = (token: string) => `${window.location.origin}/entrega/${token}`;

/** Detalle de una entrega: datos, artículos, acciones (en ruta, confirmar, editar, cancelar) y bitácora. */
export const DeliveryDetailModal: React.FC<{
    deliveryId: string | null;
    onClose: () => void;
    onChanged?: (d: Delivery) => void;
}> = ({ deliveryId, onClose, onChanged }) => {
    const { can } = usePermissions();
    const { settings } = useGlobalSettings();
    const canManage = can('deliveries.manage');
    const canDeliver = can('deliveries.deliver') || canManage;

    const [d, setD] = useState<Delivery | null>(null);
    const [loading, setLoading] = useState(false);
    const [busy, setBusy] = useState(false);
    const [editing, setEditing] = useState(false);
    const [confirmCancel, setConfirmCancel] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [qty, setQty] = useState<Record<string, string>>({});
    const [receivedBy, setReceivedBy] = useState('');
    const [note, setNote] = useState('');
    const [reschedule, setReschedule] = useState('');

    useEffect(() => {
        if (!deliveryId) { setD(null); return; }
        setLoading(true); setConfirming(false);
        deliveriesService.get(deliveryId).then(setD).catch(err => toast.error(err instanceof ApiError ? err.message : 'No se pudo cargar la entrega.')).finally(() => setLoading(false));
    }, [deliveryId]);

    const apply = (next: Delivery, msg?: string) => { setD(next); onChanged?.(next); if (msg) toast.success(msg); };
    const run = async (fn: () => Promise<Delivery>, msg: string) => {
        setBusy(true);
        try { apply(await fn(), msg); return true; }
        catch (err) { toast.error(err instanceof ApiError ? err.message : 'No se pudo completar la acción.'); return false; }
        finally { setBusy(false); }
    };

    const startConfirm = () => {
        if (!d) return;
        setQty(Object.fromEntries(d.items.map(i => [i.id, i.pending > 0 ? fmtQty(i.pending) : '0'])));
        setReceivedBy(d.contactName || ''); setNote(''); setReschedule(''); setConfirming(true);
    };
    const leftover = useMemo(() => !!d && d.items.some(i => i.pending - (Number(qty[i.id]) || 0) > 1e-9), [d, qty]);
    const submitConfirm = async () => {
        if (!d) return;
        const items = d.items.map(i => ({ id: i.id, quantity: Number(qty[i.id]) || 0 })).filter(i => i.quantity > 0);
        const bad = d.items.find(i => (Number(qty[i.id]) || 0) > i.pending + 1e-9);
        if (bad) { toast.error(`"${bad.name}": solo quedan ${fmtQty(bad.pending)} por entregar.`); return; }
        if (!items.length) { toast.error('Indica al menos una cantidad entregada.'); return; }
        const ok = await run(() => deliveriesService.confirm(d.id, { items, receivedBy: receivedBy.trim() || undefined, note: note.trim() || undefined, rescheduleDate: leftover && reschedule ? reschedule : null }),
            leftover ? 'Entrega parcial registrada.' : 'Entrega completada.');
        if (ok) setConfirming(false);
    };

    const copyLink = async () => {
        if (!d) return;
        try { await navigator.clipboard.writeText(deliveryPublicLink(d.publicToken)); toast.success('Enlace de seguimiento copiado.'); }
        catch { toast.error('No se pudo copiar el enlace.'); }
    };
    const rc: any = (settings as any)?.receiptConfig || {};
    const print = () => d && printDeliveryNote(d, { businessName: rc.businessName, address: rc.address, phone: rc.phone });

    const open = !!d && ['pending', 'in_route', 'partial'].includes(d.status);
    const addr = d ? deliveryAddress(d) : '';
    const phoneDigits = (d?.contactPhone || '').replace(/\D/g, '');

    const footer = d && (
        <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
                <button type="button" onClick={print} className={BUTTON_SECONDARY_SM_CLASSES}>Imprimir conduce</button>
                <button type="button" onClick={copyLink} className={BUTTON_SECONDARY_SM_CLASSES}>Copiar enlace del cliente</button>
            </div>
            <div className="flex flex-wrap gap-2">
                {canManage && open && <button type="button" onClick={() => setConfirmCancel(true)} disabled={busy} className="text-sm text-red-600 dark:text-red-400 hover:underline px-2">Cancelar entrega</button>}
                {canManage && d.status === 'cancelled' && <button type="button" onClick={() => run(() => deliveriesService.setStatus(d.id, 'pending'), 'Entrega reabierta.')} disabled={busy} className={BUTTON_SECONDARY_SM_CLASSES}>Reabrir</button>}
                {canManage && open && <button type="button" onClick={() => setEditing(true)} disabled={busy} className={BUTTON_SECONDARY_SM_CLASSES}>Editar / programar</button>}
                {canDeliver && open && d.status !== 'in_route' && <button type="button" onClick={() => run(() => deliveriesService.setStatus(d.id, 'in_route'), 'Marcada en ruta. Se avisó al cliente.')} disabled={busy} className={BUTTON_SECONDARY_SM_CLASSES}>Marcar en ruta</button>}
                {canDeliver && open && !confirming && <button type="button" onClick={startConfirm} disabled={busy} className={BUTTON_PRIMARY_SM_CLASSES}>Confirmar entrega</button>}
            </div>
        </div>
    );

    return (
        <>
            <Modal isOpen={!!deliveryId} onClose={onClose} title={d ? `Entrega #${d.number ?? ''}${d.saleNumber ? ` · Factura #${d.saleNumber}` : ''}` : 'Entrega'} size="3xl" footer={footer || undefined}>
                {loading || !d ? (
                    <p className="text-sm text-neutral-500 py-6 text-center">Cargando…</p>
                ) : (
                    <div className="space-y-5 text-neutral-700 dark:text-neutral-200">
                        <div className="flex flex-wrap items-center gap-3">
                            <DeliveryStatusChip d={d} />
                            {d.status === 'delivered' && d.deliveredAt && (
                                <span className="text-sm text-neutral-500 dark:text-neutral-400">Entregada el {fmtDateTime(d.deliveredAt)}{d.deliveredByName ? ` por ${d.deliveredByName}` : ''}</span>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                            <Info label="Cliente">{d.clientName}</Info>
                            <Info label="Fecha programada">{fmtDeliveryDay(d.scheduledDate)}{d.timeWindow ? ` · ${d.timeWindow}` : ''}</Info>
                            <Info label="Recibe">
                                {d.contactName || '—'}
                                {d.contactPhone && (
                                    <span className="ml-2 inline-flex gap-2">
                                        <a href={`tel:${phoneDigits}`} className="text-blue-600 dark:text-blue-400 hover:underline">{d.contactPhone}</a>
                                        {phoneDigits.length >= 10 && <a href={`https://wa.me/${phoneDigits.length === 10 ? '1' + phoneDigits : phoneDigits}`} target="_blank" rel="noreferrer" className="text-green-700 dark:text-green-400 hover:underline">WhatsApp</a>}
                                    </span>
                                )}
                            </Info>
                            <Info label="Repartidor">{d.assignedName || 'Sin asignar'}</Info>
                            <Info label="Dirección">
                                {addr || '—'}
                                {addr && <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`} target="_blank" rel="noreferrer" className="ml-2 text-blue-600 dark:text-blue-400 hover:underline">Abrir en mapa</a>}
                            </Info>
                            {d.notes && <Info label="Notas">{d.notes}</Info>}
                        </div>

                        {/* Artículos */}
                        <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden">
                            <table className="min-w-full text-sm">
                                <thead className="bg-neutral-50 dark:bg-neutral-900/40 text-neutral-500 dark:text-neutral-400">
                                    <tr>
                                        <th className="px-3 py-2 text-left font-medium">Artículo</th>
                                        <th className="px-3 py-2 text-right font-medium">Cantidad</th>
                                        <th className="px-3 py-2 text-right font-medium">Entregado</th>
                                        <th className="px-3 py-2 text-right font-medium">Pendiente</th>
                                        {confirming && <th className="px-3 py-2 text-right font-medium">Entregar ahora</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700/60">
                                    {d.items.map(i => (
                                        <tr key={i.id}>
                                            <td className="px-3 py-2">{i.name}</td>
                                            <td className="px-3 py-2 text-right tabular-nums">{fmtQty(i.quantity)}</td>
                                            <td className="px-3 py-2 text-right tabular-nums">{fmtQty(i.delivered)}</td>
                                            <td className={`px-3 py-2 text-right tabular-nums ${i.pending > 0 ? 'text-orange-600 dark:text-orange-400 font-semibold' : ''}`}>{i.pending > 0 ? fmtQty(i.pending) : '—'}</td>
                                            {confirming && (
                                                <td className="px-3 py-1.5 text-right">
                                                    <input type="number" min={0} max={i.pending} step="any" disabled={i.pending <= 0}
                                                        value={qty[i.id] ?? ''} onChange={e => setQty(q => ({ ...q, [i.id]: e.target.value }))}
                                                        className={`${inputFormStyle} !w-24 text-right !py-1`} />
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {confirming && (
                            <div className="rounded-lg border border-primary/40 bg-primary/5 dark:bg-primary/10 p-4 space-y-3">
                                <p className="text-sm font-medium">Confirmar entrega</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">Recibido por</label>
                                        <input type="text" value={receivedBy} onChange={e => setReceivedBy(e.target.value)} className={inputFormStyle} />
                                    </div>
                                    {leftover && (
                                        <div>
                                            <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">Programar lo que falta para <span className="text-neutral-400">(opcional)</span></label>
                                            <input type="date" value={reschedule} onChange={e => setReschedule(e.target.value)} className={inputFormStyle} />
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">Notas <span className="text-neutral-400">(opcional)</span></label>
                                    <input type="text" value={note} onChange={e => setNote(e.target.value)} className={inputFormStyle} />
                                </div>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                    {leftover ? 'Quedará como entrega parcial: lo que falta sigue pendiente.' : 'Se marca como entregada.'} La firma del cliente va en el conduce impreso. Se avisa al cliente por correo.
                                </p>
                                <div className="flex justify-end gap-2">
                                    <button type="button" onClick={() => setConfirming(false)} className={BUTTON_SECONDARY_SM_CLASSES}>Volver</button>
                                    <button type="button" onClick={submitConfirm} disabled={busy} className={`${BUTTON_PRIMARY_SM_CLASSES} disabled:opacity-50`}>{busy ? 'Guardando…' : leftover ? 'Registrar entrega parcial' : 'Marcar entregada'}</button>
                                </div>
                            </div>
                        )}

                        {/* Bitácora */}
                        {!!d.events?.length && (
                            <div>
                                <p className="text-sm font-medium mb-2">Historial</p>
                                <ul className="space-y-2">
                                    {d.events.slice().reverse().map(e => (
                                        <li key={e.id} className="text-sm border-l-2 border-neutral-200 dark:border-neutral-700 pl-3">
                                            <div>
                                                <span className="font-medium">{EVENT_LABEL[e.type] || e.type}</span>
                                                <span className="text-neutral-500 dark:text-neutral-400"> · {fmtDateTime(e.createdAt)}{e.userName ? ` · ${e.userName}` : ''}</span>
                                            </div>
                                            {e.note && <div className="text-neutral-600 dark:text-neutral-300">{e.note}</div>}
                                            {e.receivedBy && <div className="text-neutral-600 dark:text-neutral-300">Recibió: {e.receivedBy}</div>}
                                            {!!e.quantities?.length && <div className="text-xs text-neutral-500 dark:text-neutral-400">{e.quantities.map(q => `${q.name} ×${fmtQty(q.quantity)}`).join(', ')}</div>}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </Modal>

            {d && (
                <DeliverySetupModal
                    isOpen={editing}
                    onClose={() => setEditing(false)}
                    title={`Editar entrega #${d.number ?? ''}`}
                    saveLabel="Guardar cambios"
                    saving={busy}
                    initial={{ scheduledDate: d.scheduledDate, timeWindow: d.timeWindow, contactName: d.contactName, contactPhone: d.contactPhone, street: d.street, city: d.city, state: d.state, zip: d.zip, notes: d.notes, assignedUserId: d.assignedUserId }}
                    onSave={async (data: DeliveryInput) => { const ok = await run(() => deliveriesService.update(d.id, data), 'Entrega actualizada.'); if (ok) setEditing(false); }}
                />
            )}
            <ConfirmationModal
                isOpen={confirmCancel}
                onClose={() => setConfirmCancel(false)}
                onConfirm={() => { setConfirmCancel(false); if (d) run(() => deliveriesService.setStatus(d.id, 'cancelled'), 'Entrega cancelada.'); }}
                title="Cancelar entrega"
                message="La entrega queda cancelada y se avisa al cliente. La venta no cambia: si hay que devolver dinero, usa Devolución en la caja."
                confirmButtonText="Cancelar entrega"
                cancelButtonText="Volver"
            />
        </>
    );
};

const Info: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div>
        <div className="text-xs text-neutral-500 dark:text-neutral-400">{label}</div>
        <div className="text-neutral-800 dark:text-neutral-100">{children}</div>
    </div>
);
