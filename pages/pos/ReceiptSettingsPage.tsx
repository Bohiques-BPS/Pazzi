import React, { useState, useMemo, useEffect } from 'react';
import { useGlobalSettings, useTranslation } from '../../contexts/GlobalSettingsContext';
import { barcodeToSvg } from '../../utils/barcode';
import { DEFAULT_RECEIPT_CONFIG, type ReceiptConfig } from '../../types';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES, INPUT_SM_CLASSES } from '../../constants';
import { PhoneInput } from '../../components/ui/PhoneInput';
import { buildReceiptHTML, type ReceiptSale } from '../../components/pos/ReceiptModal';
import { Link } from 'react-router-dom';
import { toast } from '../../hooks/useToast';

// label/placeholder guardan CLAVES i18n; se resuelven con t() al renderizar.
const TEXT_FIELDS: { key: keyof ReceiptConfig; label: string; placeholder?: string; textarea?: boolean }[] = [
    { key: 'businessName', label: 'posx.receipt.field.businessName', placeholder: 'posx.receipt.field.businessName.ph' },
    { key: 'rnc', label: 'posx.receipt.field.rnc', placeholder: 'posx.receipt.field.rnc.ph' },
    { key: 'address', label: 'posx.receipt.field.address', placeholder: 'posx.receipt.field.address.ph' },
    { key: 'phone', label: 'posx.receipt.field.phone', placeholder: 'posx.receipt.field.phone.ph' },
    { key: 'email', label: 'posx.receipt.field.email', placeholder: 'posx.receipt.field.email.ph' },
    { key: 'headerNote', label: 'posx.receipt.field.headerNote', placeholder: 'posx.receipt.field.headerNote.ph', textarea: true },
    { key: 'footerNote', label: 'posx.receipt.field.footerNote', placeholder: 'posx.receipt.field.footerNote.ph', textarea: true },
];

const TOGGLES: { key: keyof ReceiptConfig; label: string }[] = [
    { key: 'showLogo', label: 'posx.receipt.toggle.showLogo' },
    { key: 'showRnc', label: 'posx.receipt.toggle.showRnc' },
    { key: 'showAddress', label: 'posx.receipt.toggle.showAddress' },
    { key: 'showPhone', label: 'posx.receipt.toggle.showPhone' },
    { key: 'showEmail', label: 'posx.receipt.toggle.showEmail' },
    { key: 'showClient', label: 'posx.receipt.toggle.showClient' },
    { key: 'showCashier', label: 'posx.receipt.toggle.showCashier' },
    { key: 'showTaxBreakdown', label: 'posx.receipt.toggle.showTaxBreakdown' },
    { key: 'showFooter', label: 'posx.receipt.toggle.showFooter' },
    { key: 'autoPrint', label: 'posx.receipt.toggle.autoPrint' },
];

const SAMPLE: ReceiptSale = {
    saleNumber: 'AB12CD34',
    date: new Date().toISOString(),
    items: [
        { name: 'CABLE PULLER', quantity: 1, unitPrice: 24.99, description: 'Jalacables de acero, 30m' },
        { name: 'TORNILLO 1/4" (caja)', quantity: 2, unitPrice: 5.50, description: 'Cabeza hexagonal, caja de 100' },
    ],
    subtotal: 35.99, tax: 4.14, discount: 0, total: 40.13,
    payments: [{ method: 'Efectivo', amount: 50 }],
    changeDue: 9.87,
    clientName: 'Público General',
    cashierName: 'Roberto',
};

