
import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/Modal';
import { Sale } from '../../types';
import { useData } from '../../contexts/DataContext';
import { inputFormStyle, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import { RichTextEditor } from '../../components/ui/RichTextEditor';
import { useTranslation } from '../../contexts/GlobalSettingsContext';

interface ReceivableEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    saleToEdit: Sale | null;
}

export const ReceivableEditModal: React.FC<ReceivableEditModalProps> = ({ isOpen, onClose, saleToEdit }) => {
    const { t } = useTranslation();
    const { setSales, getClientById } = useData();
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

    const client = saleToEdit.clientId ? getClientById(saleToEdit.clientId) : null;
    const clientName = client ? `${client.name} ${client.lastName}` : (saleToEdit.clientId || 'Contado');

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('pos.receivable.edit_modal.title', { id: saleToEdit.id.substring(0,8) })} size="lg">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="bg-neutral-50 dark:bg-neutral-700/30 p-3 rounded-md border border-neutral-200 dark:border-neutral-600">
                    <p className="text-sm text-neutral-600 dark:text-neutral-300">
                        <strong>{t('pos.receivable.edit_modal.client')}:</strong> {clientName} <br/>
                        <strong>{t('pos.receivable.edit_modal.original_amount')}:</strong> ${saleToEdit.totalAmount.toFixed(2)} <br/>
                        <strong>Fecha Venta:</strong> {new Date(saleToEdit.date).toLocaleDateString()}
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Detalle de Productos</label>
                    <div className="border border-neutral-200 dark:border-neutral-600 rounded-md overflow-hidden max-h-40 overflow-y-auto">
                        <table className="min-w-full text-xs sm:text-sm">
                            <thead className="bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 sticky top-0">
                                <tr>
                                    <th className="px-3 py-2 text-left font-medium">Producto</th>
                                    <th className="px-3 py-2 text-right font-medium">Cant.</th>
                                    <th className="px-3 py-2 text-right font-medium">Precio</th>
                                    <th className="px-3 py-2 text-right font-medium">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-600 bg-white dark:bg-neutral-800">
                                {saleToEdit.items.map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="px-3 py-2">{item.name}</td>
                                        <td className="px-3 py-2 text-right">{item.quantity}</td>
                                        <td className="px-3 py-2 text-right">${item.unitPrice.toFixed(2)}</td>
                                        <td className="px-3 py-2 text-right">${(item.unitPrice * item.quantity).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="dueDate" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">{t('pos.receivable.edit_modal.due_date')}</label>
                        <input
                            type="date"
                            id="dueDate"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            className={inputFormStyle + " w-full mt-1"}
                        />
                    </div>
                </div>

                <div>
                    <label htmlFor="receivableNotes" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">{t('pos.receivable.edit_modal.notes')}</label>
                    <RichTextEditor
                        value={notes}
                        onChange={setNotes}
                        placeholder="Notas internas sobre esta cuenta por cobrar..."
                    />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                    <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>{t('common.cancel')}</button>
                    <button type="submit" className={BUTTON_PRIMARY_SM_CLASSES}>{t('common.save')}</button>
                </div>
            </form>
        </Modal>
    );
};
