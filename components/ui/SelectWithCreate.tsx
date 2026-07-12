import React from 'react';
import { PlusIcon } from '../icons';
import { inputFormStyle } from '../../constants';

export interface SelectOption {
    value: string;
    label: string;
}

interface SelectWithCreateProps {
    /** id/name del <select> (para el label htmlFor y el form). */
    id?: string;
    name?: string;
    label?: string;
    value: string;
    onChange: (value: string) => void;
    options: SelectOption[];
    /** Se llama al pulsar el botón "+". El padre abre su modal de creación anidado. */
    onCreateClick: () => void;
    required?: boolean;
    disabled?: boolean;
    /** Texto de la opción vacía inicial (placeholder). Si se omite, no se agrega. */
    placeholder?: string;
    /** Mensaje bajo el select cuando no hay opciones. */
    emptyHint?: string;
    /** Tooltip del botón "+". */
    createTitle?: string;
    className?: string;
}

/**
 * Select con botón "+" para crear la entidad dependiente sin salir del formulario.
 * El padre controla el modal de creación (onCreateClick) y, al crear, actualiza `value`.
 * Así el usuario nunca pierde el progreso del formulario actual.
 */
export const SelectWithCreate: React.FC<SelectWithCreateProps> = ({
    id,
    name,
    label,
    value,
    onChange,
    options,
    onCreateClick,
    required,
    disabled,
    placeholder,
    emptyHint,
    createTitle = 'Crear nuevo',
    className,
}) => {
    const isEmpty = options.length === 0;
    return (
        <div className={className}>
            {label && (
                <label htmlFor={id} className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    {label}
                </label>
            )}
            <div className="flex items-stretch gap-1 mt-1">
                <select
                    id={id}
                    name={name}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className={`${inputFormStyle} flex-1 min-w-0 mt-0`}
                    required={required}
                    disabled={disabled}
                >
                    {placeholder !== undefined && <option value="">{placeholder}</option>}
                    {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    {isEmpty && placeholder === undefined && <option value="" disabled>Sin opciones</option>}
                </select>
                <button
                    type="button"
                    onClick={onCreateClick}
                    disabled={disabled}
                    title={createTitle}
                    aria-label={createTitle}
                    className="flex-shrink-0 flex items-center justify-center px-3 rounded-md bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30 transition-colors disabled:opacity-50"
                >
                    <PlusIcon className="w-5 h-5" />
                </button>
            </div>
            {isEmpty && emptyHint && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">{emptyHint}</p>
            )}
        </div>
    );
};
