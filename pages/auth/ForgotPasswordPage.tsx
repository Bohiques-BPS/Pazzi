import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { LandingLayout } from '../../components/layout/LandingLayout';
import { authInputStyle, authButtonPrimary, authLinkStyle } from '../../constants';
import { authService } from '../../services/auth';
import { ApiError } from '../../services/api';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
      setError(err instanceof ApiError ? err.message : 'Error al procesar la solicitud');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <LandingLayout>
      <div className="bg-white dark:bg-neutral-800 p-8 sm:p-10 rounded-xl shadow-2xl w-full max-w-md text-neutral-800 dark:text-neutral-100">
        <h2 className="text-3xl font-semibold text-center text-neutral-700 dark:text-neutral-200 mb-6">Recuperar contraseña</h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center mb-6">
          Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
        </p>
        {message && (
          <p className="text-green-600 dark:text-green-400 text-center mb-4 p-2 bg-green-50 dark:bg-green-900/50 rounded-md text-sm">
            {message}
          </p>
        )}
        {error && (
          <p className="text-red-600 dark:text-red-400 text-center mb-4 p-2 bg-red-50 dark:bg-red-900/50 rounded-md text-sm">
            {error}
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-base font-medium text-neutral-600 dark:text-neutral-300">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={authInputStyle}
              required
              disabled={submitting}
              autoFocus
            />
          </div>
          <button type="submit" className={authButtonPrimary} disabled={submitting}>
            {submitting ? 'Enviando...' : 'Enviar enlace'}
          </button>
        </form>
        <p className="mt-6 text-center">
          <Link to="/login" className={authLinkStyle}>Volver a iniciar sesión</Link>
        </p>
      </div>
    </LandingLayout>
  );
};
