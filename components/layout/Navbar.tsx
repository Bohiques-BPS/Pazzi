
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { useData } from '../../contexts/DataContext';
import { useModules } from '../../hooks/useModules';
import { useModuleAccess } from '../../hooks/useModuleAccess';
import { SidebarItemConfig } from '../../constants';
import { useTranslation, useGlobalSettings } from '../../contexts/GlobalSettingsContext'; // Import hook
import { AppModule, UserRole, Notification } from '../../types';
import { APP_MODULES_CONFIG } from '../../constants';
import { API_URL } from '../../services/api';
import { MenuIcon, UserCircleIcon, ChevronDownIcon, ChevronRightIcon, Cog6ToothIcon, ArrowLeftOnRectangleIcon, ListBulletIcon, BuildingStorefrontIcon, CalendarDaysIcon, ChatBubbleLeftRightIcon, Squares2X2Icon, BellIcon, ShoppingCartIcon as OrderIcon, WrenchScrewdriverIcon, ClockIcon, PlusIcon } from '../icons';
import { AddAccountModal } from '../AddAccountModal';
import { TimeClockModal } from '../TimeClockModal';
import { NavCommand } from './NavCommand';
import { JoinRequestDecisionModal, parseJoinRequestLink, type JoinRequestTarget } from '../pm/JoinRequestDecisionModal';
import { hubPath } from '../../utils/moduleNav';
import logo from '../../assets/logo.png';
import logoWhite from '../../assets/logo_white.png';
import { toast } from '../../hooks/useToast';

interface NavbarProps {
    onToggleSidebar: () => void;
    /** Colapsar/mostrar el sidebar en escritorio (persistido). */
    onToggleCollapse?: () => void;
    sidebarCollapsed?: boolean;
    currentModule: AppModule;
    setCurrentModule: (module: AppModule) => void;
}

// Helper to format time relatively (simplified)
const formatRelativeTime = (isoTimestamp: string) => {
    const now = new Date();
    const past = new Date(isoTimestamp);
    const diffInSeconds = Math.round((now.getTime() - past.getTime()) / 1000);

    const minutes = Math.round(diffInSeconds / 60);
    const hours = Math.round(minutes / 60);
    const days = Math.round(hours / 24);

    if (minutes < 1) return 'Ahora';
    if (minutes < 60) return `Hace ${minutes} min`;
    if (hours < 24) return `Hace ${hours}h`;
    if (days === 1) return 'Ayer';
    return `Hace ${days} días`;
};


/** Ícono del botón que oculta/muestra el sidebar: un panel con chevron que apunta
 *  a la derecha cuando está oculto (mostrar) y a la izquierda cuando está visible (ocultar). */
