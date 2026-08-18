import React, { useEffect, useRef, useState } from 'react';
import { Modal } from '../Modal';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import type { Product } from '../../types';

interface ManualPriceModalProps {
    /** Producto de precio manual a agregar (o null si cerrado). */
    product: Product | null;
    onClose: () => void;
    onConfirm: (unitPrice: number, note: string) => void;
}

/** Pide el PRECIO (y descripción opcional) al agregar un producto de precio manual / servicio. */
export const ManualPriceModal: React.FC<ManualPriceModalProps> = ({ product, onClose, onConfirm }) => {
    const [price, setPrice] = useState('');
    const [note, setNote] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (product) {
            setPrice(product.unitPrice ? String(product.unitPrice) : '');
            setNote('');
            setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select(); }, 0);
        }
    }, [product?.id]);

    if (!product) return null;

    const submit = () => {
        const p = parseFloat(price);
        if (isNaN(p) || p < 0) { inputRef.current?.focus(); return; }
        onConfirm(Math.round(p * 100) / 100, note.trim());
    };

    return (
        <Modal isOpen={!!product} onClose={onClose} title={`Precio manual — ${product.name}`} size="sm">
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Precio de venta</label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-lg">$</span>
                        <input
                            ref={inputRef}
                            type="number" min="0" step="0.01" inputMode="decimal"
                            value={price} onChange={e => setPrice(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') submit(); }}
                            placeholder="0.00"
                            className="w-full text-2xl pl-8 pr-3 py-2.5 border-2 border-teal-400 rounded-md focus:ring-teal-500 focus:border-teal-500 dark:bg-neutral-700"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Descripción / comentario <span className="text-xs font-normal text-neutral-400">(opcional, sale en el recibo)</span></label>
                    <input
                        type="text" value={note} onChange={e => setNote(e.target.value)} maxLength={120}
                        onKeyDown={e => { if (e.key === 'Enter') submit(); }}
                        placeholder="Ej. Entrega a Bélgica"
                        className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md dark:bg-neutral-700 text-sm"
                    />
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-700">
                    <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button>
                    <button type="button" onClick={submit} className={BUTTON_PRIMARY_SM_CLASSES}>Agregar</button>
                </div>
            </div>
        </Modal>
    );
};
