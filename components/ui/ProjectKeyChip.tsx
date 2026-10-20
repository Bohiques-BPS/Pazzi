import React from 'react';

// Color estable por prefijo (el mismo prefijo siempre del mismo color en toda la app).
const PALETTE = [
    'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
    'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
    'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
    'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
];

/** Normaliza el prefijo: sin espacios extremos y en mayúsculas ("pw " → "PW"). */
export const normalizeProjectKey = (k?: string | null) => (k || '').trim().toUpperCase();

export const projectKeyColor = (key: string) => {
    let h = 0;
    for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return PALETTE[h % PALETTE.length];
};

/** Etiqueta del prefijo/clave del proyecto (p. ej. "PW" = Página web). No se pinta si está vacío. */
export const ProjectKeyChip: React.FC<{ value?: string | null; className?: string }> = ({ value, className = '' }) => {
    const key = normalizeProjectKey(value);
    if (!key) return null;
    return (
        <span translate="no" title={`Prefijo: ${key}`} className={`inline-flex items-center text-[11px] font-bold tracking-wide px-2 py-0.5 rounded-full ${projectKeyColor(key)} ${className}`}>
            {key}
        </span>
    );
};
