
import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { useAuth } from '../../contexts/AuthContext';
import { inputFormStyle, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import { UserRole } from '../../types';

interface DiscountAuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (discount: { type: 'percentage' | 'fixed'; value: number }) => void;
    currentDiscount?: { type: 'percentage' | 'fixed'; value: number } | null;
}

export const DiscountAuthModal: React.FC<DiscountAuthModalProps> = ({ isOpen, onClose, onApply, currentDiscount }) => {
    const { allUsers } = useAuth();
    const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
    const [discountValue, setDiscountValue] = useState('');
    const [adminPassword, setAdminPassword] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (currentDiscount) {
                setDiscountType(currentDiscount.type);
                setDiscountValue(currentDiscount.value.toString());
            } else {
                setDiscountType('percentage');
                setDiscountValue('');
            }
            setAdminPassword('');
            setError('');
        }
    }, [isOpen, currentDiscount]);

    const handleApply = () => {
        setError('');
        const value = parseFloat(discountValue);
        if (isNaN(value) || value <= 0) {
            setError('Por favor, ingrese un valor de descuento válido.');
            return;
        }

        const admin = allUsers.find(u => u.role === UserRole.MANAGER && u.password === adminPassword);
        if (!admin) {
            setError('Contraseña de administrador incorrecta.');
            return;
        }

        onApply({ type: discountType, value });
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={currentDiscount ? "Editar Descuento" : "Aplicar Descuento con Autorización"} size="md">
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium">Tipo de Descuento</label>
                    <select value={discountType} onChange={e => setDiscountType(e.target.value as any)} className={inputFormStyle}>
                        <option value="percentage">Porcentaje (%)</option>
                        <option value="fixed">Monto Fijo ($)</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium">Valor del Descuento</label>
                    <input
                        type="number"
                        value={discountValue}
                        onChange={e => setDiscountValue(e.target.value)}
                        className={inputFormStyle}
                        placeholder={discountType === 'percentage' ? 'Ej: 10 para 10%' : 'Ej: 5.00'}
                        step="0.01"
                        min="0"
                        autoFocus
                    />
                </div>
                <div className="border-t pt-4 dark:border-neutral-700">
                    <label className="block text-sm font-medium">Contraseña de Administrador</label>
                    <input
                        type="password"
                        value={adminPassword}
                        onChange={e => setAdminPassword(e.target.value)}
                        className={inputFormStyle}
                        placeholder="Requiere clave de admin"
                    />
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <div className="flex justify-end space-x-2 pt-4">
                    <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button>
                    <button type="button" onClick={handleApply} className={BUTTON_PRIMARY_SM_CLASSES}>{currentDiscount ? 'Actualizar' : 'Aplicar'} Descuento</button>
                </div>
            </div>
        </Modal>
    );
};
