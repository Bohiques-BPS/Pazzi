

import React, { useState, useEffect, useContext } from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import { Navbar } from './Navbar'; // Adjusted path
import { Sidebar } from './Sidebar'; // Adjusted path
import { AppContext, useAppContext } from '../../contexts/AppContext'; // Adjusted path
import { AppModule } from '../../types'; // Adjusted path
import { APP_MODULES_CONFIG, getModuleForPath } from '../../constants'; // Adjusted path
import { useAuth } from '../../contexts/AuthContext';
import { useModules } from '../../hooks/useModules';
import { useModuleAccess } from '../../hooks/useModuleAccess';
import { recordPageVisit } from '../../utils/pageTracker';

const SIDEBAR_COLLAPSED_KEY = 'pazzi_sidebar_collapsed';

export const MainLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Colapso del sidebar en ESCRITORIO (persistido por dispositivo). true = oculto.
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1'; } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem(SIDEBAR_COLLAPSED_KEY, sidebarCollapsed ? '1' : '0'); } catch { /* almacenamiento no disponible */ }
  }, [sidebarCollapsed]);
  const appContextValue = useAppContext();
  const { currentUser } = useAuth();
  const { isModuleEnabled } = useModules();
  const { canAccessModule, canAccessPath } = useModuleAccess();

  if (!appContextValue) {
      return <div>Error: AppContext not found.</div>;
  }
  const { currentModule, setCurrentModule } = appContextValue;

  const location = useLocation();
  const navigate = useNavigate();

  // Confinamiento de clientes de portal: un CLIENT_PROJECT/CLIENT_ECOMMERCE solo puede estar
  // en SU portal. Si navega (por URL) a una página de staff (POS, Tienda, Proyectos, etc.),
  // se le redirige a su portal. Defensa en profundidad además del filtrado del backend.
  useEffect(() => {
    if (!currentUser) return;
    const isPortalClient = currentUser.role === 'CLIENT_PROJECT' || currentUser.role === 'CLIENT_ECOMMERCE';
    if (!isPortalClient) return;
    const allowedPrefixes = ['/project-client', '/my-orders', '/profile'];
    const allowed = allowedPrefixes.some(p => location.pathname === p || location.pathname.startsWith(p + '/'));
    if (!allowed) {
      navigate(currentUser.role === 'CLIENT_PROJECT' ? '/project-client/dashboard' : '/my-orders', { replace: true });
    }
  }, [location.pathname, currentUser, navigate]);

  // Interruptor maestro: si se accede por URL directa a un módulo apagado a nivel
  // negocio, redirigir al dashboard. Cubre el caso de un link/bookmark antiguo.
  useEffect(() => {
    const moduleForPath = getModuleForPath(location.pathname);
    if (moduleForPath && !isModuleEnabled(moduleForPath)) {
      navigate('/', { replace: true });
      return;
    }
    // CRM de Leads: un colaborador sin permisos del módulo (o de esa página concreta: reportes,
    // configuración…) no entra por URL directa; vuelve al inicio en vez de ver errores 403.
    if (moduleForPath === AppModule.LEADS && currentUser && (!canAccessModule(AppModule.LEADS) || !canAccessPath(AppModule.LEADS, location.pathname))) {
      navigate('/', { replace: true });
    }
  }, [location.pathname, isModuleEnabled, navigate, currentUser, canAccessModule, canAccessPath]);

  // Track page visits for dynamic quick access on the dashboard
  useEffect(() => {
    if (currentUser?.id) {
      recordPageVisit(currentUser.id, location.pathname);
    }
  }, [location.pathname, currentUser?.id]);

  useEffect(() => {
    const currentPath = location.pathname;
    // getModuleForPath respeta los overrides de prefijo (p.ej. /tienda/suppliers → POS);
    // si no resuelve, caemos al match genérico por path de módulo.
    const resolvedModule = getModuleForPath(currentPath)
        ?? APP_MODULES_CONFIG.find(m => currentPath.startsWith(m.path))?.name;

    if (resolvedModule && resolvedModule !== currentModule) {
        setCurrentModule(resolvedModule);
    }
    // If no resolvedModule (e.g. /settings), currentModule remains as is, which is fine.
  }, [location.pathname, currentModule, setCurrentModule]);


  useEffect(() => {
    const moduleConfig = APP_MODULES_CONFIG.find(m => m.name === currentModule);
    if (moduleConfig && location.pathname === moduleConfig.path) { 
        let firstSubModulePath: string | undefined;
        if (currentModule === AppModule.PROJECT_MANAGEMENT && moduleConfig.subModulesProject.length > 0 && moduleConfig.subModulesProject[0].type === 'link') {
            firstSubModulePath = moduleConfig.subModulesProject[0].path;
        } else if (currentModule === AppModule.POS && moduleConfig.subModulesPOS && moduleConfig.subModulesPOS.length > 0) {
            const firstItem = moduleConfig.subModulesPOS[0];
            if (firstItem.type === 'link') {
                firstSubModulePath = firstItem.path;
            } else if (firstItem.type === 'group' && firstItem.children.length > 0) {
                firstSubModulePath = firstItem.children[0].path;
            }
        } else if (currentModule === AppModule.ECOMMERCE && moduleConfig.subModulesEcommerce.length > 0 && moduleConfig.subModulesEcommerce[0].type === 'link') {
            firstSubModulePath = moduleConfig.subModulesEcommerce[0].path;
        }
        
        if (firstSubModulePath && location.pathname !== firstSubModulePath) {
            // Avoid redirecting if already on a deeper path of the module
            if (!location.pathname.startsWith(firstSubModulePath) || location.pathname === moduleConfig.path) {
                 // navigate(firstSubModulePath); // This might be too aggressive, App.tsx handles initial redirects
            }
        }
    }
  }, [currentModule, location.pathname, navigate]);


  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const toggleCollapse = () => setSidebarCollapsed(c => !c);
  const isPOSCashierPage = location.pathname === '/pos/cashier';


  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-900">
      {/* Sidebar de ALTO COMPLETO (incluye el logo arriba). El navbar y el contenido van a su derecha. */}
      {!isPOSCashierPage && <Sidebar isOpen={sidebarOpen} collapsed={sidebarCollapsed} currentModule={currentModule} setCurrentModule={setCurrentModule} setSidebarOpen={setSidebarOpen} />}
      {!isPOSCashierPage && <Navbar onToggleSidebar={toggleSidebar} onToggleCollapse={toggleCollapse} sidebarCollapsed={sidebarCollapsed} currentModule={currentModule} setCurrentModule={setCurrentModule} />}
      <main className={`min-w-0 bg-neutral-100 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 transition-[margin] duration-200 ease-in-out ${!isPOSCashierPage ? `mt-[65px] h-[calc(100vh-65px)] overflow-y-auto p-6 ${sidebarCollapsed ? '' : 'lg:ml-72'}` : ''}`}>
        <Outlet />
      </main>
    </div>
  );
};