const SidebarToggleIcon: React.FC<{ collapsed?: boolean; className?: string }> = ({ collapsed, className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <line x1="9" y1="4" x2="9" y2="20" />
    {collapsed
      ? <polyline points="13,9 16,12 13,15" />
      : <polyline points="16,9 13,12 16,15" />}
  </svg>
);

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, onToggleCollapse, sidebarCollapsed, currentModule, setCurrentModule }) => {
  const { currentUser, logout, accounts, activeAccountId, switchAccount } = useAuth();
  const { canAny } = usePermissions();
  const { notifications, markNotificationAsRead, getUnreadNotificationsCount, markAllNotificationsAsRead } = useData();
  const { isModuleEnabled } = useModules();
  const { canAccessModule } = useModuleAccess();
  const { t } = useTranslation(); // Use hook
  const { settings } = useGlobalSettings();
  const navigate = useNavigate();

  // Selector de módulo que aparece EN EL NAVBAR solo cuando el sidebar está colapsado
  // (el logo y el selector normalmente viven arriba del sidebar).
  const [moduleMenuOpen, setModuleMenuOpen] = useState(false);
  const availableModules = APP_MODULES_CONFIG.filter(m => canAccessModule(m.name as AppModule));
  const pickModule = (m: AppModule) => { setCurrentModule(m); setModuleMenuOpen(false); navigate(hubPath(m)); };

  // Logo del negocio (arriba a la derecha). Fuente: GlobalSettings.receiptConfig.
  const rc = settings.receiptConfig || ({} as any);
  const rawLogo: string = rc.logoUrl || '';
  const businessLogoSrc = rawLogo
    ? (rawLogo.startsWith('http') || rawLogo.startsWith('data:')
        ? rawLogo
        : `${API_URL.replace('/api', '')}${rawLogo.startsWith('/') ? '' : '/'}${rawLogo}`)
    : '';
  const businessName: string = rc.businessName || '';
  const showBusinessLogo = !!businessLogoSrc
    && currentUser
    && ![UserRole.CLIENT_ECOMMERCE, UserRole.CLIENT_PROJECT].includes(currentUser.role);
  // Avatar del botón de cuenta: foto propia si la tiene; si no (p. ej. el gerente), el logo del negocio.
  const avatarSrc: string = (currentUser as any)?.profilePictureUrl || (showBusinessLogo ? businessLogoSrc : '');
  const [avatarFailed, setAvatarFailed] = useState(false);
  useEffect(() => { setAvatarFailed(false); }, [avatarSrc]);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);
  const [joinRequestTarget, setJoinRequestTarget] = useState<JoinRequestTarget | null>(null);
  // Modal de ponche de asistencia (4 fases del día).
  const [punchModalOpen, setPunchModalOpen] = useState(false);

  // Cerrar los dropdowns al hacer clic fuera de su contenedor.
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (notifRef.current && !notifRef.current.contains(target)) setNotificationDropdownOpen(false);
      if (userRef.current && !userRef.current.contains(target)) setUserDropdownOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);
  
  const unreadCount = getUnreadNotificationsCount();
  const latestNotifications = notifications.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 7); 

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Misma regla que el Home y las rutas (hooks/useModuleAccess): apagado → nadie; gerente → todos;
  // colaborador → si tiene al menos un permiso de alguno de los enlaces del módulo.


  const getModuleBasePath = (moduleName: AppModule) => {
    const mod = APP_MODULES_CONFIG.find(m => m.name === moduleName);
    if (!mod) return '/';

    if (currentUser?.role === UserRole.EMPLOYEE) {
        // Ir al PRIMER enlace del módulo que el empleado tenga permiso de ver.
        const lists: SidebarItemConfig[] = [
          ...((mod as any).subModulesTienda || []),
          ...(mod.subModulesProject || []),
          ...(mod.subModulesPOS || []),
          ...(mod.subModulesEcommerce || []),
          ...((mod as any).subModulesLeads || []),
        ];
        for (const item of lists) {
          const links = item.type === 'group' ? item.children : [item];
          for (const l of links) {
            const p = (l as any).permission;
            const allowed = !p || canAny(...(Array.isArray(p) ? p : [p]));
            if (allowed) return l.path;
          }
        }
        return mod.path;
    }
     if (currentUser?.role === UserRole.MANAGER && moduleName === AppModule.POS) {
        return '/pos/reports'; 
    }
    
    if (moduleName === AppModule.PROJECT_MANAGEMENT && mod.subModulesProject && mod.subModulesProject.length > 0 && mod.subModulesProject[0].type === 'link') {
        return mod.subModulesProject[0].path;
    } else if (moduleName === AppModule.POS && mod.subModulesPOS && mod.subModulesPOS.length > 0) {
        const firstPosItem = mod.subModulesPOS[0];
        if (firstPosItem.type === 'link') return firstPosItem.path;
        if (firstPosItem.type === 'group' && firstPosItem.children.length > 0) return firstPosItem.children[0].path;
         return mod.path; 
    } else if (moduleName === AppModule.ECOMMERCE && mod.subModulesEcommerce && mod.subModulesEcommerce.length > 0 && mod.subModulesEcommerce[0].type === 'link') {
        return mod.subModulesEcommerce[0].path;
    }
    return mod.path;
  };

  const renderClientProjectNavLinks = () => (
    <>
        <Link to="/project-client/dashboard" className="text-slate-600 dark:text-slate-300 hover:text-primary px-3 py-2 rounded-md text-lg font-medium flex items-center"><BuildingStorefrontIcon className="w-6 h-6 text-slate-600 dark:text-slate-300 mr-1.5" /> {t('cmp.navbar.dashboard')}</Link>
        <Link to="/project-client/calendar" className="text-slate-600 dark:text-slate-300 hover:text-primary px-3 py-2 rounded-md text-lg font-medium flex items-center"><CalendarDaysIcon className="w-6 h-6 text-slate-600 dark:text-slate-300 mr-1.5" /> {t('cmp.navbar.calendar')}</Link>
        <Link to="/project-client/dashboard" className="text-slate-600 dark:text-slate-300 hover:text-primary px-3 py-2 rounded-md text-lg font-medium flex items-center"><ChatBubbleLeftRightIcon className="w-6 h-6 text-slate-600 dark:text-slate-300 mr-1.5" /> {t('cmp.navbar.my_chats')}</Link>
    </>
  );

  const handleNotificationClick = (notification: Notification) => {
    markNotificationAsRead(notification.id);
    setNotificationDropdownOpen(false);
    // Solicitud para unirse a un proyecto → modal para decidir ahí mismo (sin salir de la pantalla).
    const jr = parseJoinRequestLink(notification.link, notification.message);
    if (jr) { setJoinRequestTarget(jr); return; }
    if (notification.link) {
        // Compat: enlaces viejos con '#/...' (hash) → ruta limpia para BrowserRouter.
        let to = notification.link.startsWith('#') ? notification.link.slice(1) : notification.link;
        // Si es una notificación de factura sin id en el enlace (notificaciones antiguas),
        // deducimos el número de factura del mensaje ("Factura #83 …") para abrir su detalle.
        if (to.startsWith('/pos/invoices') && !/[?&]invoice=/.test(to)) {
            const m = /#(\d+)/.exec(notification.message || '');
            if (m) to += (to.includes('?') ? '&' : '?') + 'invoiceNo=' + m[1];
        }
        if (to.startsWith('/pos')) setCurrentModule(AppModule.POS);
        navigate(to);
    }
  };
  
  return (
    <nav className={`bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 p-0 shadow-md fixed right-0 top-0 z-20 border-b border-neutral-200 dark:border-neutral-700 h-[65px] transition-[left] duration-200 ease-in-out left-0 ${sidebarCollapsed ? '' : 'lg:left-72'}`}>
      <div className="mx-auto flex items-center justify-between h-full px-2 sm:px-4"> 
        <div className="flex items-center">
          {/* Mobile Sidebar Toggle (drawer) */}
          { currentUser && ![UserRole.CLIENT_ECOMMERCE, UserRole.CLIENT_PROJECT].includes(currentUser.role) &&
            <button onClick={onToggleSidebar} className="mr-1 sm:mr-2 p-1.5 sm:p-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 lg:hidden" aria-label={t('cmp.navbar.toggle_menu') || 'Menú'}>
              <MenuIcon className="w-5 h-5 sm:w-6 sm:h-6 text-slate-600 dark:text-slate-300" />
            </button>
          }
          {/* Desktop: ocultar/mostrar el sidebar (se recuerda). Ícono distinto según el estado + animación. */}
          { currentUser && onToggleCollapse && ![UserRole.CLIENT_ECOMMERCE, UserRole.CLIENT_PROJECT].includes(currentUser.role) &&
            <button
              onClick={onToggleCollapse}
              className="mr-1 sm:mr-2 p-1.5 sm:p-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 hidden lg:inline-flex transition-transform duration-150 active:scale-90 hover:text-primary"
              aria-label={sidebarCollapsed ? (t('cmp.navbar.show_menu') || 'Mostrar menú') : (t('cmp.navbar.hide_menu') || 'Ocultar menú')}
              title={sidebarCollapsed ? (t('cmp.navbar.show_menu') || 'Mostrar menú') : (t('cmp.navbar.hide_menu') || 'Ocultar menú')}
            >
              <SidebarToggleIcon collapsed={sidebarCollapsed} className="w-5 h-5 sm:w-6 sm:h-6 text-slate-600 dark:text-slate-300 transition-colors" />
            </button>
          }

          {/* Con el sidebar COLAPSADO: el logo y el selector de módulos aparecen aquí, en el navbar. */}
          { sidebarCollapsed && currentUser && ![UserRole.CLIENT_ECOMMERCE, UserRole.CLIENT_PROJECT].includes(currentUser.role) && (
            <div className="flex items-center gap-2 ml-1">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setModuleMenuOpen(o => !o)}
                  className="flex items-center justify-center p-2 rounded-md border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                  aria-haspopup="true"
                  aria-expanded={moduleMenuOpen}
                  aria-label={t('cmp.navbar.select_module') || 'Seleccionar módulo'}
                  title={t('cmp.navbar.select_module') || 'Seleccionar módulo'}
                >
                  <Squares2X2Icon className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                </button>
                {moduleMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setModuleMenuOpen(false)} />
                    <div className="absolute left-0 mt-2 z-20 w-56 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg py-1 max-h-72 overflow-y-auto">
                      {availableModules.map(mod => (
                        <button
                          key={mod.name}
                          type="button"
                          onClick={() => pickModule(mod.name as AppModule)}
                          className={`block w-full text-left px-3 py-2 text-sm transition-colors ${mod.name === currentModule ? 'bg-primary/10 text-primary dark:text-teal-300 font-medium' : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}
                        >
                          {t(`module.${mod.name}`)}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <Link to="/" className="flex items-center flex-shrink-0">
                <img src={logo}      alt="Pazzi" className="h-7 sm:h-8 dark:hidden" />
                <img src={logoWhite} alt="Pazzi" className="h-7 sm:h-8 hidden dark:block" />
              </Link>
            </div>
          )}

          {/* Client Project Nav Links */}
          {currentUser?.role === UserRole.CLIENT_PROJECT && (
              <div className="hidden md:flex items-center space-x-1">
                  {renderClientProjectNavLinks()}
              </div>
          )}
        </div>

        {/* Right side: buscador + creación rápida + Notifications & User Menu */}
        <div className="flex items-center space-x-1 sm:space-x-2">
           {/* Buscador global + "+ Nuevo" (solo staff) */}
           <NavCommand setCurrentModule={setCurrentModule} />
           {/* Ponche rápido (Entrada/Salida) — solo staff */}
           {currentUser && currentUser.role === UserRole.EMPLOYEE && (
             <button
                onClick={() => setPunchModalOpen(true)}
                className="flex items-center gap-1.5 px-2 py-1.5 sm:px-2.5 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-full focus:outline-none focus:ring-2 focus:ring-primary/50"
                aria-label={t('cmp.navbar.punch')}
                title={t('cmp.navbar.punch')}
             >
                <ClockIcon className="w-5 h-5 sm:w-6 sm:h-6 text-slate-600 dark:text-slate-300" />
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{t('cmp.navbar.punch_label') || 'Ponche'}</span>
             </button>
           )}
           {/* El engranaje de configuración rápida se movió al menú de la cuenta (dropdown). */}
           {/* Notification Bell */}
           {currentUser && currentUser.role !== UserRole.CLIENT_ECOMMERCE && (
            <div className="relative" ref={notifRef}>
                <button
                    onClick={() => setNotificationDropdownOpen(!notificationDropdownOpen)}
                    className="p-1.5 sm:p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-full focus:outline-none focus:ring-2 focus:ring-primary/50"
                    aria-label={t('cmp.navbar.notifications')}
                    aria-haspopup="true"
                    aria-expanded={notificationDropdownOpen}
                    aria-controls="notification-menu"
                >
                    <BellIcon className="w-5 h-5 sm:w-6 sm:h-6 text-slate-600 dark:text-slate-300"/>
                    {unreadCount > 0 && (
                        <span className="absolute top-0 right-0 block h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full ring-2 ring-white dark:ring-neutral-800 bg-red-500 animate-pulse"></span>
                    )}
                </button>
                {notificationDropdownOpen && (
                    <div id="notification-menu" className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-neutral-700 rounded-md shadow-xl py-1 z-30 border border-neutral-200 dark:border-neutral-600 max-h-[70vh] flex flex-col">
                        <div className="flex justify-between items-center px-4 py-2 border-b dark:border-neutral-600">
                            <h3 className="text-base font-semibold text-neutral-700 dark:text-neutral-200">{t('cmp.navbar.notifications')}</h3>
                            {unreadCount > 0 && (
                                <button
                                    onClick={() => {markAllNotificationsAsRead(); }}
                                    className="text-sm text-primary hover:underline"
                                >
                                    {t('cmp.navbar.mark_all_read')}
                                </button>
                            )}
                        </div>
                        <div className="overflow-y-auto flex-grow">
                            {latestNotifications.length > 0 ? latestNotifications.map(notification => {
                                const IconComponent = notification.icon;
                                return (
                                <div
                                    key={notification.id}
                                    onClick={() => handleNotificationClick(notification)}
                                    className={`px-4 py-3 hover:bg-neutral-100 dark:hover:bg-neutral-600 cursor-pointer border-b dark:border-neutral-600/50 ${!notification.read ? 'bg-primary/5 dark:bg-primary/10' : ''}`}
                                    role="menuitem"
                                >
                                    <div className="flex items-start">
                                        {IconComponent && <span className="mr-3 mt-0.5 text-primary dark:text-accent"><IconComponent className="w-4 h-4" /></span>}
                                        <div className="flex-1">
                                            <p className={`text-base font-medium ${!notification.read ? 'text-primary dark:text-accent' : 'text-neutral-800 dark:text-neutral-100'}`}>{notification.title}</p>
                                            <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate max-w-xs">{notification.message}</p>
                                            <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-0.5">{formatRelativeTime(notification.timestamp)}</p>
                                        </div>
                                        {!notification.read && <span className="ml-2 mt-1 w-2 h-2 bg-primary dark:bg-accent rounded-full flex-shrink-0"></span>}
                                    </div>
                                </div>
                            )}) : (
                                <p className="text-center text-base text-neutral-500 dark:text-neutral-400 py-6">{t('cmp.navbar.no_notifications')}</p>
                            )}
                        </div>
                         <div className="px-2 py-2 border-t dark:border-neutral-600">
                            <button
                                type="button"
                                onClick={() => { setNotificationDropdownOpen(false); navigate('/notifications'); }}
                                className="w-full text-center text-sm font-medium text-primary dark:text-accent hover:bg-primary/10 dark:hover:bg-primary/20 rounded-md py-2"
                            >
                                {t('cmp.navbar.view_all_notifications') || 'Ver todas las notificaciones'}
                            </button>
                         </div>
                    </div>
                )}
            </div>
           )}

          {/* User Menu */}
          <div className="relative" ref={userRef}>
            <button onClick={() => setUserDropdownOpen(!userDropdownOpen)} className="flex items-center space-x-1 sm:space-x-2 p-1.5 sm:p-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary/50" aria-haspopup="true" aria-expanded={userDropdownOpen} aria-controls="user-menu">
                {/* Foto propia si la tiene; si no (p. ej. el gerente, que no puede subir una), el logo del negocio. */}
                {avatarSrc && !avatarFailed
                    ? <img src={avatarSrc} alt={businessName || 'Logo'} title={businessName || undefined} onError={() => setAvatarFailed(true)} className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-contain bg-white border border-neutral-200 dark:border-neutral-600" />
                    : <UserCircleIcon className="w-5 h-5 sm:w-6 sm:h-6 text-slate-600 dark:text-slate-300" />}
                <span className="hidden md:inline text-sm sm:text-base text-neutral-700 dark:text-neutral-200">{currentUser?.name || currentUser?.email}</span>
                <ChevronDownIcon className="w-4 h-4 sm:w-6 sm:h-6 text-slate-600 dark:text-slate-300" />
            </button>
            {userDropdownOpen && (
                <div id="user-menu" className="absolute right-0 mt-2 w-64 bg-white dark:bg-neutral-700 rounded-md shadow-lg py-1 z-30 border border-neutral-200 dark:border-neutral-600">
                {/* Multi-cuenta: cuentas conectadas en este dispositivo + cambiar/agregar. */}
                {accounts.length > 0 && (
                    <div className="border-b border-neutral-200 dark:border-neutral-600 pb-1 mb-1">
                        <p className="px-4 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-400">Cuentas</p>
                        {accounts.map(acc => {
                            const active = acc.id === activeAccountId;
                            return (
                                <button
                                    key={acc.id}
                                    onClick={() => { if (!active) switchAccount(acc.id); setUserDropdownOpen(false); }}
                                    className={`flex items-center gap-2 w-full text-left px-4 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-600 ${active ? 'bg-primary/5' : ''}`}
                                    role="menuitem"
                                    title={active ? 'Cuenta activa' : 'Cambiar a esta cuenta'}
                                >
                                    {(acc.profilePictureUrl || (active && showBusinessLogo ? businessLogoSrc : ''))
                                        ? <img src={acc.profilePictureUrl || businessLogoSrc} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" referrerPolicy="no-referrer" />
                                        : <span className="w-7 h-7 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">{(acc.name || acc.email || '?').charAt(0).toUpperCase()}</span>}
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate">{`${acc.name || ''} ${acc.lastName || ''}`.trim() || acc.email}</span>
                                        <span className="block text-xs text-neutral-500 dark:text-neutral-400 truncate">{acc.email}</span>
                                    </span>
                                    {active && <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" title="Activa" />}
                                </button>
                            );
                        })}
                        <button
                            onClick={() => { setShowAddAccount(true); setUserDropdownOpen(false); }}
                            className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-primary hover:bg-neutral-100 dark:hover:bg-neutral-600"
                            role="menuitem"
                        >
                            <PlusIcon className="w-5 h-5" /> Agregar otra cuenta
                        </button>
                    </div>
                )}
                {currentUser?.role === UserRole.CLIENT_ECOMMERCE && (
                    <Link 
                        to="/my-orders" 
                        onClick={() => setUserDropdownOpen(false)} 
                        className="flex items-center w-full text-left px-4 py-2 text-lg text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-600" 
                        role="menuitem"
                    >
                    <ListBulletIcon className="w-6 h-6 text-slate-600 dark:text-slate-300 mr-2" /> {t('nav.my_orders')}
                    </Link>
                )}
                <Link 
                    to="/settings" 
                    onClick={() => setUserDropdownOpen(false)} 
                    className="flex items-center w-full text-left px-4 py-2 text-lg text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-600" 
                    role="menuitem"
                >
                    <Cog6ToothIcon className="w-6 h-6 text-slate-600 dark:text-slate-300 mr-2" /> {t('nav.my_account')}
                </Link>
                <Link 
                    to="/configuration"
                    onClick={() => setUserDropdownOpen(false)}
                    className="flex items-center w-full text-left px-4 py-2 text-lg text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-600"
                    role="menuitem"
                >
                    <WrenchScrewdriverIcon className="w-6 h-6 text-slate-600 dark:text-slate-300 mr-2" /> {t('nav.configuration')}
                </Link>
                <Link
                    to="/profile"
                    onClick={() => setUserDropdownOpen(false)}
                    className="flex items-center w-full text-left px-4 py-2 text-lg text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-600"
                    role="menuitem"
                >
                    <UserCircleIcon className="w-6 h-6 text-slate-600 dark:text-slate-300 mr-2" /> {t('nav.profile') || 'Mi perfil'}
                </Link>
                {/* Tema e idioma viven en la página /configuration (enlace "Configuración" de arriba). */}
                <button
                    onClick={() => {handleLogout(); setUserDropdownOpen(false);}}
                    className="flex items-center w-full text-left px-4 py-2 text-lg text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-600"
                    role="menuitem"
                >
                    <ArrowLeftOnRectangleIcon className="w-6 h-6 text-slate-600 dark:text-slate-300 mr-2" /> {t('nav.logout')}
                </button>
            </div>
            )}
          </div>
        </div>
      </div>
      <AddAccountModal isOpen={showAddAccount} onClose={() => setShowAddAccount(false)} />
      <TimeClockModal isOpen={punchModalOpen} onClose={() => setPunchModalOpen(false)} />
      <JoinRequestDecisionModal target={joinRequestTarget} onClose={() => setJoinRequestTarget(null)} />
    </nav>
  );
};
