import React, { useEffect, useState } from 'react';
import { useGlobalSettings } from '../../contexts/GlobalSettingsContext';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES, inputFormStyle } from '../../constants';
import { XMarkIcon } from '../icons';
import { getTaxClasses, pct } from '../../utils/taxClasses';
import { toast } from '../../hooks/useToast';
import type { TaxClass } from '../../types';

interface Row { id: string; name: string; state: string; municipal: string; reduced: boolean; builtin: boolean }

const toPctStr = (r: number) => String(Math.round((Number(r) || 0) * 100000) / 1000);
const fromPctStr = (s: string) => Math.max(0, (parseFloat(String(s).replace(',', '.')) || 0) / 100);
const rowsFrom = (classes: TaxClass[]): Row[] => classes.map(c => ({
    id: c.id, name: c.name, state: toPctStr(c.stateRate), municipal: toPctStr(c.municipalRate), reduced: !!c.reduced, builtin: !!c.builtin,
}));

/**
 * Administración › Impuestos: clases de impuesto (Estándar / Reducida / Cero / propias).
 * Cada producto escoge su clase (o la hereda de su categoría/departamento) y paga ese IVU.
 */
export const TaxClassesSettings: React.FC = () => {
    const { settings, updateSettings } = useGlobalSettings();
    const [rows, setRows] = useState<Row[]>(() => rowsFrom(getTaxClasses(settings)));
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    useEffect(() => { if (!dirty) setRows(rowsFrom(getTaxClasses(settings))); }, [(settings as any)?.taxClasses]); // eslint-disable-line react-hooks/exhaustive-deps

    const setRow = (id: string, patch: Partial<Row>) => { setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r)); setDirty(true); };
    const addRow = () => {
        setRows(prev => [...prev, { id: `clase_${Date.now().toString(36)}`, name: '', state: '0', municipal: '0', reduced: false, builtin: false }]);
        setDirty(true);
    };
    const removeRow = (id: string) => { setRows(prev => prev.filter(r => r.id !== id)); setDirty(true); };

    const save = async () => {
        if (rows.some(r => !r.name.trim())) { toast.error('Cada clase necesita un nombre.'); return; }
        const names = rows.map(r => r.name.trim().toLowerCase());
        if (new Set(names).size !== names.length) { toast.error('Hay dos clases con el mismo nombre.'); return; }
        const taxClasses = rows.map(r => ({
            id: r.id, name: r.name.trim(),
            stateRate: r.id === 'cero' ? 0 : fromPctStr(r.state),
            municipalRate: r.id === 'cero' ? 0 : fromPctStr(r.municipal),
            reduced: r.reduced,
        }));
        setSaving(true);
        const ok = await updateSettings({ taxClasses } as any);
        setSaving(false);
        if (!ok) { toast.error('No se pudieron guardar las clases de impuesto. Intente de nuevo.'); return; }
        setDirty(false);
        toast.success('Clases de impuesto guardadas. Los productos de cada clase ya usan la nueva tasa.');
    };

    const cell = 'px-2 py-2 align-middle';
    return (
        <div>
            <div className="overflow-x-auto rounded-md border border-neutral-200 dark:border-neutral-700">
                <table className="min-w-full text-sm">
                    <thead className="bg-neutral-50 dark:bg-neutral-900/40 text-left text-xs uppercase text-neutral-500 dark:text-neutral-400">
                        <tr>
                            <th className={cell}>Clase</th>
                            <th className={cell}>Estatal %</th>
                            <th className={cell}>Municipal %</th>
                            <th className={cell}>Total</th>
                            <th className={cell} title='En el recibo con desglose, la parte estatal sale como "IVU Reducido"'>Línea "Reducido"</th>
                            <th className={cell}></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                        {rows.map(r => {
                            const locked = r.id === 'cero';
                            const total = locked ? 0 : fromPctStr(r.state) + fromPctStr(r.municipal);
                            return (
                                <tr key={r.id}>
                                    <td className={cell}>
                                        <input value={r.name} onChange={e => setRow(r.id, { name: e.target.value })} placeholder="Ej. Alimentos preparados" className={`${inputFormStyle} min-w-[10rem]`} />
                                    </td>
                                    <td className={cell}>
                                        <input type="number" min="0" step="0.01" value={locked ? '0' : r.state} disabled={locked} onChange={e => setRow(r.id, { state: e.target.value })} className={`${inputFormStyle} w-24`} />
                                    </td>
                                    <td className={cell}>
                                        <input type="number" min="0" step="0.01" value={locked ? '0' : r.municipal} disabled={locked} onChange={e => setRow(r.id, { municipal: e.target.value })} className={`${inputFormStyle} w-24`} />
                                    </td>
                                    <td className={`${cell} font-semibold tabular-nums text-neutral-800 dark:text-neutral-100`}>{pct(total)}</td>
                                    <td className={cell}>
                                        <input type="checkbox" checked={r.reduced} disabled={locked} onChange={e => setRow(r.id, { reduced: e.target.checked })} className="h-4 w-4" />
                                    </td>
                                    <td className={`${cell} text-right`}>
                                        {r.builtin
                                            ? <span className="text-[11px] text-neutral-400">Básica</span>
                                            : <button type="button" onClick={() => removeRow(r.id)} title="Quitar clase" className="text-red-600 dark:text-red-400 p-1"><XMarkIcon className="w-4 h-4" /></button>}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
                <button type="button" onClick={addRow} className={BUTTON_SECONDARY_SM_CLASSES}>+ Agregar clase</button>
                <button type="button" onClick={save} disabled={!dirty || saving} className={`${BUTTON_PRIMARY_SM_CLASSES} disabled:opacity-50`}>{saving ? 'Guardando…' : 'Guardar clases'}</button>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
                Cada producto escoge su clase en su formulario (pestaña Precios), o la toma de su categoría o departamento. Al cambiar una tasa aquí, todos los productos de esa clase cobran la nueva tasa. Si quita una clase, sus productos pasan a "Según categoría". Las ventas ya hechas no cambian.
            </p>
        </div>
    );
};
