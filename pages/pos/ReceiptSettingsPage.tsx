import React, { useState, useMemo } from 'react';
import { useGlobalSettings } from '../../contexts/GlobalSettingsContext';
import { DEFAULT_RECEIPT_CONFIG, type ReceiptConfig } from '../../types';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES, INPUT_SM_CLASSES } from '../../constants';
import { buildReceiptHTML, getReceiptAction, setReceiptAction, type ReceiptSale, type ReceiptAction } from '../../components/pos/ReceiptModal';
import { getDrawerConfig, setDrawerConfig, listPrinters, openCashDrawer, type DrawerConfig } from '../../services/cashDrawer';
import { getLabelConfig, setLabelConfig, printBarcodeLabel, type LabelConfig } from '../../services/labelPrinter';
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
    // Preferencia POR DISPOSITIVO de qué hacer al finalizar (preguntar / imprimir / descargar).
    const [receiptAction, setReceiptActionState] = useState<ReceiptAction>(getReceiptAction());
    const changeReceiptAction = (v: ReceiptAction) => { setReceiptAction(v); setReceiptActionState(v); toast.success('Preferencia actualizada para esta caja.'); };
    // Gaveta de efectivo (QZ Tray) — configuración POR DISPOSITIVO.
    const [drawer, setDrawer] = useState<DrawerConfig>(getDrawerConfig());
    const [printers, setPrinters] = useState<string[]>([]);
    const updateDrawer = (patch: Partial<DrawerConfig>) => { const next = { ...drawer, ...patch }; setDrawer(next); setDrawerConfig(next); };
    const detectPrinters = () => listPrinters().then(setPrinters).catch(err => toast.error(`QZ Tray: ${err?.message || 'no disponible (¿instalado y activo?)'}`));
    const testDrawer = () => openCashDrawer().then(() => toast.success('Gaveta abierta.')).catch(err => toast.error(`Gaveta: ${err?.message || 'no se pudo abrir'}`));
    // Impresora de códigos de barras (etiquetas) — POR DISPOSITIVO.
    const [label, setLabel] = useState<LabelConfig>(getLabelConfig());
    const updateLabel = (patch: Partial<LabelConfig>) => { const next = { ...label, ...patch }; setLabel(next); setLabelConfig(next); };
    const testLabel = () => printBarcodeLabel({ name: 'PRODUCTO DE PRUEBA', unitPrice: 9.99, barcode13Digits: '0123456789012' })
        .then(() => toast.success('Etiqueta enviada.')).catch(err => toast.error(`Etiqueta: ${err?.message || 'no se pudo imprimir'}`));

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
                        <h3 className="font-semibold text-primary mb-1">Al finalizar la venta</h3>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">Qué hacer con la factura al cobrar. Aplica solo a <strong>esta caja/dispositivo</strong>. También puedes fijarlo desde el propio recibo con “No volver a preguntar”.</p>
                        <select value={receiptAction} onChange={e => changeReceiptAction(e.target.value as ReceiptAction)} className={`${INPUT_SM_CLASSES} w-full`}>
                            <option value="ask">Preguntar (mostrar el recibo con Imprimir / Descargar)</option>
                            <option value="print">Imprimir siempre automáticamente</option>
                            <option value="download">Descargar PDF siempre automáticamente</option>
                        </select>
                    </section>

                    <section className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4">
                        <h3 className="font-semibold text-primary mb-1">Gaveta de efectivo</h3>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">
                            Abre la gaveta al cobrar en efectivo. Requiere <strong>QZ Tray</strong> instalado en <strong>esta PC</strong>
                            {' '}(descárgalo en qz.io/download). Funciona con la gaveta conectada a la impresora (RJ11) o por USB. Config por dispositivo.
                        </p>
                        <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-200 mb-2">
                            <input type="checkbox" checked={drawer.enabled} onChange={e => updateDrawer({ enabled: e.target.checked })} className="h-4 w-4" />
                            Abrir la gaveta automáticamente en ventas de efectivo
                        </label>
                        {drawer.enabled && (
                            <div className="space-y-2">
                                <div>
                                    <label className="block text-xs text-neutral-500 mb-1">Impresora / dispositivo (en QZ Tray)</label>
                                    <div className="flex gap-2">
                                        <select value={drawer.printerName} onChange={e => updateDrawer({ printerName: e.target.value })} className={`${INPUT_SM_CLASSES} flex-1`}>
                                            <option value="">(Impresora predeterminada)</option>
                                            {printers.map(p => <option key={p} value={p}>{p}</option>)}
                                        </select>
                                        <button type="button" onClick={detectPrinters} className={BUTTON_SECONDARY_SM_CLASSES}>Detectar</button>
                                    </div>
                                    <input type="text" value={drawer.printerName} onChange={e => updateDrawer({ printerName: e.target.value })} placeholder="o escribe el nombre exacto del dispositivo" className={`${INPUT_SM_CLASSES} w-full mt-1`} />
                                </div>
                                <details>
                                    <summary className="text-xs text-neutral-500 cursor-pointer">Avanzado: comando de apertura</summary>
                                    <label className="block text-xs text-neutral-500 mt-1 mb-1">Comando ESC/POS (hex) — por defecto <code>1B700019FA</code></label>
                                    <input type="text" value={drawer.kickHex} onChange={e => updateDrawer({ kickHex: e.target.value.replace(/[^0-9a-fA-F]/g, '') })} placeholder="1B700019FA" className={`${INPUT_SM_CLASSES} w-full`} />
                                </details>
                                <button type="button" onClick={testDrawer} className={BUTTON_PRIMARY_SM_CLASSES}>Probar (abrir gaveta)</button>
                            </div>
                        )}
                    </section>

                    <section className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4">
                        <h3 className="font-semibold text-primary mb-1">Impresora de códigos de barras</h3>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">
                            Impresora <strong>dedicada</strong> a etiquetas para imprimir los códigos de barras de los productos.
                            Con <strong>QZ Tray</strong> se envía directo a la impresora elegida; sin él, usa el diálogo del navegador. Config por dispositivo.
                        </p>
                        <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-200 mb-2">
                            <input type="checkbox" checked={label.enabled} onChange={e => updateLabel({ enabled: e.target.checked })} className="h-4 w-4" />
                            Usar impresora dedicada (QZ Tray) para los códigos de barras
                        </label>
                        {label.enabled && (
                            <div className="mb-2">
                                <label className="block text-xs text-neutral-500 mb-1">Impresora de etiquetas (en QZ Tray)</label>
                                <div className="flex gap-2">
                                    <select value={label.printerName} onChange={e => updateLabel({ printerName: e.target.value })} className={`${INPUT_SM_CLASSES} flex-1`}>
                                        <option value="">(Predeterminada)</option>
                                        {printers.map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                    <button type="button" onClick={detectPrinters} className={BUTTON_SECONDARY_SM_CLASSES}>Detectar</button>
                                </div>
                            </div>
                        )}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            <div>
                                <label className="block text-xs text-neutral-500 mb-1">Ancho (mm)</label>
                                <input type="number" value={label.widthMm} onChange={e => updateLabel({ widthMm: Number(e.target.value) || 0 })} className={`${INPUT_SM_CLASSES} w-full`} />
                            </div>
                            <div>
                                <label className="block text-xs text-neutral-500 mb-1">Alto (mm)</label>
                                <input type="number" value={label.heightMm} onChange={e => updateLabel({ heightMm: Number(e.target.value) || 0 })} className={`${INPUT_SM_CLASSES} w-full`} />
                            </div>
                            <div>
                                <label className="block text-xs text-neutral-500 mb-1">Código a imprimir</label>
                                <select value={label.field} onChange={e => updateLabel({ field: e.target.value as LabelConfig['field'] })} className={`${INPUT_SM_CLASSES} w-full`}>
                                    <option value="barcode13Digits">Código de barras (13 díg.)</option>
                                    <option value="sku">SKU</option>
                                    <option value="barcode2">Código de barras 2</option>
                                    <option value="id">ID interno</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-neutral-500 mb-1">Copias por defecto</label>
                                <input type="number" min={1} value={label.copies} onChange={e => updateLabel({ copies: Math.max(1, Number(e.target.value) || 1) })} className={`${INPUT_SM_CLASSES} w-full`} />
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-2">
                            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={label.showName} onChange={e => updateLabel({ showName: e.target.checked })} className="h-4 w-4" />Nombre</label>
                            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={label.showPrice} onChange={e => updateLabel({ showPrice: e.target.checked })} className="h-4 w-4" />Precio</label>
                            <button type="button" onClick={testLabel} className={`${BUTTON_PRIMARY_SM_CLASSES} ml-auto`}>Imprimir etiqueta de prueba</button>
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
