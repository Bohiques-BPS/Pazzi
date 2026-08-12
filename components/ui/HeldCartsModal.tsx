import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { HeldCart } from '../../types';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES, INPUT_SM_CLASSES } from '../../constants';
import { TrashIconMini } from '../icons';
import { toast } from 'react-hot-toast';

interface HeldCartsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onHoldCart: (alias?: string) => boolean; // Returns true if cart was held, false if cart was empty
    onRecallCart: (cartId: string) => void;
    onDeleteHeldCart: (cartId: string) => void;
    heldCarts: HeldCart[];
    /** Cliente actual es "Público General" → se ofrece un alias para identificar la espera. */
    isGeneralClient?: boolean;
}

export const HeldCartsModal: React.FC<HeldCartsModalProps> = ({
    isOpen,
    onClose,
    onHoldCart,
    onRecallCart,
    onDeleteHeldCart,
    heldCarts,
    isGeneralClient = false,
}) => {
    const [alias, setAlias] = useState('');

    useEffect(() => { if (!isOpen) setAlias(''); }, [isOpen]);

    const handleHoldAndClose = () => {
        const success = onHoldCart(alias.trim() || undefined);
        if (success) {
            setAlias('');
            onClose();
        } else {
            toast.error('El carrito está vacío. Añada productos antes de poner la venta en espera.');
        }
    };

    const handleRecallAndClose = (cartId: string) => {
        onRecallCart(cartId);
        onClose();
    };


    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Ventas en Espera" size="lg">
            <div className="space-y-4">
                <div>
                    <label htmlFor="holdAlias" className="block text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-1">
                        Nombre de la orden en espera <span className="text-neutral-400">(opcional)</span>
                    </label>
                    <input
                        id="holdAlias"
                        type="text"
                        value={alias}
                        onChange={e => setAlias(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleHoldAndClose(); } }}
                        placeholder="Ej. Señor de camisa azul, Mesa 3…"
                        autoFocus
                        maxLength={60}
                        className={`${INPUT_SM_CLASSES} w-full`}
                    />
                    <p className="text-xs text-neutral-400 mt-1">
                        {isGeneralClient
                            ? 'El cliente es Público General: ponle un nombre para reconocer esta espera.'
                            : 'Opcional. Si lo dejas vacío, se usa el nombre del cliente.'}
                    </p>
                </div>
                <button onClick={handleHoldAndClose} className={BUTTON_PRIMARY_SM_CLASSES + " w-full text-lg py-3"}>
                    Poner Venta Actual en Espera
                </button>

                <div className="border-t pt-4 dark:border-neutral-700">
                    <h3 className="text-lg font-semibold mb-2">Recuperar Venta en Espera</h3>
                    {heldCarts.length > 0 ? (
                        <ul className="space-y-2 max-h-80 overflow-y-auto pr-2">
                            {heldCarts.map(cart => (
                                <li key={cart.id} className="p-3 flex items-center justify-between bg-neutral-100 dark:bg-neutral-700 rounded-md">
                                    <div>
                                        <p className="font-medium text-base">{cart.name}</p>
                                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                            {new Date(cart.date).toLocaleTimeString()} - ${cart.totalAmount.toFixed(2)} ({cart.items.length} items)
                                        </p>
                                    </div>
                                    <div className="flex space-x-2">
                                        <button onClick={() => handleRecallAndClose(cart.id)} className={BUTTON_SECONDARY_SM_CLASSES + " !text-sm"}>Recuperar</button>
                                        <button onClick={() => onDeleteHeldCart(cart.id)} className="p-1 text-red-500 hover:text-red-700"><TrashIconMini/></button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-base text-center text-neutral-500 dark:text-neutral-400 py-4">No hay ventas en espera.</p>
                    )}
                </div>
            </div>
        </Modal>
    );
};