import React, { useState, useMemo, useEffect } from 'react';
import { Modal } from '../Modal';
import { CartItem, Client } from '../../types';
import { inputFormStyle, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import { UserCircleIcon } from '../icons';
import { RichTextEditor } from '../ui/RichTextEditor';

interface CreateLayawayModalProps {
    isOpen: boolean;
    onClose: () => void;
    cart: CartItem[];
    total: number;
    selectedClient: Client | null;
    onOpenClientSearch: () => void;
    onCreateLayaway: (initialPayment: { amount: number; method: string }, notes?: string) => void;
}

export const CreateLayawayModal: React.FC<CreateLayawayModalProps> = ({
    isOpen,
    onClose,
    cart,
    total,
    selectedClient,
    onOpenClientSearch,
    onCreateLayaway
}) => {
    const [depositType, setDepositType] = useState<'percentage' | 'fixed'>('percentage');
    const [depositValue, setDepositValue] = useState<string>('25'); // Default 25%
    const [paymentMethod, setPaymentMethod] = useState('Efectivo');
    const [notes, setNotes] = useState('');

    const initialDeposit = useMemo(() => {
        const value = parseFloat(depositValue);
        if (isNaN(value) || value <= 0) return 0;

        if (depositType === 'percentage') {
            return (total * value) / 100;
        }
        return value;
    }, [depositType, depositValue, total]);

    const remainingBalance = total - initialDeposit;

    const handleSubmit = () => {
        if (!selectedClient) {
            alert("Se debe seleccionar un cliente para crear un apartado.");
            return;
        }
        if (initialDeposit <= 0) {
            alert("El abono inicial debe ser mayor a cero.");
            return;
        }
        if (initialDeposit > total) {
            alert("El abono inicial no puede ser mayor que el total de la venta.");
            return;
        }

        onCreateLayaway({ amount: initialDeposit, method: paymentMethod }, notes);
    };

    useEffect(() => {
        if (isOpen) {
            // Reset state when modal opens
            setDepositType('percentage');
            setDepositValue('25');
            setPaymentMethod('Efectivo');
            setNotes('');
        }
    }, [isOpen]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Crear Apartado (Layaway)" size="lg">
            <div className="space-y-4">
                <div className="flex items-center space-x-3 p-2 border rounded-md dark:border-neutral-600">
                    <UserCircleIcon className="w-8 h-8 text-neutral-400 flex-shrink-0" />
                    <div className="flex-grow">
                        {selectedClient ? (
                            <>
                                <p className="text-sm font-semibold">{selectedClient.name} {selectedClient.lastName}</p>
                                <p className="text-xs text-neutral-500">{selectedClient.email}</p>
                            </>
                        ) : (
                            <p className="text-sm text-red-500">Ningún cliente seleccionado. Es obligatorio para apartados.</p>
                        )}
                    </div>
                    <button type="button" onClick={onOpenClientSearch} className={BUTTON_SECONDARY_SM_CLASSES}>
                        {selectedClient ? 'Cambiar' : 'Buscar Cliente'}
                    </button>
                </div>
                
                <div className="p-3 bg-neutral-100 dark:bg-neutral-900 rounded-lg text-center">
                    <p className="text-sm text-neutral-600 dark:text-neutral-300">Total del Apartado</p>
                    <p className="text-3xl font-bold text-primary">${total.toFixed(2)}</p>
                </div>

                <fieldset className="border p-3 rounded-md dark:border-neutral-600">
                    <legend className="text-sm font-medium px-1">Abono Inicial</legend>
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center">
                            <input type="radio" id="deposit_percentage" name="depositType" value="percentage" checked={depositType === 'percentage'} onChange={() => setDepositType('percentage')} className="form-radio"/>
                            <label htmlFor="deposit_percentage" className="ml-2 text-sm">Porcentaje (%)</label>
                        </div>
                         <div className="flex items-center">
                            <input type="radio" id="deposit_fixed" name="depositType" value="fixed" checked={depositType === 'fixed'} onChange={() => setDepositType('fixed')} className="form-radio"/>
                            <label htmlFor="deposit_fixed" className="ml-2 text-sm">Monto Fijo ($)</label>
                        </div>
                    </div>
                    <div className="mt-2">
                        <input
                            type="number"
                            value={depositValue}
                            onChange={(e) => setDepositValue(e.target.value)}
                            className={inputFormStyle}
                            step={depositType === 'percentage' ? '1' : '0.01'}
                            min="0"
                        />
                    </div>
                </fieldset>

                <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded">
                        <p className="text-xs text-blue-800 dark:text-blue-200">Abono Inicial Calculado</p>
                        <p className="text-xl font-bold text-blue-800 dark:text-blue-200">${initialDeposit.toFixed(2)}</p>
                    </div>
                     <div className="p-2 bg-yellow-50 dark:bg-yellow-900/30 rounded">
                        <p className="text-xs text-yellow-800 dark:text-yellow-200">Saldo Restante</p>
                        <p className="text-xl font-bold text-yellow-800 dark:text-yellow-200">${remainingBalance.toFixed(2)}</p>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium">Método de Pago del Abono</label>
                    <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className={inputFormStyle}>
                        <option>Efectivo</option>
                        <option>Tarjeta</option>
                        <option>ATH Móvil</option>
                        <option>Cheque</option>
                    </select>
                </div>

                 <div>
                    <label className="block text-sm font-medium">Notas (Opcional)</label>
                    <RichTextEditor value={notes} onChange={setNotes} placeholder="Añada notas o condiciones para el apartado..." />
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t dark:border-neutral-700">
                    <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        className={BUTTON_PRIMARY_SM_CLASSES}
                        disabled={!selectedClient || initialDeposit <= 0 || initialDeposit > total}
                    >
                        Crear Apartado
                    </button>
                </div>
            </div>
        </Modal>
    );
};
