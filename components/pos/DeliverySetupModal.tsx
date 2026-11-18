import React, { useEffect, useState } from 'react';
import { Modal } from '../Modal';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES, inputFormStyle } from '../../constants';
import { deliveriesService, type DeliveryInput } from '../../services/deliveries';
import { matchZone, suggestedFee, type DeliveryPricing } from '../../utils/deliveryPricing';

/** Mañana en "YYYY-MM-DD" (hora local), fecha por defecto de una entrega nueva. */
export const tomorrowYmd = () => {
    const d = new Date(); d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Datos de entrega por defecto a partir del cliente (dirección y contacto de envío). */
export function deliveryDefaultsFromClient(client: any): DeliveryInput {
    if (!client) return { scheduledDate: tomorrowYmd() };
    const general = !!client.isDefault;
    return {
        scheduledDate: tomorrowYmd(),
        contactName: general ? '' : (client.shippingContactName || `${client.name || ''} ${client.lastName || ''}`.trim()),
        contactPhone: general ? '' : (client.shippingContactPhone || client.phone || ''),
        street: general ? '' : (client.shippingStreet || client.address || ''),
        city: general ? '' : (client.shippingCity || client.city || ''),
        state: general ? '' : (client.shippingState || ''),
        zip: general ? '' : (client.shippingZip || client.zip || ''),
    };
}

/**
 * Programar una entrega: fecha, franja, dirección, quién recibe y repartidor.
 * Lo usa la caja (venta "para entrega") y el historial (crear la entrega de una venta ya hecha).
 */
export const DeliverySetupModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    initial: DeliveryInput;
    title?: string;
    saveLabel?: string;
    saving?: boolean;
    onSave: (data: DeliveryInput) => void;
    onRemove?: () => void;
    /** Pestaña extra (p. ej. "Entregas del cliente" en la caja). */
    extraTab?: { label: string; content: React.ReactNode };
    /** false: solo la pestaña extra (p. ej. carrito vacío: solo se pueden ver las entregas). */
    allowCreate?: boolean;
    /** Cobro de entregas (Administración). Si viene y no es "sin cargo", se pide el cargo. */
    pricing?: DeliveryPricing | null;
    /** Subtotal de la venta sin el cargo de entrega (para "gratis desde $X"). */
    orderSubtotal?: number;
}> = ({ isOpen, onClose, initial, title = 'Venta para entrega', saveLabel = 'Guardar', saving, onSave, onRemove, extraTab, allowCreate = true, pricing, orderSubtotal = 0 }) => {
    const [f, setF] = useState<DeliveryInput>(initial);
    // Cargo de entrega: zona escogida (modo por zona) y precio (sugerido o escrito a mano).
    const charging = !!pricing && pricing.mode !== 'none';
    const canEditPrice = !!pricing && (pricing.mode === 'manual' || pricing.allowManual);
    const [zoneId, setZoneId] = useState<string>('');
    const [zoneTouched, setZoneTouched] = useState(false);
    const [price, setPrice] = useState<string>('');
    const [priceTouched, setPriceTouched] = useState(false);
    useEffect(() => {
        if (!isOpen) return;
        setZoneId(initial.fee?.zoneId || ''); setZoneTouched(!!initial.fee?.zoneId);
        setPrice(initial.fee ? String(initial.fee.amount) : ''); setPriceTouched(!!initial.fee);
    }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps
    // Por zona: si la ciudad o el zip de la dirección está en una zona, se escoge sola.
    useEffect(() => {
        if (!isOpen || !pricing || pricing.mode !== 'zone' || zoneTouched) return;
        const z = matchZone(pricing, f.city, f.zip);
        if (z && z.id !== zoneId) setZoneId(z.id);
    }, [isOpen, f.city, f.zip, pricing, zoneTouched]); // eslint-disable-line react-hooks/exhaustive-deps
    const suggestion = pricing ? suggestedFee(pricing, { zoneId, subtotal: orderSubtotal }) : null;
    // Mientras el cajero no escriba un precio, se usa el sugerido.
    useEffect(() => {
        if (!charging || priceTouched || pricing?.mode === 'manual') return;
        setPrice(suggestion ? String(suggestion.amount) : '0');
    }, [charging, priceTouched, suggestion?.amount]); // eslint-disable-line react-hooks/exhaustive-deps
    const [view, setView] = useState<'new' | 'extra'>('new');
    useEffect(() => { if (isOpen) setView(allowCreate || !extraTab ? 'new' : 'extra'); }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps
    const [staff, setStaff] = useState<{ id: string; name: string }[]>([]);
    const [error, setError] = useState<string | null>(null);
    useEffect(() => { if (isOpen) { setF(initial); setError(null); } }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => { if (isOpen && !staff.length) deliveriesService.staff().then(setStaff).catch(() => {}); }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

    const set = (k: keyof DeliveryInput, v: string) => setF(prev => ({ ...prev, [k]: v }));
    const label = 'block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1';

    const save = () => {
        if (!f.street?.trim()) { setError('Escribe la dirección de entrega.'); return; }
        if (!f.contactPhone?.trim()) { setError('Escribe un teléfono de contacto para la entrega.'); return; }
        let fee: DeliveryInput['fee'] = null;
        if (charging && pricing) {
            if (pricing.mode === 'zone' && !zoneId && pricing.zones.length) { setError('Escoge la zona de la entrega.'); return; }
            const amount = Math.round((parseFloat(price) || 0) * 100) / 100;
            if (pricing.mode === 'manual' && price.trim() === '') { setError('Escribe el precio de la entrega.'); return; }
            if (amount < 0) { setError('El precio de la entrega no puede ser negativo.'); return; }
            fee = { amount, label: suggestion?.label || 'Entrega', zoneId: zoneId || null };
        }
        onSave({
            ...f,
            scheduledDate: f.scheduledDate || null,
            assignedUserId: f.assignedUserId || null,
            fee,
        });
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            size={extraTab ? "3xl" : "lg"}
            footer={view === 'extra' ? (
                <div className="flex justify-end"><button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>Cerrar</button></div>
            ) : (
                <div className="flex items-center justify-between gap-2">
                    {onRemove ? <button type="button" onClick={onRemove} className="text-sm text-red-600 dark:text-red-400 hover:underline">No es para entrega</button> : <span />}
                    <div className="flex gap-2">
                        <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button>
                        <button type="button" onClick={save} disabled={saving} className={`${BUTTON_PRIMARY_SM_CLASSES} disabled:opacity-50`}>{saving ? 'Guardando…' : saveLabel}</button>
                    </div>
                </div>
            )}
        >
            {extraTab && (
                <div className="flex gap-1 border-b border-neutral-200 dark:border-neutral-700 mb-4 -mt-1">
                    {allowCreate && (
                        <button type="button" onClick={() => setView('new')} className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${view === 'new' ? 'border-primary text-primary' : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200'}`}>Nueva entrega</button>
                    )}
                    <button type="button" onClick={() => setView('extra')} className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${view === 'extra' ? 'border-primary text-primary' : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200'}`}>{extraTab.label}</button>
                </div>
            )}
            {view === 'extra' && extraTab ? extraTab.content : (
            <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label className={label}>Fecha programada</label>
                        <input type="date" value={f.scheduledDate || ''} onChange={e => set('scheduledDate', e.target.value)} className={inputFormStyle} />
                        <p className="text-xs text-neutral-400 mt-0.5">Déjala vacía si aún no tiene fecha.</p>
                    </div>
                    <div>
                        <label className={label}>Horario <span className="text-neutral-400 font-normal">(opcional)</span></label>
                        <input type="text" value={f.timeWindow || ''} onChange={e => set('timeWindow', e.target.value)} placeholder="Ej. 8:00 a 12:00" className={inputFormStyle} />
                    </div>
                    <div>
                        <label className={label}>Recibe</label>
                        <input type="text" value={f.contactName || ''} onChange={e => set('contactName', e.target.value)} className={inputFormStyle} />
                    </div>
                    <div>
                        <label className={label}>Teléfono</label>
                        <input type="tel" value={f.contactPhone || ''} onChange={e => set('contactPhone', e.target.value)} className={inputFormStyle} />
                    </div>
                </div>
                <div>
                    <label className={label}>Dirección de entrega</label>
                    <input type="text" value={f.street || ''} onChange={e => set('street', e.target.value)} placeholder="Calle, número, urbanización" className={inputFormStyle} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                    <div><label className={label}>Ciudad</label><input type="text" value={f.city || ''} onChange={e => set('city', e.target.value)} className={inputFormStyle} /></div>
                    <div><label className={label}>Estado</label><input type="text" value={f.state || ''} onChange={e => set('state', e.target.value)} className={inputFormStyle} /></div>
                    <div><label className={label}>Zip</label><input type="text" value={f.zip || ''} onChange={e => set('zip', e.target.value)} className={inputFormStyle} /></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label className={label}>Repartidor <span className="text-neutral-400 font-normal">(opcional)</span></label>
                        <select value={f.assignedUserId || ''} onChange={e => set('assignedUserId', e.target.value)} className={inputFormStyle}>
                            <option value="">Sin asignar</option>
                            {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                </div>
                {charging && pricing && (
                    <div className="rounded-lg ring-1 ring-inset ring-primary/30 bg-primary/5 dark:bg-primary/10 p-3">
                        <div className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 mb-2">Cargo de entrega</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {pricing.mode === 'zone' && (
                                <div>
                                    <label className={label}>Zona</label>
                                    <select value={zoneId} onChange={e => { setZoneId(e.target.value); setZoneTouched(true); setPriceTouched(false); }} className={inputFormStyle}>
                                        <option value="">— Escoja la zona —</option>
                                        {pricing.zones.map(z => <option key={z.id} value={z.id}>{z.name} · ${z.price.toFixed(2)}</option>)}
                                    </select>
                                </div>
                            )}
                            <div>
                                <label className={label}>Precio de la entrega</label>
                                {canEditPrice ? (
                                    <div className="relative">
                                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400">$</span>
                                        <input type="number" min={0} step="0.01" value={price} onChange={e => { setPrice(e.target.value); setPriceTouched(true); }} placeholder="0.00" className={`${inputFormStyle} pl-6`} />
                                    </div>
                                ) : (
                                    <div className="h-10 flex items-center text-lg font-bold">${(parseFloat(price) || 0).toFixed(2)}</div>
                                )}
                            </div>
                        </div>
                        {suggestion?.free && <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mt-2">Entrega gratis: la compra pasa de ${pricing.freeOver?.toFixed(2)}.</p>}
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">Se suma al total de la venta como la línea "{suggestion?.label || 'Entrega'}"{pricing.taxable ? ' (con IVU)' : ' (sin IVU)'}.</p>
                    </div>
                )}
                <div>
                    <label className={label}>Notas para la entrega <span className="text-neutral-400 font-normal">(opcional)</span></label>
                    <textarea rows={2} value={f.notes || ''} onChange={e => set('notes', e.target.value)} placeholder="Ej. llamar antes de llegar, portón azul" className={inputFormStyle} />
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">El cliente recibe un correo con el enlace para seguir su entrega (si tiene correo registrado).</p>
                {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            </div>
            )}
        </Modal>
    );
};
