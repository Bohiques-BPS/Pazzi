import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { authInputStyle, authButtonPrimary, authLinkStyle } from '../../constants';
import { EnvelopeIcon, LockClosedIcon, ExclamationTriangleIcon } from '../../components/icons';
import { PasswordInput } from '../../components/ui/PasswordInput';
import type { InvitationInfo } from '../../services/auth';
import { ApiError } from '../../services/api';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; info: InvitationInfo }
  | { kind: 'invalid'; message: string; code?: number };

export const ActivateAccountPage: React.FC = () => {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const { getInvitation, activate } = useAuth();
  const navigate = useNavigate();

  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setState({ kind: 'invalid', message: 'No se proporcionó un token de invitación.' });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const info = await getInvitation(token);
        if (!cancelled) setState({ kind: 'ready', info });
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError) {
          const msg =
            err.status === 410
              ? 'Esta invitación expiró o ya fue utilizada. Solicite una nueva al administrador.'
              : err.status === 404
              ? 'Invitación no encontrada. Verifique el enlace o solicite una nueva.'
              : err.message;
          setState({ kind: 'invalid', message: msg, code: err.status });
        } else {
          setState({ kind: 'invalid', message: 'No se pudo verificar la invitación. Intente más tarde.' });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, getInvitation]);

  const validatePassword = (): string | null => {
    if (password.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
    if (!/[A-Za-z]/.test(password)) return 'La contraseña debe contener al menos una letra.';
    if (!/[0-9]/.test(password)) return 'La contraseña debe contener al menos un número.';
    if (password !== confirmPassword) return 'Las contraseñas no coinciden.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const validationError = validatePassword();
    if (validationError) {
      setError(validationError);
      return;
    }
    setSubmitting(true);
    const result = await activate(token, password);
    setSubmitting(false);
    if ('error' in result) {
      setError(result.error);
    } else {
      navigate('/', { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-neutral-800 rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-semibold text-center mb-2">Activar tu cuenta</h1>
        <p className="text-sm text-center text-neutral-500 dark:text-neutral-400 mb-6">
          Crea tu contraseña para empezar a usar Pazzi.
        </p>

        {state.kind === 'loading' && (
          <div className="text-center text-sm text-neutral-500">Verificando invitación...</div>
        )}

        {state.kind === 'invalid' && (
          <div className="space-y-4">
            <div className="p-3 rounded-md bg-red-50 border border-red-200 flex items-start text-red-700 text-sm">
              <ExclamationTriangleIcon className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
              <span>{state.message}</span>
            </div>
            <Link to="/login" className={authLinkStyle + ' block text-center'}>
              Volver al inicio de sesión
            </Link>
          </div>
        )}

        {state.kind === 'ready' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-md bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 p-3 text-sm">
              <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
                <EnvelopeIcon className="w-4 h-4" />
                <span><strong>{state.info.email}</strong></span>
              </div>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                Esta invitación expira el {new Date(state.info.expiresAt).toLocaleString()}.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Contraseña</label>
              <div className="relative">
                <LockClosedIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 z-10" />
                <PasswordInput
                  className={`${authInputStyle} pl-9`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  minLength={8}
                />
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                Mínimo 8 caracteres, con al menos una letra y un número.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Confirmar contraseña</label>
              <div className="relative">
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

            {error && (
              <div className="p-2 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}

            <button type="submit" className={authButtonPrimary} disabled={submitting}>
              {submitting ? 'Activando...' : 'Activar y entrar'}
            </button>

            <Link to="/login" className={authLinkStyle + ' block text-center text-sm'}>
              ¿Ya tienes cuenta? Inicia sesión
            </Link>
          </form>
        )}
      </div>
    </div>
  );
};
