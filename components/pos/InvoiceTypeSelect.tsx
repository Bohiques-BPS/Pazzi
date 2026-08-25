import React, { useState } from 'react';
import { Modal } from '../Modal';
import { useGlobalSettings, useTranslation } from '../../contexts/GlobalSettingsContext';
import { INPUT_SM_CLASSES, BUTTON_PRIMARY_SM_CLASSES } from '../../constants';
import { EditIcon, TrashIconMini, XMarkIcon } from '../icons';
import { toast } from '../../hooks/useToast';

interface Props {
    value: string;
    onChange: (v: string) => void;
}

/**
 * Select de "Tipo de factura" con administración del catálogo (crear/editar/eliminar) en la
 * misma ventana. El catálogo se guarda por negocio en GlobalSettings.invoiceTypes.
 */
export const InvoiceTypeSelect: React.FC<Props> = ({ value, onChange }) => {
    const { settings, updateSettings } = useGlobalSettings();
    const { t } = useTranslation();
    const types: string[] = Array.isArray(settings.invoiceTypes) ? settings.invoiceTypes : [];

    const [managing, setManaging] = useState(false);
    const [newType, setNewType] = useState('');
    const [editIdx, setEditIdx] = useState<number | null>(null);
    const [editVal, setEditVal] = useState('');

    const persist = (next: string[]) => updateSettings({ invoiceTypes: next });

    const add = () => {
        const v = newType.trim();
        if (!v) return;
        if (types.some(x => x.toLowerCase() === v.toLowerCase())) { toast.error(t('posx.invoices.type_exists')); return; }
        persist([...types, v]);
        setNewType('');
        onChange(v); // seleccionar el recién creado
    };

    const remove = (i: number) => {
        const removed = types[i];
        persist(types.filter((_, x) => x !== i));
        if (value === removed) onChange('');
    };

    const startEdit = (i: number) => { setEditIdx(i); setEditVal(types[i]); };
    const commitEdit = (i: number) => {
        const v = editVal.trim();
        if (!v) return;
        if (types.some((x, xi) => xi !== i && x.toLowerCase() === v.toLowerCase())) { toast.error(t('posx.invoices.type_exists')); return; }
        const prev = types[i];
        persist(types.map((x, xi) => xi === i ? v : x));
        if (value === prev) onChange(v);
        setEditIdx(null);
    };

    return (
        <>
            <div className="flex gap-2">
                <select value={value} onChange={e => onChange(e.target.value)} className={`${INPUT_SM_CLASSES} w-full`}>
                    <option value="">{t('posx.invoices.type_none')}</option>
                    {/* El valor actual, aunque ya no esté en el catálogo, se muestra para no perderlo. */}
                    {value && !types.includes(value) && <option value={value}>{value}</option>}
                    {types.map(ty => <option key={ty} value={ty}>{ty}</option>)}
                </select>
                <button
                    type="button"
                    onClick={() => setManaging(true)}
                    className="flex-shrink-0 h-9 px-3 rounded-md border border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-sm whitespace-nowrap"
                    title={t('posx.invoices.type_manage')}
                >
                    {t('posx.invoices.type_manage')}
                </button>
            </div>

            <Modal isOpen={managing} onClose={() => setManaging(false)} title={t('posx.invoices.type_manage')} size="sm">
                <div className="space-y-3">
                    {/* Agregar nuevo */}
                    <div className="flex gap-2">
                        <input
                            type="text" value={newType} onChange={e => setNewType(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
                            placeholder={t('posx.invoices.type_new_ph')} className={`${INPUT_SM_CLASSES} w-full`} autoFocus
                        />
                        <button type="button" onClick={add} className={BUTTON_PRIMARY_SM_CLASSES}>{t('posx.invoices.type_add')}</button>
                    </div>

                    {/* Lista */}
                    {types.length === 0 ? (
                        <p className="text-sm text-neutral-500 text-center py-3">{t('posx.invoices.type_empty')}</p>
                    ) : (
                        <ul className="divide-y divide-neutral-200 dark:divide-neutral-700 border border-neutral-200 dark:border-neutral-700 rounded-md">
                            {types.map((ty, i) => (
                                <li key={i} className="flex items-center gap-2 px-3 py-2">
                                    {editIdx === i ? (
                                        <>
                                            <input
                                                type="text" value={editVal} onChange={e => setEditVal(e.target.value)}
                                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitEdit(i); } if (e.key === 'Escape') setEditIdx(null); }}
                                                className={`${INPUT_SM_CLASSES} flex-grow`} autoFocus
                                            />
                                            <button type="button" onClick={() => commitEdit(i)} className="text-green-600 p-1 font-bold" title={t('common.save')}>✓</button>
                                            <button type="button" onClick={() => setEditIdx(null)} className="text-neutral-500 p-1" title={t('common.cancel')}><XMarkIcon className="w-4 h-4" /></button>
                                        </>
                                    ) : (
                                        <>
                                            <span className="flex-grow text-sm text-neutral-800 dark:text-neutral-100 truncate">{ty}</span>
                                            <button type="button" onClick={() => startEdit(i)} className="text-blue-600 p-1" title={t('common.edit')}><EditIcon className="w-4 h-4" /></button>
                                            <button type="button" onClick={() => remove(i)} className="text-red-600 p-1" title={t('common.delete')}><TrashIconMini className="w-4 h-4" /></button>
                                        </>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </Modal>
        </>
    );
};
