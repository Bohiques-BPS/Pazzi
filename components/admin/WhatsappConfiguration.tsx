import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types';
import { whatsappService, type WhatsappConfig } from '../../services/whatsapp';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';
import { inputFormStyle, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';

/**
 * Configuración de WhatsApp por tienda (Administración, solo gerente).
 * Cada negocio pone su propio número/credenciales de Meta y activa/desactiva el envío.
 * El token nunca se muestra completo (llega enmascarado); solo se reemplaza si el gerente
 * escribe uno nuevo.
 */
export const WhatsappConfiguration: React.FC = () => {
    const { currentUser } = useAuth();
    const [cfg, setCfg] = useState<WhatsappConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Campos editables
    const [enabled, setEnabled] = useState(false);
    const [phoneNumberId, setPhoneNumberId] = useState('');
    const [displayNumber, setDisplayNumber] = useState('');
    const [verifyToken, setVerifyToken] = useState('');
    const [wabaId, setWabaId] = useState('');
    const [graphVersion, setGraphVersion] = useState('');
    const [newToken, setNewToken] = useState(''); // vacío = conservar el actual

    const load = async () => {
        setLoading(true);
        try {
            const c = await whatsappService.getConfig();
            setCfg(c);
            setEnabled(c.enabled);
            setPhoneNumberId(c.phoneNumberId);
            setDisplayNumber(c.displayNumber);
            setVerifyToken(c.verifyToken);
            setWabaId(c.wabaId);
            setGraphVersion(c.graphVersion);
            setNewToken('');
        } catch (err) {
            toast.error(err instanceof ApiError ? err.message : 'No se pudo cargar la configuración de WhatsApp.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

    if (currentUser?.role !== UserRole.MANAGER) return null;

    const save = async () => {
        if (saving) return;
        setSaving(true);
        try {
            const saved = await whatsappService.updateConfig({
                enabled,
                phoneNumberId: phoneNumberId.trim(),
                displayNumber: displayNumber.trim(),
                verifyToken: verifyToken.trim(),
                wabaId: wabaId.trim(),
                graphVersion: graphVersion.trim(),
                ...(newToken.trim() ? { accessToken: newToken.trim() } : {}),
            });
            setCfg(prev => ({ ...(prev as WhatsappConfig), ...saved }));
            setNewToken('');
            toast.success('Configuración de WhatsApp guardada.');
        } catch (err) {
            toast.error(err instanceof ApiError ? err.message : 'No se pudo guardar.');
        } finally {
            setSaving(false);
        }
    };

    const copyWebhook = async () => {
        if (!cfg?.webhookUrl) return;
        try { await navigator.clipboard.writeText(cfg.webhookUrl); toast.success('URL del webhook copiada.'); }
        catch { toast.error('No se pudo copiar.'); }
    };

    const label = 'block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1';

    return (
        <div className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow-md max-w-3xl">
            <h2 className="text-xl font-semibold text-primary mb-1 flex items-center">
                <span className="mr-2">💬</span> WhatsApp
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                Conecta tu número de WhatsApp Business (Meta Cloud API) para el chat de proyectos. Cada negocio usa
                su propio número. Los mensajes del chat <strong>solo se envían a WhatsApp si quien escribe lo elige</strong>;
                los mensajes que el cliente manda por WhatsApp siempre entran al chat.
            </p>

            {loading ? (
                <p className="text-sm text-neutral-400 py-6">Cargando…</p>
            ) : (
                <div className="space-y-5">
                    {/* Activar */}
                    <div className={`flex items-center justify-between gap-4 p-3 rounded-lg border ${enabled ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700' : 'bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700'}`}>
                        <div>
                            <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{enabled ? '🟢 WhatsApp activo' : 'WhatsApp desactivado'}</p>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">Para activar necesitas el Phone Number ID y el token de acceso.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                            <input type="checkbox" checked={enabled} onChange={() => setEnabled(v => !v)} className="sr-only peer" aria-label="Activar WhatsApp" />
                            <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className={label}>Phone Number ID</label>
                            <input value={phoneNumberId} onChange={e => setPhoneNumberId(e.target.value)} placeholder="123456789012345" className={inputFormStyle} />
                        </div>
                        <div>
                            <label className={label}>Número visible (opcional)</label>
                            <input value={displayNumber} onChange={e => setDisplayNumber(e.target.value)} placeholder="+1 787 555 1234" className={inputFormStyle} />
                        </div>
                    </div>

                    <div>
                        <label className={label}>Token de acceso {cfg?.hasAccessToken && <span className="text-xs text-green-600 dark:text-green-400 font-normal">(guardado: {cfg.accessTokenMasked})</span>}</label>
                        <input
                            type="password"
                            value={newToken}
                            onChange={e => setNewToken(e.target.value)}
                            placeholder={cfg?.hasAccessToken ? 'Deja vacío para conservar el actual' : 'Pega aquí el token permanente de Meta'}
                            className={inputFormStyle}
                            autoComplete="off"
                        />
                        <p className="text-xs text-neutral-400 mt-1">Token permanente (System User) de tu app de Meta. No se muestra completo por seguridad.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className={label}>Verify Token del webhook</label>
                            <input value={verifyToken} onChange={e => setVerifyToken(e.target.value)} placeholder="un-texto-que-tu-elijas" className={inputFormStyle} />
                            <p className="text-xs text-neutral-400 mt-1">Este mismo valor lo pones en Meta al configurar el webhook.</p>
                        </div>
                        <div>
                            <label className={label}>Graph API version (opcional)</label>
                            <input value={graphVersion} onChange={e => setGraphVersion(e.target.value)} placeholder="v21.0" className={inputFormStyle} />
                        </div>
                    </div>

                    <div>
                        <label className={label}>WABA ID (opcional)</label>
                        <input value={wabaId} onChange={e => setWabaId(e.target.value)} placeholder="WhatsApp Business Account id" className={inputFormStyle} />
                    </div>

                    {/* Webhook URL para pegar en Meta */}
                    {cfg?.webhookUrl && (
                        <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700">
                            <label className={label}>URL del webhook (pégala en Meta)</label>
                            <div className="flex gap-2">
                                <input readOnly value={cfg.webhookUrl} className={`${inputFormStyle} text-xs`} onFocus={e => e.target.select()} />
                                <button type="button" onClick={copyWebhook} className={BUTTON_SECONDARY_SM_CLASSES}>Copiar</button>
                            </div>
                            <p className="text-xs text-neutral-400 mt-1">En Meta → WhatsApp → Configuración → Webhook: usa esta URL y el Verify Token de arriba, y suscríbete al campo <strong>messages</strong>.</p>
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-1">
                        <button type="button" onClick={load} disabled={saving} className={BUTTON_SECONDARY_SM_CLASSES}>Restablecer</button>
                        <button type="button" onClick={save} disabled={saving} className={`${BUTTON_PRIMARY_SM_CLASSES} disabled:opacity-50`}>{saving ? 'Guardando…' : 'Guardar'}</button>
                    </div>
                </div>
            )}
        </div>
    );
};
