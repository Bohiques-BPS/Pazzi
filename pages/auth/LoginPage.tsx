
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
    authSecondaryLinkStyle,
    ADMIN_EMAIL, ADMIN_PASSWORD,
    ECOMMERCE_CLIENT_EMAIL, ECOMMERCE_CLIENT_PASSWORD,
    PROJECT_CLIENT_EMAIL, PROJECT_CLIENT_PASSWORD,
    EMPLOYEE_EMAIL, EMPLOYEE_PASSWORD
} from '../../constants';
import { ArrowUturnLeftIcon, EnvelopeIcon, LockClosedIcon, UserIcon as UserIconMini } from '../../components/icons';

const logoUrl = "/Logo.png"; 
const rightPanelImageUrl = "https://picsum.photos/seed/businessgrowth/400/300";

const demoUsers = [
    { name: 'Admin (Gerente)', email: ADMIN_EMAIL, pass: ADMIN_PASSWORD },
    { name: 'Cliente E-commerce', email: ECOMMERCE_CLIENT_EMAIL, pass: ECOMMERCE_CLIENT_PASSWORD },
    { name: 'Cliente Proyecto', email: PROJECT_CLIENT_EMAIL, pass: PROJECT_CLIENT_PASSWORD },
    { name: 'Empleado', email: EMPLOYEE_EMAIL, pass: EMPLOYEE_PASSWORD },
];

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, currentUser } = useAuth();
  const navigate = useNavigate();
  const appContextValue = useAppContext();

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
                if ([AppModule.PROJECT_MANAGEMENT, AppModule.POS, AppModule.ECOMMERCE].includes(parsedModule)) {
                    initialModuleForManager = parsedModule;
                }
            } catch (e) {
                console.error("Error parsing stored module for manager, defaulting.", e);
            }
        }
        
        setCurrentModule(initialModuleForManager);
        const moduleConfig = APP_MODULES_CONFIG.find(m => m.name === initialModuleForManager);
        let firstSubModulePath = moduleConfig?.path || '/pm';

        if (moduleConfig) { // Determine the first actual linkable sub-module path
            if (moduleConfig.name === AppModule.PROJECT_MANAGEMENT && moduleConfig.subModulesProject && moduleConfig.subModulesProject.length > 0 && moduleConfig.subModulesProject[0].type === 'link') {
                firstSubModulePath = moduleConfig.subModulesProject[0].path;
            } else if (moduleConfig.name === AppModule.POS && moduleConfig.subModulesPOS && moduleConfig.subModulesPOS.length > 0 && moduleConfig.subModulesPOS[0].type === 'link') {
                firstSubModulePath = moduleConfig.subModulesPOS[0].path;
            } else if (moduleConfig.name === AppModule.ECOMMERCE && moduleConfig.subModulesEcommerce && moduleConfig.subModulesEcommerce.length > 0 && moduleConfig.subModulesEcommerce[0].type === 'link') {
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
    <div className="min-h-screen flex">
      {/* Form Panel */}
      <div className="w-full md:w-1/2 flex flex-col items-center justify-center p-6 sm:p-10 lg:p-12 bg-white dark:bg-neutral-800 overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-6">
            <img src={logoUrl} alt="Pazzi Logo" className="h-18" />
          </div>
          <h2 className="text-2xl font-bold text-center text-neutral-800 dark:text-neutral-100 mb-6">
            Inicie sesión en su cuenta
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Email</label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <EnvelopeIcon className="h-5 w-5 text-neutral-400" />
                </div>
                <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} className={`${authInputStyle} pl-10`} required autoComplete="email" />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Contraseña</label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LockClosedIcon className="h-5 w-5 text-neutral-400" />
                </div>
                <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} className={`${authInputStyle} pl-10`} required autoComplete="current-password" />
              </div>
            </div>
            <div className="flex items-center justify-between">
                <div className="flex items-center">
                    <input id="remember-me" name="remember-me" type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="h-4 w-4 text-primary focus:ring-primary border-neutral-300 dark:border-neutral-600 rounded" />
                    <label htmlFor="remember-me" className="ml-2 block text-sm text-neutral-700 dark:text-neutral-300">
                        Recordar contraseña
                    </label>
                </div>
                <div className="text-sm">
                    <Link to="/forgot-password" className={`${authLinkStyle} !text-sm`}>¿Contraseña olvidada?</Link>
                </div>
            </div>
            <button type="submit" disabled={loading} className={`${authButtonPrimary} bg-teal-500 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-700`}>
              {loading ? 'Iniciando...' : 'Iniciar sesión'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              ¿Todavía no tienes una cuenta?{' '}
              <Link to="/register" className={authLinkStyle}>Crea una ahora</Link>
            </p>
          </div>

          {/* Demo Accounts Section */}
          <div className="mt-8 pt-6 border-t border-neutral-200 dark:border-neutral-700">
            <h3 className="text-md font-semibold text-center text-neutral-700 dark:text-neutral-300 mb-3">Cuentas de Demostración</h3>
            <div className="flex space-x-3 overflow-x-auto py-2"> {/* Horizontal scroll container */}
                {demoUsers.map(user => (
                    <div key={user.email} className="flex-shrink-0 w-60 p-2.5 bg-neutral-50 dark:bg-neutral-700 rounded-md border border-neutral-200 dark:border-neutral-600">
                        <p className="font-medium text-neutral-700 dark:text-neutral-200 flex items-center text-sm mb-0.5"> {/* Ensure name is text-sm if other text becomes xs */}
                            <UserIconMini />{user.name}
                        </p>
                        <p className="text-xs text-neutral-600 dark:text-neutral-300"> {/* Reduced font size */}
                            Email: <code className="bg-neutral-200 dark:bg-neutral-600 px-1 py-0.5 rounded text-xs">{user.email}</code>
                        </p>
                        <p className="text-xs text-neutral-600 dark:text-neutral-300"> {/* Reduced font size */}
                            Pass: <code className="bg-neutral-200 dark:bg-neutral-600 px-1 py-0.5 rounded text-xs">{user.pass}</code>
                        </p>
                    </div>
                ))}
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-neutral-200 dark:border-neutral-700 text-center">
              <Link to="/" className={`${authSecondaryLinkStyle} flex items-center justify-center`}>
                <ArrowUturnLeftIcon /> Volver al Inicio
              </Link>
            </div>
        </div>
      </div>
      {/* Decorative Panel */}
      <div className="hidden md:flex md:w-1/2 bg-iconCustomBlue items-center justify-center p-10 flex-col bg-blend-multiply" style={{backgroundImage: "url('/login.jpg')", backgroundSize: 'cover', backgroundPosition: 'center'}}>
      
        <p className="text-xl lg:text-4xl text-white text-center font-semibold leading-relaxed max-w-md">
          Simplificamos la gestión de tu negocio para que te enfoques en crecer.
        </p>
      </div>
    </div>
  );
};
