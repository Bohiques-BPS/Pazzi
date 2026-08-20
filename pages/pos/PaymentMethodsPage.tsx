import React, { useState } from 'react';
import { useGlobalSettings, useTranslation } from '../../contexts/GlobalSettingsContext';
import { useData } from '../../contexts/DataContext';
import { DEFAULT_PAYMENT_METHODS, type PaymentMethodConfig, type PaymentMethodScopes } from '../../types';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES, INPUT_SM_CLASSES } from '../../constants';
import { ArrowUpIcon, ArrowDownIcon, DeleteIcon, PlusIcon } from '../../components/icons';
import { toast } from '../../hooks/useToast';

/** Quita/añade un id en una lista, devolviendo la nueva lista (sin duplicados, sin vacíos). */
const toggleInList = (list: string[] | undefined, id: string, disabled: boolean): string[] => {
    const set = new Set(list || []);
    if (disabled) set.add(id); else set.delete(id);
    return [...set];
};

const TYPE_LABEL: Record<string, string> = {
    cash: 'Efectivo', card: 'Tarjeta', ath_movil: 'ATH Móvil', credit: 'Crédito', check: 'Cheque', invoice: 'Factura', custom: 'Personalizado',
};

const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `metodo-${Date.now()}`;

export const PaymentMethodsPage: React.FC = () => {
    const { t } = useTranslation();
    const { settings, updateSettings } = useGlobalSettings();
    const { branches, cajas } = useData();
    const [methods, setMethods] = useState<PaymentMethodConfig[]>(
        (settings.paymentMethods && settings.paymentMethods.length ? settings.paymentMethods : DEFAULT_PAYMENT_METHODS).map(m => ({ ...m }))
    );
    // Overrides por alcance: ids de métodos DESHABILITADOS por sucursal / caja.
    const [scopes, setScopes] = useState<PaymentMethodScopes>({
        branchDisabled: { ...(settings.paymentMethodScopes?.branchDisabled || {}) },
        cajaDisabled: { ...(settings.paymentMethodScopes?.cajaDisabled || {}) },
    });
    const [expandedScope, setExpandedScope] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    // Efectivo/activo por alcance (global apagado ⇒ apagado en todas partes).
    const branchOn = (mId: string, bId: string) => !(scopes.branchDisabled[bId] || []).includes(mId);
    const cajaOn = (mId: string, cId: string) => !(scopes.cajaDisabled[cId] || []).includes(mId);

    const setBranchDisabled = (mId: string, bId: string, disabled: boolean) =>
        setScopes(prev => ({ ...prev, branchDisabled: { ...prev.branchDisabled, [bId]: toggleInList(prev.branchDisabled[bId], mId, disabled) } }));
    const setCajaDisabled = (mId: string, cId: string, disabled: boolean) =>
        setScopes(prev => ({ ...prev, cajaDisabled: { ...prev.cajaDisabled, [cId]: toggleInList(prev.cajaDisabled[cId], mId, disabled) } }));

    // Cuántos alcances tienen el método apagado (para el resumen del botón).
    const disabledScopeCount = (mId: string) =>
        Object.values(scopes.branchDisabled).filter(l => l.includes(mId)).length +
        Object.values(scopes.cajaDisabled).filter(l => l.includes(mId)).length;

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
        setMethods(prev => [...prev, { id, name: t('posx.paymentmethods.new_method_name'), enabled: true, color: '#607D8B', type: 'custom', requiresReference: false, referenceLabel: '', builtin: false }]);
    };

    const remove = (id: string) => setMethods(prev => prev.filter(m => m.id !== id));

    const handleSave = () => {
        // Normalizar ids de custom por si cambiaron el nombre.
        const cleaned = methods.map(m => (m.builtin ? m : { ...m, id: m.id.startsWith('custom-') ? m.id : slug(m.name) }));
        setSaving(true);
        updateSettings({ paymentMethods: cleaned, paymentMethodScopes: scopes });
        setTimeout(() => { setSaving(false); toast.success(t('posx.paymentmethods.saved')); }, 300);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-2">
                <h1 className="text-2xl font-semibold text-neutral-700 dark:text-neutral-200">{t('posx.paymentmethods.title')}</h1>
                <div className="flex gap-2">
                    <button onClick={addCustom} className={`${BUTTON_SECONDARY_SM_CLASSES} flex items-center gap-1`}><PlusIcon className="w-4 h-4" /> {t('posx.paymentmethods.add_method')}</button>
                    <button onClick={handleSave} disabled={saving} className={`${BUTTON_PRIMARY_SM_CLASSES} disabled:opacity-50`}>{saving ? t('posx.paymentmethods.saving') : t('common.save')}</button>
                </div>
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">{t('posx.paymentmethods.intro')}</p>

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
                            <input type="color" value={m.color} onChange={e => patch(m.id, { color: e.target.value })} className="w-9 h-9 rounded cursor-pointer border border-neutral-300 dark:border-neutral-600 bg-transparent" title={t('posx.paymentmethods.button_color')} />
                            {/* Nombre */}
                            <input type="text" value={m.name} onChange={e => patch(m.id, { name: e.target.value })} disabled={m.builtin} className={`${INPUT_SM_CLASSES} flex-grow min-w-[140px] disabled:opacity-70`} placeholder={t('posx.paymentmethods.method_name_placeholder')} />
                            <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-700 text-neutral-500">{TYPE_LABEL[m.type] || m.type}{m.builtin ? '' : t('posx.paymentmethods.custom_suffix')}</span>
                            {/* Activar */}
                            <label className="flex items-center gap-2 text-sm ml-auto">
                                <input type="checkbox" checked={m.enabled} onChange={e => patch(m.id, { enabled: e.target.checked })} className="h-4 w-4" />
                                {m.enabled ? t('posx.paymentmethods.active') : t('posx.paymentmethods.inactive')}
                            </label>
                            {!m.builtin && <button onClick={() => remove(m.id)} className="text-red-500 hover:text-red-700 p-1" title={t('posx.paymentmethods.delete')}><DeleteIcon className="w-4 h-4" /></button>}
                        </div>

                        {/* Requiere referencia (cheque, ATH, etc.) */}
                        {m.type !== 'cash' && m.type !== 'credit' && m.type !== 'invoice' && (
                            <div className="mt-3 flex items-center gap-3 flex-wrap pl-1">
                                <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                                    <input type="checkbox" checked={m.requiresReference} onChange={e => patch(m.id, { requiresReference: e.target.checked })} className="h-4 w-4" />
                                    {t('posx.paymentmethods.requires_reference')}
                                </label>
                                {m.requiresReference && (
                                    <input type="text" value={m.referenceLabel} onChange={e => patch(m.id, { referenceLabel: e.target.value })} placeholder={t('posx.paymentmethods.reference_label_placeholder')} className={`${INPUT_SM_CLASSES} min-w-[220px]`} />
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
                                    <label className="block text-xs text-neutral-500 mb-1">{t('posx.paymentmethods.environment')}</label>
                                    <select value={m.config?.environment || 'production'} onChange={e => patchConfig(m.id, 'environment', e.target.value)} className={`${INPUT_SM_CLASSES} w-full`}>
                                        <option value="production">{t('posx.paymentmethods.env_production')}</option>
                                        <option value="sandbox">{t('posx.paymentmethods.env_sandbox')}</option>
                                    </select>
                                </div>
                                <p className="sm:col-span-3 text-xs text-neutral-400">{t('posx.paymentmethods.ath_note')}</p>
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
                                    <label className="block text-xs text-neutral-500 mb-1">{t('posx.paymentmethods.environment')}</label>
                                    <select value={m.config?.environment || 'sandbox'} onChange={e => patchConfig(m.id, 'environment', e.target.value)} className={`${INPUT_SM_CLASSES} w-full`}>
                                        <option value="production">{t('posx.paymentmethods.env_production')}</option>
                                        <option value="sandbox">{t('posx.paymentmethods.env_sandbox')}</option>
                                    </select>
                                </div>
                                <p className="sm:col-span-4 text-xs text-neutral-400">{t('posx.paymentmethods.agilpay_note')}</p>
                            </div>
                        )}

                        {/* Disponibilidad por sucursal / caja */}
                        <div className="mt-3 border-t border-neutral-100 dark:border-neutral-700 pt-3 pl-1">
                            <button
                                type="button"
                                onClick={() => setExpandedScope(expandedScope === m.id ? null : m.id)}
                                className="text-sm text-primary hover:underline flex items-center gap-1"
                            >
                                {t('posx.paymentmethods.availability')}
                                {disabledScopeCount(m.id) > 0 && (
                                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                                        {t('posx.paymentmethods.disabled_count', { count: disabledScopeCount(m.id) })}
                                    </span>
                                )}
                                <span className="text-neutral-400">{expandedScope === m.id ? '▲' : '▼'}</span>
                            </button>

                            {expandedScope === m.id && (
                                <div className="mt-2">
                                    {!m.enabled ? (
                                        <p className="text-xs text-neutral-500">{t('posx.paymentmethods.inactive_global_pre')} <strong>{t('posx.paymentmethods.inactive_word')}</strong> {t('posx.paymentmethods.inactive_global_post')}</p>
                                    ) : branches.length === 0 ? (
                                        <p className="text-xs text-neutral-500">{t('posx.paymentmethods.no_branches')}</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {branches.map(b => {
                                                const bOn = branchOn(m.id, b.id);
                                                const branchCajas = cajas.filter(c => c.branchId === b.id);
                                                return (
                                                    <div key={b.id} className="rounded-md border border-neutral-100 dark:border-neutral-700 p-2">
                                                        <label className="flex items-center gap-2 text-sm font-medium">
                                                            <input type="checkbox" checked={bOn} onChange={e => setBranchDisabled(m.id, b.id, !e.target.checked)} className="h-4 w-4" />
                                                            {b.name}
                                                            {!bOn && <span className="text-xs text-red-500">{t('posx.paymentmethods.off_in_branch')}</span>}
                                                        </label>
                                                        {branchCajas.length > 0 && (
                                                            <div className="mt-1.5 ml-6 space-y-1">
                                                                {branchCajas.map(c => (
                                                                    <label key={c.id} className={`flex items-center gap-2 text-sm ${!bOn ? 'opacity-40' : ''}`}>
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={bOn && cajaOn(m.id, c.id)}
                                                                            disabled={!bOn}
                                                                            onChange={e => setCajaDisabled(m.id, c.id, !e.target.checked)}
                                                                            className="h-4 w-4"
                                                                        />
                                                                        {c.name}
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                            <p className="text-xs text-neutral-400">{t('posx.paymentmethods.scope_help')}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex justify-end mt-4">
                <button onClick={handleSave} disabled={saving} className={`${BUTTON_PRIMARY_SM_CLASSES} disabled:opacity-50`}>{saving ? t('posx.paymentmethods.saving') : t('common.save')}</button>
            </div>
        </div>
    );
};
