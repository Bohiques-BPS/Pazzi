import React, { useState } from 'react';
import { useGlobalSettings } from '../../contexts/GlobalSettingsContext';
import { DEFAULT_PAYMENT_METHODS, type PaymentMethodConfig } from '../../types';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES, INPUT_SM_CLASSES } from '../../constants';
import { ArrowUpIcon, ArrowDownIcon, DeleteIcon, PlusIcon } from '../../components/icons';
import { toast } from '../../hooks/useToast';

const TYPE_LABEL: Record<string, string> = {
    cash: 'Efectivo', card: 'Tarjeta', ath_movil: 'ATH Móvil', credit: 'Crédito', check: 'Cheque', invoice: 'Factura', custom: 'Personalizado',
};

const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `metodo-${Date.now()}`;

export const PaymentMethodsPage: React.FC = () => {
    const { settings, updateSettings } = useGlobalSettings();
    const [methods, setMethods] = useState<PaymentMethodConfig[]>(
        (settings.paymentMethods && settings.paymentMethods.length ? settings.paymentMethods : DEFAULT_PAYMENT_METHODS).map(m => ({ ...m }))
    );
    const [saving, setSaving] = useState(false);

    const patch = (id: string, changes: Partial<PaymentMethodConfig>) =>
        setMethods(prev => prev.map(m => (m.id === id ? { ...m, ...changes } : m)));

    const patchConfig = (id: string, key: string, value: string) =>
        setMethods(prev => prev.map(m => (m.id === id ? { ...m, config: { ...(m.config || {}), [key]: value } } : m)));

    const move = (idx: number, dir: -1 | 1) => {
        setMethods(prev => {
            const next = [...prev];
            const j = idx + dir;
            if (j < 0 || j >= next.length) return prev;
            [next[idx], next[j]] = [next[j], next[idx]];
            return next;
        });
    };

    const addCustom = () => {
        const id = `custom-${Date.now()}`;
        setMethods(prev => [...prev, { id, name: 'Nuevo método', enabled: true, color: '#607D8B', type: 'custom', requiresReference: false, referenceLabel: '', builtin: false }]);
    };

    const remove = (id: string) => setMethods(prev => prev.filter(m => m.id !== id));

    const handleSave = () => {
        // Normalizar ids de custom por si cambiaron el nombre.
        const cleaned = methods.map(m => (m.builtin ? m : { ...m, id: m.id.startsWith('custom-') ? m.id : slug(m.name) }));
        setSaving(true);
        updateSettings({ paymentMethods: cleaned });
        setTimeout(() => { setSaving(false); toast.success('Métodos de pago guardados.'); }, 300);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-2">
                <h1 className="text-2xl font-semibold text-neutral-700 dark:text-neutral-200">Métodos de Pago</h1>
                <div className="flex gap-2">
                    <button onClick={addCustom} className={`${BUTTON_SECONDARY_SM_CLASSES} flex items-center gap-1`}><PlusIcon className="w-4 h-4" /> Agregar método</button>
                    <button onClick={handleSave} disabled={saving} className={`${BUTTON_PRIMARY_SM_CLASSES} disabled:opacity-50`}>{saving ? 'Guardando…' : 'Guardar'}</button>
                </div>
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">Activa, desactiva, reordena o agrega los métodos de pago que aparecen en la caja. Se guarda en la base de datos para todo el negocio.</p>

            <div className="space-y-3">
                {methods.map((m, idx) => (
                    <div key={m.id} className={`bg-white dark:bg-neutral-800 border rounded-lg p-4 ${m.enabled ? 'border-neutral-200 dark:border-neutral-700' : 'border-dashed border-neutral-300 dark:border-neutral-600 opacity-70'}`}>
                        <div className="flex items-center gap-3 flex-wrap">
                            {/* Reordenar */}
                            <div className="flex flex-col">
                                <button onClick={() => move(idx, -1)} disabled={idx === 0} className="text-neutral-400 hover:text-primary disabled:opacity-30"><ArrowUpIcon className="w-4 h-4" /></button>
                                <button onClick={() => move(idx, 1)} disabled={idx === methods.length - 1} className="text-neutral-400 hover:text-primary disabled:opacity-30"><ArrowDownIcon className="w-4 h-4" /></button>
                            </div>
                            {/* Color */}
                            <input type="color" value={m.color} onChange={e => patch(m.id, { color: e.target.value })} className="w-9 h-9 rounded cursor-pointer border border-neutral-300 dark:border-neutral-600 bg-transparent" title="Color del botón" />
                            {/* Nombre */}
                            <input type="text" value={m.name} onChange={e => patch(m.id, { name: e.target.value })} disabled={m.builtin} className={`${INPUT_SM_CLASSES} flex-grow min-w-[140px] disabled:opacity-70`} placeholder="Nombre del método" />
                            <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-700 text-neutral-500">{TYPE_LABEL[m.type] || m.type}{m.builtin ? '' : ' · personalizado'}</span>
                            {/* Activar */}
                            <label className="flex items-center gap-2 text-sm ml-auto">
                                <input type="checkbox" checked={m.enabled} onChange={e => patch(m.id, { enabled: e.target.checked })} className="h-4 w-4" />
                                {m.enabled ? 'Activo' : 'Inactivo'}
                            </label>
                            {!m.builtin && <button onClick={() => remove(m.id)} className="text-red-500 hover:text-red-700 p-1" title="Eliminar"><DeleteIcon className="w-4 h-4" /></button>}
                        </div>

                        {/* Requiere referencia (cheque, ATH, etc.) */}
                        {m.type !== 'cash' && m.type !== 'credit' && m.type !== 'invoice' && (
                            <div className="mt-3 flex items-center gap-3 flex-wrap pl-1">
                                <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                                    <input type="checkbox" checked={m.requiresReference} onChange={e => patch(m.id, { requiresReference: e.target.checked })} className="h-4 w-4" />
                                    Pide un dato al cobrar
                                </label>
                                {m.requiresReference && (
                                    <input type="text" value={m.referenceLabel} onChange={e => patch(m.id, { referenceLabel: e.target.value })} placeholder="Etiqueta (ej. Nº de confirmación)" className={`${INPUT_SM_CLASSES} min-w-[220px]`} />
                                )}
                            </div>
                        )}

                        {/* Keys ATH Móvil */}
                        {m.type === 'ath_movil' && (
                            <div className="mt-3 border-t border-neutral-100 dark:border-neutral-700 pt-3 pl-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <div>
                                    <label className="block text-xs text-neutral-500 mb-1">Public Token</label>
                                    <input type="text" value={m.config?.publicToken || ''} onChange={e => patchConfig(m.id, 'publicToken', e.target.value)} className={`${INPUT_SM_CLASSES} w-full`} placeholder="ATH Móvil Business" />
                                </div>
                                <div>
                                    <label className="block text-xs text-neutral-500 mb-1">Private Token</label>
                                    <input type="password" value={m.config?.privateToken || ''} onChange={e => patchConfig(m.id, 'privateToken', e.target.value)} className={`${INPUT_SM_CLASSES} w-full`} placeholder="••••••••" />
                                </div>
                                <div>
                                    <label className="block text-xs text-neutral-500 mb-1">Ambiente</label>
                                    <select value={m.config?.environment || 'production'} onChange={e => patchConfig(m.id, 'environment', e.target.value)} className={`${INPUT_SM_CLASSES} w-full`}>
                                        <option value="production">Producción</option>
                                        <option value="sandbox">Sandbox (pruebas)</option>
                                    </select>
                                </div>
                                <p className="sm:col-span-3 text-xs text-neutral-400">Se guardan para la integración; hoy el cobro se registra con el número de confirmación de la app ATH Móvil.</p>
                            </div>
                        )}

                        {/* Keys AgilPay (Dynamics Payments) */}
                        {m.type === 'agilpay' && (
                            <div className="mt-3 border-t border-neutral-100 dark:border-neutral-700 pt-3 pl-1 grid grid-cols-1 sm:grid-cols-4 gap-2">
                                <div>
                                    <label className="block text-xs text-neutral-500 mb-1">Merchant Key</label>
                                    <input type="text" value={m.config?.merchantKey || ''} onChange={e => patchConfig(m.id, 'merchantKey', e.target.value)} className={`${INPUT_SM_CLASSES} w-full`} placeholder="TEST-001" />
                                </div>
                                <div>
                                    <label className="block text-xs text-neutral-500 mb-1">Client ID</label>
                                    <input type="text" value={m.config?.clientId || ''} onChange={e => patchConfig(m.id, 'clientId', e.target.value)} className={`${INPUT_SM_CLASSES} w-full`} placeholder="API-001" />
                                </div>
                                <div>
                                    <label className="block text-xs text-neutral-500 mb-1">Client Secret</label>
                                    <input type="password" value={m.config?.clientSecret || ''} onChange={e => patchConfig(m.id, 'clientSecret', e.target.value)} className={`${INPUT_SM_CLASSES} w-full`} placeholder="•••••••• (guardado)" />
                                </div>
                                <div>
                                    <label className="block text-xs text-neutral-500 mb-1">Ambiente</label>
                                    <select value={m.config?.environment || 'sandbox'} onChange={e => patchConfig(m.id, 'environment', e.target.value)} className={`${INPUT_SM_CLASSES} w-full`}>
                                        <option value="production">Producción</option>
                                        <option value="sandbox">Sandbox (pruebas)</option>
                                    </select>
                                </div>
                                <p className="sm:col-span-4 text-xs text-neutral-400">Cobro real con tarjeta vía AgilPay (Dynamics Payments). El Client Secret se guarda cifrado en el servidor; déjalo vacío para conservar el actual.</p>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="flex justify-end mt-4">
                <button onClick={handleSave} disabled={saving} className={`${BUTTON_PRIMARY_SM_CLASSES} disabled:opacity-50`}>{saving ? 'Guardando…' : 'Guardar'}</button>
            </div>
        </div>
    );
};
