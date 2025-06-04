
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AppModule, UserRole } from '../../types'; 
import { APP_MODULES_CONFIG, SidebarItemConfig } from '../../constants'; 
import { useAuth } from '../../contexts/AuthContext'; 
import { ChevronDownIcon, BriefcaseIcon, ChatBubbleLeftRightIcon, CashBillIcon, CalendarDaysIcon, BuildingStorefrontIcon } from '../icons'; 

interface SidebarProps {
    isOpen: boolean;
    currentModule: AppModule; // currentModule might be less relevant for clients with fixed dashboards
    setSidebarOpen: (isOpen: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, currentModule, setSidebarOpen }) => {
  const location = useLocation();
  const { currentUser } = useAuth();
  const moduleConfig = APP_MODULES_CONFIG.find(m => m.name === currentModule);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  let subModulesToDisplay: SidebarItemConfig[] = []; 

  if (currentUser?.role === UserRole.EMPLOYEE) {
    if (currentModule === AppModule.POS) {
        subModulesToDisplay = [
            { type: 'link', name: 'Caja Registradora', path: '/pos/cashier', icon: React.createElement(CashBillIcon, null) }
        ];
    } else if (currentModule === AppModule.PROJECT_MANAGEMENT) {
        subModulesToDisplay = [
            { type: 'link', name: 'Mis Proyectos', path: '/pm/projects', icon: React.createElement(BriefcaseIcon, { className: "w-6 h-6" }) }, // Ensure icon size consistent
            { type: 'link', name: 'Chat de Proyectos', path: '/pm/chat', icon: React.createElement(ChatBubbleLeftRightIcon, null) }
        ];
    }
  } else if (currentUser?.role === UserRole.CLIENT_PROJECT) {
    const projectClientModule = APP_MODULES_CONFIG.find(m => m.name === AppModule.PROJECT_CLIENT_DASHBOARD);
    subModulesToDisplay = projectClientModule?.subModulesProjectClient || [];
  }
   else if (currentUser?.role === UserRole.MANAGER && moduleConfig) { 
    if (currentModule === AppModule.PROJECT_MANAGEMENT) subModulesToDisplay = moduleConfig.subModulesProject || [];
    else if (currentModule === AppModule.POS) subModulesToDisplay = moduleConfig.subModulesPOS || [];
    else if (currentModule === AppModule.ECOMMERCE) subModulesToDisplay = moduleConfig.subModulesEcommerce || [];
  }


  const handleLinkClick = () => {
    if (isOpen && window.innerWidth < 1024) { 
      setSidebarOpen(false);
    }
  };

  const toggleGroup = (groupName: string) => {
    setOpenGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  // No sidebar for E-commerce client
  if (currentUser?.role === UserRole.CLIENT_ECOMMERCE) { 
      return null; 
  }
  
  if (subModulesToDisplay.length === 0 && currentUser?.role !== UserRole.CLIENT_PROJECT) { // Don't show "No options" for client project if config is simply missing for a moment
      return (
        <aside className={`bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 w-64 space-y-1 py-7 px-2 fixed inset-y-0 left-0 top-[65px] transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-200 ease-in-out z-10 shadow-lg border-r border-neutral-200 dark:border-neutral-700`}>
            <p className="px-4 py-2 text-base text-neutral-500 dark:text-neutral-400">No hay opciones disponibles.</p>
        </aside>
      );
  }


  const renderSidebarItem = (item: SidebarItemConfig, index: number) => {
    if (item.type === 'group') {
      const isGroupOpen = openGroups[item.name] || item.children.some(child => location.pathname.startsWith(child.path)); // Auto-open if child is active
      return (
        <div key={`${item.name}-${index}`}>
          <button
            onClick={() => toggleGroup(item.name)}
            className={`flex items-center justify-between w-full py-2.5 px-4 rounded-md transition duration-200 text-neutral-600 dark:text-neutral-300 hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 dark:hover:text-white focus:outline-none text-base`} 
            aria-expanded={isGroupOpen}
            aria-controls={`group-content-${item.name}`}
          >
            <div className="flex items-center">
              {item.icon && <span className="mr-3">{item.icon}</span>}
              {item.name}
            </div>
            <ChevronDownIcon className={`w-5 h-5 transition-transform duration-200 ${isGroupOpen ? 'transform rotate-180' : ''}`} /> {/* Group chevron can be smaller */}
          </button>
          <div 
            id={`group-content-${item.name}`}
            className={`overflow-hidden transition-all duration-300 ease-in-out ${isGroupOpen ? 'max-h-screen' : 'max-h-0'}`}
          >
            <div className="pt-1 pl-4"> 
              {item.children.map((child, childIndex) => renderSidebarItem(child, childIndex))}
            </div>
          </div>
        </div>
      );
    }
    // item.type === 'link'
    let isActive = location.pathname === item.path;
    // Special handling for Project Client Dashboard to also highlight for /project-client/chat/*
    if (currentUser?.role === UserRole.CLIENT_PROJECT && item.path === '/project-client/dashboard' && location.pathname.startsWith('/project-client/chat')) {
        isActive = true;
    }


    return (
      <Link
        key={item.path}
        to={item.path}
        onClick={handleLinkClick}
        className={`flex items-center py-2.5 px-4 rounded-md transition duration-200 text-base ${isActive ? 'bg-primary text-white font-medium' : 'text-neutral-600 dark:text-neutral-300 hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 dark:hover:text-white'}`}
      >
        {item.icon && <span className="mr-3 w-6 h-6 flex items-center justify-center">{item.icon}</span>} {/* Ensure icon container respects size */}
        {item.name}
      </Link>
    );
  };

  return (
    <aside className={`bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 w-64 space-y-1 py-7 px-2 fixed inset-y-0 left-0 top-[65px] transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-200 ease-in-out z-10 shadow-lg border-r border-neutral-200 dark:border-neutral-700`}>
      <nav className="mt-4">
        {subModulesToDisplay.map((item, index) => renderSidebarItem(item, index))}
      </nav>
    </aside>
  );
};
