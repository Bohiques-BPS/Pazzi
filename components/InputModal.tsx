import React, { useState, useEffect, useRef } from 'react';
import { Modal } from './Modal';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES, INPUT_SM_CLASSES } from '../constants';

interface InputModalProps {
    isOpen: boolean;
    title: string;
    label?: string;
    placeholder?: string;
    initialValue?: string;
    confirmText?: string;
    cancelText?: string;
    inputType?: string;
    /** Devuelve el valor (ya recortado). Cerrar queda a cargo del que llama. */
    onConfirm: (value: string) => void;
    onClose: () => void;
    /** Si true, permite confirmar con el campo vacío (por defecto exige texto). */
    allowEmpty?: boolean;
}

/** Modal de entrada de texto — reemplazo bonito de window.prompt(). */
export const InputModal: React.FC<InputModalProps> = ({
    isOpen, title, label, placeholder, initialValue = '',
    confirmText = 'Aceptar', cancelText = 'Cancelar', inputType = 'text',
    onConfirm, onClose, allowEmpty = false,
}) => {
    const [value, setValue] = useState(initialValue);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setValue(initialValue);
            const id = setTimeout(() => inputRef.current?.focus(), 60);
            return () => clearTimeout(id);
        }
    }, [isOpen, initialValue]);

    const canSubmit = allowEmpty || value.trim().length > 0;
    const submit = () => {
        if (!canSubmit) return;
        onConfirm(value.trim());
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
            <div className="space-y-4">
                {label && <label className="block text-sm text-neutral-600 dark:text-neutral-300">{label}</label>}
                <input
                    ref={inputRef}
                    type={inputType}
                    value={value}
                    onChange={e => setValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
                    placeholder={placeholder}
                    className={`${INPUT_SM_CLASSES} w-full`}
                />
                <div className="flex justify-end gap-2">
                    <button onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>{cancelText}</button>
                    <button onClick={submit} disabled={!canSubmit} className={`${BUTTON_PRIMARY_SM_CLASSES} disabled:opacity-50`}>{confirmText}</button>
                </div>
            </div>
        </Modal>
    );
};
