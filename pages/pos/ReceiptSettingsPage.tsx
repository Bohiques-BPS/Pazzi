import React, { useState, useMemo } from 'react';
import { useGlobalSettings } from '../../contexts/GlobalSettingsContext';
import { DEFAULT_RECEIPT_CONFIG, type ReceiptConfig } from '../../types';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES, INPUT_SM_CLASSES } from '../../constants';
import { buildReceiptHTML, type ReceiptSale } from '../../components/pos/ReceiptModal';
import { toast } from '../../hooks/useToast';

const TEXT_FIELDS: { key: keyof ReceiptConfig; label: string; placeholder?: string; textarea?: boolean }[] = [
    { key: 'businessName', label: 'Nombre del negocio', placeholder: 'Ferretería La Económica' },
    { key: 'rnc', label: 'RNC / Registro del comercio', placeholder: 'RNC-000-00000-0' },
    { key: 'address', label: 'Dirección', placeholder: 'Calle 1 #23, San Juan, PR 00901' },
    { key: 'phone', label: 'Teléfono', placeholder: '(787) 000-0000' },
    { key: 'email', label: 'Email', placeholder: 'ventas@negocio.com' },
    { key: 'headerNote', label: 'Nota superior', placeholder: 'Texto opcional arriba de la factura', textarea: true },
    { key: 'footerNote', label: 'Pie / Términos legales', placeholder: 'Gracias por su compra. No hay devoluciones sin recibo…', textarea: true },
];

const TOGGLES: { key: keyof ReceiptConfig; label: string }[] = [
    { key: 'showLogo', label: 'Mostrar logo' },
    { key: 'showRnc', label: 'Mostrar RNC/registro' },
    { key: 'showAddress', label: 'Mostrar dirección' },
    { key: 'showPhone', label: 'Mostrar teléfono' },
    { key: 'showEmail', label: 'Mostrar email' },
    { key: 'showClient', label: 'Mostrar cliente' },
    { key: 'showCashier', label: 'Mostrar cajero' },
    { key: 'showTaxBreakdown', label: 'Mostrar desglose de IVU' },
    { key: 'showFooter', label: 'Mostrar pie/términos' },
    { key: 'autoPrint', label: 'Imprimir automáticamente al finalizar' },
];

const SAMPLE: ReceiptSale = {
    saleNumber: 'AB12CD34',
    date: new Date().toISOString(),
    items: [
        { name: 'CABLE PULLER', quantity: 1, unitPrice: 24.99 },
        { name: 'TORNILLO 1/4" (caja)', quantity: 2, unitPrice: 5.50 },
    ],
    subtotal: 35.99, tax: 4.14, discount: 0, total: 40.13,
    payments: [{ method: 'Efectivo', amount: 50 }],
    changeDue: 9.87,
    clientName: 'Público General',
    cashierName: 'Roberto',
};

export const ReceiptSettingsPage: React.FC = () => {
    const { settings, updateSettings } = useGlobalSettings();
    const [cfg, setCfg] = useState<ReceiptConfig>({ ...DEFAULT_RECEIPT_CONFIG, ...settings.receiptConfig });
    const [saving, setSaving] = useState(false);

    const set = <K extends keyof ReceiptConfig>(key: K, value: ReceiptConfig[K]) =>
        setCfg(prev => ({ ...prev, [key]: value }));

    const previewHtml = useMemo(() => buildReceiptHTML(SAMPLE, cfg), [cfg]);

    const handleLogo = (file: File) => {
        if (file.size > 400 * 1024) { toast.error('El logo debe pesar menos de 400 KB.'); return; }
        const reader = new FileReader();
        reader.onload = () => set('logoUrl', String(reader.result));
        reader.readAsDataURL(file);
    };

    const handleSave = () => {
        setSaving(true);
        updateSettings({ receiptConfig: cfg });
        setTimeout(() => { setSaving(false); toast.success('Configuración de factura guardada.'); }, 300);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-semibold text-neutral-700 dark:text-neutral-200">Configuración de la Factura</h1>
                <button onClick={handleSave} disabled={saving} className={`${BUTTON_PRIMARY_SM_CLASSES} disabled:opacity-50`}>
                    {saving ? 'Guardando…' : 'Guardar'}
                </button>
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">Personaliza lo que aparece en la factura que se genera al finalizar cada venta. Los cambios se guardan en la base de datos para todo el negocio.</p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Formulario */}
                <div className="space-y-4">
                    <section className="space-y-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4">
                        <h3 className="font-semibold text-primary">Datos del negocio</h3>
                        {TEXT_FIELDS.map(f => (
                            <div key={f.key}>
                                <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-1">{f.label}</label>
                                {f.textarea ? (
                                    <textarea value={(cfg[f.key] as string) || ''} onChange={e => set(f.key, e.target.value as any)} placeholder={f.placeholder} rows={2} className={`${INPUT_SM_CLASSES} w-full`} />
                                ) : (
                                    <input type="text" value={(cfg[f.key] as string) || ''} onChange={e => set(f.key, e.target.value as any)} placeholder={f.placeholder} className={`${INPUT_SM_CLASSES} w-full`} />
                                )}
                            </div>
                        ))}
                        <div>
                            <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-1">Logo</label>
                            <div className="flex items-center gap-3">
                                {cfg.logoUrl ? <img src={cfg.logoUrl} alt="logo" className="w-16 h-16 object-contain border rounded bg-white" /> : <div className="w-16 h-16 border rounded flex items-center justify-center text-xs text-neutral-400">Sin logo</div>}
                                <input type="file" accept="image/*" onChange={e => e.target.files?.[0] && handleLogo(e.target.files[0])} className="text-sm" />
                                {cfg.logoUrl && <button onClick={() => set('logoUrl', '')} className="text-red-500 text-xs hover:underline">Quitar</button>}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-1">Tamaño de papel</label>
                            <select value={cfg.paperSize} onChange={e => set('paperSize', e.target.value as ReceiptConfig['paperSize'])} className={INPUT_SM_CLASSES}>
                                <option value="80mm">Térmico 80mm (recibo)</option>
                                <option value="letter">Carta (documento)</option>
                            </select>
                        </div>
                    </section>

                    <section className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4">
                        <h3 className="font-semibold text-primary mb-2">Qué mostrar</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {TOGGLES.map(tg => (
                                <label key={tg.key} className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-200">
                                    <input type="checkbox" checked={!!cfg[tg.key]} onChange={e => set(tg.key, e.target.checked as any)} className="h-4 w-4" />
                                    {tg.label}
                                </label>
                            ))}
                        </div>
                    </section>
                </div>

                {/* Vista previa */}
                <div>
                    <h3 className="font-semibold text-neutral-600 dark:text-neutral-300 mb-2">Vista previa</h3>
                    <div className="bg-neutral-100 dark:bg-neutral-900 rounded-lg p-4 flex justify-center overflow-x-auto">
                        <div className="bg-white shadow" dangerouslySetInnerHTML={{ __html: previewHtml }} />
                    </div>
                </div>
            </div>

            <div className="flex justify-end mt-4">
                <button onClick={handleSave} disabled={saving} className={`${BUTTON_PRIMARY_SM_CLASSES} disabled:opacity-50`}>
                    {saving ? 'Guardando…' : 'Guardar'}
                </button>
            </div>
        </div>
    );
};
