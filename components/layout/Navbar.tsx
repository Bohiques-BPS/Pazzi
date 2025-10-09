import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext'; 
import { useData } from '../../contexts/DataContext'; // Added useData
import { AppModule, UserRole, Notification } from '../../types'; // Added Notification
import { APP_MODULES_CONFIG } from '../../constants'; 
// FIX: Corrected import path for icons from `../../components/icons` to `../icons` to match sibling components in the same directory.
import { MenuIcon, UserCircleIcon, ChevronDownIcon, Cog6ToothIcon, ArrowLeftOnRectangleIcon, ListBulletIcon, BuildingStorefrontIcon, CalendarDaysIcon, ChatBubbleLeftRightIcon, Squares2X2Icon, BellIcon, ShoppingCartIcon as OrderIcon } from '../icons'; // Added BellIcon, OrderIcon

interface NavbarProps {
    onToggleSidebar: () => void;
    currentModule: AppModule;
    setCurrentModule: (module: AppModule) => void;
}

const logoUrl = "https://picsum.photos/seed/pazziapplogo/120/40"; 

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


export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, currentModule, setCurrentModule }) => {
  const { currentUser, logout } = useAuth();
  const { notifications, markNotificationAsRead, getUnreadNotificationsCount, markAllNotificationsAsRead } = useData(); // Added notification context
  const navigate = useNavigate();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [moduleDropdownOpen, setModuleDropdownOpen] = useState(false);
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false); // State for notification dropdown
  
  const unreadCount = getUnreadNotificationsCount();
  const latestNotifications = notifications.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 7); // Show latest 7

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const availableModulesForSelector = APP_MODULES_CONFIG.filter(mod => {
    if (currentUser?.role === UserRole.MANAGER) {
      return mod.name !== AppModule.PROJECT_CLIENT_DASHBOARD; 
    }
    if (currentUser?.role === UserRole.EMPLOYEE) {
      return mod.name === AppModule.POS || mod.name === AppModule.PROJECT_MANAGEMENT;
    }
    return false; 
  });


  const getModuleBasePath = (moduleName: AppModule) => {
    const mod = APP_MODULES_CONFIG.find(m => m.name === moduleName);
    if (!mod) return '/';

    if (currentUser?.role === UserRole.EMPLOYEE) {
        if (moduleName === AppModule.POS) return '/pos/cashier';
        if (moduleName === AppModule.PROJECT_MANAGEMENT) return '/pm/projects';
    }
     if (currentUser?.role === UserRole.MANAGER && moduleName === AppModule.POS) {
        return '/pos/reports'; // Manager defaults to reports page for POS
    }
    
    if (moduleName === AppModule.PROJECT_MANAGEMENT && mod.subModulesProject && mod.subModulesProject.length > 0 && mod.subModulesProject[0].type === 'link') {
        return mod.subModulesProject[0].path;
    } else if (moduleName === AppModule.POS && mod.subModulesPOS && mod.subModulesPOS.length > 0) {
        const firstPosItem = mod.subModulesPOS[0];
        if (firstPosItem.type === 'link') return firstPosItem.path;
        if (firstPosItem.type === 'group' && firstPosItem.children.length > 0) return firstPosItem.children[0].path;
         return mod.path; // Fallback to base path if no direct sub-module link
    } else if (moduleName === AppModule.ECOMMERCE && mod.subModulesEcommerce && mod.subModulesEcommerce.length > 0 && mod.subModulesEcommerce[0].type === 'link') {
        return mod.subModulesEcommerce[0].path;
    }
    return mod.path;
  };

  const getLogoLink = () => {
    if (!currentUser) return "/";
    switch (currentUser.role) {
        case UserRole.CLIENT_ECOMMERCE: return "/store";
        case UserRole.CLIENT_PROJECT: return "/project-client/dashboard";
        default: return "/"; 
    }
  }

  const renderClientProjectNavLinks = () => (
    <>
        <Link to="/project-client/dashboard" className="text-slate-600 dark:text-slate-300 hover:text-primary px-3 py-2 rounded-md text-lg font-medium flex items-center"><BuildingStorefrontIcon className="w-6 h-6 text-slate-600 dark:text-slate-300 mr-1.5" /> Dashboard</Link>
        <Link to="/project-client/calendar" className="text-slate-600 dark:text-slate-300 hover:text-primary px-3 py-2 rounded-md text-lg font-medium flex items-center"><CalendarDaysIcon className="w-6 h-6 text-slate-600 dark:text-slate-300 mr-1.5" /> Calendario</Link>
        <Link to="/project-client/dashboard" className="text-slate-600 dark:text-slate-300 hover:text-primary px-3 py-2 rounded-md text-lg font-medium flex items-center"><ChatBubbleLeftRightIcon className="w-6 h-6 text-slate-600 dark:text-slate-300 mr-1.5" /> Mis Chats</Link>
    </>
  );

  const handleNotificationClick = (notification: Notification) => {
    markNotificationAsRead(notification.id);
    if (notification.link) {
        navigate(notification.link);
    }
    // Potentially close dropdown if not navigating, or if navigating within same page.
    // For now, it will stay open unless a navigation happens which re-renders navbar.
    // To ensure it closes, you might need: setNotificationDropdownOpen(false);
  };
  
  const moduleLabelColors: Record<AppModule, string> = {
    [AppModule.TIENDA]: 'bg-purple-500',
    [AppModule.PROJECT_MANAGEMENT]: 'bg-blue-500',
    [AppModule.POS]: 'bg-teal-500',
    [AppModule.ECOMMERCE]: 'bg-amber-500',
    [AppModule.ADMINISTRACION]: 'bg-slate-600',
    [AppModule.PROJECT_CLIENT_DASHBOARD]: 'bg-gray-500', // For completeness
  };
  const moduleLabelColorClass = moduleLabelColors[currentModule] || 'bg-gray-500'; // Fallback


  return (
    <nav className="bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 p-0 shadow-md fixed w-full z-20 top-0 border-b border-neutral-200 dark:border-neutral-700 h-[65px]">
      <div className="mx-auto flex items-center justify-between h-full px-4"> {/* Added px-4 here for overall padding */}
        <div className="flex items-center">
          {/* Mobile Sidebar Toggle (Manager/Employee on mobile) */}
          { currentUser && ![UserRole.CLIENT_ECOMMERCE, UserRole.CLIENT_PROJECT].includes(currentUser.role) && 
            <button onClick={onToggleSidebar} className="mr-2 p-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 lg:hidden">
              <MenuIcon className="w-6 h-6 text-slate-600 dark:text-slate-300" />
            </button>
          }
          
          {/* Module Selector (Desktop Icon / Mobile Text) - if available */}
          {availableModulesForSelector.length > 0 && ( 
            <div className="relative mr-3">
                {/* Mobile/Tablet: Text-based dropdown */}
                <button 
                    id="navbar-module-selector-button-mobile"
                    onClick={() => setModuleDropdownOpen(!moduleDropdownOpen)}
                    className="md:hidden px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-md flex items-center text-neutral-700 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-600 text-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                    aria-haspopup="true"
                    aria-expanded={moduleDropdownOpen}
                    aria-controls="module-menu"
                >
                    {currentModule} <ChevronDownIcon className="w-6 h-6 text-slate-600 dark:text-slate-300 ml-1" />
                </button>

                {/* Desktop: Icon-based dropdown */}
                <button
                    id="navbar-module-selector-button-desktop"
                    onClick={() => setModuleDropdownOpen(!moduleDropdownOpen)}
                    className="hidden md:flex items-center justify-center p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-md border border-neutral-300 dark:border-neutral-600 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    aria-label="Seleccionar módulo"
                    aria-haspopup="true"
                    aria-expanded={moduleDropdownOpen}
                    aria-controls="module-menu"
                >
                    <Squares2X2Icon className="w-6 h-6 text-slate-600 dark:text-slate-300" />
                </button>

                {/* Dropdown menu content (shared) */}
                {moduleDropdownOpen && (
                    <div 
                        id="module-menu" 
                        className="absolute mt-2 w-56 bg-white dark:bg-neutral-700 rounded-md shadow-lg py-1 z-30 border border-neutral-200 dark:border-neutral-600 left-0"
                    >
                        {availableModulesForSelector.map(mod => (
                            <button
                                key={mod.name}
                                onClick={() => {
                                    setCurrentModule(mod.name);
                                    setModuleDropdownOpen(false);
                                    navigate(getModuleBasePath(mod.name));
                                }}
                                className="block w-full text-left px-4 py-2 text-lg text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-600"
                                role="menuitem"
                            >
                                {mod.name}
                            </button>
                        ))}
                    </div>
                )}
            </div>
          )}

          {/* Logo */}
          <Link to={getLogoLink()} className="mr-3 flex-shrink-0">
            <img src={logoUrl} alt="Pazzi Logo" className="h-9" />
          </Link>

          {/* NEW: Module Label */}
          { currentUser && ![UserRole.CLIENT_ECOMMERCE, UserRole.CLIENT_PROJECT].includes(currentUser.role) &&
            <div className={`hidden md:flex items-center px-2.5 py-1 rounded-md text-base font-semibold text-white ${moduleLabelColorClass}`}>
                {currentModule}
            </div>
          }
          
          {/* Client Project Nav Links (Desktop) */}
          {currentUser?.role === UserRole.CLIENT_PROJECT && (
              <div className="hidden md:flex items-center space-x-1">
                  {renderClientProjectNavLinks()}
              </div>
          )}
        </div>

        {/* Right side of Navbar: Notifications & User Menu */}
        <div className="flex items-center space-x-2">
           {/* Notification Bell - Visible for logged-in users except e-commerce clients */}
           {currentUser && currentUser.role !== UserRole.CLIENT_ECOMMERCE && (
            <div className="relative">
                <button 
                    onClick={() => setNotificationDropdownOpen(!notificationDropdownOpen)} 
                    className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-full focus:outline-none focus:ring-2 focus:ring-primary/50"
                    aria-label="Notificaciones"
                    aria-haspopup="true"
                    aria-expanded={notificationDropdownOpen}
                    aria-controls="notification-menu"
                >
                    <BellIcon className="w-6 h-6 text-slate-600 dark:text-slate-300"/>
                    {unreadCount > 0 && (
                        <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-neutral-800 bg-red-500 animate-pulse"></span>
                    )}
                </button>
                {notificationDropdownOpen && (
                    <div id="notification-menu" className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-neutral-700 rounded-md shadow-xl py-1 z-30 border border-neutral-200 dark:border-neutral-600 max-h-[70vh] flex flex-col">
                        <div className="flex justify-between items-center px-4 py-2 border-b dark:border-neutral-600">
                            <h3 className="text-base font-semibold text-neutral-700 dark:text-neutral-200">Notificaciones</h3>
                            {unreadCount > 0 && (
                                <button 
                                    onClick={() => {markAllNotificationsAsRead(); /* setNotificationDropdownOpen(false); */}}
                                    className="text-sm text-primary hover:underline"
                                >
                                    Marcar todas como leídas
                                </button>
                            )}
                        </div>
                        <div className="overflow-y-auto flex-grow">
                            {latestNotifications.length > 0 ? latestNotifications.map(notification => (
                                <div
                                    key={notification.id}
                                    onClick={() => handleNotificationClick(notification)}
                                    className={`px-4 py-3 hover:bg-neutral-100 dark:hover:bg-neutral-600 cursor-pointer border-b dark:border-neutral-600/50 ${!notification.read ? 'bg-primary/5 dark:bg-primary/10' : ''}`}
                                    role="menuitem"
                                >
                                    <div className="flex items-start">
                                        {notification.icon && <span className="mr-3 mt-0.5 text-primary dark:text-accent">{notification.icon}</span>}
                                        <div className="flex-1">
                                            <p className={`text-base font-medium ${!notification.read ? 'text-primary dark:text-accent' : 'text-neutral-800 dark:text-neutral-100'}`}>{notification.title}</p>
                                            <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate max-w-xs">{notification.message}</p>
                                            <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-0.5">{formatRelativeTime(notification.timestamp)}</p>
                                        </div>
                                        {!notification.read && <span className="ml-2 mt-1 w-2 h-2 bg-primary dark:bg-accent rounded-full flex-shrink-0"></span>}
                                    </div>
                                </div>
                            )) : (
                                <p className="text-center text-base text-neutral-500 dark:text-neutral-400 py-6">No hay notificaciones nuevas.</p>
                            )}
                        </div>
                         {notifications.length > 0 && (
                             <div className="px-4 py-2 border-t dark:border-neutral-600 text-center">
                                {/* <Link to="/notifications" onClick={() => setNotificationDropdownOpen(false)} className="text-base text-primary hover:underline">Ver todas</Link> */}
                                <span className="text-sm text-neutral-400 dark:text-neutral-500">Mostrando últimas {latestNotifications.length}</span>
                            </div>
                         )}
                    </div>
                )}
            </div>
           )}

          {/* User Menu */}
          <div className="relative">
            <button onClick={() => setUserDropdownOpen(!userDropdownOpen)} className="flex items-center space-x-2 p-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary/50" aria-haspopup="true" aria-expanded={userDropdownOpen} aria-controls="user-menu">
                <UserCircleIcon className="w-6 h-6 text-slate-600 dark:text-slate-300" />
                <span className="hidden md:inline text-lg text-neutral-700 dark:text-neutral-200">{currentUser?.name || currentUser?.email}</span>
                <ChevronDownIcon className="w-6 h-6 text-slate-600 dark:text-slate-300" />
            </button>
            {userDropdownOpen && (
                <div id="user-menu" className="absolute right-0 mt-2 w-48 bg-white dark:bg-neutral-700 rounded-md shadow-lg py-1 z-30 border border-neutral-200 dark:border-neutral-600">
                {currentUser?.role === UserRole.CLIENT_ECOMMERCE && (
                    <Link 
                        to="/my-orders" 
                        onClick={() => setUserDropdownOpen(false)} 
                        className="flex items-center w-full text-left px-4 py-2 text-lg text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-600" 
                        role="menuitem"
                    >
                    <ListBulletIcon className="w-6 h-6 text-slate-600 dark:text-slate-300 mr-2" /> Mis Pedidos
                    </Link>
                )}
                <Link 
                    to="/settings" 
                    onClick={() => setUserDropdownOpen(false)} 
                    className="flex items-center w-full text-left px-4 py-2 text-lg text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-600" 
                    role="menuitem"
                >
                    <Cog6ToothIcon className="w-6 h-6 text-slate-600 dark:text-slate-300 mr-2" /> Mi Cuenta
                </Link>
                <button
                    onClick={() => {handleLogout(); setUserDropdownOpen(false);}}
                    className="flex items-center w-full text-left px-4 py-2 text-lg text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-600"
                    role="menuitem"
                >
                    <ArrowLeftOnRectangleIcon className="w-6 h-6 text-slate-600 dark:text-slate-300 mr-2" /> Cerrar Sesión
                </button>
            </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
