import React from 'react';
import { Modal } from '../Modal';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';

interface EndShiftModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    shiftData: {
        totalSales: number;
        cashSales: number;
        cardSales: number;
        otherSales: number;
        startingCash: number;
        payouts: number;
        expectedCash: number;
    };
}

export const EndShiftModal: React.FC<EndShiftModalProps> = ({ isOpen, onClose, onConfirm, shiftData }) => {
    
    const { totalSales, cashSales, cardSales, otherSales, startingCash, payouts, expectedCash } = shiftData;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Resumen y Cierre de Turno" size="md">
            <div className="space-y-3">
                <h3 className="text-lg font-semibold text-primary">Resumen del Turno</h3>
                <div className="text-sm space-y-1 p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-md">
                    <div className="flex justify-between"><span className="text-neutral-500 dark:text-neutral-400">Ventas Totales:</span> <span className="font-medium">${totalSales.toFixed(2)}</span></div>
                    <div className="flex justify-between pl-4"><span className="text-neutral-500 dark:text-neutral-400">En Efectivo:</span> <span>${cashSales.toFixed(2)}</span></div>
                    <div className="flex justify-between pl-4"><span className="text-neutral-500 dark:text-neutral-400">En Tarjeta:</span> <span>${cardSales.toFixed(2)}</span></div>
                    <div className="flex justify-between pl-4"><span className="text-neutral-500 dark:text-neutral-400">Otros Métodos:</span> <span>${otherSales.toFixed(2)}</span></div>
                </div>
                <div className="text-sm space-y-1 p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-md">
                    <div className="flex justify-between"><span className="text-neutral-500 dark:text-neutral-400">Fondo Inicial:</span> <span>${startingCash.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-neutral-500 dark:text-neutral-400">Ventas en Efectivo:</span> <span>+ ${cashSales.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-neutral-500 dark:text-neutral-400">Retiros (Payouts):</span> <span>- ${payouts.toFixed(2)}</span></div>
                    <div className="flex justify-between font-semibold border-t pt-1 mt-1 border-neutral-300 dark:border-neutral-600">
                        <span>Efectivo Esperado en Caja:</span> 
                        <span className="text-lg text-primary">${expectedCash.toFixed(2)}</span>
                    </div>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Por favor, cuente el efectivo en la caja y asegúrese de que coincida con el monto esperado antes de cerrar el turno.
                </p>
                <div className="flex justify-end space-x-2 pt-4">
                    <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>Continuar Turno</button>
                    <button type="button" onClick={onConfirm} className={BUTTON_PRIMARY_SM_CLASSES}>Finalizar Turno</button>
                </div>
            </div>
        </Modal>
    );
};