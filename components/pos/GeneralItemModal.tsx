import React, { useEffect, useRef, useState } from 'react';
import { Modal } from '../Modal';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import { MoneyInput } from '../ui/MoneyInput';

interface GeneralItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** Cantidad, precio por unidad y descripción opcional de la línea. */
    onConfirm: (quantity: number, unitPrice: number, note: string) => void;
    loading?: boolean;
}

/**
 * "Artículo general" del POS (Enter con el buscador vacío): una línea libre con cantidad y precio,
 * como en la caja anterior del cliente. Enter avanza de Cantidad → Precio → Agregar.
 */
export const GeneralItemModal: React.FC<GeneralItemModalProps> = ({ isOpen, onClose, onConfirm, loading }) => {
    const [qty, setQty] = useState('1');
    const [price, setPrice] = useState('');
    const [note, setNote] = useState('');
    const qtyRef = useRef<HTMLInputElement>(null);
    const priceRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!isOpen) return;
        setQty('1'); setPrice(''); setNote('');
        setTimeout(() => { qtyRef.current?.focus(); qtyRef.current?.select(); }, 0);
    }, [isOpen]);

    const q = Math.max(1, Math.floor(Number(qty)) || 1);
    const p = Math.round((parseFloat(price) || 0) * 100) / 100;

    const submit = () => {
        if (!(p > 0)) { priceRef.current?.focus(); return; }
        onConfirm(q, p, note.trim());
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Artículo general" size="md">
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Cantidad</label>
                        <input
                            ref={qtyRef}
                            type="number" min={1} step={1} inputMode="numeric" value={qty}
                            onChange={e => setQty(e.target.value.replace(/[^\d]/g, ''))}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); priceRef.current?.focus(); priceRef.current?.select(); } }}
                            className="w-full text-2xl text-center font-semibold py-2.5 border-2 border-neutral-300 dark:border-neutral-600 rounded-md focus:ring-teal-500 focus:border-teal-500 dark:bg-neutral-700 tabular-nums"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Precio por unidad</label>
                        <MoneyInput
                            inputRef={priceRef}
                            value={price}
                            onChange={setPrice}
                            onEnter={submit}
                            placeholder="0.00"
                            className="w-full text-2xl pr-3 py-2.5 border-2 border-teal-400 rounded-md focus:ring-teal-500 focus:border-teal-500 dark:bg-neutral-700"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Descripción <span className="text-xs font-normal text-neutral-400">(opcional, sale en el recibo)</span></label>
                    <input
                        type="text" value={note} onChange={e => setNote(e.target.value)} maxLength={120}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
                        placeholder="Ej. Tornillos sueltos, corte de llave…"
                        className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md dark:bg-neutral-700 text-sm"
                    />
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-neutral-200 dark:border-neutral-700">
                    <span className="text-sm text-neutral-500 dark:text-neutral-400">Total <b className="text-lg text-neutral-800 dark:text-neutral-100 tabular-nums">${(q * p).toFixed(2)}</b></span>
                    <div className="flex gap-2">
                        <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button>
                        <button type="button" onClick={submit} disabled={loading || !(p > 0)} className={`${BUTTON_PRIMARY_SM_CLASSES} disabled:opacity-50`}>{loading ? 'Agregando…' : 'Agregar'}</button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};
