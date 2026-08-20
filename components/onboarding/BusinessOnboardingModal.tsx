import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { useAuth } from '../../contexts/AuthContext';
import { useGlobalSettings } from '../../contexts/GlobalSettingsContext';
import { UserRole, type ReceiptConfig } from '../../types';
import { API_URL } from '../../services/api';
import { inputFormStyle, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import { toast } from '../../hooks/useToast';
import { CameraIcon, TrashIconMini } from '../icons';

/**
 * Modal de bienvenida (una sola vez, para el MANAGER): invita a completar los datos de la empresa
 * (nombre, descripción, logo, teléfono y correo — estos dos opcionales). Se guarda en
 * `GlobalSettings.receiptConfig`, que alimenta la factura, el recibo y los correos.
 * Se marca `onboardedAt` al guardar o posponer para no volver a mostrarlo.
 */
export const BusinessOnboardingModal: React.FC = () => {
    const { currentUser } = useAuth();
    const { settings, updateSettings } = useGlobalSettings();

    const [ready, setReady] = useState(false);
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');

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
        if (!ready || !isManager) return;
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
        if (!name.trim()) { toast.error('Ingresa el nombre de la empresa.'); return; }
        if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { toast.error('El correo no es válido.'); return; }
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
            toast.success('¡Listo! Datos de tu empresa guardados.');
        } catch {
            toast.error('No se pudieron guardar los datos. Intenta de nuevo.');
        } finally { setSaving(false); }
    };

    const handleLogoFile = async (file: File) => {
        if (file.size > 1024 * 1024) { toast.error('El logo debe pesar menos de 1 MB.'); return; }
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
            toast.error('No se pudo subir el logo.');
        } finally { setUploading(false); }
    };

    const logoSrc = logoUrl
        ? (logoUrl.startsWith('http') || logoUrl.startsWith('data:') ? logoUrl : `${API_URL.replace('/api', '')}${logoUrl.startsWith('/') ? '' : '/'}${logoUrl}`)
        : '';

    if (!open) return null;

    return (
        <Modal isOpen={open} onClose={handleLater} title="👋 Bienvenido — datos de tu empresa" size="lg">
            <div className="space-y-4">
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Completa los datos de tu empresa. Se usarán en las <strong>facturas</strong>, <strong>recibos</strong> y <strong>correos</strong> a tus clientes y colaboradores. Puedes cambiarlos luego en Configuración.
                </p>

                {/* Logo */}
                <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Logo</label>
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
                            {uploading ? 'Subiendo…' : 'PNG o JPG, hasta 1 MB. Cuadrado se ve mejor.'}
                        </div>
                    </div>
                </div>

                {/* Nombre */}
                <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Nombre de la empresa <span className="text-red-500">*</span></label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ej. Ferretería La Económica" className={`${inputFormStyle} w-full`} autoFocus />
                </div>

                {/* Descripción */}
                <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Descripción</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Breve descripción de tu negocio (opcional)" className={`${inputFormStyle} w-full resize-none`} />
                </div>

                {/* Teléfono + Correo (opcionales) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Teléfono <span className="text-neutral-400 text-xs">(opcional)</span></label>
                        <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(787) 000-0000" className={`${inputFormStyle} w-full`} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Correo <span className="text-neutral-400 text-xs">(opcional)</span></label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="ventas@empresa.com" className={`${inputFormStyle} w-full`} />
                    </div>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-neutral-200 dark:border-neutral-700">
                    <button type="button" onClick={handleLater} disabled={saving} className={`${BUTTON_SECONDARY_SM_CLASSES} disabled:opacity-50`}>Más tarde</button>
                    <button type="button" onClick={handleSave} disabled={saving || uploading} className={`${BUTTON_PRIMARY_SM_CLASSES} disabled:opacity-50`}>
                        {saving ? 'Guardando…' : 'Guardar datos'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};