export const ReceiptSettingsPage: React.FC = () => {
    const { t } = useTranslation();
    const { settings, updateSettings } = useGlobalSettings();
    const [cfg, setCfg] = useState<ReceiptConfig>({ ...DEFAULT_RECEIPT_CONFIG, ...settings.receiptConfig });
    const [saving, setSaving] = useState(false);
    const set = <K extends keyof ReceiptConfig>(key: K, value: ReceiptConfig[K]) =>
        setCfg(prev => ({ ...prev, [key]: value }));

    const [previewHtml, setPreviewHtml] = useState('');
    useEffect(() => {
        let alive = true;
        (async () => {
            let bc = '';
            if ((cfg.design ?? 'modern') === 'classic' && cfg.showBarcode) {
                bc = await barcodeToSvg(`${cfg.receiptPrefix || ''}${SAMPLE.saleNumber}`);
            }
            if (alive) setPreviewHtml(buildReceiptHTML(SAMPLE, cfg, bc));
        })();
        return () => { alive = false; };
    }, [cfg]);

    const handleLogo = (file: File) => {
        if (file.size > 400 * 1024) { toast.error(t('posx.receipt.toast.logoTooBig')); return; }
        const reader = new FileReader();
        reader.onload = () => set('logoUrl', String(reader.result));
        reader.readAsDataURL(file);
    };

    const handleSave = () => {
        setSaving(true);
        updateSettings({ receiptConfig: cfg });
        setTimeout(() => { setSaving(false); toast.success(t('posx.receipt.toast.saved')); }, 300);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-semibold text-neutral-700 dark:text-neutral-200">{t('posx.receipt.title')}</h1>
                <button onClick={handleSave} disabled={saving} className={`${BUTTON_PRIMARY_SM_CLASSES} disabled:opacity-50`}>
                    {saving ? t('posx.receipt.saving') : t('posx.receipt.save')}
                </button>
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">{t('posx.receipt.subtitle')}</p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Formulario */}
                <div className="space-y-4">
                    <section className="space-y-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4">
                        <h3 className="font-semibold text-primary">{t('posx.receipt.section.business')}</h3>
                        {TEXT_FIELDS.map(f => (
                            <div key={f.key}>
                                <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-1">{t(f.label)}</label>
                                {f.textarea ? (
                                    <textarea value={(cfg[f.key] as string) || ''} onChange={e => set(f.key, e.target.value as any)} placeholder={f.placeholder ? t(f.placeholder) : undefined} rows={2} className={`${INPUT_SM_CLASSES} w-full`} />
                                ) : f.key === 'phone' ? (
                                    <PhoneInput value={(cfg[f.key] as string) || ''} onChange={val => set(f.key, val as any)} placeholder={f.placeholder ? t(f.placeholder) : undefined} className="w-full" />
                                ) : (
                                    <input type="text" value={(cfg[f.key] as string) || ''} onChange={e => set(f.key, e.target.value as any)} placeholder={f.placeholder ? t(f.placeholder) : undefined} className={`${INPUT_SM_CLASSES} w-full`} />
                                )}
                            </div>
                        ))}
                        <div>
                            <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-1">{t('posx.receipt.logo')}</label>
                            <div className="flex items-center gap-3">
                                {cfg.logoUrl ? <img src={cfg.logoUrl} alt="logo" className="w-16 h-16 object-contain border rounded bg-white" /> : <div className="w-16 h-16 border rounded flex items-center justify-center text-xs text-neutral-400">{t('posx.receipt.noLogo')}</div>}
                                <input type="file" accept="image/*" onChange={e => e.target.files?.[0] && handleLogo(e.target.files[0])} className="text-sm" />
                                {cfg.logoUrl && <button onClick={() => set('logoUrl', '')} className="text-red-500 text-xs hover:underline">{t('posx.receipt.remove')}</button>}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-1">{t('posx.receipt.paperSize')}</label>
                            <select value={cfg.paperSize} onChange={e => set('paperSize', e.target.value as ReceiptConfig['paperSize'])} className={INPUT_SM_CLASSES}>
                                <option value="80mm">{t('posx.receipt.paper.thermal')}</option>
                                <option value="letter">{t('posx.receipt.paper.letter')}</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-1">{t('posx.receipt.design.label')}</label>
                            <select value={cfg.design ?? 'modern'} onChange={e => set('design', e.target.value as ReceiptConfig['design'])} className={INPUT_SM_CLASSES}>
                                <option value="modern">{t('posx.receipt.design.modern')}</option>
                                <option value="classic">{t('posx.receipt.design.classic')}</option>
                            </select>
                        </div>
                        {(cfg.design ?? 'modern') === 'classic' && (
                            <div className="space-y-2 border-t border-neutral-200 dark:border-neutral-700 pt-3">
                                <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">{t('posx.receipt.design.classic_opts')}</p>
                                <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-200">
                                    <input type="checkbox" checked={cfg.showBarcode ?? true} onChange={e => set('showBarcode', e.target.checked)} className="h-4 w-4" />
                                    {t('posx.receipt.design.show_barcode')}
                                </label>
                                <div>
                                    <label className="block text-xs text-neutral-500 mb-1">{t('posx.receipt.design.prefix')}</label>
                                    <input type="text" value={cfg.receiptPrefix ?? ''} onChange={e => set('receiptPrefix', e.target.value)} placeholder="C" className={`${INPUT_SM_CLASSES} w-full`} />
                                </div>
                                <div>
                                    <label className="block text-xs text-neutral-500 mb-1">{t('posx.receipt.design.reprint_label')}</label>
                                    <input type="text" value={cfg.reprintLabel ?? ''} onChange={e => set('reprintLabel', e.target.value)} placeholder="DUPLICADO - REPRINT - COPY" className={`${INPUT_SM_CLASSES} w-full`} />
                                </div>
                                <div>
                                    <label className="block text-xs text-neutral-500 mb-1">{t('posx.receipt.design.return_policy')}</label>
                                    <input type="text" value={cfg.returnPolicyText ?? ''} onChange={e => set('returnPolicyText', e.target.value)} placeholder="30 días para cambios y/o devoluciones" className={`${INPUT_SM_CLASSES} w-full`} />
                                </div>
                                <div>
                                    <label className="block text-xs text-neutral-500 mb-1">{t('posx.receipt.design.thank_you')}</label>
                                    <input type="text" value={cfg.thankYouText ?? ''} onChange={e => set('thankYouText', e.target.value)} placeholder="*** Gracias por su patrocinio ***" className={`${INPUT_SM_CLASSES} w-full`} />
                                </div>
                                <div>
                                    <label className="block text-xs text-neutral-500 mb-1">{t('posx.receipt.design.payment_terms')}</label>
                                    <input type="text" value={cfg.paymentTermsText ?? ''} onChange={e => set('paymentTermsText', e.target.value)} placeholder="*** Término para pago 30 días ***" className={`${INPUT_SM_CLASSES} w-full`} />
                                </div>
                            </div>
                        )}
                    </section>

                    {/* Términos y condiciones del NEGOCIO para pagos en línea (página de pago y autorización de cobro recurrente). */}
                    <section className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 space-y-3">
                        <h3 className="font-semibold text-primary mb-1">{t('posx.receipt.terms.title')}</h3>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">{t('posx.receipt.terms.help')}</p>
                        <div className="flex flex-wrap gap-1">
                            {(['none', 'link', 'text'] as const).map(m => (
                                <button key={m} type="button" onClick={() => set('termsMode' as any, m)}
                                    className={`px-3.5 py-1.5 text-sm font-medium rounded-full transition-colors ${(cfg.termsMode || 'none') === m ? 'bg-primary text-white shadow-sm' : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}>
                                    {t(`posx.receipt.terms.mode.${m}`)}
                                </button>
                            ))}
                        </div>
                        {cfg.termsMode === 'link' && (
                            <div>
                                <label className="block text-xs text-neutral-500 mb-1">{t('posx.receipt.terms.url')}</label>
                                <input type="url" value={cfg.termsUrl ?? ''} onChange={e => set('termsUrl' as any, e.target.value)} placeholder="https://www.minegocio.com/terminos" className={`${INPUT_SM_CLASSES} w-full`} />
                                {!!cfg.termsUrl && !/^https?:\/\//i.test(cfg.termsUrl) && <p className="text-xs text-amber-600 mt-1">{t('posx.receipt.terms.url_invalid')}</p>}
                            </div>
                        )}
                        {cfg.termsMode === 'text' && (
                            <div>
                                <label className="block text-xs text-neutral-500 mb-1">{t('posx.receipt.terms.text')}</label>
                                <textarea value={cfg.termsText ?? ''} onChange={e => set('termsText' as any, e.target.value)} rows={8} maxLength={20000} placeholder={t('posx.receipt.terms.text_ph')} className={`${INPUT_SM_CLASSES} w-full !h-auto`} />
                            </div>
                        )}
                        <p className="text-xs text-neutral-400">{t('posx.receipt.terms.pazzi_note')}</p>
                    </section>

                    {/* Diseño de la FACTURA (PDF de correo/descarga) */}
                    {(() => {
                        const dz: any = (cfg as any).invoiceDesign || {};
                        const setDz = (patch: any) => set('invoiceDesign' as any, { ...dz, ...patch });
                        const boolField = (key: string, label: string) => (
                            <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-200">
                                <input type="checkbox" checked={dz[key] !== false} onChange={e => setDz({ [key]: e.target.checked })} className="h-4 w-4" />
                                {label}
                            </label>
                        );
                        return (
                            <section className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 space-y-3">
                                <h3 className="font-semibold text-primary mb-1">📄 Diseño de la factura</h3>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400">Aplica al PDF de la factura (correo, descarga y factura del POS).</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-neutral-500 mb-1">Plantilla</label>
                                        <select value={dz.template ?? 'modern'} onChange={e => setDz({ template: e.target.value })} className={`${INPUT_SM_CLASSES} w-full`}>
                                            <option value="modern">Moderno (logo izq., título de color)</option>
                                            <option value="banner">Banner (banda de color arriba)</option>
                                            <option value="classic">Clásico (centrado, sobrio)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-neutral-500 mb-1">Combinaciones rápidas</label>
                                        <div className="flex flex-wrap gap-2 pt-1">
                                            {[
                                                { n: 'Verde/Morado', h: '#4CAF50', a: '#7E57C2' },
                                                { n: 'Azul', h: '#1E88E5', a: '#0D47A1' },
                                                { n: 'Teal', h: '#0D9488', a: '#0F766E' },
                                                { n: 'Rojo', h: '#E53935', a: '#B71C1C' },
                                                { n: 'Oscuro', h: '#374151', a: '#111827' },
                                            ].map(p => (
                                                <button key={p.n} type="button" title={p.n} onClick={() => setDz({ headerColor: p.h, accentColor: p.a })}
                                                    className="w-8 h-8 rounded-md border border-neutral-300 dark:border-neutral-600 overflow-hidden flex" style={{ background: `linear-gradient(135deg, ${p.h} 50%, ${p.a} 50%)` }} />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-neutral-500 mb-1">Título del documento</label>
                                        <input type="text" value={dz.title ?? 'FACTURA'} onChange={e => setDz({ title: e.target.value })} className={`${INPUT_SM_CLASSES} w-full`} placeholder="FACTURA" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-neutral-500 mb-1">Texto del pie</label>
                                        <input type="text" value={dz.footerText ?? ''} onChange={e => setDz({ footerText: e.target.value })} className={`${INPUT_SM_CLASSES} w-full`} placeholder="¡Gracias por su preferencia!" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-neutral-500 mb-1">Color del encabezado de la tabla</label>
                                        <div className="flex items-center gap-2">
                                            <input type="color" value={dz.headerColor ?? '#4CAF50'} onChange={e => setDz({ headerColor: e.target.value })} className="h-9 w-12 rounded border border-neutral-300 dark:border-neutral-600" />
                                            <input type="text" value={dz.headerColor ?? '#4CAF50'} onChange={e => setDz({ headerColor: e.target.value })} className={`${INPUT_SM_CLASSES} w-28`} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-neutral-500 mb-1">Color del título / total</label>
                                        <div className="flex items-center gap-2">
                                            <input type="color" value={dz.accentColor ?? '#7E57C2'} onChange={e => setDz({ accentColor: e.target.value })} className="h-9 w-12 rounded border border-neutral-300 dark:border-neutral-600" />
                                            <input type="text" value={dz.accentColor ?? '#7E57C2'} onChange={e => setDz({ accentColor: e.target.value })} className={`${INPUT_SM_CLASSES} w-28`} />
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                                    {boolField('showLogo', 'Mostrar logo')}
                                    {boolField('showBusiness', 'Nombre del negocio')}
                                    {boolField('showAddress', 'Dirección')}
                                    {boolField('showPhone', 'Teléfono')}
                                    {boolField('showEmail', 'Correo')}
                                    {boolField('showRnc', 'RNC / registro')}
                                    {boolField('showClient', 'Datos del cliente')}
                                    {boolField('showPaymentMethod', 'Método de pago')}
                                    {boolField('showNotes', 'Notas / términos de línea')}
                                </div>
                                {/* Descripción por línea: opt-in (apagado por defecto). */}
                                <label className="flex items-start gap-2 text-sm text-neutral-700 dark:text-neutral-200 pt-1">
                                    <input type="checkbox" checked={!!dz.showLineDescription} onChange={e => setDz({ showLineDescription: e.target.checked })} className="h-4 w-4 mt-0.5" />
                                    <span>
                                        Mostrar descripción por línea
                                        <span className="block text-xs text-neutral-500 dark:text-neutral-400">La descripción de cada producto aparece debajo de su nombre en cada fila de la factura.</span>
                                    </span>
                                </label>

                                {/* Textos editables de la factura */}
                                {(() => {
                                    const labels = dz.labels || {};
                                    const setLabel = (k: string, v: string) => setDz({ labels: { ...labels, [k]: v } });
                                    const fields: { k: string; label: string; def: string }[] = [
                                        { k: 'clientHeading', label: 'Encabezado del cliente', def: 'Datos del Cliente' },
                                        { k: 'number', label: 'Etiqueta "Número"', def: 'Número' },
                                        { k: 'date', label: 'Etiqueta "Fecha"', def: 'Fecha' },
                                        { k: 'paymentMethod', label: 'Etiqueta "Método de pago"', def: 'Método de pago' },
                                        { k: 'status', label: 'Etiqueta "Estado"', def: 'Estado' },
                                        { k: 'paid', label: 'Texto "Pagada"', def: 'PAGADA' },
                                        { k: 'pending', label: 'Texto "Pendiente"', def: 'PENDIENTE' },
                                        { k: 'colProduct', label: 'Columna "Producto"', def: 'Producto' },
                                        { k: 'colQty', label: 'Columna "Cant"', def: 'Cant' },
                                        { k: 'colPrice', label: 'Columna "Precio Unit."', def: 'Precio Unit.' },
                                        { k: 'colTotal', label: 'Columna "Total"', def: 'Total' },
                                        { k: 'subtotal', label: 'Total: "Subtotal"', def: 'Subtotal' },
                                        { k: 'tax', label: 'Total: "IVU"', def: 'IVU' },
                                        { k: 'total', label: 'Total: "Total"', def: 'Total' },
                                    ];
                                    return (
                                        <details className="pt-2">
                                            <summary className="text-sm font-medium cursor-pointer text-primary">✏️ Editar textos de la factura</summary>
                                            <p className="text-xs text-neutral-400 mt-1 mb-2">Personaliza cada etiqueta. Deja vacío para usar el texto por defecto.</p>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                                {fields.map(f => (
                                                    <div key={f.k}>
                                                        <label className="block text-[11px] text-neutral-500 mb-0.5">{f.label}</label>
                                                        <input type="text" value={labels[f.k] ?? ''} onChange={e => setLabel(f.k, e.target.value)} placeholder={f.def} className={`${INPUT_SM_CLASSES} w-full`} />
                                                    </div>
                                                ))}
                                            </div>
                                        </details>
                                    );
                                })()}
                            </section>
                        );
                    })()}

                    {/* Impresoras, gaveta y etiquetas viven en "Configuración de la terminal" (por PC). */}
                    <section className="bg-primary/5 border border-primary/30 rounded-lg p-4 text-sm text-neutral-700 dark:text-neutral-200">
                        <p className="font-semibold text-primary mb-1">🖨️ Impresoras de esta PC</p>
                        <p className="text-neutral-600 dark:text-neutral-300">La impresora de recibos y facturas, la gaveta y las etiquetas se configuran en cada terminal, en <Link to="/pos/terminal-settings" className="text-primary font-medium underline">Configuración de la terminal</Link>.</p>
                    </section>
                    <section className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4">
                        <h3 className="font-semibold text-primary mb-2">{t('posx.receipt.section.whatToShow')}</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {TOGGLES.map(tg => (
                                <label key={tg.key} className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-200">
                                    <input type="checkbox" checked={!!cfg[tg.key]} onChange={e => set(tg.key, e.target.checked as any)} className="h-4 w-4" />
                                    {t(tg.label)}
                                </label>
                            ))}
                        </div>
                    </section>
                </div>

                {/* Vista previa — sticky en desktop para seguir el scroll del formulario */}
                <div className="lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
                    <h3 className="font-semibold text-neutral-600 dark:text-neutral-300 mb-2">{t('posx.receipt.preview')}</h3>
                    <div className="bg-neutral-100 dark:bg-neutral-900 rounded-lg p-4 flex justify-center overflow-x-auto">
                        <div className="bg-white shadow" dangerouslySetInnerHTML={{ __html: previewHtml }} />
                    </div>
                </div>
            </div>

            <div className="flex justify-end mt-4">
                <button onClick={handleSave} disabled={saving} className={`${BUTTON_PRIMARY_SM_CLASSES} disabled:opacity-50`}>
                    {saving ? t('posx.receipt.saving') : t('posx.receipt.save')}
                </button>
            </div>
        </div>
    );
};
