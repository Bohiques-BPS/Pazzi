import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { inputFormStyle, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import { authService } from '../../services/auth';
import { PasswordInput } from '../ui/PasswordInput';
import { ApiError } from '../../services/api';

interface DiscountAuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (discount: { type: 'percentage' | 'fixed'; value: number }) => void;
    currentDiscount?: { type: 'percentage' | 'fixed'; value: number } | null;
}

export const DiscountAuthModal: React.FC<DiscountAuthModalProps> = ({ isOpen, onClose, onApply, currentDiscount }) => {
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
            setError('Ingrese un valor de descuento válido.');
            return;
        }
        if (discountType === 'percentage' && value > 100) {
            setError('El descuento porcentual no puede exceder 100%.');
            return;
        }
        if (!supervisorPin) {
            setError('Ingrese el PIN del supervisor.');
            return;
        }

        setAuthorizing(true);
        try {
            await authService.verifySupervisorPin(supervisorPin);
            onApply({ type: discountType, value });
            onClose();
        } catch (err) {
            if (err instanceof ApiError && err.status === 401) {
                setError('PIN de supervisor incorrecto.');
            } else {
                setError(err instanceof ApiError ? err.message : 'Error al verificar PIN');
            }
        } finally {
            setAuthorizing(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={currentDiscount ? 'Editar descuento' : 'Aplicar descuento con autorización'} size="md">
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium">Tipo de descuento</label>
                    <select value={discountType} onChange={e => setDiscountType(e.target.value as any)} className={inputFormStyle}>
                        <option value="percentage">Porcentaje (%)</option>
                        <option value="fixed">Monto fijo ($)</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium">Valor del descuento</label>
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
                    <label className="block text-sm font-medium">PIN de supervisor</label>
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
                        Cualquier administrador del sistema puede autorizar con su PIN de 4 dígitos.
                    </p>
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <div className="flex justify-end space-x-2 pt-4">
                    <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES} disabled={authorizing}>Cancelar</button>
                    <button type="button" onClick={handleApply} className={BUTTON_PRIMARY_SM_CLASSES} disabled={authorizing}>
                        {authorizing ? 'Autorizando...' : (currentDiscount ? 'Actualizar descuento' : 'Aplicar descuento')}
                    </button>
                </div>
            </div>
        </Modal>
    );
};
