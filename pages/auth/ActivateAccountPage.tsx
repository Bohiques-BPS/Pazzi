import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { authInputStyle, authButtonPrimary, authLinkStyle } from '../../constants';
import { EnvelopeIcon, LockClosedIcon, ExclamationTriangleIcon } from '../../components/icons';
import { PasswordInput } from '../../components/ui/PasswordInput';
import type { InvitationInfo } from '../../services/auth';
import { ApiError } from '../../services/api';
import { usePublicT } from '../../hooks/usePublicTranslation';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; info: InvitationInfo }
  | { kind: 'invalid'; message: string; code?: number };

export const ActivateAccountPage: React.FC = () => {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const { getInvitation, activate } = useAuth();
  const navigate = useNavigate();
  const t = usePublicT();

  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setState({ kind: 'invalid', message: t('auth.err.invite_missing') });
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
              ? t('auth.err.invite_expired')
              : err.status === 404
              ? t('auth.err.invite_notfound')
              : err.message;
          setState({ kind: 'invalid', message: msg, code: err.status });
        } else {
          setState({ kind: 'invalid', message: t('auth.err.invite_verify') });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, getInvitation]);

  const validatePassword = (): string | null => {
    if (password.length < 8) return t('auth.err.pw_min');
    if (!/[A-Za-z]/.test(password)) return t('auth.err.pw_letter');
    if (!/[0-9]/.test(password)) return t('auth.err.pw_number');
    if (password !== confirmPassword) return t('auth.err.pw_match');
    if (!/^\d{4}$/.test(pin)) return t('auth.err.pin4');
    if (pin !== confirmPin) return t('auth.err.pin_match');
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
    const result = await activate(token, password, pin);
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
        <h1 className="text-2xl font-semibold text-center mb-2">{t('auth.activate.title')}</h1>
        <p className="text-sm text-center text-neutral-500 dark:text-neutral-400 mb-6">
          {t('auth.activate.subtitle')}
        </p>

        {state.kind === 'loading' && (
          <div className="text-center text-sm text-neutral-500">{t('auth.activate.verifying')}</div>
        )}

        {state.kind === 'invalid' && (
          <div className="space-y-4">
            <div className="p-3 rounded-md bg-red-50 border border-red-200 flex items-start text-red-700 text-sm">
              <ExclamationTriangleIcon className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
              <span>{state.message}</span>
            </div>
            <Link to="/login" className={authLinkStyle + ' block text-center'}>
              {t('auth.activate.back_login')}
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
                {t('auth.activate.expires', { date: new Date(state.info.expiresAt).toLocaleString() })}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">{t('auth.password')}</label>
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
                {t('auth.password_hint')}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">{t('auth.confirm_password')}</label>
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

            <div className="border-t border-neutral-200 dark:border-neutral-700 pt-4">
              <label className="block text-sm font-medium mb-1">{t('auth.pin_label')}</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="password"
                  inputMode="numeric"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder={t('auth.pin_placeholder')}
                  maxLength={4}
                  className={`${authInputStyle} text-center tracking-[0.3em]`}
                  required
                />
                <input
                  type="password"
                  inputMode="numeric"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder={t('auth.pin_confirm_placeholder')}
                  maxLength={4}
                  className={`${authInputStyle} text-center tracking-[0.3em]`}
                  required
                />
              </div>
              <p className="text-xs text-neutral-500 mt-1">{t('auth.pin_hint')}</p>
            </div>

            {error && (
              <div className="p-2 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}

            <button type="submit" className={authButtonPrimary} disabled={submitting}>
              {submitting ? t('auth.activating') : t('auth.activate.submit')}
            </button>

            <Link to="/login" className={authLinkStyle + ' block text-center text-sm'}>
              {t('auth.have_account')}
            </Link>
          </form>
        )}
      </div>
    </div>
  );
};
