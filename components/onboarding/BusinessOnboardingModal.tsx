import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Modal } from '../Modal';
import { useAuth } from '../../contexts/AuthContext';
import { useGlobalSettings, useTranslation } from '../../contexts/GlobalSettingsContext';
import { UserRole, type ReceiptConfig } from '../../types';
import { API_URL } from '../../services/api';
import { inputFormStyle, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import { toast } from '../../hooks/useToast';
import { CameraIcon, TrashIconMini } from '../icons';
import { PhoneInput } from '../ui/PhoneInput';

/**
 * Modal de bienvenida (una sola vez, para el MANAGER): invita a completar los datos de la empresa
 * (nombre, descripción, logo, teléfono y correo — estos dos opcionales). Se guarda en
 * `GlobalSettings.receiptConfig`, que alimenta la factura, el recibo y los correos.
 * Se marca `onboardedAt` al guardar o posponer para no volver a mostrarlo.
 */
export const BusinessOnboardingModal: React.FC = () => {
    const { currentUser } = useAuth();
    const { settings, updateSettings } = useGlobalSettings();
    const { t } = useTranslation();

    const [ready, setReady] = useState(false);
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');

    const { pathname } = useLocation();
    // Nunca mostrar el onboarding en páginas PÚBLICAS (pago de factura, activación, tienda, login):
    // ahí entra un cliente/visitante, no el dueño del negocio.
    const isPublicRoute = /^\/(pay|activate|store|login|register)(\/|$)/.test(pathname);
    const isManager = currentUser?.role === UserRole.MANAGER;
    const localKey = `pazzi_onboarded_${currentUser?.id || 'anon'}`;

    // Espera ~1.5s a que carguen los settings del servidor antes de decidir (evita parpadeo).
    useEffect(() => {
        if (!isManager) { setReady(false); return; }
        try { if (localStorage.getItem(localKey)) return; } catch { /* sin storage */ }
        const t = setTimeout(() => setReady(true), 1500);
        return () => clearTimeout(t);
    }, [isManager, localKey]);

    // Decide si mostrar: MANAGER, settings ya cargados, y aún sin onboarding ni nombre de empresa.
    useEffect(() => {
        if (!ready || !isManager || isPublicRoute) return;
        const rc = settings.receiptConfig || ({} as ReceiptConfig);
        const alreadyOnboarded = !!rc.onboardedAt;
        const hasName = !!(rc.businessName && rc.businessName.trim());
        if (alreadyOnboarded || hasName) return;
        setName(rc.businessName || '');
        setDescription(rc.businessDescription || '');
        setLogoUrl(rc.logoUrl || '');
        setPhone(rc.phone || '');
        setEmail(rc.email || '');
        setOpen(true);
    }, [ready, isManager, settings.receiptConfig]);

    const markOnboardedLocal = () => { try { localStorage.setItem(localKey, new Date().toISOString()); } catch { /* sin storage */ } };

    const persist = async (extra: Partial<ReceiptConfig>) => {
        await updateSettings({ receiptConfig: { ...settings.receiptConfig, ...extra, onboardedAt: new Date().toISOString() } });
        markOnboardedLocal();
        setOpen(false);
    };

    const handleLater = async () => {
        setSaving(true);
        try { await persist({}); } catch { setOpen(false); } finally { setSaving(false); }
    };

    const handleSave = async () => {
        if (!name.trim()) { toast.error(t('cmp.onb.err_name_required')); return; }
        if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { toast.error(t('cmp.onb.err_email_invalid')); return; }
        setSaving(true);
        try {
            await persist({
                businessName: name.trim(),
                businessDescription: description.trim(),
                logoUrl: logoUrl || settings.receiptConfig?.logoUrl || '',
                phone: phone.trim(),
                email: email.trim(),
                showLogo: !!logoUrl || !!settings.receiptConfig?.logoUrl,
            });
            toast.success(t('cmp.onb.saved_ok'));
        } catch {
            toast.error(t('cmp.onb.save_error'));
        } finally { setSaving(false); }
    };

    const handleLogoFile = async (file: File) => {
        if (file.size > 1024 * 1024) { toast.error(t('cmp.onb.logo_too_big')); return; }
        setUploading(true);
        try {
            const token = localStorage.getItem('pazzi_token');
            const fd = new FormData();
            fd.append('file', file);
            const res = await fetch(`${API_URL}/upload`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
            if (!res.ok) throw new Error();
            const data = await res.json();
            setLogoUrl(data.url);
        } catch {
            toast.error(t('cmp.onb.logo_upload_error'));
        } finally { setUploading(false); }
    };

    const logoSrc = logoUrl
        ? (logoUrl.startsWith('http') || logoUrl.startsWith('data:') ? logoUrl : `${API_URL.replace('/api', '')}${logoUrl.startsWith('/') ? '' : '/'}${logoUrl}`)
        : '';

    if (!open || isPublicRoute) return null;

    return (
        <Modal isOpen={open} onClose={handleLater} title={t('cmp.onb.title')} size="lg">
            <div className="space-y-4">
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    {t('cmp.onb.desc_before')} <strong>{t('cmp.onb.invoices')}</strong>, <strong>{t('cmp.onb.receipts')}</strong> {t('cmp.onb.and')} <strong>{t('cmp.onb.emails')}</strong> {t('cmp.onb.desc_after')}
                </p>

                {/* Logo */}
                <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">{t('cmp.onb.logo')}</label>
                    <div className="flex items-center gap-4">
                        {logoSrc ? (
                            <div className="relative w-24 h-24 border rounded-md overflow-hidden bg-white flex items-center justify-center">
                                <img src={logoSrc} alt="Logo" className="max-w-full max-h-full object-contain" />
                                <button type="button" onClick={() => setLogoUrl('')} className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-bl-md"><TrashIconMini className="w-4 h-4" /></button>
                            </div>
                        ) : (
                            <label className="w-24 h-24 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-md flex items-center justify-center bg-neutral-50 dark:bg-neutral-800 cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
                                <CameraIcon className="w-7 h-7 text-neutral-400" />
                                <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleLogoFile(e.target.files[0])} />
                            </label>
                        )}
                        <div className="text-xs text-neutral-500">
                            {uploading ? t('cmp.onb.uploading') : t('cmp.onb.logo_hint')}
                        </div>
                    </div>
                </div>

                {/* Nombre */}
                <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">{t('cmp.onb.business_name')} <span className="text-red-500">*</span></label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder={t('cmp.onb.business_name_placeholder')} className={`${inputFormStyle} w-full`} autoFocus />
                </div>

                {/* Descripción */}
                <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">{t('cmp.onb.description')}</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder={t('cmp.onb.description_placeholder')} className={`${inputFormStyle} w-full resize-none`} />
                </div>

                {/* Teléfono + Correo (opcionales) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">{t('common.phone')} <span className="text-neutral-400 text-xs">{t('cmp.onb.optional')}</span></label>
                        <PhoneInput value={phone} onChange={setPhone} placeholder="(787) 000-0000" className="w-full" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">{t('cmp.onb.email')} <span className="text-neutral-400 text-xs">{t('cmp.onb.optional')}</span></label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="ventas@empresa.com" className={`${inputFormStyle} w-full`} />
                    </div>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-neutral-200 dark:border-neutral-700">
                    <button type="button" onClick={handleLater} disabled={saving} className={`${BUTTON_SECONDARY_SM_CLASSES} disabled:opacity-50`}>{t('cmp.onb.later')}</button>
                    <button type="button" onClick={handleSave} disabled={saving || uploading} className={`${BUTTON_PRIMARY_SM_CLASSES} disabled:opacity-50`}>
                        {saving ? t('cmp.onb.saving') : t('cmp.onb.save')}
                    </button>
                </div>
            </div>
        </Modal>
    );
};
