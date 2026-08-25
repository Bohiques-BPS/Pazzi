import React, { useState } from 'react';
import { Modal } from '../Modal';
import { INPUT_SM_CLASSES, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import { EyeIcon, EyeSlashIcon } from '../icons';
import { useTranslation } from '../../contexts/GlobalSettingsContext';
import { api, ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';

interface Props {
    methodId: string;
    field: string;            // 'privateToken' | 'clientSecret' | 'secretKey'
    value: string;
    onChange: (v: string) => void;
    /** El backend indica que hay un secreto guardado (aunque no lo envíe). */
    hasSecret: boolean;
    placeholder?: string;
}

/**
 * Campo de secreto (token privado / client secret): enmascarado con ••••••, con un ojito.
 * Si el campo ya tiene valor local, el ojito solo alterna ver/ocultar. Si está vacío pero hay
 * un secreto guardado en el servidor, el ojito pide la CONTRASEÑA del usuario para revelarlo.
 */
export const SecretInput: React.FC<Props> = ({ methodId, field, value, onChange, hasSecret, placeholder }) => {
    const { t } = useTranslation();
    const [visible, setVisible] = useState(false);
    const [askPw, setAskPw] = useState(false);
    const [pw, setPw] = useState('');
    const [busy, setBusy] = useState(false);

    const onEye = () => {
        if (value) { setVisible(v => !v); return; }   // hay valor a la vista → alternar
        if (hasSecret) { setAskPw(true); return; }    // secreto guardado en el server → pedir clave
        setVisible(v => !v);
    };

    const doReveal = async () => {
        if (!pw.trim()) return;
        setBusy(true);
        try {
            const r = await api.post<{ value: string }>('/settings/reveal-secret', { methodId, field, password: pw });
            onChange(r.value);
            setVisible(true);
            setAskPw(false);
            setPw('');
        } catch (err) {
            const bad = err instanceof ApiError && (err as any).code === 'bad_password';
            toast.error(bad ? t('posx.paymentmethods.bad_password') : t('posx.paymentmethods.reveal_error'));
        } finally { setBusy(false); }
    };

    return (
        <div className="relative">
            <input
                type={visible ? 'text' : 'password'}
                value={value}
                onChange={e => onChange(e.target.value)}
                className={`${INPUT_SM_CLASSES} w-full pr-9`}
                placeholder={hasSecret ? t('posx.paymentmethods.secret_saved') : (placeholder || '••••••••')}
                autoComplete="off"
            />
            <button
                type="button"
                onClick={onEye}
                className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                title={t('posx.paymentmethods.reveal')}
                aria-label={t('posx.paymentmethods.reveal')}
            >
                {visible ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
            </button>

            <Modal isOpen={askPw} onClose={() => { setAskPw(false); setPw(''); }} title={t('posx.paymentmethods.reveal_title')} size="sm">
                <div className="space-y-3">
                    <p className="text-sm text-neutral-600 dark:text-neutral-300">{t('posx.paymentmethods.reveal_desc')}</p>
                    <input
                        type="password"
                        value={pw}
                        onChange={e => setPw(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); doReveal(); } }}
                        placeholder={t('posx.paymentmethods.reveal_pw_ph')}
                        className={`${INPUT_SM_CLASSES} w-full`}
                        autoFocus
                        autoComplete="current-password"
                    />
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => { setAskPw(false); setPw(''); }} className={BUTTON_SECONDARY_SM_CLASSES}>{t('common.cancel')}</button>
                        <button type="button" onClick={doReveal} disabled={busy || !pw.trim()} className={`${BUTTON_PRIMARY_SM_CLASSES} disabled:opacity-50`}>
                            {busy ? '…' : t('posx.paymentmethods.reveal')}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
