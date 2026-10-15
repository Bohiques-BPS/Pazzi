import React, { useMemo, useRef, useState, useEffect } from 'react';

interface TextAutocompleteProps {
    value: string;
    onChange: (value: string) => void;
    /** Sugerencias existentes (p. ej. las secciones del proyecto). */
    options: string[];
    placeholder?: string;
    /** Clase del <input> (por defecto hereda la del formulario que lo use). */
    className?: string;
    disabled?: boolean;
    /** Texto del encabezado del desplegable (ej. "Secciones existentes"). */
    listLabel?: string;
    /** Texto para la opción "crear" cuando lo escrito no existe; {q} = lo escrito. */
    createLabel?: string;
}

/**
 * Autocompletado de texto LIBRE con sugerencias:
 *  - filtra por coincidencia (no solo prefijo), sin distinguir mayúsculas/acentos;
 *  - permite escribir un valor nuevo (no obliga a elegir de la lista);
 *  - navegación con teclado (↑/↓, Enter, Esc) y estilos del tema (a diferencia de <datalist>).
 */
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const TextAutocomplete: React.FC<TextAutocompleteProps> = ({ value, onChange, options, placeholder, className, disabled, listLabel, createLabel }) => {
    const [open, setOpen] = useState(false);
    const [highlight, setHighlight] = useState(-1);
    const wrapRef = useRef<HTMLDivElement>(null);

    // Opciones únicas, ordenadas, filtradas por lo escrito.
    const filtered = useMemo(() => {
        const uniq = Array.from(new Set(options.filter(Boolean).map(o => o.trim())));
        const q = norm(value.trim());
        const list = q ? uniq.filter(o => norm(o).includes(q)) : uniq;
        return list.sort((a, b) => a.localeCompare(b)).slice(0, 50);
    }, [options, value]);

    const typedIsNew = value.trim() !== '' && !options.some(o => norm(o) === norm(value.trim()));

    useEffect(() => {
        const onDown = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, []);

    const select = (v: string) => { onChange(v); setOpen(false); setHighlight(-1); };

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { setOpen(true); return; }
        if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight(h => Math.min(filtered.length - 1, h + 1)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight(h => Math.max(0, h - 1)); }
        else if (e.key === 'Enter') {
            if (open && highlight >= 0 && highlight < filtered.length) { e.preventDefault(); select(filtered[highlight]); }
            else setOpen(false);
        } else if (e.key === 'Escape') { setOpen(false); setHighlight(-1); }
    };

    return (
        <div className="relative" ref={wrapRef}>
            <input
                type="text"
                value={value}
                onChange={e => { onChange(e.target.value); setOpen(true); setHighlight(-1); }}
                onFocus={() => setOpen(true)}
                onKeyDown={onKeyDown}
                placeholder={placeholder}
                className={className}
                disabled={disabled}
                autoComplete="off"
                role="combobox"
                aria-expanded={open}
                aria-autocomplete="list"
            />
            {open && (filtered.length > 0 || typedIsNew) && (
                <div className="absolute z-30 left-0 right-0 mt-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-600 rounded-md shadow-lg py-1 max-h-56 overflow-y-auto">
                    {listLabel && filtered.length > 0 && (
                        <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">{listLabel}</p>
                    )}
                    {filtered.map((opt, i) => (
                        <button
                            key={opt}
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); select(opt); }}
                            onMouseEnter={() => setHighlight(i)}
                            className={`block w-full text-left px-3 py-1.5 text-sm ${i === highlight ? 'bg-primary/10 text-primary dark:bg-primary/20' : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}
                        >
                            {opt}
                        </button>
                    ))}
                    {typedIsNew && createLabel && (
                        <button
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); select(value.trim()); }}
                            className="block w-full text-left px-3 py-1.5 text-sm text-primary border-t border-neutral-100 dark:border-neutral-700 mt-1"
                        >
                            {createLabel.replace('{q}', value.trim())}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};
