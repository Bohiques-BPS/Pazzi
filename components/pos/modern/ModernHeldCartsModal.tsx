import React, { useEffect, useMemo, useState } from 'react';
import { Modal, ConfirmationModal } from '../../Modal';
import type { HeldCart } from '../../../types';
import { MagnifyingGlassIcon, TrashIconMini } from '../../icons';
import { toast } from 'react-hot-toast';

/**
 * Ventas en espera (caja MODERNA): poner la venta actual en espera (solo si hay artículos) y
 * recuperar las guardadas. Muestra hace cuánto están en espera (gris < 10 min, ámbar 10–20, rojo > 20),
 * buscador por nombre o monto, y pide confirmación antes de borrar.
 */

const money = (n: number) => `$${(Number(n) || 0).toFixed(2)}`;
const minutesSince = (iso: string, now: number) => Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
const ago = (m: number) => (m < 1 ? 'ahora' : m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`);

export const ModernHeldCartsModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    heldCarts: HeldCart[];
    /** Venta actual (para ponerla en espera). */
    currentItems: number;
    currentTotal: number;
    isGeneralClient: boolean;
    onHoldCart: (alias?: string) => boolean;
    onRecallCart: (id: string) => void;
    onDeleteHeldCart: (id: string) => void;
}> = ({ isOpen, onClose, heldCarts, currentItems, currentTotal, isGeneralClient, onHoldCart, onRecallCart, onDeleteHeldCart }) => {
    const [alias, setAlias] = useState('');
    const [q, setQ] = useState('');
    const [now, setNow] = useState(Date.now());
    const [toDelete, setToDelete] = useState<HeldCart | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        setAlias(''); setQ(''); setNow(Date.now());
        const id = window.setInterval(() => setNow(Date.now()), 30000);
        return () => window.clearInterval(id);
    }, [isOpen]);

    const list = useMemo(() => {
        const term = q.trim().toLowerCase();
        const sorted = [...heldCarts].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        if (!term) return sorted;
        return sorted.filter(h => (h.name || '').toLowerCase().includes(term) || money(h.totalAmount).includes(term) || String(h.totalAmount).includes(term));
    }, [heldCarts, q]);

    const hold = () => {
        if (onHoldCart(alias.trim() || undefined)) { toast.success('Venta puesta en espera.'); onClose(); }
        else toast.error('No hay artículos para poner en espera.');
    };

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title="Ventas en espera" size="lg"
                footer={<div className="flex justify-end"><button type="button" onClick={onClose} className="h-11 px-5 rounded-lg font-semibold bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-700 dark:hover:bg-neutral-600">Cerrar</button></div>}>
                <p className="text-sm text-neutral-600 dark:text-neutral-300 -mt-2 mb-3">Guarde la venta actual o recupere una guardada.</p>

                {currentItems > 0 && (
                    <div className="rounded-xl ring-1 ring-inset ring-primary/40 bg-primary/5 dark:bg-primary/10 p-3 mb-4">
                        <div className="text-sm font-semibold mb-2">Venta actual · {currentItems} artículo{currentItems === 1 ? '' : 's'} · {money(currentTotal)}</div>
                        <form onSubmit={e => { e.preventDefault(); hold(); }} className="flex gap-2">
                            <input autoFocus value={alias} onChange={e => setAlias(e.target.value)} placeholder={isGeneralClient ? 'Nombre para reconocerla (opcional)' : 'Nombre (opcional)'}
                                className="flex-1 min-w-0 h-11 px-3 rounded-lg ring-1 ring-inset ring-neutral-300 dark:ring-neutral-700 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary" />
                            <button type="submit" className="h-11 px-4 rounded-lg font-bold bg-primary hover:bg-secondary text-white whitespace-nowrap">Poner en espera</button>
                        </form>
                    </div>
                )}

                <div className="flex items-center justify-between gap-3 mb-2">
                    <span className="text-sm font-semibold">En espera <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-700">{heldCarts.length}</span></span>
                    {heldCarts.length > 3 && (
                        <div className="flex items-center h-9 rounded-lg ring-1 ring-inset ring-neutral-200 dark:ring-neutral-700 px-2.5 w-56">
                            <MagnifyingGlassIcon className="w-4 h-4 text-neutral-400 mr-1.5" />
                            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nombre o monto" className="flex-1 min-w-0 bg-transparent text-sm focus:outline-none" />
                        </div>
                    )}
                </div>

                {list.length === 0 ? (
                    <p className="text-sm text-center text-neutral-500 dark:text-neutral-400 py-8 rounded-xl ring-1 ring-inset ring-neutral-200 dark:ring-neutral-800">
                        {heldCarts.length ? 'No hay ventas en espera con esa búsqueda.' : 'No hay ventas en espera.'}
                    </p>
                ) : (
                    <ul className="max-h-[46vh] overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800 rounded-xl ring-1 ring-inset ring-neutral-200 dark:ring-neutral-800">
                        {list.map(h => {
                            const m = minutesSince(h.date, now);
                            const tone = m > 20 ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' : m >= 10 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300';
                            const units = h.items.reduce((a, it) => a + it.quantity, 0);
                            return (
                                <li key={h.id} className="flex items-center gap-3 px-3.5 py-2.5">
                                    <div className="flex-1 min-w-0">
                                        <div className="font-semibold truncate">{h.name || 'Sin nombre'}</div>
                                        <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                                            <span className={`px-1.5 py-0.5 rounded font-semibold ${tone}`}>{ago(m)}</span>
                                            <span>{units} art.</span>
                                        </div>
                                    </div>
                                    <span className="font-bold tabular-nums">{money(h.totalAmount)}</span>
                                    <button type="button" onClick={() => { onRecallCart(h.id); onClose(); }} className="h-10 px-3.5 rounded-lg text-sm font-semibold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:opacity-90">Recuperar</button>
                                    <button type="button" onClick={() => setToDelete(h)} aria-label={`Eliminar ${h.name}`} className="h-10 w-10 rounded-lg flex items-center justify-center text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"><TrashIconMini className="w-4 h-4" /></button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </Modal>
            <ConfirmationModal
                isOpen={!!toDelete}
                onClose={() => setToDelete(null)}
                onConfirm={() => { if (toDelete) { onDeleteHeldCart(toDelete.id); toast.success('Venta en espera eliminada.'); } setToDelete(null); }}
                title="Eliminar venta en espera"
                message={toDelete ? `¿Seguro que desea eliminar "${toDelete.name || 'Sin nombre'}" (${toDelete.items.reduce((a, it) => a + it.quantity, 0)} art. · ${money(toDelete.totalAmount)})? Esta acción no se puede deshacer.` : ''}
                confirmButtonText="Eliminar"
                cancelButtonText="Cancelar"
            />
        </>
    );
};
