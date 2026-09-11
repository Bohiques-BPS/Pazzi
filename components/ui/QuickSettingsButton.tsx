import React, { useEffect, useRef, useState } from 'react';
import { Cog6ToothIcon } from '../icons';
import { useTheme } from '../../contexts/ThemeContext';
import { Theme } from '../../types';
import { useGlobalSettings } from '../../contexts/GlobalSettingsContext';

interface Props {
    /** Clases para el botón del engranaje (para que combine con la barra donde se coloca). */
    buttonClassName?: string;
    /** Clases del contenedor. */
    className?: string;
}

/**
 * Botón de configuración rápida: cambia el TEMA (claro/oscuro, por dispositivo) y el IDIOMA
 * (español/inglés, ajuste de la tienda). Pensado para ir junto al botón de Ponche / la campana.
 */
export const QuickSettingsButton: React.FC<Props> = ({ buttonClassName, className }) => {
    const { theme, setTheme } = useTheme();
    const { settings, updateSettings } = useGlobalSettings();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const lang = (settings.language || 'es');

    useEffect(() => {
        if (!open) return;
        const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, [open]);

    const optCls = (active: boolean) =>
        `px-2 py-1.5 rounded-md text-sm border transition-colors ${active ? 'border-primary bg-primary/10 text-primary font-semibold' : 'border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-200 hover:border-primary/50'}`;

    return (
        <div className={`relative ${className || ''}`} ref={ref}>
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                title="Configuración"
                aria-label="Configuración"
                className={buttonClassName || 'p-2 rounded-full text-neutral-500 hover:text-primary hover:bg-primary/10 dark:text-neutral-300'}
            >
                <Cog6ToothIcon className="w-5 h-5" />
            </button>
            {open && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-neutral-800 rounded-lg shadow-xl border border-neutral-200 dark:border-neutral-700 p-3 z-50 text-left">
                    <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-1.5">Tema</p>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                        <button type="button" onClick={() => setTheme(Theme.LIGHT)} className={optCls(theme === Theme.LIGHT)}>☀️ Claro</button>
                        <button type="button" onClick={() => setTheme(Theme.DARK)} className={optCls(theme === Theme.DARK)}>🌙 Oscuro</button>
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-1.5">Idioma</p>
                    <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => updateSettings({ language: 'es' })} className={optCls(lang === 'es')}>Español</button>
                        <button type="button" onClick={() => updateSettings({ language: 'en' })} className={optCls(lang === 'en')}>English</button>
                    </div>
                    <p className="text-[10px] text-neutral-400 mt-2">El tema es por dispositivo; el idioma aplica a la tienda.</p>
                </div>
            )}
        </div>
    );
};
