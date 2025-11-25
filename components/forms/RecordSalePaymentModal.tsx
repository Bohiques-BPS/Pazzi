
import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { Sale } from '../../types';
import { inputFormStyle, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import { DocumentArrowUpIcon, PhotoIcon } from '../icons';
import { useTranslation } from '../../contexts/GlobalSettingsContext';

interface RecordSalePaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    sale: (Sale & { balance: number }) | null;
    onConfirm: (saleId: string, amount: number, method: string, notes: string, attachment?: string) => void;
}

export const RecordSalePaymentModal: React.FC<RecordSalePaymentModalProps> = ({ isOpen, onClose, sale, onConfirm }) => {
    const { t } = useTranslation();
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState('Efectivo');
    const [notes, setNotes] = useState('');
    const [attachment, setAttachment] = useState<string | undefined>(undefined);
    const [attachmentName, setAttachmentName] = useState<string | undefined>(undefined);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (sale && isOpen) {
            setAmount(sale.balance.toFixed(2));
            setMethod('Efectivo');
            setNotes('');
            setAttachment(undefined);
            setAttachmentName(undefined);
            setError(null);
        }
    }, [sale, isOpen]);

    if (!isOpen || !sale) return null;

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setAttachment(reader.result as string);
                setAttachmentName(file.name);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setAmount(val);
        
        const numVal = parseFloat(val);
        if (numVal > sale.balance + 0.01) {
            setError(`El monto no puede exceder el saldo pendiente de $${sale.balance.toFixed(2)}`);
        } else {
            setError(null);
        }
    };

    const handleConfirm = () => {
        const paymentAmount = parseFloat(amount);
        
        if (isNaN(paymentAmount) || paymentAmount <= 0) {
            setError('Por favor ingrese un monto válido mayor a 0.');
            return;
        }

        if (paymentAmount > sale.balance + 0.001) {
            setError(`Monto inválido. No puede ser mayor al balance de $${sale.balance.toFixed(2)}.`);
            return;
        }
        
        onConfirm(sale.id, paymentAmount, method, notes, attachment);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('pos.receivable.payment_modal.title', { id: sale.id.substring(0,8) })}>
            <div className="space-y-4">
                <p>{t('pos.receivable.payment_modal.balance')}: <span className="font-bold text-red-500">${sale.balance.toFixed(2)}</span></p>
                <div>
                    <label className="block text-sm">{t('pos.receivable.payment_modal.amount')}</label>
                    <input 
                        type="number" 
                        value={amount} 
                        onChange={handleAmountChange} 
                        className={`${inputFormStyle} ${error ? 'border-red-500 focus:ring-red-500' : ''}`}
                        max={sale.balance.toFixed(2)} 
                        step="0.01" 
                        autoFocus 
                    />
                    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
                </div>
                <div>
                    <label className="block text-sm">{t('pos.receivable.payment_modal.method')}</label>
                    <select value={method} onChange={e => setMethod(e.target.value)} className={inputFormStyle}>
                        <option>Efectivo</option><option>Tarjeta</option><option>ATH Móvil</option><option>Cheque</option><option>Transferencia</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm">{t('pos.receivable.payment_modal.reference')}</label>
                    <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className={inputFormStyle} placeholder="Factura #12345" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">{t('pos.receivable.payment_modal.attachment')}</label>
                    <div className="mt-1 flex items-center space-x-2">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className={BUTTON_SECONDARY_SM_CLASSES}
                        >
                            <DocumentArrowUpIcon className="w-4 h-4 mr-2" />
                            {t('common.search')}...
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            onChange={handleFileChange}
                            className="hidden"
                            accept="image/*,.pdf"
                        />
                        {attachmentName && (
                            <div className="flex items-center space-x-2 text-sm text-neutral-600 dark:text-neutral-300">
                                <PhotoIcon className="w-4 h-4 text-green-500"/>
                                <span className="truncate max-w-xs">{attachmentName}</span>
                                <button type="button" onClick={() => {setAttachment(undefined); setAttachmentName(undefined); if(fileInputRef.current) fileInputRef.current.value = '';}} className="text-red-500 text-xs">X</button>
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                    <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>{t('common.cancel')}</button>
                    <button 
                        type="button" 
                        onClick={handleConfirm} 
                        className={`${BUTTON_PRIMARY_SM_CLASSES} ${error ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={!!error}
                    >
                        {t('pos.receivable.payment_modal.register')}
                    </button>
                </div>
            </div>
        </Modal>
    );
};
