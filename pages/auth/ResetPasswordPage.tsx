import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/auth';
import { ApiError } from '../../services/api';
import { authInputStyle, authButtonPrimary, authLinkStyle } from '../../constants';
import { LockClosedIcon, ExclamationTriangleIcon, ArrowUturnLeftIcon } from '../../components/icons';
import logo from '../../assets/logo.png';
import banner from '../../assets/img/banner.png';
import { PasswordInput } from '../../components/ui/PasswordInput';

export const ResetPasswordPage: React.FC = () => {
    const [params] = useSearchParams();
    const token = params.get('token') || '';
    const navigate = useNavigate();
    useAuth(); // Asegurar provider montado

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const validate = (): string | null => {
        if (!token) return 'Token de recuperación faltante. Verifica el enlace.';
        if (password.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
        if (!/[A-Za-z]/.test(password)) return 'La contraseña debe contener al menos una letra.';
        if (!/[0-9]/.test(password)) return 'La contraseña debe contener al menos un número.';
        if (password !== confirmPassword) return 'Las contraseñas no coinciden.';
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        const v = validate();
        if (v) { setError(v); return; }
        setSubmitting(true);
        try {
            const result = await authService.resetPassword(token, password);
            // Persistir sesión nueva
            localStorage.setItem('pazzi_token', result.token);
            localStorage.setItem('pazzi_refresh_token', result.refreshToken);
            localStorage.setItem('pazzi_user', JSON.stringify(result.user));
            navigate('/', { replace: true });
            // Forzar re-cargar la app con la sesión nueva
            window.location.reload();
        } catch (err) {
            if (err instanceof ApiError) {
                setError(err.status === 410 ? 'Este enlace expiró o ya fue utilizado. Solicita uno nuevo.' : err.message);
            } else {
                setError('Error al resetear la contraseña');
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-white dark:bg-neutral-800">
          {/* Form panel */}
          <div className="w-full md:w-1/2 flex flex-col items-center justify-center px-6 py-10">
            <div className="w-full max-w-sm">
              <div className="flex justify-center mb-6">
                <img src={logo} alt="Pazzi" className="h-9" />
              </div>
                <h2 className="text-2xl font-bold text-center text-neutral-800 dark:text-neutral-100 mb-1">Crear nueva contraseña</h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center mb-6">Elige una contraseña segura de al menos 8 caracteres.</p>

                {error && (
                    <div className="p-3 rounded-md bg-red-50 border border-red-200 flex items-start text-red-700 text-sm mb-4">
                        <ExclamationTriangleIcon className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-base font-medium">Nueva contraseña</label>
                        <div className="relative mt-1">
                            <LockClosedIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 z-10" />
                            <PasswordInput
                                className={`${authInputStyle} pl-9`}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="new-password"
                                required
                                minLength={8}
                                autoFocus
                            />
                        </div>
                        <p className="text-xs text-neutral-500 mt-1">
                            Mínimo 8 caracteres, con al menos una letra y un número.
                        </p>
                    </div>

                    <div>
                        <label className="block text-base font-medium">Confirmar contraseña</label>
                        <div className="relative mt-1">
                            <LockClosedIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 z-10" />
                            <PasswordInput
                                className={`${authInputStyle} pl-9`}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                autoComplete="new-password"
                                required
                                minLength={8}
                            />
                        </div>
                    </div>

                    <button type="submit" className={authButtonPrimary} disabled={submitting}>
                        {submitting ? 'Guardando...' : 'Cambiar contraseña'}
                    </button>
                </form>

                <p className="mt-6 text-center">
                    <Link to="/login" className={`${authLinkStyle} inline-flex items-center gap-1`}>
                      <ArrowUturnLeftIcon className="w-4 h-4" /> Volver a iniciar sesión
                    </Link>
                </p>
            </div>
          </div>

          {/* Banner panel */}
          <div className="hidden md:flex md:w-1/2 items-center justify-center relative overflow-hidden bg-primary dark:bg-neutral-900">
            <img src={banner} alt="" className="absolute inset-0 w-full h-full object-cover opacity-80 dark:opacity-50" />
            <div className="absolute inset-0 bg-gradient-to-br from-primary/60 to-secondary/60 dark:from-neutral-900/80 dark:to-neutral-800/80" />
            <div className="absolute inset-0 flex flex-col items-center justify-center p-10 text-center text-white">
              <h3 className="text-3xl font-bold mb-3 drop-shadow">Nueva contraseña</h3>
              <p className="text-base opacity-90 max-w-xs drop-shadow">Crea una contraseña segura para proteger tu cuenta.</p>
            </div>
          </div>
        </div>
    );
};
