import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from '../../contexts/GlobalSettingsContext';

export interface RowAction {
    label: string;
    onClick: () => void;
    /** Clase de color del texto, ej. 'text-red-600'. */
    className?: string;
    hidden?: boolean;
}

/**
 * Menú de acciones por fila (botón "⋯" → dropdown). Ahorra espacio horizontal frente a
 * los botones en línea. El menú se renderiza en un portal con posición fija para no ser
 * recortado por contenedores con overflow (tablas con scroll horizontal).
 */
export const RowActionsMenu: React.FC<{ items: RowAction[] }> = ({ items }) => {
    const { t } = useTranslation();
    const visible = items.filter(i => !i.hidden);
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState<{ top: number; left: number; maxHeight: number }>({ top: 0, left: 0, maxHeight: 9999 });
    const btnRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!open) return;
        const close = () => setOpen(false);
        // Cerrar al hacer scroll (incluye el scroll horizontal de la tabla) o redimensionar.
        window.addEventListener('scroll', close, true);
        window.addEventListener('resize', close);
        return () => { window.removeEventListener('scroll', close, true); window.removeEventListener('resize', close); };
    }, [open]);

    const toggle = () => {
        const r = btnRef.current?.getBoundingClientRect();
        if (r) {
            const left = Math.max(8, Math.min(r.right - 176, window.innerWidth - 184));
            // Alto estimado del menú (cada ítem ~34px + padding).
            const menuH = visible.length * 34 + 8;
            const spaceBelow = window.innerHeight - r.bottom - 8;
            const spaceAbove = r.top - 8;
            // Si no cabe debajo pero sí (mejor) arriba, abrir hacia arriba.
            const openUp = spaceBelow < menuH && spaceAbove > spaceBelow;
            const top = openUp ? Math.max(8, r.top - Math.min(menuH, spaceAbove) - 4) : r.bottom + 4;
            const maxHeight = openUp ? spaceAbove : spaceBelow;
            setPos({ top, left, maxHeight: Math.max(120, maxHeight) });
        }
        setOpen(o => !o);
    };

    if (visible.length === 0) return null;

    return (
        <>
            <button
                ref={btnRef}
                type="button"
                onClick={(e) => { e.stopPropagation(); toggle(); }}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-600"
                aria-haspopup="menu"
                aria-expanded={open}
                title={t('common.actions')}
            >
                <span className="tracking-widest leading-none">···</span>
            </button>
            {open && createPortal(
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    <div
                        role="menu"
                        style={{ top: pos.top, left: pos.left, maxHeight: pos.maxHeight }}
                        className="fixed z-50 w-44 rounded-md border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 shadow-lg py-1 overflow-y-auto"
                    >
                        {visible.map((it, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={(e) => { e.stopPropagation(); it.onClick(); setOpen(false); }}
                                className={`w-full text-left px-3 py-1.5 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-700/60 ${it.className || 'text-neutral-700 dark:text-neutral-200'}`}
                                role="menuitem"
                            >
                                {it.label}
                            </button>
                        ))}
                    </div>
                </>,
                document.body
            )}
        </>
    );
};
