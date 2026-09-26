import React, { useState } from 'react';
import { Modal } from './Modal';
import { useAuth } from '../contexts/AuthContext';
import { inputFormStyle, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../constants';
import { ExclamationTriangleIcon } from './icons';

/**
 * Conecta OTRA cuenta sin cerrar la actual (estilo Google). Al iniciar sesión, la nueva cuenta
 * queda guardada en este dispositivo y la app cambia a ella. Luego se puede alternar desde el menú.
 */
export const AddAccountModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const { addAccount } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const reset = () => { setEmail(''); setPassword(''); setError(null); setBusy(false); };
    const close = () => { if (!busy) { reset(); onClose(); } };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (busy) return;
        if (!email.trim() || !password) { setError('Escribe correo y contraseña.'); return; }
        setBusy(true);
        setError(null);
        const r = await addAccount(email.trim(), password) as { success: boolean; error?: string };
        if (r.success) return; // En éxito, addAccount recarga la app (window.location).
        setError(r.error || 'No se pudo conectar la cuenta.');
        setBusy(false);
    };

    return (
        <Modal isOpen={isOpen} onClose={close} title="Agregar otra cuenta" size="sm">
            <form onSubmit={submit} className="space-y-4">
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Inicia sesión con otra cuenta. Quedará conectada en este dispositivo y podrás alternar entre cuentas desde el menú, sin volver a escribir la contraseña.
                </p>
                {error && (
                    <div className="p-3 rounded-md bg-red-50 border border-red-200 flex items-center text-red-700 text-sm dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
                        <ExclamationTriangleIcon className="w-5 h-5 mr-2 flex-shrink-0" />
                        {error}
                    </div>
                )}
                <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Correo</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputFormStyle} autoFocus autoComplete="email" placeholder="cuenta@correo.com" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Contraseña</label>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} className={inputFormStyle} autoComplete="current-password" placeholder="••••••••" />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                    <button type="button" onClick={close} disabled={busy} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button>
                    <button type="submit" disabled={busy} className={`${BUTTON_PRIMARY_SM_CLASSES} disabled:opacity-50`}>{busy ? 'Conectando…' : 'Conectar y cambiar'}</button>
                </div>
            </form>
        </Modal>
    );
};
