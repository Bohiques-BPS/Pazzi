import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types';
import { authInputStyle, authButtonPrimary, authLinkStyle } from '../../constants';
import { PasswordInput } from '../../components/ui/PasswordInput';
import { EnvelopeIcon, LockClosedIcon, UserIcon as UserIconMini, PhoneIcon, BriefcaseIcon } from '../../components/icons';
import logo from '../../assets/logo.png';
import banner from '../../assets/img/banner.png';

const ACCOUNT_TYPES = [
  { role: UserRole.MANAGER,         label: 'Administrador',    icon: '🏢' },
  { role: UserRole.CLIENT_ECOMMERCE, label: 'Cliente Compras', icon: '🛍️' },
  { role: UserRole.CLIENT_PROJECT,   label: 'Cliente Proyecto', icon: '📋' },
];

export const RegisterPage: React.FC = () => {
  const [name, setName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.MANAGER);
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const isClient = role === UserRole.CLIENT_ECOMMERCE || role === UserRole.CLIENT_PROJECT;
  const isProjectClient = role === UserRole.CLIENT_PROJECT;

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    setPhone('');
    setCompanyName('');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) { setError('Las contraseñas no coinciden.'); return; }
    setLoading(true);
    try {
      const extra = isClient ? { phone: phone || undefined, companyName: companyName || undefined } : undefined;
      const result = await register(name, lastName, email, password, role, extra);
      if ('error' in result) { setError(result.error); }
      else { navigate('/login'); }
    } catch (err: any) {
      const be = err?.error || err?.message;
      setError(Array.isArray(be) ? be[0]?.message || 'Error de validación' : typeof be === 'string' ? be : 'Error al registrar');
    } finally { setLoading(false); }
  };

  return (
    <div className="h-screen flex bg-white dark:bg-neutral-800 overflow-hidden">

      {/* ── Form panel ───────────────────────────────── */}
      <div className="w-full md:w-1/2 h-full flex flex-col items-center justify-center overflow-y-auto px-6 py-4">
        <div className="w-full max-w-sm">

          {/* Logo + heading */}
          <div className="flex flex-col items-center mb-4">
            <img src={logo} alt="Pazzi" className="h-8 mb-3" />
            <h2 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">Crear cuenta</h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Completa los datos para registrarte</p>
          </div>

          {error && (
            <div className="mb-3 p-2.5 rounded-md bg-red-100 border border-red-200 text-red-700 text-sm dark:bg-red-900/30 dark:border-red-800 dark:text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">

            {/* Tipo de cuenta */}
            <div>
              <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Tipo de cuenta</p>
              <div className="grid grid-cols-3 gap-1.5">
                {ACCOUNT_TYPES.map(type => (
                  <button key={type.role} type="button" onClick={() => handleRoleChange(type.role)}
                    className={`flex flex-col items-center py-2.5 px-1 rounded-xl border-2 transition-all text-center
                      ${role === type.role
                        ? 'border-primary bg-primary/10 dark:bg-primary/20 text-primary dark:text-teal-400'
                        : 'border-neutral-200 dark:border-neutral-600 hover:border-primary/40 text-neutral-600 dark:text-neutral-300'}`}>
                    <span className="text-xl leading-none mb-0.5">{type.icon}</span>
                    <span className="text-[11px] font-semibold leading-tight">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Nombre + Apellido */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-0.5">Nombre</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><UserIconMini className="h-4 w-4 text-neutral-400" /></div>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} className={`${authInputStyle} pl-9 !py-2`} placeholder="Juan" required autoFocus />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-0.5">Apellido</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><UserIconMini className="h-4 w-4 text-neutral-400" /></div>
                  <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} className={`${authInputStyle} pl-9 !py-2`} placeholder="Pérez" required />
                </div>
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-0.5">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><EnvelopeIcon className="h-4 w-4 text-neutral-400" /></div>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={`${authInputStyle} pl-9 !py-2`} placeholder="correo@ejemplo.com" required autoComplete="email" />
              </div>
            </div>

            {/* Teléfono — solo clientes */}
            {isClient && (
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-0.5">Teléfono <span className="text-neutral-400 font-normal">(opcional)</span></label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><PhoneIcon className="h-4 w-4 text-neutral-400" /></div>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className={`${authInputStyle} pl-9 !py-2`} placeholder="(787) 000-0000" />
                </div>
              </div>
            )}

            {/* Empresa — solo cliente proyecto */}
            {isProjectClient && (
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-0.5">Empresa <span className="text-neutral-400 font-normal">(opcional)</span></label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><BriefcaseIcon className="h-4 w-4 text-neutral-400" /></div>
                  <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} className={`${authInputStyle} pl-9 !py-2`} placeholder="Nombre de tu empresa" />
                </div>
              </div>
            )}

            {/* Contraseña + Confirmar */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-0.5">Contraseña</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10"><LockClosedIcon className="h-4 w-4 text-neutral-400" /></div>
                  <PasswordInput value={password} onChange={e => setPassword(e.target.value)} className={`${authInputStyle} pl-9 !py-2`} placeholder="Mín. 8 car." required autoComplete="new-password" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-0.5">Confirmar</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10"><LockClosedIcon className="h-4 w-4 text-neutral-400" /></div>
                  <PasswordInput value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={`${authInputStyle} pl-9 !py-2`} placeholder="Repite" required autoComplete="new-password" />
                </div>
              </div>
            </div>

            <button type="submit" disabled={loading} className={`${authButtonPrimary} !py-2.5 bg-teal-500 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-700`}>
              {loading ? 'Registrando...' : 'Crear cuenta'}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-neutral-600 dark:text-neutral-400">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className={authLinkStyle}>Inicia sesión</Link>
          </p>
        </div>
      </div>

      {/* ── Banner panel ─────────────────────────────── */}
      <div className="hidden md:flex md:w-1/2 h-full items-center justify-center relative overflow-hidden bg-primary dark:bg-neutral-900">
        <img src={banner} alt="" className="w-full h-full object-cover opacity-80 dark:opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/60 to-secondary/60 dark:from-neutral-900/80 dark:to-neutral-800/80" />
        <div className="absolute inset-0 flex flex-col items-center justify-center p-10 text-center text-white">
          <h3 className="text-3xl font-bold mb-3 drop-shadow">Bienvenido a Pazzi</h3>
          <p className="text-base opacity-90 max-w-xs drop-shadow">La plataforma todo-en-uno para gestionar tu negocio, proyectos y tienda en línea.</p>
        </div>
      </div>

    </div>
  );
};
