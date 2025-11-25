
import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types';
import { inputFormStyle, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import { ShieldCheckIcon } from '../icons';
import { useTranslation } from '../../contexts/GlobalSettingsContext';

interface AdminAuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title?: string;
    message?: string;
}

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title = "Autorización Requerida", 
    message = "Esta acción requiere autorización de un administrador. Por favor ingrese su contraseña." 
}) => {
    const { t } = useTranslation();
    const { allUsers } = useAuth();
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setPassword('');
            setError('');
        }
    }, [isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Check if any user with MANAGER role has this password
        const admin = allUsers.find(u => u.role === UserRole.MANAGER && u.password === password);
        
        if (admin) {
            onConfirm();
            onClose();
        } else {
            setError('Contraseña incorrecta o usuario no autorizado.');
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex flex-col items-center justify-center p-2 text-amber-600 dark:text-amber-500">
                    <ShieldCheckIcon className="w-12 h-12 mb-2" />
                    <p className="text-sm text-center text-neutral-600 dark:text-neutral-300">{message}</p>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Contraseña de Administrador</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setError(''); }}
                        className={inputFormStyle}
                        autoFocus
                        placeholder="Ingrese contraseña..."
                    />
                </div>

                {error && <p className="text-xs text-red-600 dark:text-red-400 text-center font-medium">{error}</p>}

                <div className="flex justify-end space-x-2 pt-2 border-t border-neutral-200 dark:border-neutral-700">
                    <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>{t('common.cancel')}</button>
                    <button type="submit" className={BUTTON_PRIMARY_SM_CLASSES}>{t('common.confirm')}</button>
                </div>
            </form>
        </Modal>
    );
};
