import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/Modal';
import { Sale } from '../../types';
import { useData } from '../../contexts/DataContext';
import { inputFormStyle, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';

interface ReceivableEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    saleToEdit: Sale | null;
}

export const ReceivableEditModal: React.FC<ReceivableEditModalProps> = ({ isOpen, onClose, saleToEdit }) => {
    const { setSales } = useData();
    const [dueDate, setDueDate] = useState('');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (saleToEdit && isOpen) {
            setDueDate(saleToEdit.dueDate || '');
            setNotes(saleToEdit.receivableNotes || '');
        } else if (!isOpen) {
            setDueDate('');
            setNotes('');
        }
    }, [saleToEdit, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!saleToEdit) return;

        const updatedSale: Sale = {
            ...saleToEdit,
            dueDate: dueDate.trim() || undefined,
            receivableNotes: notes.trim() || undefined,
        };

        setSales(prevSales => prevSales.map(s => s.id === saleToEdit.id ? updatedSale : s));
        onClose();
    };

    if (!saleToEdit) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Editar Cuenta por Cobrar - Venta #${saleToEdit.id.substring(0,8)}`} size="lg">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-300">
                        Cliente: {saleToEdit.clientId ? saleToEdit.clientId : 'Contado'} <br/>
                        Monto Original: ${saleToEdit.totalAmount.toFixed(2)}
                    </p>
                </div>
                <div>
                    <label htmlFor="dueDate" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Fecha de Vencimiento</label>
                    <input
                        type="date"
                        id="dueDate"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className={inputFormStyle + " w-full mt-1"}
                    />
                </div>
                <div>
                    <label htmlFor="receivableNotes" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Notas de Cobranza</label>
                    <textarea
                        id="receivableNotes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        className={inputFormStyle + " w-full mt-1"}
                        placeholder="Notas internas sobre esta cuenta por cobrar..."
                    />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                    <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button>
                    <button type="submit" className={BUTTON_PRIMARY_SM_CLASSES}>Guardar Cambios</button>
                </div>
            </form>
        </Modal>
    );
};
