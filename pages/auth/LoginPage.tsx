
import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AppContext, useAppContext } from '../../contexts/AppContext';
import { UserRole, AppModule } from '../../types';
import { APP_MODULES_CONFIG, authInputStyle, authButtonPrimary, authLinkStyle, authSecondaryLinkStyle } from '../../constants';
import { ArrowUturnLeftIcon, EnvelopeIcon, LockClosedIcon } from '../../components/icons';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, currentUser } = useAuth();
  const navigate = useNavigate();
  const appContextValue = useAppContext();

  useEffect(() => {
    if (currentUser && appContextValue) {
      const { setCurrentModule } = appContextValue;
      if (currentUser.role === UserRole.CLIENT) {
        // Redirect CLIENT (shopper) to the store page
        navigate('/store', { replace: true });
      } else if (currentUser.role === UserRole.EMPLOYEE) {
        setCurrentModule(AppModule.POS);
        navigate('/pos/cashier', { replace: true });
      } else { // Manager
        const lastStoredModule = localStorage.getItem('pazziCurrentModule');
        const initialModule = lastStoredModule ? JSON.parse(lastStoredModule) as AppModule : AppModule.PROJECT_MANAGEMENT;
        setCurrentModule(initialModule);

        const moduleConfig = APP_MODULES_CONFIG.find(m => m.name === initialModule);
        let firstSubModulePath = moduleConfig?.path || '/pm';

        if (moduleConfig) {
            if (moduleConfig.name === AppModule.PROJECT_MANAGEMENT && moduleConfig.subModulesProject.length > 0 && moduleConfig.subModulesProject[0].type === 'link') {
                firstSubModulePath = moduleConfig.subModulesProject[0].path;
            } else if (moduleConfig.name === AppModule.POS && moduleConfig.subModulesPOS.length > 0 && moduleConfig.subModulesPOS[0].type === 'link') {
                firstSubModulePath = moduleConfig.subModulesPOS[0].path;
            } else if (moduleConfig.name === AppModule.ECOMMERCE && moduleConfig.subModulesEcommerce.length > 0 && moduleConfig.subModulesEcommerce[0].type === 'link') {
                firstSubModulePath = moduleConfig.subModulesEcommerce[0].path;
            }
        }
        navigate(firstSubModulePath, { replace: true });
      }
    }
  }, [currentUser, navigate, appContextValue]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await login(email, password);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-100 dark:bg-neutral-900 p-4">
      <div className="flex flex-col md:flex-row w-full max-w-4xl bg-white dark:bg-neutral-800 rounded-xl shadow-2xl overflow-hidden">
        {/* Image Section - Hidden on small screens */}
        <div className="hidden md:block md:w-1/2 bg-cover bg-center" style={{ backgroundImage: "url('https://picsum.photos/seed/pazzilogin/800/900')" }}>
          {/* You can add an overlay or text here if needed */}
        </div>

        {/* Form Section */}
        <div className="w-full md:w-1/2 p-8 sm:p-10 flex flex-col justify-center">
          <div className="w-full max-w-md mx-auto">
            <h1 className="text-4xl font-bold text-center text-primary mb-4">Pazzi</h1>
            <h2 className="text-xl font-semibold text-center text-neutral-700 dark:text-neutral-200 mb-8">Iniciar Sesión</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-neutral-600 dark:text-neutral-300">Email</label>
                <div className="relative mt-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <EnvelopeIcon className="h-5 w-5 text-neutral-400" />
                    </div>
                    <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} className={`${authInputStyle} pl-10`} required />
                </div>
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-neutral-600 dark:text-neutral-300">Contraseña</label>
                 <div className="relative mt-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <LockClosedIcon className="h-5 w-5 text-neutral-400" />
                    </div>
                    <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} className={`${authInputStyle} pl-10`} required />
                </div>
              </div>
              <button type="submit" disabled={loading} className={authButtonPrimary}>
                {loading ? 'Iniciando...' : 'Iniciar Sesión'}
              </button>
            </form>
            <div className="mt-6 text-center">
              <Link to="/register" className={authLinkStyle}>¿No tienes cuenta? Regístrate</Link>
              <br />
              <Link to="/forgot-password" className={authSecondaryLinkStyle}>¿Olvidaste tu contraseña?</Link>
            </div>
            <div className="mt-4 text-xs text-neutral-500 dark:text-neutral-400 text-center space-y-1">
              <p>Gerente: admin@admin.com / admin</p>
              <p>Cliente: cliente@cliente.com / cliente</p>
              <p>Empleado: empleado@empleado.com / empleado</p>
            </div>
            <div className="mt-8 pt-6 border-t border-neutral-200 dark:border-neutral-700 text-center">
              <Link to="/" className={`${authSecondaryLinkStyle} flex items-center justify-center`}>
                <ArrowUturnLeftIcon /> Volver al Inicio
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
