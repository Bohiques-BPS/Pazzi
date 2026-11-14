import React, { useEffect, useState } from 'react';
import { Modal } from '../Modal';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES, inputFormStyle } from '../../constants';
import { deliveriesService, type DeliveryInput } from '../../services/deliveries';

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
}> = ({ isOpen, onClose, initial, title = 'Venta para entrega', saveLabel = 'Guardar', saving, onSave, onRemove }) => {
    const [f, setF] = useState<DeliveryInput>(initial);
    const [staff, setStaff] = useState<{ id: string; name: string }[]>([]);
    const [error, setError] = useState<string | null>(null);
    useEffect(() => { if (isOpen) { setF(initial); setError(null); } }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => { if (isOpen && !staff.length) deliveriesService.staff().then(setStaff).catch(() => {}); }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

    const set = (k: keyof DeliveryInput, v: string) => setF(prev => ({ ...prev, [k]: v }));
    const label = 'block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1';

    const save = () => {
        if (!f.street?.trim()) { setError('Escribe la dirección de entrega.'); return; }
        if (!f.contactPhone?.trim()) { setError('Escribe un teléfono de contacto para la entrega.'); return; }
        onSave({
            ...f,
            scheduledDate: f.scheduledDate || null,
            assignedUserId: f.assignedUserId || null,
        });
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            size="lg"
            footer={
                <div className="flex items-center justify-between gap-2">
                    {onRemove ? <button type="button" onClick={onRemove} className="text-sm text-red-600 dark:text-red-400 hover:underline">No es para entrega</button> : <span />}
                    <div className="flex gap-2">
                        <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button>
                        <button type="button" onClick={save} disabled={saving} className={`${BUTTON_PRIMARY_SM_CLASSES} disabled:opacity-50`}>{saving ? 'Guardando…' : saveLabel}</button>
                    </div>
                </div>
            }
        >
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
                <div>
                    <label className={label}>Notas para la entrega <span className="text-neutral-400 font-normal">(opcional)</span></label>
                    <textarea rows={2} value={f.notes || ''} onChange={e => set('notes', e.target.value)} placeholder="Ej. llamar antes de llegar, portón azul" className={inputFormStyle} />
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">El cliente recibe un correo con el enlace para seguir su entrega (si tiene correo registrado).</p>
                {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            </div>
        </Modal>
    );
};
