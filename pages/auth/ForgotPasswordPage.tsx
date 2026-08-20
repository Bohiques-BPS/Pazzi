import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authInputStyle, authButtonPrimary, authLinkStyle } from '../../constants';
import { authService } from '../../services/auth';
import { ApiError } from '../../services/api';
import { EnvelopeIcon, ArrowUturnLeftIcon } from '../../components/icons';
import { usePublicT } from '../../hooks/usePublicTranslation';
import logo from '../../assets/logo.png';
import banner from '../../assets/img/banner.png';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const t = usePublicT();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setSubmitting(true);
    try {
      const res = await authService.forgotPassword(email);
      setMessage(res.message);
      setEmail('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('auth.error_generic'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white dark:bg-neutral-800">

      {/* Form panel */}
      <div className="w-full md:w-1/2 flex flex-col items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm">

          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img src={logo} alt="Pazzi" className="h-9" />
          </div>

          <h2 className="text-2xl font-bold text-center text-neutral-800 dark:text-neutral-100 mb-1">
            {t('auth.forgot.title')}
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center mb-6">
            {t('auth.forgot.subtitle')}
          </p>

          {message && (
            <div className="mb-4 p-3 rounded-md bg-green-50 border border-green-200 text-green-700 text-sm dark:bg-green-900/30 dark:border-green-800 dark:text-green-400">
              {message}
            </div>
          )}
          {error && (
            <div className="mb-4 p-3 rounded-md bg-red-100 border border-red-200 text-red-700 text-sm dark:bg-red-900/30 dark:border-red-800 dark:text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                {t('common.email')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <EnvelopeIcon className="h-5 w-5 text-neutral-400" />
                </div>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className={`${authInputStyle} pl-10`}
                  placeholder={t('auth.email_placeholder')}
                  required
                  disabled={submitting}
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              className={`${authButtonPrimary} bg-teal-500 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-700`}
              disabled={submitting}
            >
              {submitting ? t('auth.sending') : t('auth.forgot.send')}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-neutral-600 dark:text-neutral-400">
            <Link to="/login" className={`${authLinkStyle} inline-flex items-center gap-1`}>
              <ArrowUturnLeftIcon className="w-4 h-4" />
              {t('auth.back_login')}
            </Link>
          </p>
        </div>
      </div>

      {/* Banner panel */}
      <div className="hidden md:flex md:w-1/2 items-center justify-center relative overflow-hidden bg-primary dark:bg-neutral-900">
        <img src={banner} alt="" className="absolute inset-0 w-full h-full object-cover opacity-80 dark:opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/60 to-secondary/60 dark:from-neutral-900/80 dark:to-neutral-800/80" />
        <div className="absolute inset-0 flex flex-col items-center justify-center p-10 text-center text-white">
          <h3 className="text-3xl font-bold mb-3 drop-shadow">{t('auth.forgot.banner_title')}</h3>
          <p className="text-base opacity-90 max-w-xs drop-shadow">
            {t('auth.forgot.banner_text')}
          </p>
        </div>
      </div>

    </div>
  );
};
