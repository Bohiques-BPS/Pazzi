import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { Client } from '../../types';
import { INPUT_SM_CLASSES } from '../../constants';
import { useTranslation } from '../../contexts/GlobalSettingsContext';
import { MagnifyingGlassIcon, XMarkIcon } from '../icons';

interface ClientAutocompleteProps {
    clients: Client[];
    /** id del cliente seleccionado ('' = ninguno). */
    value: string;
    onChange: (clientId: string) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    /** Muestra la "×" para limpiar la selección (por defecto true). */
    allowClear?: boolean;
    autoFocus?: boolean;
}

const fullName = (c?: Client | null) => c ? `${c.name} ${c.lastName || ''}`.trim() : '';

/**
 * Autocompletar de cliente: reemplaza el <select> de "Cliente". Escribe para filtrar por
 * nombre, apellido, correo o teléfono; selecciona con click/teclado. Controlado por `value`
 * (id del cliente) + `onChange`.
 */
export const ClientAutocomplete: React.FC<ClientAutocompleteProps> = ({
    clients, value, onChange, placeholder, disabled = false, className, allowClear = true, autoFocus = false,
}) => {
    const { t } = useTranslation();
    const [query, setQuery] = useState('');
    const [editing, setEditing] = useState(false);
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const rootRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const selected = useMemo(() => clients.find(c => c.id === value) || null, [clients, value]);

    const suggestions = useMemo(() => {
        const q = query.trim().toLowerCase();
        const base = q
            ? clients.filter(c =>
                fullName(c).toLowerCase().includes(q) ||
                (c.email || '').toLowerCase().includes(q) ||
                (c.phone || '').toLowerCase().includes(q))
            : clients;
        return base.slice(0, 30);
    }, [clients, query]);

    // Cierra al hacer click fuera y revierte al nombre seleccionado.
    useEffect(() => {
        const onDocDown = (e: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
                setOpen(false); setEditing(false); setQuery('');
            }
        };
        document.addEventListener('mousedown', onDocDown);
        return () => document.removeEventListener('mousedown', onDocDown);
    }, []);

    const select = (c: Client) => {
        onChange(c.id);
        setEditing(false); setOpen(false); setQuery(''); setActiveIndex(-1);
    };

    const clear = () => {
        onChange('');
        setQuery(''); setEditing(false); setOpen(false);
        inputRef.current?.focus();
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (disabled) return;
        if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) { setOpen(true); setEditing(true); return; }
        if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => (i + 1) % Math.max(suggestions.length, 1)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => (i - 1 + suggestions.length) % Math.max(suggestions.length, 1)); }
        else if (e.key === 'Enter') { e.preventDefault(); const c = suggestions[activeIndex] || suggestions[0]; if (c) select(c); }
        else if (e.key === 'Escape') { setOpen(false); setEditing(false); setQuery(''); }
    };

    const displayValue = editing ? query : fullName(selected);

    return (
        <div className="relative" ref={rootRef}>
            <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-neutral-400">
                <MagnifyingGlassIcon className="w-4 h-4" />
            </span>
            <input
                ref={inputRef}
                type="text"
                value={displayValue}
                disabled={disabled}
                autoFocus={autoFocus}
                onFocus={() => { setEditing(true); setOpen(true); setQuery(''); }}
                onChange={e => { setQuery(e.target.value); setEditing(true); setOpen(true); setActiveIndex(-1); }}
                onKeyDown={onKeyDown}
                placeholder={placeholder ?? t('cmpx.client_ac.placeholder')}
                className={`${className ?? INPUT_SM_CLASSES} w-full pl-8 ${allowClear && selected ? 'pr-8' : ''}`}
                aria-autocomplete="list"
                aria-expanded={open}
            />
            {allowClear && selected && !disabled && (
                <button type="button" onClick={clear} className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200" title={t('common.clear')}>
                    <XMarkIcon className="w-4 h-4" />
                </button>
            )}
            {open && (
                <ul className="absolute z-30 w-full mt-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-600 rounded-md shadow-lg max-h-72 overflow-y-auto py-1">
                    {suggestions.length === 0 ? (
                        <li className="px-3 py-2 text-sm text-neutral-500 dark:text-neutral-400 text-center">{t('cmpx.client_ac.none')}</li>
                    ) : suggestions.map((c, idx) => (
                        <li
                            key={c.id}
                            onClick={() => select(c)}
                            onMouseEnter={() => setActiveIndex(idx)}
                            className={`px-3 py-2 cursor-pointer text-sm ${activeIndex === idx ? 'bg-neutral-100 dark:bg-neutral-700' : 'hover:bg-neutral-50 dark:hover:bg-neutral-700/50'}`}
                        >
                            <div className="font-medium text-neutral-800 dark:text-neutral-100 truncate">{fullName(c) || t('cmpx.client_ac.unnamed')}</div>
                            {(c.email || c.phone) && (
                                <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{[c.email, c.phone].filter(Boolean).join(' · ')}</div>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};
