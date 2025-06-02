
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext'; // Adjusted path
import { AppModule, UserRole } from '../../types';
import { APP_MODULES_CONFIG } from '../../constants'; // Adjusted path
import { MenuIcon, UserCircleIcon, ChevronDownIcon, Cog6ToothIcon, ArrowLeftOnRectangleIcon, ListBulletIcon } from '../icons'; // Adjusted path, Added Cog6ToothIcon, ArrowLeftOnRectangleIcon, ListBulletIcon

interface NavbarProps {
    onToggleSidebar: () => void;
    currentModule: AppModule;
    setCurrentModule: (module: AppModule) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, currentModule, setCurrentModule }) => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [moduleDropdownOpen, setModuleDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const availableModules = currentUser?.role === UserRole.EMPLOYEE 
    ? APP_MODULES_CONFIG.filter(mod => mod.name === AppModule.POS)
    : APP_MODULES_CONFIG;

  return (
    <nav className="bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 p-4 shadow-md fixed w-full z-20 top-0 border-b border-neutral-200 dark:border-neutral-700">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center">
          { currentUser?.role !== UserRole.CLIENT && /* Hide sidebar toggle for shopper client */
            <button onClick={onToggleSidebar} className="mr-3 p-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 lg:hidden text-neutral-600 dark:text-neutral-300">
              <MenuIcon />
            </button>
          }
          <Link to={currentUser?.role === UserRole.CLIENT ? "/store" : "/"} className="text-2xl font-bold text-primary mr-4">Pazzi</Link>
          
          {currentUser?.role !== UserRole.EMPLOYEE && currentUser?.role !== UserRole.CLIENT && availableModules.length > 1 && (
            <div className="relative">
                <button 
                    onClick={() => setModuleDropdownOpen(!moduleDropdownOpen)}
                    className="px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-md flex items-center text-neutral-700 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-600 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    aria-haspopup="true"
                    aria-expanded={moduleDropdownOpen}
                    aria-controls="module-menu"
                >
                    {currentModule} <ChevronDownIcon />
                </button>
                {moduleDropdownOpen && (
                    <div id="module-menu" className="absolute mt-2 w-56 bg-white dark:bg-neutral-700 rounded-md shadow-lg py-1 z-30 border border-neutral-200 dark:border-neutral-600 left-0">
                        {availableModules.map(mod => (
                            <button
                                key={mod.name}
                                onClick={() => {
                                    setCurrentModule(mod.name);
                                    setModuleDropdownOpen(false);
                                    let basePath = mod.path;
                                    if (mod.name === AppModule.PROJECT_MANAGEMENT && mod.subModulesProject.length > 0 && mod.subModulesProject[0].type === 'link') {
                                        basePath = mod.subModulesProject[0].path;
                                    } else if (mod.name === AppModule.POS && mod.subModulesPOS.length > 0 && mod.subModulesPOS[0].type === 'link') {
                                        basePath = mod.subModulesPOS[0].path;
                                    } else if (mod.name === AppModule.ECOMMERCE && mod.subModulesEcommerce.length > 0 && mod.subModulesEcommerce[0].type === 'link') {
                                        basePath = mod.subModulesEcommerce[0].path;
                                    }
                                    navigate(basePath);
                                }}
                                className="block w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-600"
                                role="menuitem"
                            >
                                {mod.name}
                            </button>
                        ))}
                    </div>
                )}
            </div>
          )}
           {currentUser?.role === UserRole.EMPLOYEE && (
             <span className="px-3 py-1.5 text-neutral-700 dark:text-neutral-200 text-sm font-medium">{AppModule.POS}</span>
           )}
           {/* For CLIENT role, no module selector, they are in "store" context */}
        </div>

        <div className="relative">
          <button onClick={() => setUserDropdownOpen(!userDropdownOpen)} className="flex items-center space-x-2 p-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary/50" aria-haspopup="true" aria-expanded={userDropdownOpen} aria-controls="user-menu">
            <UserCircleIcon />
            <span className="hidden md:inline">{currentUser?.name || currentUser?.email}</span>
            <ChevronDownIcon />
          </button>
          {userDropdownOpen && (
            <div id="user-menu" className="absolute right-0 mt-2 w-48 bg-white dark:bg-neutral-700 rounded-md shadow-lg py-1 z-30 border border-neutral-200 dark:border-neutral-600">
              {currentUser?.role === UserRole.CLIENT && (
                <Link 
                    to="/my-orders" 
                    onClick={() => setUserDropdownOpen(false)} 
                    className="flex items-center w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-600" 
                    role="menuitem"
                >
                  <ListBulletIcon className="w-4 h-4 mr-2" /> Mis Pedidos
                </Link>
              )}
              {currentUser?.role !== UserRole.CLIENT && ( // Settings for Manager and Employee
                <Link 
                    to="/settings" 
                    onClick={() => setUserDropdownOpen(false)} 
                    className="flex items-center w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-600" 
                    role="menuitem"
                >
                  <Cog6ToothIcon className="w-4 h-4 mr-2" /> Configuración
                </Link>
              )}
               {/* All roles can see a settings link for password/theme */}
              {(currentUser?.role === UserRole.CLIENT) && ( 
                <Link 
                    to="/settings" 
                    onClick={() => setUserDropdownOpen(false)} 
                    className="flex items-center w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-600" 
                    role="menuitem"
                >
                  <Cog6ToothIcon className="w-4 h-4 mr-2" /> Mi Cuenta
                </Link>
              )}
              <button 
                onClick={() => {handleLogout(); setUserDropdownOpen(false);}} 
                className="flex items-center w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-600" 
                role="menuitem"
              >
                <ArrowLeftOnRectangleIcon className="w-4 h-4 mr-2" /> Cerrar Sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};
