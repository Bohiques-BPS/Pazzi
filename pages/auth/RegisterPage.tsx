import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types';
import { authInputStyle, authButtonPrimary, authLinkStyle } from '../../constants';
import { PasswordInput } from '../../components/ui/PasswordInput';
import { EnvelopeIcon, LockClosedIcon, UserIcon as UserIconMini } from '../../components/icons';
import logo from '../../assets/logo.png';
import banner from '../../assets/img/banner.png';

const ACCOUNT_TYPES = [
  {
    role: UserRole.MANAGER,
    label: 'Administrador',
    description: 'Gestiona tu negocio, productos, empleados y reportes',
    icon: '🏢',
  },
  {
    role: UserRole.CLIENT_ECOMMERCE,
    label: 'Cliente Compras',
    description: 'Compra productos en la tienda en línea',
    icon: '🛍️',
  },
  {
    role: UserRole.CLIENT_PROJECT,
    label: 'Cliente Proyecto',
    description: 'Accede al seguimiento de tus proyectos',
    icon: '📋',
  },
];

export const RegisterPage: React.FC = () => {
  const [name, setName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.MANAGER);
  const [error, setError] = useState<string | null>(null);
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
      if ('error' in result) {
        setError(result.error);
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
    <div className="min-h-screen flex bg-white dark:bg-neutral-800">
      {/* Form Panel */}
      <div className="w-full md:w-1/2 flex flex-col items-center justify-center p-6 sm:p-10 lg:p-12 overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img src={logo} alt="Pazzi Logo" className="h-10 dark:hidden" />
            <img src={logo} alt="Pazzi Logo" className="h-10 hidden dark:block" />
          </div>

          <h2 className="text-3xl font-bold text-center text-neutral-800 dark:text-neutral-100 mb-1">
            Crear cuenta
          </h2>
          <p className="text-center text-sm text-neutral-500 dark:text-neutral-400 mb-6">
            Completa los datos para registrarte
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-md bg-red-100 border border-red-200 text-red-700 text-sm dark:bg-red-900/30 dark:border-red-800 dark:text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nombre + Apellido */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Nombre</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UserIconMini className="h-5 w-5 text-neutral-400" />
                  </div>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className={`${authInputStyle} pl-10`}
                    placeholder="Juan"
                    required
                    autoFocus
                  />
                </div>
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Apellido</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UserIconMini className="h-5 w-5 text-neutral-400" />
                  </div>
                  <input
                    type="text"
                    id="lastName"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    className={`${authInputStyle} pl-10`}
                    placeholder="Pérez"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Email</label>
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
                  placeholder="correo@ejemplo.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Contraseña + Confirmar */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Contraseña</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                    <LockClosedIcon className="h-5 w-5 text-neutral-400" />
                  </div>
                  <PasswordInput
                    id="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className={`${authInputStyle} pl-10`}
                    placeholder="Mínimo 8 caracteres"
                    required
                    autoComplete="new-password"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Confirmar</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                    <LockClosedIcon className="h-5 w-5 text-neutral-400" />
                  </div>
                  <PasswordInput
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className={`${authInputStyle} pl-10`}
                    placeholder="Repite la contraseña"
                    required
                    autoComplete="new-password"
                  />
                </div>
              </div>
            </div>

            {/* Tipo de cuenta — tarjetas */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Tipo de cuenta</label>
              <div className="grid grid-cols-3 gap-2">
                {ACCOUNT_TYPES.map(type => (
                  <button
                    key={type.role}
                    type="button"
                    onClick={() => setRole(type.role)}
                    className={`flex flex-col items-center text-center p-3 rounded-xl border-2 transition-all duration-150 cursor-pointer
                      ${role === type.role
                        ? 'border-primary bg-primary/10 dark:bg-primary/20 text-primary dark:text-teal-400'
                        : 'border-neutral-200 dark:border-neutral-600 hover:border-primary/50 text-neutral-600 dark:text-neutral-300'
                      }`}
                  >
                    <span className="text-2xl mb-1">{type.icon}</span>
                    <span className="text-xs font-semibold leading-tight">{type.label}</span>
                    <span className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5 leading-tight hidden sm:block">{type.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <button type="submit" disabled={loading} className={`${authButtonPrimary} mt-2 bg-teal-500 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-700`}>
              {loading ? 'Registrando...' : 'Crear cuenta'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-neutral-600 dark:text-neutral-400">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className={authLinkStyle}>Inicia sesión</Link>
          </p>
        </div>
      </div>

      {/* Banner Panel (hidden on mobile) */}
      <div className="hidden md:flex md:w-1/2 items-center justify-center relative overflow-hidden bg-primary dark:bg-neutral-900">
        <img
          src={banner}
          alt="Pazzi Banner"
          className="w-full h-full object-cover opacity-80 dark:opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/60 to-secondary/60 dark:from-neutral-900/80 dark:to-neutral-800/80" />
        <div className="absolute inset-0 flex flex-col items-center justify-center p-10 text-center text-white">
          <h3 className="text-3xl font-bold mb-3 drop-shadow">Bienvenido a Pazzi</h3>
          <p className="text-base opacity-90 max-w-xs drop-shadow">
            La plataforma todo-en-uno para gestionar tu negocio, proyectos y tienda en línea.
          </p>
        </div>
      </div>
    </div>
  );
};
