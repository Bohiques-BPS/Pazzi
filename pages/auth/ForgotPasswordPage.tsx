
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { LandingLayout } from '../../components/layout/LandingLayout'; // Adjusted path
import { authInputStyle, authButtonPrimary, authLinkStyle } from '../../constants'; // Adjusted path

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(`Se ha enviado un enlace de recuperación a ${email}`);
    setEmail('');
  };
  return (
    <LandingLayout>
      <div className="bg-white dark:bg-neutral-800 p-8 sm:p-10 rounded-xl shadow-2xl w-full max-w-md text-neutral-800 dark:text-neutral-100">
        <h2 className="text-2xl font-semibold text-center text-neutral-700 dark:text-neutral-200 mb-6">Recuperar Contraseña</h2>
        {message && <p className="text-green-600 dark:text-green-400 text-center mb-4 p-2 bg-green-50 dark:bg-green-900/50 rounded-md">{message}</p>}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-neutral-600 dark:text-neutral-300">Email</label>
            <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} className={authInputStyle} required />
          </div>
          <button type="submit" className={authButtonPrimary}>
            Recuperar Contraseña
          </button>
        </form>
        <p className="mt-6 text-center">
          <Link to="/login" className={authLinkStyle}>Volver a Iniciar Sesión</Link>
        </p>
      </div>
    </LandingLayout>
  );
};