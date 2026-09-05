import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AppContext, useAppContext } from '../../contexts/AppContext';
import { UserRole, AppModule } from '../../types';
import { 
    APP_MODULES_CONFIG, 
    authInputStyle, 
    authButtonPrimary, 
    authLinkStyle, 
    authSecondaryLinkStyle
} from '../../constants';
import { ArrowUturnLeftIcon, EnvelopeIcon, LockClosedIcon, UserIcon as UserIconMini } from '../../components/icons';
import { PasswordInput } from '../../components/ui/PasswordInput';
import { usePublicT } from '../../hooks/usePublicTranslation';

import logo from '../../assets/logo.png';
import logoWhite from '../../assets/logo_white.png';
import banner from '../../assets/img/banner.png';

const demoUsers = [
    { name: 'Admin (Gerente)', email: 'admin@pazzi.com', pass: 'password123' },
    { name: 'Cliente E-commerce', email: 'cliente.eco@pazzi.com', pass: 'password123' },
    { name: 'Cliente Proyecto', email: 'cliente.proj@pazzi.com', pass: 'password123' },
    { name: 'Empleado', email: 'empleado@pazzi.com', pass: 'password123' },
];

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState(() => localStorage.getItem('pazzi_remembered_email') || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(() => !!localStorage.getItem('pazzi_remembered_email'));
  const [loading, setLoading] = useState(false);
  const { login, currentUser } = useAuth();
  const navigate = useNavigate();
  const appContextValue = useAppContext();
  const t = usePublicT();

  useEffect(() => {
    if (currentUser && appContextValue) {
      const { setCurrentModule, currentModule: contextCurrentModule } = appContextValue;
      if (currentUser.role === UserRole.CLIENT_ECOMMERCE) {
        navigate('/store', { replace: true });
      } else if (currentUser.role === UserRole.CLIENT_PROJECT) {
        setCurrentModule(AppModule.PROJECT_CLIENT_DASHBOARD);
        navigate('/project-client/dashboard', { replace: true });
      }
       else if (currentUser.role === UserRole.EMPLOYEE) {
        const employeeValidModules = [AppModule.POS, AppModule.PROJECT_MANAGEMENT];
        let employeeTargetModule = contextCurrentModule;
        if (!employeeValidModules.includes(employeeTargetModule)) {
            employeeTargetModule = AppModule.POS; // Default for employee if current is not POS or PM
        }
        const defaultPath = employeeTargetModule === AppModule.POS ? '/pos/cashier' : '/pm/projects';
        setCurrentModule(employeeTargetModule);
        navigate(defaultPath, { replace: true });
      } else { // Manager
        const lastStoredModuleString = localStorage.getItem('pazziCurrentModule');
        let initialModuleForManager: AppModule = AppModule.PROJECT_MANAGEMENT; // Default for manager

        if (lastStoredModuleString) {
            try {
                const parsedModule = JSON.parse(lastStoredModuleString) as AppModule;
                // Ensure the stored module is valid for a manager
                if ([AppModule.PROJECT_MANAGEMENT, AppModule.POS, AppModule.ECOMMERCE, AppModule.TIENDA].includes(parsedModule)) {
                    initialModuleForManager = parsedModule;
                }
            } catch (e) {
                console.error("Error parsing stored module for manager, defaulting.", e);
            }
        }
        
        setCurrentModule(initialModuleForManager);
        const moduleConfig = APP_MODULES_CONFIG.find(m => m.name === initialModuleForManager);
        navigate(moduleConfig?.path || '/', { replace: true });
      }
    }
  }, [currentUser, navigate, appContextValue]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await login(email, password);
      if ('error' in result) {
        setError(result.error);
      } else {
        // Persist or clear remembered email
        if (rememberMe) {
          localStorage.setItem('pazzi_remembered_email', email);
        } else {
          localStorage.removeItem('pazzi_remembered_email');
        }
      }
    } catch (err: any) {
      const backendError = err?.error || err?.message;
      const finalMessage = Array.isArray(backendError)
        ? backendError[0]?.message || t('auth.err.validation')
        : typeof backendError === 'string' ? backendError : t('auth.err.server');
      setError(finalMessage);
    } finally {
      setLoading(false);
    }
  };
  
  const handleDemoLogin = (user: typeof demoUsers[0]) => {
    setEmail(user.email);
    setPassword(user.pass);
  };

  return (
    <div className="min-h-screen flex bg-white dark:bg-neutral-800">
      {/* Form Panel */}
      <div className="w-full md:w-1/2 flex flex-col items-center justify-center p-6 sm:p-10 lg:p-12 overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-6">
            <img src={logo} alt="Pazzi Logo" className="h-10" />
          </div>
          <h2 className="text-3xl font-bold text-center text-neutral-800 dark:text-neutral-100 mb-6">
            {t('auth.login.title')}
          </h2>

          {error && (
            <div className="mb-4 p-3 rounded-md bg-red-100 border border-red-200 text-red-700 text-sm dark:bg-red-900/30 dark:border-red-800 dark:text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-base font-medium text-neutral-700 dark:text-neutral-300">{t('common.email')}</label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <EnvelopeIcon className="h-5 w-5 text-neutral-400" />
                </div>
                <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} className={`${authInputStyle} pl-10`} required autoComplete="email" />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="block text-base font-medium text-neutral-700 dark:text-neutral-300">{t('auth.password')}</label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                    <LockClosedIcon className="h-5 w-5 text-neutral-400" />
                </div>
                <PasswordInput id="password" value={password} onChange={(e) => setPassword(e.target.value)} className={`${authInputStyle} pl-10`} required autoComplete="current-password" />
              </div>
            </div>
            <div className="flex items-center justify-between">
                <div className="flex items-center">
                    <input id="remember-me" name="remember-me" type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="h-4 w-4 text-primary focus:ring-primary border-neutral-300 dark:border-neutral-600 rounded" />
                    <label htmlFor="remember-me" className="ml-2 block text-base text-neutral-700 dark:text-neutral-300">
                        {t('auth.remember')}
                    </label>
                </div>
                <div className="text-base">
                    <Link to="/forgot-password" className={`${authLinkStyle} !text-base`}>{t('auth.forgot_q')}</Link>
                </div>
            </div>
            <button type="submit" disabled={loading} className={`${authButtonPrimary} bg-teal-500 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-700`}>
              {loading ? t('auth.logging_in') : t('auth.login_btn')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-base text-neutral-600 dark:text-neutral-400">
              {t('auth.no_account')}{' '}
              <Link to="/register" className={authLinkStyle}>{t('auth.create_now')}</Link>
            </p>
          </div>

          

          <div className="mt-8 pt-6 border-t border-neutral-200 dark:border-neutral-700 text-center">
              <Link to="/" className={`${authSecondaryLinkStyle} inline-flex items-center justify-center`}>
                <ArrowUturnLeftIcon /> {t('auth.back_home')}
              </Link>
              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-neutral-400 dark:text-neutral-500">
                <Link to="/privacy" className="hover:text-primary transition-colors">{t('auth.privacy')}</Link>
                <span aria-hidden="true">·</span>
                <Link to="/terms" className="hover:text-primary transition-colors">{t('auth.terms')}</Link>
              </div>
            </div>
        </div>
      </div>
      {/* Decorative Panel */}
      <div
        className="hidden md:flex md:w-1/2 items-center justify-center p-10 flex-col bg-cover bg-center relative"
        style={{ backgroundImage: `url(${banner})` }}
      >
        {/* dark overlay so text stays readable */}
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 flex flex-col items-center">
          <img src={logoWhite} alt="Pazzi Logo" className="max-w-[180px] lg:max-w-[220px] mb-8 drop-shadow-lg" />
          <p className="text-2xl lg:text-3xl text-white text-center font-semibold leading-relaxed max-w-md drop-shadow">
            {t('auth.tagline')}
          </p>
        </div>
      </div>
    </div>
  );
};