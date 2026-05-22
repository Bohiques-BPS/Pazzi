import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/auth';
import { ApiError } from '../services/api';
import { toast } from '../hooks/useToast';
import { inputFormStyle, BUTTON_PRIMARY_SM_CLASSES } from '../constants';
import { LockClosedIcon, UserIcon as UserKeyIcon, ExclamationTriangleIcon } from '../components/icons';
import { PasswordInput } from '../components/ui/PasswordInput';

export const ProfilePage: React.FC = () => {
    const { currentUser, logout } = useAuth();

    const [current, setCurrent] = useState('');
    const [next, setNext] = useState('');
    const [confirm, setConfirm] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!currentUser) return null;

    const validate = (): string | null => {
        if (!current) return 'Ingresa tu contraseña actual.';
        if (next.length < 8) return 'La nueva contraseña debe tener al menos 8 caracteres.';
        if (!/[A-Za-z]/.test(next) || !/[0-9]/.test(next)) return 'La contraseña debe tener letra y número.';
        if (next !== confirm) return 'Las contraseñas nuevas no coinciden.';
        if (next === current) return 'La nueva contraseña debe ser distinta a la actual.';
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        const v = validate();
        if (v) { setError(v); return; }
        setSubmitting(true);
        try {
            await authService.updatePassword(current, next);
            toast.success('Contraseña actualizada. Por seguridad, cierra sesión y vuelve a entrar.');
            setCurrent('');
            setNext('');
            setConfirm('');
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Error al cambiar la contraseña');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <h1 className="text-2xl font-semibold text-neutral-700 dark:text-neutral-200">Mi perfil</h1>

            <section className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <UserKeyIcon className="w-5 h-5 text-primary" />
                    Información de la cuenta
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                        <p className="text-xs uppercase text-neutral-500">Nombre</p>
                        <p className="font-medium">{currentUser.name} {currentUser.lastName}</p>
                    </div>
                    <div>
                        <p className="text-xs uppercase text-neutral-500">Email</p>
                        <p className="font-medium">{currentUser.email}</p>
                    </div>
                    <div>
                        <p className="text-xs uppercase text-neutral-500">Rol</p>
                        <p className="font-medium">{currentUser.role}</p>
                    </div>
                    <div>
                        <p className="text-xs uppercase text-neutral-500">Estado</p>
                        <p className="font-medium">{currentUser.status || 'ACTIVE'}</p>
                    </div>
                </div>
            </section>

            <section className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <LockClosedIcon className="w-5 h-5 text-primary" />
                    Cambiar contraseña
                </h2>

                {error && (
                    <div className="p-3 rounded-md bg-red-50 border border-red-200 flex items-start text-red-700 text-sm mb-4">
                        <ExclamationTriangleIcon className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-3 max-w-md">
                    <div>
                        <label className="block text-sm font-medium">Contraseña actual</label>
                        <PasswordInput
                            value={current}
                            onChange={(e) => setCurrent(e.target.value)}
                            className={inputFormStyle}
                            autoComplete="current-password"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Nueva contraseña</label>
                        <PasswordInput
                            value={next}
                            onChange={(e) => setNext(e.target.value)}
                            className={inputFormStyle}
                            autoComplete="new-password"
                            required
                            minLength={8}
                        />
                        <p className="text-xs text-neutral-500 mt-1">Mín. 8 caracteres con letra y número.</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Confirmar nueva contraseña</label>
                        <PasswordInput
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            className={inputFormStyle}
                            autoComplete="new-password"
                            required
                            minLength={8}
                        />
                    </div>
                    <button type="submit" className={BUTTON_PRIMARY_SM_CLASSES} disabled={submitting}>
                        {submitting ? 'Guardando...' : 'Cambiar contraseña'}
                    </button>
                </form>
            </section>

            <section className="bg-white dark:bg-neutral-800 border border-red-200 dark:border-red-900/50 rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-2 text-red-600 dark:text-red-400">Cerrar sesión</h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-3">
                    Termina tu sesión en este dispositivo.
                </p>
                <button
                    onClick={() => logout()}
                    className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-md"
                >
                    Cerrar sesión
                </button>
            </section>
        </div>
    );
};
