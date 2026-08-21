import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useGlobalSettings, useTranslation } from '../../contexts/GlobalSettingsContext';
import { UserRole, type ReceiptConfig } from '../../types';
import { API_URL } from '../../services/api';
import { inputFormStyle, BUTTON_PRIMARY_SM_CLASSES } from '../../constants';
import { toast } from '../../hooks/useToast';
import { CameraIcon, TrashIconMini } from '../icons';
import { PhoneInput } from '../ui/PhoneInput';

/**
 * Editor de "Datos del Negocio" (Administración): nombre, descripción, logo, teléfono y correo.
 * Es la versión SIEMPRE disponible de lo que pide el modal de bienvenida (BusinessOnboardingModal).
 * Guarda en `GlobalSettings.receiptConfig`, que alimenta facturas, recibos y correos.
 * Solo visible para el MANAGER (dueño de la tienda).
 */
export const BusinessDataConfiguration: React.FC = () => {
    const { currentUser } = useAuth();
    const { settings, updateSettings } = useGlobalSettings();
    const { t } = useTranslation();

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Hidratar desde los settings al cargar / cuando cambien.
    useEffect(() => {
        const rc = settings.receiptConfig || ({} as ReceiptConfig);
        // El nombre del negocio: usa receiptConfig.businessName; si está vacío, cae al nombre del
        // dueño (User) — EXACTAMENTE el mismo respaldo que usa el correo de invitación
        // (getBusinessBranding en el backend). Así el formulario muestra lo mismo que el correo,
        // y al Guardar queda persistido en receiptConfig para que ambos usen la misma fuente.
        const ownerName = `${currentUser?.name || ''} ${currentUser?.lastName || ''}`.trim();
        setName(rc.businessName || ownerName);
        setDescription(rc.businessDescription || '');
        setLogoUrl(rc.logoUrl || '');
        setPhone(rc.phone || '');
        setEmail(rc.email || '');
    }, [settings.receiptConfig, currentUser]);

    if (currentUser?.role !== UserRole.MANAGER) return null;

    const handleSave = async () => {
        if (!name.trim()) { toast.error(t('admin.business.err_name')); return; }
        if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { toast.error(t('admin.business.err_email')); return; }
        setSaving(true);
        try {
            await updateSettings({
                receiptConfig: {
                    ...settings.receiptConfig,
                    businessName: name.trim(),
                    businessDescription: description.trim(),
                    logoUrl: logoUrl || '',
                    phone: phone.trim(),
                    email: email.trim(),
                    showLogo: !!logoUrl,
                },
            });
            toast.success(t('admin.business.saved'));
        } catch {
            toast.error(t('admin.business.save_error'));
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

    return (
        <div className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-primary mb-1">{t('admin.business.title')}</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">{t('admin.business.subtitle')}</p>

            <div className="space-y-4 max-w-2xl">
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
                        <div className="text-xs text-neutral-500">{uploading ? t('cmp.onb.uploading') : t('cmp.onb.logo_hint')}</div>
                    </div>
                </div>

                {/* Nombre */}
                <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">{t('cmp.onb.business_name')} <span className="text-red-500">*</span></label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder={t('cmp.onb.business_name_placeholder')} className={`${inputFormStyle} w-full`} />
                </div>

                {/* Descripción */}
                <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">{t('cmp.onb.description')}</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder={t('cmp.onb.description_placeholder')} className={`${inputFormStyle} w-full resize-none`} />
                </div>

                {/* Teléfono + Correo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">{t('common.phone')}</label>
                        <PhoneInput value={phone} onChange={setPhone} className="w-full" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">{t('cmp.onb.email')}</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="ventas@empresa.com" className={`${inputFormStyle} w-full`} />
                    </div>
                </div>

                <div className="pt-2">
                    <button type="button" onClick={handleSave} disabled={saving || uploading} className={`${BUTTON_PRIMARY_SM_CLASSES} disabled:opacity-50`}>
                        {saving ? t('admin.business.saving') : t('admin.business.save')}
                    </button>
                </div>
            </div>
        </div>
    );
};
