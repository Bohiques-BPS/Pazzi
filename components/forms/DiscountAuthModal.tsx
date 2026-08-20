import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { inputFormStyle, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import { authService } from '../../services/auth';
import { PasswordInput } from '../ui/PasswordInput';
import { ApiError } from '../../services/api';
import { useTranslation } from '../../contexts/GlobalSettingsContext';

interface DiscountAuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (discount: { type: 'percentage' | 'fixed'; value: number }) => void;
    currentDiscount?: { type: 'percentage' | 'fixed'; value: number } | null;
}

export const DiscountAuthModal: React.FC<DiscountAuthModalProps> = ({ isOpen, onClose, onApply, currentDiscount }) => {
    const { t } = useTranslation();
    const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
    const [discountValue, setDiscountValue] = useState('');
    const [supervisorPin, setSupervisorPin] = useState('');
    const [error, setError] = useState('');
    const [authorizing, setAuthorizing] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (currentDiscount) {
                setDiscountType(currentDiscount.type);
                setDiscountValue(currentDiscount.value.toString());
            } else {
                setDiscountType('percentage');
                setDiscountValue('');
            }
            setSupervisorPin('');
            setError('');
        }
    }, [isOpen, currentDiscount]);

    const handleApply = async () => {
        setError('');
        const value = parseFloat(discountValue);
        if (isNaN(value) || value <= 0) {
            setError(t('cmpx.discount.err_value'));
            return;
        }
        if (discountType === 'percentage' && value > 100) {
            setError(t('cmpx.discount.err_max_percent'));
            return;
        }
        if (!supervisorPin) {
            setError(t('cmpx.discount.err_pin'));
            return;
        }

        setAuthorizing(true);
        try {
            await authService.verifySupervisorPin(supervisorPin);
            onApply({ type: discountType, value });
            onClose();
        } catch (err) {
            if (err instanceof ApiError && err.status === 401) {
                setError(t('cmpx.common.err_pin_incorrect'));
            } else {
                setError(err instanceof ApiError ? err.message : t('cmpx.common.err_pin_verify'));
            }
        } finally {
            setAuthorizing(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={currentDiscount ? t('cmpx.discount.title_edit') : t('cmpx.discount.title_new')} size="md">
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium">{t('cmpx.discount.type_label')}</label>
                    <select value={discountType} onChange={e => setDiscountType(e.target.value as any)} className={inputFormStyle}>
                        <option value="percentage">{t('cmpx.discount.type_percentage')}</option>
                        <option value="fixed">{t('cmpx.discount.type_fixed')}</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium">{t('cmpx.discount.value_label')}</label>
                    <input
                        type="number"
                        value={discountValue}
                        onChange={e => setDiscountValue(e.target.value)}
                        className={inputFormStyle}
                        placeholder={discountType === 'percentage' ? t('cmpx.discount.value_ph_percent') : t('cmpx.discount.value_ph_fixed')}
                        step="0.01"
                        min="0"
                        autoFocus
                    />
                </div>
                <div className="border-t pt-4 dark:border-neutral-700">
                    <label className="block text-sm font-medium">{t('cmpx.common.supervisor_pin')}</label>
                    <PasswordInput
                        value={supervisorPin}
                        onChange={e => setSupervisorPin(e.target.value)}
                        className={inputFormStyle}
                        placeholder="****"
                        inputMode="numeric"
                        pattern="\d*"
                        maxLength={6}
                    />
                    <p className="text-xs text-neutral-500 mt-1">
                        {t('cmpx.discount.pin_hint')}
                    </p>
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <div className="flex justify-end space-x-2 pt-4">
                    <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES} disabled={authorizing}>{t('common.cancel')}</button>
                    <button type="button" onClick={handleApply} className={BUTTON_PRIMARY_SM_CLASSES} disabled={authorizing}>
                        {authorizing ? t('cmpx.common.authorizing') : (currentDiscount ? t('cmpx.discount.submit_edit') : t('cmpx.discount.submit_new'))}
                    </button>
                </div>
            </div>
        </Modal>
    );
};
