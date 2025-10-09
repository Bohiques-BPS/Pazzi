import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../Modal';
import { inputFormStyle, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import { useAuth } from '../../contexts/AuthContext';
import { User, UserRole } from '../../types';

interface PayoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (amount: number, reason: string) => void;
    currentCashInDrawer: number;
}

const payoutReasons = [
    'Depósito a Caja Fuerte DROP', 'Mercancía', 'Suplidores',
    'Maquinas', 'Loto', 'Instantáneos',
    'Western Union', 'Vales', 'Otros'
];

export const PayoutModal: React.FC<PayoutModalProps> = ({ isOpen, onClose, onConfirm, currentCashInDrawer }) => {
    const { allUsers } = useAuth();
    const [amount, setAmount] = useState('');
    const [authorizedBy, setAuthorizedBy] = useState('');
    const [comments, setComments] = useState('');
    const [receiptCount, setReceiptCount] = useState('1');
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [error, setError] = useState('');

    const managers = useMemo(() => {
        return allUsers.filter(u => u.role === UserRole.MANAGER);
    }, [allUsers]);

    useEffect(() => {
        if (isOpen) {
            setAmount('');
            setAuthorizedBy(managers.length > 0 ? managers[0].id : '');
            setComments('');
            setReceiptCount('1');
            setInvoiceNumber('');
            setError('');
        }
    }, [isOpen, managers]);

    const handleConfirm = () => {
        const payoutAmount = parseFloat(amount);
        if (isNaN(payoutAmount) || payoutAmount <= 0) {
            setError('Por favor, ingrese un monto válido.');
            return;
        }
        if (payoutAmount > currentCashInDrawer) {
            setError(`El retiro no puede exceder el efectivo en caja ($${currentCashInDrawer.toFixed(2)}).`);
            return;
        }
        if (!authorizedBy) {
            setError('Debe seleccionar un administrador que autoriza.');
            return;
        }
        if (!comments.trim()) {
            setError('Debe seleccionar una razón o añadir un comentario.');
            return;
        }

        const authorizingManager = managers.find(m => m.id === authorizedBy);
        const fullReason = `
            Razón: ${comments}.
            Autorizado por: ${authorizingManager?.name || 'N/A'}.
            ${invoiceNumber ? `Factura #: ${invoiceNumber}.` : ''}
            ${receiptCount ? `Recibos: ${receiptCount}.` : ''}
        `.trim().replace(/\s+/g, ' ');

        onConfirm(payoutAmount, fullReason);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Desembolsos - Pay Out" size="3xl">
            <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {payoutReasons.map(reason => (
                        <button
                            key={reason}
                            onClick={() => setComments(reason)}
                            className={`p-3 text-center border rounded-md transition-colors text-sm font-medium
                                ${comments === reason
                                    ? 'bg-primary text-white border-primary'
                                    : 'bg-neutral-100 dark:bg-neutral-700 border-neutral-300 dark:border-neutral-600 hover:bg-neutral-200 dark:hover:bg-neutral-600'
                                }`}
                        >
                            {reason}
                        </button>
                    ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t dark:border-neutral-600">
                    <div>
                        <label htmlFor="authorizedBy" className="block text-sm font-medium">Autorizado por</label>
                        <select id="authorizedBy" value={authorizedBy} onChange={e => setAuthorizedBy(e.target.value)} className={inputFormStyle}>
                            {managers.map(manager => (
                                <option key={manager.id} value={manager.id}>{manager.name} {manager.lastName}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                         <label htmlFor="payoutAmount" className="block text-sm font-medium">Cantidad</label>
                         <input
                            type="number"
                            id="payoutAmount"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            className={inputFormStyle}
                            placeholder="0.00"
                            min="0.01"
                            step="0.01"
                            max={currentCashInDrawer}
                        />
                    </div>
                </div>
                <div>
                     <label htmlFor="payoutComments" className="block text-sm font-medium">Comentarios</label>
                     <textarea
                        id="payoutComments"
                        value={comments}
                        onChange={e => setComments(e.target.value)}
                        rows={2}
                        className={inputFormStyle}
                        placeholder="Escriba la razón del desembolso o seleccione una de las opciones de arriba"
                     />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="receiptCount" className="block text-sm font-medium">Cantidad Recibos</label>
                        <input
                            type="number"
                            id="receiptCount"
                            value={receiptCount}
                            onChange={e => setReceiptCount(e.target.value)}
                            className={inputFormStyle}
                            min="0"
                            step="1"
                        />
                    </div>
                     <div>
                        <label htmlFor="invoiceNumber" className="block text-sm font-medium">Número de Factura</label>
                        <input
                            type="text"
                            id="invoiceNumber"
                            value={invoiceNumber}
                            onChange={e => setInvoiceNumber(e.target.value)}
                            className={inputFormStyle}
                        />
                    </div>
                </div>
                 {error && <p className="text-xs text-center text-red-500">{error}</p>}
                <div className="flex justify-end space-x-2 pt-4">
                    <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button>
                    <button type="button" onClick={handleConfirm} className={BUTTON_PRIMARY_SM_CLASSES}>Aceptar</button>
                </div>
            </div>
        </Modal>
    );
};
