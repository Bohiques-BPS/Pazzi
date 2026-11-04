import React, { useCallback, useEffect, useState } from 'react';
import { authService } from '../../services/auth';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES, inputFormStyle } from '../../constants';
import { LockClosedIcon } from '../icons';
import { PasswordInput } from '../ui/PasswordInput';

const errMsg = (err: unknown, fallback: string) => (err instanceof ApiError ? err.message : fallback);
const codeInputCls = `${inputFormStyle} tracking-widest`;

type Mode = 'idle' | 'setup-password' | 'setup-scan' | 'codes' | 'disable' | 'regenerate';

/** Verificación en dos pasos con app de autenticación, en el perfil de cualquier usuario. */
export const TwoFactorSettings: React.FC = () => {
    const [status, setStatus] = useState<{ enabled: boolean; recoveryCodesLeft: number } | null>(null);
    const [mode, setMode] = useState<Mode>('idle');
    const [password, setPassword] = useState('');
    const [code, setCode] = useState('');
    const [secret, setSecret] = useState('');
    const [qr, setQr] = useState('');
    const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
    const [busy, setBusy] = useState(false);

    const load = useCallback(() => {
        authService.twoFactorStatus().then(setStatus).catch(() => setStatus({ enabled: false, recoveryCodesLeft: 0 }));
    }, []);
    useEffect(load, [load]);

    const reset = () => { setMode('idle'); setPassword(''); setCode(''); setSecret(''); setQr(''); };

    const startSetup = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        try {
            const r = await authService.twoFactorSetup(password);
            const QR = await import('qrcode');
            setQr(await QR.toDataURL(r.otpauthUri, { width: 220, margin: 1 }));
            setSecret(r.secret);
            setPassword('');
            setMode('setup-scan');
        } catch (err) { toast.error(errMsg(err, 'No se pudo iniciar la activación.')); }
        finally { setBusy(false); }
    };

    const confirmSetup = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        try {
            const r = await authService.twoFactorEnable(code.trim());
            setRecoveryCodes(r.recoveryCodes);
            setCode(''); setSecret(''); setQr('');
            setMode('codes');
            load();
            toast.success('Verificación en dos pasos activada.');
        } catch (err) { toast.error(errMsg(err, 'No se pudo activar.')); }
        finally { setBusy(false); }
    };

    const confirmDisable = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        try {
            await authService.twoFactorDisable(password, code.trim());
            reset(); load();
            toast.success('Verificación en dos pasos desactivada.');
        } catch (err) { toast.error(errMsg(err, 'No se pudo desactivar.')); }
        finally { setBusy(false); }
    };

    const confirmRegenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        try {
            const r = await authService.twoFactorRegenerate(password, code.trim());
            setRecoveryCodes(r.recoveryCodes);
            setPassword(''); setCode('');
            setMode('codes');
            load();
        } catch (err) { toast.error(errMsg(err, 'No se pudieron generar los códigos.')); }
        finally { setBusy(false); }
    };

    const copyCodes = async () => {
        try { await navigator.clipboard.writeText(recoveryCodes.join('\n')); toast.success('Códigos copiados.'); }
        catch { toast.error('No se pudieron copiar.'); }
    };

    const confirmForm = (onSubmit: (e: React.FormEvent) => void, label: string) => (
        <form onSubmit={onSubmit} className="space-y-3 max-w-sm">
            <div>
                <label className="block text-sm font-medium">Contraseña</label>
                <PasswordInput value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" className={inputFormStyle} required />
            </div>
            <div>
                <label className="block text-sm font-medium">Código de la app o de recuperación</label>
                <input value={code} onChange={e => setCode(e.target.value)} autoComplete="one-time-code" className={codeInputCls} required />
            </div>
            <div className="flex gap-2">
                <button type="submit" disabled={busy} className={`${BUTTON_PRIMARY_SM_CLASSES} disabled:opacity-50`}>{busy ? 'Un momento…' : label}</button>
                <button type="button" onClick={reset} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button>
            </div>
        </form>
    );

    return (
        <section id="dos-pasos" className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
                <LockClosedIcon className="w-5 h-5 text-primary" />
                Verificación en dos pasos
                {status?.enabled && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">Activada</span>}
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                Además de tu contraseña, al entrar se te pedirá un código de una app como Google Authenticator o Authy.
            </p>

            {mode === 'idle' && status && !status.enabled && (
                <button onClick={() => setMode('setup-password')} className={BUTTON_PRIMARY_SM_CLASSES}>Activar</button>
            )}

            {mode === 'idle' && status?.enabled && (
                <div className="space-y-3">
                    <p className={`text-sm ${status.recoveryCodesLeft <= 2 ? 'text-amber-700 dark:text-amber-300' : 'text-neutral-600 dark:text-neutral-300'}`}>
                        Te quedan {status.recoveryCodesLeft} códigos de recuperación.
                    </p>
                    <div className="flex gap-2 flex-wrap">
                        <button onClick={() => setMode('regenerate')} className={BUTTON_SECONDARY_SM_CLASSES}>Generar códigos nuevos</button>
                        <button onClick={() => setMode('disable')} className={BUTTON_SECONDARY_SM_CLASSES}>Desactivar</button>
                    </div>
                </div>
            )}

            {mode === 'setup-password' && (
                <form onSubmit={startSetup} className="space-y-3 max-w-sm">
                    <div>
                        <label className="block text-sm font-medium">Confirma tu contraseña</label>
                        <PasswordInput value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" className={inputFormStyle} required />
                    </div>
                    <div className="flex gap-2">
                        <button type="submit" disabled={busy} className={`${BUTTON_PRIMARY_SM_CLASSES} disabled:opacity-50`}>{busy ? 'Un momento…' : 'Continuar'}</button>
                        <button type="button" onClick={reset} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button>
                    </div>
                </form>
            )}

            {mode === 'setup-scan' && (
                <form onSubmit={confirmSetup} className="space-y-3 max-w-sm">
                    <p className="text-sm">1. Escanea este código con tu app de autenticación.</p>
                    {qr && <img src={qr} alt="Código QR para la app de autenticación" className="rounded-md border border-neutral-200 dark:border-neutral-700" />}
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">Si no puedes escanearlo, escribe esta clave en la app:</p>
                    <input readOnly value={secret} onFocus={e => e.currentTarget.select()} className={`${inputFormStyle} !text-sm font-mono`} />
                    <div>
                        <label className="block text-sm">2. Escribe el código de 6 dígitos que muestra la app.</label>
                        <input value={code} onChange={e => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={7} autoFocus className={codeInputCls} required />
                    </div>
                    <div className="flex gap-2">
                        <button type="submit" disabled={busy} className={`${BUTTON_PRIMARY_SM_CLASSES} disabled:opacity-50`}>{busy ? 'Un momento…' : 'Activar'}</button>
                        <button type="button" onClick={reset} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button>
                    </div>
                </form>
            )}

            {mode === 'codes' && (
                <div className="space-y-3 max-w-md">
                    <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Guarda estos códigos en un lugar seguro. No se volverán a mostrar.</p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Cada uno sirve una sola vez para entrar si pierdes tu teléfono.</p>
                    <div className="grid grid-cols-2 gap-2 font-mono text-sm bg-neutral-100 dark:bg-neutral-900 rounded-md p-3">
                        {recoveryCodes.map(c => <span key={c}>{c}</span>)}
                    </div>
                    <div className="flex gap-2">
                        <button onClick={copyCodes} className={BUTTON_SECONDARY_SM_CLASSES}>Copiar</button>
                        <button onClick={() => { setRecoveryCodes([]); reset(); }} className={BUTTON_PRIMARY_SM_CLASSES}>Ya los guardé</button>
                    </div>
                </div>
            )}

            {mode === 'disable' && confirmForm(confirmDisable, 'Desactivar')}
            {mode === 'regenerate' && (
                <>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-3">Los códigos anteriores dejarán de funcionar.</p>
                    {confirmForm(confirmRegenerate, 'Generar códigos')}
                </>
            )}
        </section>
    );
};
