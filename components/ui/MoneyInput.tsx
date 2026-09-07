import React, { useState } from 'react';
import { useCurrency } from '../../hooks/useCurrency';
import { inputFormStyle } from '../../constants';

interface MoneyInputProps {
    /** Valor numérico (number o string). Vacío/null = sin valor. */
    value: number | string | null | undefined;
    /** Emite el valor normalizado como string numérico ("12.50") o "" si está vacío. */
    onChange: (value: string) => void;
    /** Símbolo de moneda; por defecto el configurado en el negocio. */
    currency?: string;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    id?: string;
    name?: string;
    autoFocus?: boolean;
    /** Se dispara con Enter (útil en modales de precio manual). */
    onEnter?: () => void;
}

/** Deja solo dígitos y UN separador decimal; convierte "," a ".". Sin negativos. */
function sanitize(raw: string): string {
    let s = (raw || '').replace(/[^0-9.,]/g, '').replace(/,/g, '.');
    const firstDot = s.indexOf('.');
    if (firstDot !== -1) {
        // conserva solo el primer punto
        s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, '');
    }
    return s;
}

const asDisplay = (value: number | string | null | undefined): string => {
    if (value === null || value === undefined || value === '') return '';
    const n = Number(value);
    return Number.isFinite(n) ? n.toFixed(2) : String(value);
};

/**
 * Input de dinero: prefijo con la moneda seleccionada, acepta "," y "." como separador
 * decimal y formatea a 2 decimales al salir del campo. Emite un string numérico ("12.50").
 */
export const MoneyInput: React.FC<MoneyInputProps> = ({
    value, onChange, currency, placeholder, className, disabled, id, name, autoFocus, onEnter,
}) => {
    const defaultCurrency = useCurrency();
    const sym = (currency || defaultCurrency || '$');
    const [focused, setFocused] = useState(false);
    const [draft, setDraft] = useState('');

    // Ancho del prefijo según la longitud del símbolo (p.ej. "RD$").
    const padLeft = sym.length <= 1 ? 'pl-7' : sym.length === 2 ? 'pl-9' : 'pl-12';

    const display = focused ? draft : asDisplay(value);

    return (
        <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-neutral-500 dark:text-neutral-400 pointer-events-none text-sm">
                {sym}
            </span>
            <input
                type="text"
                inputMode="decimal"
                id={id}
                name={name}
                autoFocus={autoFocus}
                disabled={disabled}
                value={display}
                placeholder={placeholder}
                onFocus={() => {
                    const n = value === null || value === undefined || value === '' ? '' : String(value);
                    setDraft(n);
                    setFocused(true);
                }}
                onChange={e => {
                    const s = sanitize(e.target.value);
                    setDraft(s);
                    onChange(s); // string numérico crudo mientras escribe (ej. "12.5")
                }}
                onBlur={() => {
                    setFocused(false);
                    if (draft === '' || draft === '.') { onChange(''); return; }
                    const n = Number(draft);
                    onChange(Number.isFinite(n) ? n.toFixed(2) : '');
                }}
                onKeyDown={e => { if (e.key === 'Enter' && onEnter) onEnter(); }}
                className={`${className ?? inputFormStyle} ${padLeft}`}
            />
        </div>
    );
};

export default MoneyInput;
