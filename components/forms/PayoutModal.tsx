import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { inputFormStyle, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import { useAuth } from '../../contexts/AuthContext';
import { cajasService, type CashMovement } from '../../services/cajas';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';
import { ExclamationTriangleIcon } from '../icons';
import { useTranslation } from '../../contexts/GlobalSettingsContext';

interface PayoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    cajaId: string;
    /** Efectivo disponible en caja (para validación visual). El BE re-valida. */
    currentCashInDrawer: number;
    onRecorded?: (movement: CashMovement) => void;
}

export const PayoutModal: React.FC<PayoutModalProps> = ({
    isOpen,
    onClose,
    cajaId,
    currentCashInDrawer,
    onRecorded,
}) => {
    const { t } = useTranslation();
    const { currentUser } = useAuth();
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [receiptCount, setReceiptCount] = useState('1');
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setAmount('');
            setReason('');
            setReceiptCount('1');
            setInvoiceNumber('');
            setError(null);
        }
    }, [isOpen]);

    const handleConfirm = async () => {
        setError(null);
        const payoutAmount = parseFloat(amount);
        if (isNaN(payoutAmount) || payoutAmount <= 0) {
            setError(t('cmpx.common.err_amount_gt0'));
            return;
        }
        if (payoutAmount > currentCashInDrawer) {
            setError(t('cmpx.payout.err_exceeds', { amount: currentCashInDrawer.toFixed(2) }));
            return;
        }
        if (!reason.trim()) {
            setError(t('cmpx.payout.err_reason'));
            return;
        }

        setSubmitting(true);
        try {
            const movement = await cajasService.recordCashMovement(cajaId, {
                type: 'PAYOUT',
                amount: payoutAmount,
                reason: reason.trim(),
                receiptCount: parseInt(receiptCount, 10) || undefined,
                invoiceNumber: invoiceNumber.trim() || undefined,
                authorizedByUserId: currentUser?.role === 'MANAGER' ? currentUser.id : undefined,
            });
            toast.success(t('cmpx.payout.recorded', { amount: payoutAmount.toFixed(2) }));
            onRecorded?.(movement);
            onClose();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : t('cmpx.payout.err_save'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('cmpx.payout.title')} size="lg">
            <div className="space-y-4">
                <div className="text-sm p-3 rounded-md bg-neutral-50 dark:bg-neutral-700/50 flex justify-between">
                    <span className="text-neutral-600 dark:text-neutral-300">{t('cmpx.payout.cash_available')}</span>
                    <span className="font-semibold">${currentCashInDrawer.toFixed(2)}</span>
                </div>

                <div>
                    <label htmlFor="payoutAmount" className="block text-sm font-medium">{t('cmpx.payout.amount')}</label>
                    <div className="relative mt-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">$</span>
                        <input
                            type="number"
                            id="payoutAmount"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            className={`${inputFormStyle} pl-7`}
                            placeholder="0.00"
                            min="0.01"
                            step="0.01"
                            max={currentCashInDrawer}
                            autoFocus
                        />
                    </div>
                </div>

                <div>
                    <label htmlFor="payoutReason" className="block text-sm font-medium">{t('cmpx.payout.reason')}</label>
                    <textarea
                        id="payoutReason"
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        rows={3}
                        className={inputFormStyle}
                        placeholder={t('cmpx.payout.reason_ph')}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="receiptCount" className="block text-sm font-medium">{t('cmpx.payout.receipt_count')}</label>
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
                        <label htmlFor="invoiceNumber" className="block text-sm font-medium">{t('cmpx.payout.invoice_number')}</label>
                        <input
                            type="text"
                            id="invoiceNumber"
                            value={invoiceNumber}
                            onChange={e => setInvoiceNumber(e.target.value)}
                            className={inputFormStyle}
                        />
                    </div>
                </div>

                <div className="text-xs text-neutral-500 dark:text-neutral-400">
                    {t('cmpx.payout.recorded_by')} <strong>{currentUser?.name} {currentUser?.lastName}</strong>
                    {currentUser?.role === 'MANAGER' && ` ${t('cmpx.payout.self_authorized')}`}
                </div>

                {error && (
                    <div className="p-3 rounded-md bg-red-50 border border-red-200 flex items-center text-red-700 text-sm">
                        <ExclamationTriangleIcon className="w-5 h-5 mr-2 flex-shrink-0" />
                        {error}
                    </div>
                )}

                <div className="flex justify-end space-x-2 pt-4">
                    <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>{t('common.cancel')}</button>
                    <button type="button" onClick={handleConfirm} className={BUTTON_PRIMARY_SM_CLASSES} disabled={submitting}>
                        {submitting ? t('cmpx.common.registering') : t('cmpx.payout.submit')}
                    </button>
                </div>
            </div>
        </Modal>
    );
};
