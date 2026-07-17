import React, { useState, useEffect, useMemo } from 'react';
import { ECommerceSettings, ECommerceTemplate } from '../../types';
import { DEFAULT_ECOMMERCE_SETTINGS, inputFormStyle, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import { ecommerceSettingsService } from '../../services/ecommerceSettings';
import { ApiError } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from '../../hooks/useToast';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';

// ── Catálogo de templates disponibles ──
const TEMPLATES: { id: ECommerceTemplate; name: string; desc: string; emoji: string }[] = [
    { id: 'Moderno', name: 'Moderno', desc: 'Cuadrícula limpia con imágenes grandes.', emoji: '🟦' },
    { id: 'Catalogo', name: 'Catálogo retail', desc: 'Denso, ideal para muchos productos (ferretería).', emoji: '🗂️' },
    { id: 'Clasico', name: 'Clásico', desc: 'Tradicional, con secciones y bloques.', emoji: '🧱' },
    { id: 'Minimalista', name: 'Minimalista', desc: 'Mucho espacio, tipografía protagonista.', emoji: '⚪' },
];

const PAYMENT_OPTIONS: { key: string; label: string }[] = [
    { key: 'cash', label: 'Efectivo' },
    { key: 'card', label: 'Tarjeta' },
    { key: 'transfer', label: 'Transferencia' },
    { key: 'ath', label: 'ATH Móvil' },
    { key: 'whatsapp', label: 'Coordinar por WhatsApp' },
];

const Section: React.FC<{ title: string; subtitle?: string; children: React.ReactNode }> = ({ title, subtitle, children }) => (
    <div className="bg-white dark:bg-neutral-800 p-5 rounded-lg shadow-sm border border-neutral-100 dark:border-neutral-700">
        <h3 className="text-base font-semibold text-neutral-800 dark:text-neutral-100 mb-1">{title}</h3>
        {subtitle && <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">{subtitle}</p>}
        {children}
    </div>
);

const ColorField: React.FC<{ label: string; value: string; onChange: (v: string) => void }> = ({ label, value, onChange }) => (
    <div>
        <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-300 mb-1">{label}</label>
        <div className="flex items-center gap-2">
            <input type="color" value={value || '#000000'} onChange={e => onChange(e.target.value)} className="h-9 w-12 p-1 border border-neutral-300 dark:border-neutral-600 rounded-md cursor-pointer" />
            <input type="text" value={value || ''} onChange={e => onChange(e.target.value)} className={`${inputFormStyle} w-28 text-sm`} placeholder="#0f766e" />
        </div>
    </div>
);

export const ECommerceSettingsPage: React.FC = () => {
    const { currentUser } = useAuth();
    const [formData, setFormData] = useState<ECommerceSettings>(DEFAULT_ECOMMERCE_SETTINGS);
    const [storeOwnerId, setStoreOwnerId] = useState<string>(currentUser?.id || '');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const data = await ecommerceSettingsService.getMine();
                if (cancelled) return;
                setFormData({ ...DEFAULT_ECOMMERCE_SETTINGS, ...data });
                if ((data as any).storeOwnerId) setStoreOwnerId((data as any).storeOwnerId);
            } catch (err) {
                if (!cancelled && err instanceof ApiError) toast.error(err.message);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const set = <K extends keyof ECommerceSettings>(key: K, value: ECommerceSettings[K]) =>
        setFormData(prev => ({ ...prev, [key]: value }));

    const storeUrl = useMemo(() => {
        const id = storeOwnerId || currentUser?.id || '';
        return `${window.location.origin}/#/store/${id}`;
    }, [storeOwnerId, currentUser]);

    const selectedPayments = useMemo(
        () => (formData.paymentMethods || '').split(',').map(s => s.trim()).filter(Boolean),
        [formData.paymentMethods]
    );
    const togglePayment = (key: string) => {
        const set = new Set(selectedPayments);
        set.has(key) ? set.delete(key) : set.add(key);
        setFormData(prev => ({ ...prev, paymentMethods: Array.from(set).join(',') }));
    };

    const handleCopyUrl = async () => {
        try { await navigator.clipboard.writeText(storeUrl); toast.success('URL copiada al portapapeles.'); }
        catch { toast.error('No se pudo copiar. Copia la URL manualmente.'); }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const saved = await ecommerceSettingsService.updateMine(formData);
            setFormData({ ...DEFAULT_ECOMMERCE_SETTINGS, ...saved });
            toast.success('Tienda actualizada. Los cambios ya son visibles en tu tienda pública.');
        } catch (err) {
            toast.error(err instanceof ApiError ? err.message : 'Error al guardar.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="max-w-4xl mx-auto p-2"><LoadingSkeleton variant="form" rows={8} /></div>;

    return (
        <div className="max-w-4xl mx-auto pb-10">
            <h1 className="text-2xl font-semibold text-neutral-700 dark:text-neutral-200 mb-1">Mi tienda online</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">Personaliza cómo se ve tu tienda pública y compártela con tus clientes.</p>

            {/* ── Tarjeta de URL de la tienda ── */}
            <div className="mb-6 rounded-xl p-5 text-white shadow-md" style={{ background: `linear-gradient(135deg, ${formData.primaryColor}, ${formData.secondaryColor || formData.primaryColor})` }}>
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="min-w-0">
                        <p className="text-xs uppercase tracking-wide opacity-80">🔗 La URL de tu tienda</p>
                        <p className="font-mono text-sm sm:text-base truncate">{storeUrl}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                        <button type="button" onClick={handleCopyUrl} className="px-3 py-1.5 rounded-md bg-white/20 hover:bg-white/30 text-sm font-medium">📋 Copiar</button>
                        <a href={storeUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-md bg-white text-neutral-800 hover:bg-white/90 text-sm font-medium">Abrir ↗</a>
                    </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" checked={formData.isActive ?? true} onChange={e => set('isActive', e.target.checked)} className="h-4 w-4" />
                        Tienda activa (visible al público)
                    </label>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* ── Identidad ── */}
                <Section title="Identidad de la tienda" subtitle="Nombre, logo y mensaje principal.">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium mb-1">Nombre de la tienda</label>
                            <input type="text" value={formData.storeName} onChange={e => set('storeName', e.target.value)} className={inputFormStyle} required />
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-1">Eslogan / tagline</label>
                            <input type="text" value={formData.tagline || ''} onChange={e => set('tagline', e.target.value)} className={inputFormStyle} placeholder="Los mejores precios de la isla" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-1">URL del logo</label>
                            <input type="url" value={formData.logoUrl || ''} onChange={e => set('logoUrl', e.target.value)} className={inputFormStyle} placeholder="https://…/logo.png" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-1">URL del banner (portada)</label>
                            <input type="url" value={formData.bannerUrl || ''} onChange={e => set('bannerUrl', e.target.value)} className={inputFormStyle} placeholder="https://…/banner.jpg" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-medium mb-1">Descripción</label>
                            <textarea value={formData.description || ''} onChange={e => set('description', e.target.value)} rows={2} className={inputFormStyle} placeholder="Cuéntale a tus clientes sobre tu tienda…" />
                        </div>
                    </div>
                </Section>

                {/* ── Plantilla ── */}
                <Section title="Plantilla" subtitle="Elige el estilo de tu tienda.">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {TEMPLATES.map(tpl => {
                            const active = formData.template === tpl.id;
                            return (
                                <button type="button" key={tpl.id} onClick={() => set('template', tpl.id)}
                                    className={`text-left p-3 rounded-lg border-2 transition-all ${active ? 'border-primary bg-primary/5 ring-2 ring-primary/30' : 'border-neutral-200 dark:border-neutral-700 hover:border-primary/50'}`}>
                                    <div className="text-2xl mb-1">{tpl.emoji}</div>
                                    <div className="text-sm font-semibold">{tpl.name}</div>
                                    <div className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-tight mt-0.5">{tpl.desc}</div>
                                    {active && <div className="text-[11px] text-primary font-medium mt-1">✓ Seleccionada</div>}
                                </button>
                            );
                        })}
                    </div>
                </Section>

                {/* ── Colores + preview ── */}
                <Section title="Colores del tema" subtitle="Se aplican a tu tienda pública en tiempo real.">
                    <div className="flex flex-col md:flex-row gap-6">
                        <div className="flex flex-wrap gap-4">
                            <ColorField label="Primario" value={formData.primaryColor} onChange={v => set('primaryColor', v)} />
                            <ColorField label="Secundario" value={formData.secondaryColor || ''} onChange={v => set('secondaryColor', v)} />
                            <ColorField label="Acento" value={formData.accentColor || ''} onChange={v => set('accentColor', v)} />
                        </div>
                        {/* Mini vista previa */}
                        <div className="flex-1 min-w-[220px]">
                            <p className="text-xs text-neutral-500 mb-1">Vista previa</p>
                            <div className="rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700">
                                <div className="h-10 flex items-center px-3 text-white text-sm font-semibold" style={{ backgroundColor: formData.primaryColor }}>
                                    {formData.storeName || 'Mi Tienda'}
                                </div>
                                <div className="p-3 bg-neutral-50 dark:bg-neutral-900 flex items-center gap-2">
                                    <div className="w-12 h-12 rounded" style={{ backgroundColor: formData.secondaryColor || formData.primaryColor }} />
                                    <div className="flex-1">
                                        <div className="h-2 w-2/3 rounded bg-neutral-300 dark:bg-neutral-600 mb-1" />
                                        <div className="h-2 w-1/3 rounded bg-neutral-300 dark:bg-neutral-600" />
                                    </div>
                                    <span className="px-2 py-1 rounded text-white text-xs font-medium" style={{ backgroundColor: formData.accentColor || formData.primaryColor }}>Comprar</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </Section>

                {/* ── Envío ── */}
                <Section title="Envío" subtitle="Configura si cobras envío y cuánto.">
                    <label className="flex items-center gap-2 text-sm mb-3 cursor-pointer">
                        <input type="checkbox" checked={formData.shippingEnabled ?? false} onChange={e => set('shippingEnabled', e.target.checked)} className="h-4 w-4" />
                        Cobrar envío
                    </label>
                    {formData.shippingEnabled && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-medium mb-1">Costo de envío ({formData.currency || '$'})</label>
                                <input type="number" min="0" step="0.01" value={formData.shippingCost ?? 0} onChange={e => set('shippingCost', parseFloat(e.target.value) || 0)} className={inputFormStyle} />
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1">Envío gratis desde (opcional)</label>
                                <input type="number" min="0" step="0.01" value={formData.freeShippingThreshold ?? ''} onChange={e => set('freeShippingThreshold', e.target.value === '' ? null : parseFloat(e.target.value))} className={inputFormStyle} placeholder="Ej. 50" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1">Nota de envío</label>
                                <input type="text" value={formData.shippingNote || ''} onChange={e => set('shippingNote', e.target.value)} className={inputFormStyle} placeholder="Entrega en 2-3 días" />
                            </div>
                        </div>
                    )}
                </Section>

                {/* ── Pagos ── */}
                <Section title="Métodos de pago" subtitle="Qué formas de pago aceptas en la tienda.">
                    <div className="flex flex-wrap gap-2">
                        {PAYMENT_OPTIONS.map(opt => {
                            const active = selectedPayments.includes(opt.key);
                            return (
                                <button type="button" key={opt.key} onClick={() => togglePayment(opt.key)}
                                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${active ? 'bg-primary text-white border-primary' : 'bg-white dark:bg-neutral-700 border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-200'}`}>
                                    {active ? '✓ ' : ''}{opt.label}
                                </button>
                            );
                        })}
                    </div>
                    <div className="mt-3 max-w-[120px]">
                        <label className="block text-xs font-medium mb-1">Moneda</label>
                        <input type="text" value={formData.currency || '$'} onChange={e => set('currency', e.target.value)} className={inputFormStyle} maxLength={4} />
                    </div>
                </Section>

                {/* ── Contacto / redes ── */}
                <Section title="Contacto y redes" subtitle="Para que tus clientes te encuentren.">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className="block text-xs font-medium mb-1">WhatsApp</label><input type="text" value={formData.whatsapp || ''} onChange={e => set('whatsapp', e.target.value)} className={inputFormStyle} placeholder="+1 787 000 0000" /></div>
                        <div><label className="block text-xs font-medium mb-1">Teléfono</label><input type="text" value={formData.contactPhone || ''} onChange={e => set('contactPhone', e.target.value)} className={inputFormStyle} /></div>
                        <div><label className="block text-xs font-medium mb-1">Email</label><input type="email" value={formData.contactEmail || ''} onChange={e => set('contactEmail', e.target.value)} className={inputFormStyle} /></div>
                        <div><label className="block text-xs font-medium mb-1">Dirección</label><input type="text" value={formData.address || ''} onChange={e => set('address', e.target.value)} className={inputFormStyle} /></div>
                        <div><label className="block text-xs font-medium mb-1">Facebook</label><input type="text" value={formData.facebook || ''} onChange={e => set('facebook', e.target.value)} className={inputFormStyle} placeholder="usuario o URL" /></div>
                        <div><label className="block text-xs font-medium mb-1">Instagram</label><input type="text" value={formData.instagram || ''} onChange={e => set('instagram', e.target.value)} className={inputFormStyle} placeholder="@usuario" /></div>
                    </div>
                </Section>

                <div className="flex justify-end gap-3 sticky bottom-0 bg-gradient-to-t from-neutral-100 dark:from-neutral-900 to-transparent py-4">
                    <a href={storeUrl} target="_blank" rel="noopener noreferrer" className={BUTTON_SECONDARY_SM_CLASSES}>Ver mi tienda ↗</a>
                    <button type="submit" disabled={saving} className={BUTTON_PRIMARY_SM_CLASSES}>{saving ? 'Guardando…' : 'Guardar cambios'}</button>
                </div>
            </form>
        </div>
    );
};
