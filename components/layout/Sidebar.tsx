
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AppModule, UserRole } from '../../types'; 
import { APP_MODULES_CONFIG, SidebarItemConfig, SubModuleGroup, SubModuleLink } from '../../constants'; 
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { useTranslation } from '../../contexts/GlobalSettingsContext'; // Import translation hook
import { useChatUnread } from '../../hooks/useChatUnread';
import { hubPath } from '../../utils/moduleNav';
import { ChevronDownIcon, BriefcaseIcon, ChatBubbleLeftRightIcon, CashBillIcon, BuildingStorefrontIcon as StoreIcon, Squares2X2Icon, ListBulletIcon, UserGroupIcon, UsersIcon, HomeIcon } from '../icons';

interface SidebarProps {
    isOpen: boolean;
    currentModule: AppModule;
    setSidebarOpen: (isOpen: boolean) => void;
    /** Colapsado en escritorio (oculto). En móvil manda `isOpen` (drawer). */
    collapsed?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, currentModule, setSidebarOpen, collapsed = false }) => {
  // En escritorio: visible salvo que esté colapsado. En móvil: drawer según isOpen.
  const desktopTransform = collapsed ? 'lg:-translate-x-full' : 'lg:translate-x-0';
  const location = useLocation();
  const { currentUser } = useAuth();
  const { t } = useTranslation(); // Use translation hook
  const moduleConfig = APP_MODULES_CONFIG.find(m => m.name === currentModule);
  // Por defecto TODOS los grupos CERRADOS; solo UNO abierto a la vez (acordeón).
  // null = ninguno abierto.
  // Varios grupos pueden estar abiertos a la vez: abrir uno NO cierra el anterior, así el menú no
  // se mueve durante el clic (USO-8).
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  // Badge de chats de proyecto sin leer (solo consulta estando en el módulo de Proyectos).
  const { totalUnread: unreadChats } = useChatUnread(currentModule === AppModule.PROJECT_MANAGEMENT);

  const { can, canAny } = usePermissions();

  // ¿El empleado puede ver este enlace? (MANAGER pasa todo vía can()==true).
  const linkAllowed = (item: SubModuleLink): boolean => {
    if (!item.permission) return true;
    return Array.isArray(item.permission) ? canAny(...item.permission) : can(item.permission);
  };

  // Filtra la lista por permisos: descarta enlaces sin permiso y grupos que se quedan vacíos.
  const filterByPermission = (items: SidebarItemConfig[]): SidebarItemConfig[] =>
    items
      .map(item => {
        if (item.type === 'group') {
          const children = item.children.filter(linkAllowed);
          return children.length ? { ...item, children } : null;
        }
        return linkAllowed(item) ? item : null;
      })
      .filter(Boolean) as SidebarItemConfig[];

  let subModulesToDisplay: SidebarItemConfig[] = [];

  if (currentUser?.role === UserRole.MANAGER || currentUser?.role === UserRole.EMPLOYEE) {
    // Ambos roles parten de la MISMA configuración; el filtro por permisos deja pasar
    // todo al MANAGER (can()===true) y recorta para el EMPLEADO según sus permisos.
    let base: SidebarItemConfig[] = [];
    if (moduleConfig) {
        switch(currentModule) {
            case AppModule.TIENDA:
                base = (moduleConfig as any).subModulesTienda || [];
                break;
            case AppModule.PROJECT_MANAGEMENT:
                base = moduleConfig.subModulesProject || [];
                break;
            case AppModule.POS:
                base = moduleConfig.subModulesPOS || [];
                break;
            case AppModule.ECOMMERCE:
                base = moduleConfig.subModulesEcommerce || [];
                break;
            case AppModule.LEADS:
                base = (moduleConfig as any).subModulesLeads || [];
                break;
            case AppModule.ADMINISTRACION:
                base = (moduleConfig as any).subModulesAdmin || [];
                break;
        }
    }
    subModulesToDisplay = filterByPermission(base);
  } else if (currentUser?.role === UserRole.CLIENT_PROJECT) {
    const projectClientModule = APP_MODULES_CONFIG.find(m => m.name === AppModule.PROJECT_CLIENT_DASHBOARD);
    subModulesToDisplay = projectClientModule?.subModulesProjectClient || [];
  }


  // Abre (sin cerrar los demás) el grupo que contiene la ruta activa.
  useEffect(() => {
    for (const item of subModulesToDisplay) {
      if (item.type === 'group' && (item as any).children?.some((c: any) => c.type === 'link' && c.path && location.pathname.startsWith(c.path))) {
        setOpenGroups(prev => prev.has(item.name) ? prev : new Set(prev).add(item.name));
        return;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, currentModule]);

  const handleLinkClick = () => {
    if (isOpen && window.innerWidth < 1024) { 
      setSidebarOpen(false);
    }
  };

  const toggleGroup = (groupName: string) => {
    // Alterna este grupo sin tocar los demás (no se colapsa el anterior).
    setOpenGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupName)) next.delete(groupName); else next.add(groupName);
      return next;
    });
  };

  if (currentUser?.role === UserRole.CLIENT_ECOMMERCE) { 
      return null; 
  }
  
  if (subModulesToDisplay.length === 0 && currentUser?.role !== UserRole.CLIENT_PROJECT) {
      return (
        <aside className={`bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 w-72 space-y-1 py-7 px-2 fixed inset-y-0 left-0 top-[65px] transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} ${desktopTransform} transition-transform duration-200 ease-in-out z-10 shadow-lg border-r border-neutral-200 dark:border-neutral-700`}>
            <p className="px-2 py-2 text-lg text-neutral-500 dark:text-neutral-400">{t('cmp.sidebar.no_options')}</p>
        </aside>
      );
  }


  const renderSidebarItem = (item: SidebarItemConfig, index: number) => {
    const Icon = item.icon;
    // Translate item name
    const translatedName = t(item.name);

    if (item.type === 'group') {
      const isGroupOpen = openGroups.has(item.name);

      return (
        <div key={`${item.name}-${index}`} className="mt-1.5 first:mt-0">
          <button
            onClick={() => toggleGroup(item.name)}
            className={`flex items-center justify-between gap-2 w-full py-2 px-3 rounded-lg transition-colors focus:outline-none text-[15px] font-medium hover:bg-neutral-100 dark:hover:bg-neutral-700/50 ${isGroupOpen ? 'text-neutral-800 dark:text-neutral-100' : 'text-neutral-600 dark:text-neutral-300'}`}
            aria-expanded={isGroupOpen}
            aria-controls={`group-content-${item.name}`}
          >
            <span className="flex items-center min-w-0 gap-2.5">
              {Icon && <Icon className="w-[18px] h-[18px] flex-shrink-0 text-primary/80 dark:text-teal-300/90" />}
              <span className="truncate">{translatedName}</span>
            </span>
            <ChevronDownIcon className={`w-4 h-4 flex-shrink-0 text-neutral-400 transition-transform duration-200 ${isGroupOpen ? 'transform rotate-180' : ''}`} />
          </button>
          <div
            id={`group-content-${item.name}`}
            className={`overflow-hidden transition-all duration-300 ease-in-out ${isGroupOpen ? 'max-h-screen' : 'max-h-0'}`}
          >
            <div className="mt-0.5 ml-[18px] pl-3 border-l border-neutral-200 dark:border-neutral-700 space-y-0.5">
              {item.children.map((child, childIndex) => renderSidebarItem(child, childIndex))}
            </div>
          </div>
        </div>
      );
    }

    let isActive = location.pathname === item.path;
    if (item.path === '/pm/projects' && location.pathname.startsWith('/pm/projects')) {
        isActive = true;
    }
    if (currentUser?.role === UserRole.CLIENT_PROJECT && item.path === '/project-client/dashboard' && location.pathname.startsWith('/project-client/chat')) {
        isActive = true;
    }


    return (
      <Link
        key={item.path}
        to={item.path}
        onClick={handleLinkClick}
        className={`flex items-center gap-2.5 py-2 px-3 rounded-lg transition-colors text-[15px] ${isActive ? 'bg-primary/10 dark:bg-primary/20 text-primary dark:text-teal-300 font-medium' : 'text-neutral-500 dark:text-neutral-400 font-normal hover:bg-neutral-100 dark:hover:bg-neutral-700/50 hover:text-neutral-800 dark:hover:text-neutral-100'}`}
      >
        {Icon && <Icon className="w-[18px] h-[18px] flex-shrink-0" />}
        <span className="truncate">{translatedName}</span>
        {item.path === '/pm/chat' && unreadChats > 0 && (
          <span className="ml-auto flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center" aria-label={`${unreadChats} sin leer`}>
            {unreadChats}
          </span>
        )}
      </Link>
    );
  };

  return (
    <aside className={`bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 w-72 py-5 px-3 fixed inset-y-0 left-0 top-[65px] overflow-y-auto transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} ${desktopTransform} transition-transform duration-200 ease-in-out z-10 shadow-lg border-r border-neutral-200 dark:border-neutral-700`}>
      {/* Módulo actual como encabezado del sidebar → enlaza a la vista principal del módulo. */}
      {currentModule && currentUser?.role !== UserRole.CLIENT_PROJECT && (
        <Link to={hubPath(currentModule)} className="block px-3 pb-3 mb-2 border-b border-neutral-200 dark:border-neutral-700 group" title={t('hub.go') || 'Ver todas las secciones'}>
          <span className="text-lg font-bold text-neutral-800 dark:text-neutral-100 group-hover:text-primary">{t(`module.${currentModule}`)}</span>
        </Link>
      )}
      <nav className="space-y-0.5">
        {currentModule && currentUser?.role !== UserRole.CLIENT_PROJECT && (
          <Link
            to={hubPath(currentModule)}
            className={`flex items-center gap-2.5 py-2 px-3 rounded-lg transition-colors text-[15px] ${location.pathname.startsWith('/inicio') ? 'bg-primary/10 dark:bg-primary/20 text-primary dark:text-teal-300 font-medium' : 'text-neutral-600 dark:text-neutral-300 font-medium hover:bg-neutral-100 dark:hover:bg-neutral-700/50 hover:text-neutral-800 dark:hover:text-neutral-100'}`}
          >
            <HomeIcon className="w-5 h-5 flex-shrink-0" />
            <span>{t('hub.home') || 'Inicio'}</span>
          </Link>
        )}
        {subModulesToDisplay.map((item, index) => renderSidebarItem(item, index))}
      </nav>
    </aside>
  );
};
