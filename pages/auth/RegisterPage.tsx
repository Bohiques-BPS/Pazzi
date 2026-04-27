

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext'; 
import { LandingLayout } from '../../components/layout/LandingLayout'; 
import { UserRole } from '../../types'; 
import { authInputStyle, authButtonPrimary, authLinkStyle } from '../../constants'; 

export const RegisterPage: React.FC = () => {
  const [name, setName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole>(UserRole.CLIENT_ECOMMERCE); // Default to E-commerce Client
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setLoading(true);
    try {
      const result = await register(name, lastName, email, password, role);
      if (result && result.error) {
        // Procesar error si viene como array de Zod o string
        const msg = Array.isArray(result.error)
          ? result.error[0]?.message || 'Error en los datos de registro'
          : result.error;
        setError(msg);
      } else {
        navigate('/login');
      }
    } catch (err: any) {
      const backendError = err?.error || err?.message;
      const finalMessage = Array.isArray(backendError)
        ? backendError[0]?.message || 'Error de validación'
        : typeof backendError === 'string' ? backendError : 'Error al registrar usuario';
      setError(finalMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LandingLayout>
      <div className="bg-white dark:bg-neutral-800 p-8 sm:p-10 rounded-xl shadow-2xl w-full max-w-md text-neutral-800 dark:text-neutral-100">
        <h2 className="text-3xl font-semibold text-center text-neutral-700 dark:text-neutral-200 mb-8">Crear Cuenta</h2>
        
        {error && (
          <div className="mb-4 p-3 rounded-md bg-red-100 border border-red-200 text-red-700 text-sm dark:bg-red-900/30 dark:border-red-800 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-base font-medium text-neutral-600 dark:text-neutral-300">Nombre</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={authInputStyle} required />
          </div>
          <div>
            <label className="block text-base font-medium text-neutral-600 dark:text-neutral-300">Apellido</label>
            <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className={authInputStyle} required />
          </div>
          <div>
            <label className="block text-base font-medium text-neutral-600 dark:text-neutral-300">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={authInputStyle} required />
          </div>
          <div>
            <label className="block text-base font-medium text-neutral-600 dark:text-neutral-300">Contraseña</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={authInputStyle} required />
          </div>
          <div>
            <label className="block text-base font-medium text-neutral-600 dark:text-neutral-300">Confirmar Contraseña</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={authInputStyle} required />
          </div>
          <div>
            <label className="block text-base font-medium text-neutral-600 dark:text-neutral-300">Tipo de Cuenta</label>
            <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} className={authInputStyle} required>
              <option value={UserRole.CLIENT_ECOMMERCE}>Cliente E-commerce (Comprador)</option>
              <option value={UserRole.CLIENT_PROJECT}>Cliente de Proyecto</option>
              <option value={UserRole.MANAGER}>Gerente</option>
              <option value={UserRole.EMPLOYEE}>Empleado</option>
            </select>
          </div>
          <button type="submit" disabled={loading} className={`${authButtonPrimary} mt-2`}>
            {loading ? 'Registrando...' : 'Registrarse'}
          </button>
        </form>
        <p className="mt-6 text-center">
          <Link to="/login" className={authLinkStyle}>¿Ya tienes cuenta? Inicia Sesión</Link>
        </p>
      </div>
    </LandingLayout>
  );
};