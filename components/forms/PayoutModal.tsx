import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { inputFormStyle, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import { useAuth } from '../../contexts/AuthContext';
import { cajasService, type CashMovement } from '../../services/cajas';
import { authService } from '../../services/auth';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';
import { ExclamationTriangleIcon, DocumentArrowUpIcon, PhotoIcon } from '../icons';
import { PasswordInput } from '../ui/PasswordInput';
import { useTranslation, useGlobalSettings } from '../../contexts/GlobalSettingsContext';
import { printPayoutVoucher } from '../../utils/printPayoutVoucher';

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
    const { settings } = useGlobalSettings();
    const { currentUser } = useAuth();
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [receiptCount, setReceiptCount] = useState('1');
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [pin, setPin] = useState('');
    const [attachment, setAttachment] = useState<string | undefined>(undefined);
    const [attachmentName, setAttachmentName] = useState<string | undefined>(undefined);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setAmount('');
            setReason('');
            setReceiptCount('1');
            setInvoiceNumber('');
            setPin('');
            setAttachment(undefined);
            setAttachmentName(undefined);
            setError(null);
        }
    }, [isOpen]);

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 3 * 1024 * 1024) { setError(t('cmpx.payout.err_file_size') || 'El archivo no puede superar 3 MB.'); return; }
        const reader = new FileReader();
        reader.onloadend = () => { setAttachment(reader.result as string); setAttachmentName(file.name); };
        reader.readAsDataURL(file);
    };

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
        if (!pin.trim()) {
            setError(t('cmpx.payout.err_pin') || 'Ingresa el PIN de autorización.');
            return;
        }

        setSubmitting(true);
        try {
            // El desembolso SIEMPRE requiere autorización por PIN de supervisor (gerente).
            const { manager } = await authService.verifySupervisorPin(pin.trim());
            const movement = await cajasService.recordCashMovement(cajaId, {
                type: 'PAYOUT',
                amount: payoutAmount,
                reason: reason.trim(),
                receiptCount: parseInt(receiptCount, 10) || undefined,
                invoiceNumber: invoiceNumber.trim() || undefined,
                attachment,
                authorizedByUserId: manager?.id,
            });
            // Comprobante impreso del desembolso (antes no se generaba ninguno).
            try {
                const rc: any = (settings as any)?.receiptConfig || {};
                printPayoutVoucher({
                    amount: payoutAmount,
                    reason: reason.trim(),
                    receiptCount,
                    invoiceNumber: invoiceNumber.trim(),
                    recordedBy: `${currentUser?.name || ''} ${(currentUser as any)?.lastName || ''}`.trim(),
                    authorizedBy: manager ? `${manager.name || ''} ${(manager as any).lastName || ''}`.trim() : undefined,
                    date: new Date(),
                }, { businessName: rc.businessName, address: rc.address, phone: rc.phone });
            } catch { /* la impresión no debe bloquear el registro */ }
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

                {/* Justificante opcional (imagen o PDF). */}
                <div>
                    <label className="block text-sm font-medium">{t('cmpx.payout.attachment') || 'Justificante (opcional)'}</label>
                    <div className="mt-1 flex items-center gap-2">
                        <button type="button" onClick={() => fileInputRef.current?.click()} className={BUTTON_SECONDARY_SM_CLASSES}>
                            <DocumentArrowUpIcon className="w-4 h-4 mr-2" /> {t('common.search')}...
                        </button>
                        <input ref={fileInputRef} type="file" onChange={handleFile} className="hidden" accept="image/*,.pdf" />
                        {attachmentName && (
                            <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                                <PhotoIcon className="w-4 h-4 text-green-500" />
                                <span className="truncate max-w-[180px]">{attachmentName}</span>
                                <button type="button" onClick={() => { setAttachment(undefined); setAttachmentName(undefined); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="text-red-500 text-xs">X</button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Autorización obligatoria por PIN de supervisor. */}
                <div>
                    <label className="block text-sm font-medium">{t('cmpx.payout.pin') || 'PIN de autorización'}</label>
                    <PasswordInput
                        value={pin}
                        onChange={e => setPin(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !submitting) handleConfirm(); }}
                        className={inputFormStyle}
                        placeholder="****"
                        inputMode="numeric"
                        maxLength={6}
                    />
                    <p className="text-xs text-neutral-500 mt-1">{t('cmpx.payout.pin_hint') || 'Requiere el PIN de un supervisor o gerente para autorizar el desembolso.'}</p>
                </div>

                <div className="text-xs text-neutral-500 dark:text-neutral-400">
                    {t('cmpx.payout.recorded_by')} <strong>{currentUser?.name} {currentUser?.lastName}</strong>
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
