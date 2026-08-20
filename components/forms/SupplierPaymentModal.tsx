import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { inputFormStyle, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import { supplierOrdersService, type SupplierOrderRecord } from '../../services/supplierOrders';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';
import { ExclamationTriangleIcon } from '../icons';
import { useTranslation } from '../../contexts/GlobalSettingsContext';

interface SupplierPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: SupplierOrderRecord | null;
    onPaid?: (updated: SupplierOrderRecord) => void;
}

export const SupplierPaymentModal: React.FC<SupplierPaymentModalProps> = ({
    isOpen,
    onClose,
    order,
    onPaid,
}) => {
    const { t } = useTranslation();
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setAmount('');
            setNote('');
            setError(null);
        }
    }, [isOpen]);

    if (!isOpen || !order) return null;

    const pending = Math.max(0, order.totalCost - order.amountPaid);
    const parsedAmount = parseFloat(amount) || 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (parsedAmount <= 0) {
            setError(t('cmpx.common.err_amount_gt0'));
            return;
        }
        if (parsedAmount > pending + 0.01) {
            setError(t('cmpx.supplierpay.err_exceeds', { amount: pending.toFixed(2) }));
            return;
        }
        setSubmitting(true);
        try {
            const res = await supplierOrdersService.recordPayment(order.id, {
                amount: parsedAmount,
                note: note.trim() || undefined,
            });
            toast.success(t('cmpx.supplierpay.recorded', { amount: parsedAmount.toFixed(2), status: res.payment.paymentStatus }));
            onPaid?.(res.order);
            onClose();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : t('cmpx.common.err_payment_save'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('cmpx.supplierpay.title', { id: order.id.slice(0, 8).toUpperCase() })} size="md">
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="p-3 rounded-md bg-red-50 border border-red-200 flex items-center text-red-700 text-sm">
                        <ExclamationTriangleIcon className="w-5 h-5 mr-2 flex-shrink-0" />
                        {error}
                    </div>
                )}

                <div className="text-sm space-y-1 p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-md">
                    <div className="flex justify-between">
                        <span className="text-neutral-600 dark:text-neutral-300">{t('cmpx.supplierpay.total_order')}</span>
                        <span>${order.totalCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-neutral-600 dark:text-neutral-300">{t('cmpx.supplierpay.paid_to_date')}</span>
                        <span>${order.amountPaid.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-1 mt-1 border-neutral-300 dark:border-neutral-600">
                        <span>{t('cmpx.supplierpay.pending_balance')}</span>
                        <span className="text-primary">${pending.toFixed(2)}</span>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium">{t('cmpx.supplierpay.amount')}</label>
                    <div className="relative mt-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">$</span>
                        <input
                            type="number"
                            min="0.01"
                            max={pending}
                            step="0.01"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            className={`${inputFormStyle} pl-7`}
                            placeholder="0.00"
                            required
                            autoFocus
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium">{t('cmpx.supplierpay.note_label')}</label>
                    <textarea
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        rows={2}
                        className={inputFormStyle}
                        placeholder={t('cmpx.supplierpay.note_ph')}
                    />
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                    <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES} disabled={submitting}>
                        {t('common.cancel')}
                    </button>
                    <button type="submit" className={BUTTON_PRIMARY_SM_CLASSES} disabled={submitting || pending <= 0}>
                        {submitting ? t('cmpx.common.registering') : t('cmpx.supplierpay.submit')}
                    </button>
                </div>
            </form>
        </Modal>
    );
};
