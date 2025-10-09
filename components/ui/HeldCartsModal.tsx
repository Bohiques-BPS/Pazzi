import React from 'react';
import { Modal } from '../Modal';
import { HeldCart, CartItem } from '../../types';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import { TrashIconMini } from '../icons';

interface HeldCartsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onHoldCart: () => boolean; // Returns true if cart was held, false if cart was empty
    onRecallCart: (cartId: string) => void;
    onDeleteHeldCart: (cartId: string) => void;
    heldCarts: HeldCart[];
}

export const HeldCartsModal: React.FC<HeldCartsModalProps> = ({
    isOpen,
    onClose,
    onHoldCart,
    onRecallCart,
    onDeleteHeldCart,
    heldCarts
}) => {

    const handleHoldAndClose = () => {
        const success = onHoldCart();
        if (success) {
            onClose();
        } else {
            alert("El carrito actual está vacío. Añada productos para poner la venta en espera.");
        }
    };

    const handleRecallAndClose = (cartId: string) => {
        onRecallCart(cartId);
        onClose();
    };


    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Ventas en Espera" size="lg">
            <div className="space-y-4">
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