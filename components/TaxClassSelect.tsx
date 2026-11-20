import React from 'react';
import { useGlobalSettings } from '../contexts/GlobalSettingsContext';
import { inputFormStyle } from '../constants';
import { classRate, getTaxClasses, pct } from '../utils/taxClasses';

/** Clase de impuesto por defecto de una categoría o departamento (sus productos en "según categoría"). */
export const TaxClassSelect: React.FC<{
    value: string | null;
    emptyLabel: string;
    onChange: (id: string | null, reduced: boolean) => void;
}> = ({ value, emptyLabel, onChange }) => {
    const { settings } = useGlobalSettings();
    const classes = getTaxClasses(settings);
    return (
        <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Clase de impuesto (IVU)</label>
            <select
                value={value ?? ''}
                onChange={e => {
                    const id = e.target.value || null;
                    onChange(id, !!classes.find(c => c.id === id)?.reduced);
                }}
                className={inputFormStyle + ' w-full'}
            >
                <option value="">{emptyLabel}</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name} — {pct(classRate(c))}</option>)}
            </select>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Los productos marcados "Según categoría/departamento" cobran esta clase.</p>
        </div>
    );
};
