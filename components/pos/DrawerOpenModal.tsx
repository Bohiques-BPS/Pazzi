import React, { useState } from 'react';
import { Modal } from '../Modal';
import { inputFormStyle, BUTTON_SECONDARY_SM_CLASSES, BUTTON_PRIMARY_SM_CLASSES } from '../../constants';
import { authService } from '../../services/auth';
import { useTranslation } from '../../contexts/GlobalSettingsContext';

interface DrawerOpenModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** Se llama con la razón validada (tras verificar el PIN). El padre registra el movimiento y abre la gaveta. */
    onConfirm: (reason: string) => void | Promise<void>;
}

/**
 * Apertura manual de la gaveta ("Sin venta"): exige RAZÓN + PIN del empleado antes de abrir.
 * El registro (quién, razón) queda guardado como CashMovement tipo DRAWER_OPEN en el turno.
 */
export const DrawerOpenModal: React.FC<DrawerOpenModalProps> = ({ isOpen, onClose, onConfirm }) => {
    const { t } = useTranslation();
    const [reason, setReason] = useState('');
    const [pin, setPin] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const reset = () => { setReason(''); setPin(''); setError(null); };
    const handleClose = () => { reset(); onClose(); };

    const handleConfirm = async () => {
        setError(null);
        if (!reason.trim()) { setError(t('posx.drawer.err_reason')); return; }
        if (!pin.trim()) { setError(t('posx.drawer.err_pin')); return; }
        setSubmitting(true);
        try {
            const { valid } = await authService.verifyPin(pin.trim());
            if (!valid) { setError(t('posx.drawer.err_pin_invalid')); setSubmitting(false); return; }
            await onConfirm(reason.trim());
            reset();
            onClose();
        } catch {
            setError(t('posx.drawer.err_verify'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title={t('posx.drawer.title')} size="sm">
            <div className="space-y-4">
                <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('posx.drawer.subtitle')}</p>

                <div>
                    <label className="block text-sm font-medium mb-1">{t('posx.drawer.reason')} <span className="text-red-500">*</span></label>
                    <input
                        type="text"
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        placeholder={t('posx.drawer.reason_ph')}
                        className={`${inputFormStyle} w-full`}
                        autoFocus
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">{t('posx.drawer.pin')} <span className="text-red-500">*</span></label>
                    <input
                        type="password"
                        inputMode="numeric"
                        value={pin}
                        onChange={e => setPin(e.target.value)}
                        placeholder="••••"
                        onKeyDown={e => { if (e.key === 'Enter') handleConfirm(); }}
                        className={`${inputFormStyle} w-full tracking-widest`}
                    />
                </div>

                {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

                <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={handleClose} className={BUTTON_SECONDARY_SM_CLASSES}>{t('common.cancel')}</button>
                    <button type="button" onClick={handleConfirm} disabled={submitting} className={`${BUTTON_PRIMARY_SM_CLASSES} disabled:opacity-50`}>
                        {submitting ? t('posx.drawer.opening') : t('posx.drawer.open')}
                    </button>
                </div>
            </div>
        </Modal>
    );
};
