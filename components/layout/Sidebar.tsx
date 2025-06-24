
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AppModule, UserRole } from '../../types'; 
import { APP_MODULES_CONFIG, SidebarItemConfig, SubModuleGroup, SubModuleLink } from '../../constants'; 
import { useAuth } from '../../contexts/AuthContext'; 
import { ChevronDownIcon, BriefcaseIcon, ChatBubbleLeftRightIcon, CashBillIcon, BuildingStorefrontIcon as StoreIcon, Squares2X2Icon, ListBulletIcon, UserGroupIcon, UsersIcon } from '../icons'; 

interface SidebarProps {
    isOpen: boolean;
    currentModule: AppModule; 
    setSidebarOpen: (isOpen: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, currentModule, setSidebarOpen }) => {
  const location = useLocation();
  const { currentUser } = useAuth();
  const moduleConfig = APP_MODULES_CONFIG.find(m => m.name === currentModule);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({}); // Initialize as empty to start all groups closed

  let subModulesToDisplay: SidebarItemConfig[] = []; 

  if (currentUser?.role === UserRole.MANAGER) {
    const tiendaSubLinks: SubModuleLink[] = [
        { type: 'link', name: 'Productos Globales', path: '/pm/products', icon: React.createElement(Squares2X2Icon, { className: "w-5 h-5" }) },
        { type: 'link', name: 'Categorías Globales', path: '/pm/categories', icon: React.createElement(ListBulletIcon, { className: "w-5 h-5" }) },
        { type: 'link', name: 'Clientes Globales', path: '/pm/clients', icon: React.createElement(UserGroupIcon, { className: "w-5 h-5" }) },
        { type: 'link', name: 'Colaboradores', path: '/pm/employees', icon: React.createElement(UsersIcon, { className: "w-5 h-5" }) },
    ];
    
    const tiendaGroup: SubModuleGroup = {
        type: 'group',
        name: 'Tienda',
        icon: React.createElement(StoreIcon, { className: "w-6 h-6" }),
        children: tiendaSubLinks
    };
    
    let moduleSpecificLinks: SidebarItemConfig[] = [];
    if (moduleConfig) {
        if (currentModule === AppModule.PROJECT_MANAGEMENT && moduleConfig.subModulesProject) moduleSpecificLinks = moduleConfig.subModulesProject;
        else if (currentModule === AppModule.POS && moduleConfig.subModulesPOS) moduleSpecificLinks = moduleConfig.subModulesPOS;
        else if (currentModule === AppModule.ECOMMERCE && moduleConfig.subModulesEcommerce) moduleSpecificLinks = moduleConfig.subModulesEcommerce;
    }
    
    subModulesToDisplay = [tiendaGroup, ...moduleSpecificLinks];

  } else if (currentUser?.role === UserRole.EMPLOYEE) {
    if (currentModule === AppModule.POS) {
        subModulesToDisplay = [
            { type: 'link', name: 'Caja Registradora', path: '/pos/cashier', icon: React.createElement(CashBillIcon, { className: "w-6 h-6" }) }
        ];
    } else if (currentModule === AppModule.PROJECT_MANAGEMENT) {
        subModulesToDisplay = [
            { type: 'link', name: 'Mis Proyectos', path: '/pm/projects', icon: React.createElement(BriefcaseIcon, { className: "w-6 h-6" }) },
            { type: 'link', name: 'Chat de Proyectos', path: '/pm/chat', icon: React.createElement(ChatBubbleLeftRightIcon, { className: "w-6 h-6" }) }
        ];
    }
  } else if (currentUser?.role === UserRole.CLIENT_PROJECT) {
    const projectClientModule = APP_MODULES_CONFIG.find(m => m.name === AppModule.PROJECT_CLIENT_DASHBOARD);
    subModulesToDisplay = projectClientModule?.subModulesProjectClient || [];
  }


  const handleLinkClick = () => {
    if (isOpen && window.innerWidth < 1024) { 
      setSidebarOpen(false);
    }
  };

  const toggleGroup = (groupName: string) => {
    setOpenGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  if (currentUser?.role === UserRole.CLIENT_ECOMMERCE) { 
      return null; 
  }
  
  if (subModulesToDisplay.length === 0 && currentUser?.role !== UserRole.CLIENT_PROJECT) {
      return (
        <aside className={`bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 w-64 space-y-1 py-7 px-2 fixed inset-y-0 left-0 top-[65px] transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-200 ease-in-out z-10 shadow-lg border-r border-neutral-200 dark:border-neutral-700`}>
            <p className="px-2 py-2 text-base text-neutral-500 dark:text-neutral-400">No hay opciones disponibles.</p>
        </aside>
      );
  }


  const renderSidebarItem = (item: SidebarItemConfig, index: number) => {
    if (item.type === 'group') {
      const isGroupOpen = openGroups[item.name] || false; // Default to closed if not in openGroups map
      
      return (
        <div key={`${item.name}-${index}`}>
          <button
            onClick={() => toggleGroup(item.name)}
            className={`flex items-center justify-between w-full py-2 px-2 rounded-md transition duration-200 text-neutral-600 dark:text-neutral-300 hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 dark:hover:text-white focus:outline-none text-base`} 
            aria-expanded={isGroupOpen}
            aria-controls={`group-content-${item.name}`}
          >
            <div className="flex items-center">
              {item.icon && <span className="mr-3">{item.icon}</span>}
              {item.name}
            </div>
            <ChevronDownIcon className={`w-5 h-5 transition-transform duration-200 ${isGroupOpen ? 'transform rotate-180' : ''}`} />
          </button>
          <div 
            id={`group-content-${item.name}`}
            className={`overflow-hidden transition-all duration-300 ease-in-out ${isGroupOpen ? 'max-h-screen' : 'max-h-0'}`}
          >
            <div className="pt-1 pl-3"> {/* Reduced pl for nested items */}
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
        className={`flex items-center py-2 px-2 rounded-md transition duration-200 text-base ${isActive ? 'bg-primary text-white font-medium' : 'text-neutral-600 dark:text-neutral-300 hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 dark:hover:text-white'}`}
      >
        {item.icon && <span className="mr-3 w-6 h-6 flex items-center justify-center">{item.icon}</span>}
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