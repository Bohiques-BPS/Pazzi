import React, { useEffect, useState } from 'react';
import { Modal } from '../Modal';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import { TagIcon, TrashIconMini } from '../icons';
import type { CartItem } from '../../types';

interface CartLineModalProps {
    /** Item vivo del carrito (o null si cerrado). */
    item: CartItem | null;
    onClose: () => void;
    onQuantity: (id: string, qty: number) => void;
    onNote: (id: string, note: string) => void;
    /** Abre el flujo de descuento por línea (el POS cierra este modal primero). */
    onDiscount: (id: string) => void;
    onDelete: (item: CartItem) => void;
}

/** "Modificar Línea": editar cantidad, comentario, descuento o eliminar un item del carrito. */
export const CartLineModal: React.FC<CartLineModalProps> = ({ item, onClose, onQuantity, onNote, onDiscount, onDelete }) => {
    const [note, setNote] = useState('');
    useEffect(() => { if (item) setNote(item.note || ''); }, [item?.id]);

    if (!item) return null;

    const save = () => { onNote(item.id, note.trim()); onClose(); };

    return (
        <Modal isOpen={!!item} onClose={onClose} title={`Modificar línea — ${item.name}`} size="md">
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Cantidad</label>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={() => onQuantity(item.id, Math.max(1, item.quantity - 1))} className="w-10 h-10 rounded-md border border-neutral-300 dark:border-neutral-600 text-xl font-bold hover:bg-neutral-100 dark:hover:bg-neutral-700">−</button>
                        <input
                            type="number" min={1} value={item.quantity}
                            onChange={e => onQuantity(item.id, Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-24 text-center text-lg font-semibold border border-neutral-300 dark:border-neutral-600 rounded-md p-2 dark:bg-neutral-700"
                        />
                        <button type="button" onClick={() => onQuantity(item.id, item.quantity + 1)} className="w-10 h-10 rounded-md border border-neutral-300 dark:border-neutral-600 text-xl font-bold hover:bg-neutral-100 dark:hover:bg-neutral-700">+</button>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Comentario a la línea <span className="text-xs font-normal text-neutral-400">(sale en el recibo)</span></label>
                    <textarea
                        value={note} onChange={e => setNote(e.target.value)} rows={2} maxLength={120}
                        placeholder="Ej. Color rojo, entrega el martes…"
                        className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md dark:bg-neutral-700 text-sm"
                    />
                </div>

                <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => { onClose(); onDiscount(item.id); }} className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 text-sm font-medium hover:bg-blue-50 dark:hover:bg-blue-900/30">
                        <TagIcon className="w-4 h-4" /> Descuento
                    </button>
                    <button type="button" onClick={() => onDelete(item)} className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/30">
                        <TrashIconMini className="w-4 h-4" /> Eliminar
                    </button>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200 dark:border-neutral-700">
                    <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button>
                    <button type="button" onClick={save} className={BUTTON_PRIMARY_SM_CLASSES}>Guardar</button>
                </div>
            </div>
        </Modal>
    );
};
