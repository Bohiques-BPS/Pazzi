import React, { useEffect, useState } from 'react';
import { useGlobalSettings } from '../../contexts/GlobalSettingsContext';
import { BUTTON_PRIMARY_SM_CLASSES, inputFormStyle } from '../../constants';
import { TruckIcon, XMarkIcon } from '../icons';
import { readDeliveryPricing, type DeliveryPricing, type DeliveryPricingMode } from '../../utils/deliveryPricing';
import { toast } from '../../hooks/useToast';

/** Administración › Cobro de entregas: cómo cobra la caja las ventas "para entrega". */
export const DeliveryPricingSettings: React.FC = () => {
    const { settings, updateSettings } = useGlobalSettings();
    const [p, setP] = useState<DeliveryPricing>(() => readDeliveryPricing((settings as any)?.deliveryPricing));
    const [dirty, setDirty] = useState(false);
    useEffect(() => { if (!dirty) setP(readDeliveryPricing((settings as any)?.deliveryPricing)); }, [(settings as any)?.deliveryPricing]); // eslint-disable-line react-hooks/exhaustive-deps

    const set = (patch: Partial<DeliveryPricing>) => { setP(prev => ({ ...prev, ...patch })); setDirty(true); };
    const setZone = (id: string, patch: Partial<DeliveryPricing['zones'][number]>) => set({ zones: p.zones.map(z => z.id === id ? { ...z, ...patch } : z) });

    const save = async () => {
        if (p.mode === 'zone' && !p.zones.some(z => z.name.trim())) { toast.error('Agregue al menos una zona con nombre y precio.'); return; }
        const clean: DeliveryPricing = {
            ...p,
            flatFee: Math.max(0, Number(p.flatFee) || 0),
            zones: p.zones.filter(z => z.name.trim()).map(z => ({ ...z, name: z.name.trim(), price: Math.max(0, Number(z.price) || 0), towns: z.towns.trim() })),
            freeOver: p.freeOver != null && Number(p.freeOver) > 0 ? Number(p.freeOver) : null,
        };
        const ok = await updateSettings({ deliveryPricing: clean } as any);
        if (!ok) { toast.error('No se pudo guardar el cobro de entregas. Intente de nuevo.'); return; }
        setP(clean); setDirty(false);
        toast.success('Cobro de entregas guardado.');
    };

    const MODES: { id: DeliveryPricingMode; title: string; desc: string }[] = [
        { id: 'none', title: 'Sin cargo', desc: 'La entrega no se cobra.' },
        { id: 'flat', title: 'Precio fijo', desc: 'Se suma el mismo precio a cada venta para entrega.' },
        { id: 'zone', title: 'Por zona', desc: 'Cada zona tiene su precio; la caja propone la zona según el pueblo de la dirección.' },
        { id: 'manual', title: 'Manual', desc: 'El cajero escribe el precio en cada entrega.' },
    ];
    const label = 'block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1';

    return (
        <div className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-primary mb-1 flex items-center"><TruckIcon className="w-5 h-5 mr-2" />Cobro de entregas</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                Cómo se cobra la entrega cuando el cajero marca una venta "para entrega". El cargo se suma al total de la venta como una línea "Entrega". No hace falta marcar ningún producto.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {MODES.map(m => {
                    const active = p.mode === m.id;
                    return (
                        <button key={m.id} type="button" onClick={() => set({ mode: m.id })}
                            className={`text-left rounded-lg border-2 p-3 transition-colors ${active ? 'border-primary bg-primary/5 dark:bg-primary/10' : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'}`}>
                            <div className="flex items-center gap-2">
                                <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${active ? 'border-primary' : 'border-neutral-400'}`}>{active && <span className="w-2 h-2 rounded-full bg-primary" />}</span>
                                <span className="font-semibold text-neutral-800 dark:text-neutral-100">{m.title}</span>
                            </div>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 ml-6">{m.desc}</p>
                        </button>
                    );
                })}
            </div>

            {p.mode === 'flat' && (
                <div className="mt-4 max-w-xs">
                    <label className={label}>Precio de la entrega</label>
                    <input type="number" min={0} step="0.01" value={p.flatFee} onChange={e => set({ flatFee: e.target.value as any })} className={inputFormStyle} />
                </div>
            )}

            {p.mode === 'zone' && (
                <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Zonas</span>
                        <button type="button" onClick={() => set({ zones: [...p.zones, { id: Math.random().toString(36).slice(2), name: '', price: 0, towns: '' }] })} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">+ Agregar zona</button>
                    </div>
                    {p.zones.length === 0 ? (
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 rounded-lg ring-1 ring-inset ring-neutral-200 dark:ring-neutral-700 p-4">Aún no hay zonas. Ej.: "Zona Metro" $15 (San Juan, Guaynabo, Carolina), "Zona Este" $25 (Fajardo, Humacao).</p>
                    ) : (
                        <div className="space-y-2">
                            {p.zones.map(z => (
                                <div key={z.id} className="grid grid-cols-12 gap-2 items-start rounded-lg ring-1 ring-inset ring-neutral-200 dark:ring-neutral-700 p-2">
                                    <input value={z.name} onChange={e => setZone(z.id, { name: e.target.value })} placeholder="Nombre de la zona" className={`${inputFormStyle} col-span-12 sm:col-span-3`} />
                                    <div className="col-span-5 sm:col-span-2 relative">
                                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">$</span>
                                        <input type="number" min={0} step="0.01" value={z.price} onChange={e => setZone(z.id, { price: e.target.value as any })} className={`${inputFormStyle} pl-6`} aria-label="Precio de la zona" />
                                    </div>
                                    <input value={z.towns} onChange={e => setZone(z.id, { towns: e.target.value })} placeholder="Pueblos o zip, separados por coma (ej. San Juan, Guaynabo, 00907)" className={`${inputFormStyle} col-span-6 sm:col-span-6`} />
                                    <button type="button" onClick={() => set({ zones: p.zones.filter(x => x.id !== z.id) })} aria-label="Quitar zona" className="col-span-1 h-10 flex items-center justify-center text-red-500 hover:text-red-700"><XMarkIcon className="w-5 h-5" /></button>
                                </div>
                            ))}
                        </div>
                    )}
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Si la ciudad o el zip de la dirección está en la lista de una zona, la caja la escoge sola. Si no, el cajero escoge la zona.</p>
                </div>
            )}

            {p.mode !== 'none' && (
                <div className="mt-5 pt-5 border-t border-neutral-200 dark:border-neutral-700 grid grid-cols-1 md:grid-cols-3 gap-4">
                    {p.mode !== 'manual' && (
                        <label className="flex items-start gap-2 text-sm cursor-pointer">
                            <input type="checkbox" checked={p.allowManual} onChange={e => set({ allowManual: e.target.checked })} className="h-4 w-4 mt-0.5" />
                            <span><span className="font-medium">El cajero puede cambiar el precio</span><span className="block text-xs text-neutral-500 dark:text-neutral-400">Para casos especiales (lejos, carga pesada…).</span></span>
                        </label>
                    )}
                    <label className="flex items-start gap-2 text-sm cursor-pointer">
                        <input type="checkbox" checked={p.taxable} onChange={e => set({ taxable: e.target.checked })} className="h-4 w-4 mt-0.5" />
                        <span><span className="font-medium">La entrega lleva IVU</span><span className="block text-xs text-neutral-500 dark:text-neutral-400">Si está apagado, el cargo de entrega no paga IVU.</span></span>
                    </label>
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium cursor-pointer mb-1">
                            <input type="checkbox" checked={p.freeOver != null} onChange={e => set({ freeOver: e.target.checked ? (p.freeOver || 100) : null })} className="h-4 w-4" />
                            Entrega gratis en compras desde
                        </label>
                        {p.freeOver != null && (
                            <div className="relative max-w-[160px]">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">$</span>
                                <input type="number" min={0} step="0.01" value={p.freeOver} onChange={e => set({ freeOver: e.target.value as any })} className={`${inputFormStyle} pl-6`} />
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="flex items-center justify-end gap-3 mt-5">
                {dirty && <span className="text-xs text-amber-600 dark:text-amber-400">Cambios sin guardar</span>}
                <button type="button" onClick={save} disabled={!dirty} className={`${BUTTON_PRIMARY_SM_CLASSES} disabled:opacity-50`}>Guardar</button>
            </div>
        </div>
    );
};
