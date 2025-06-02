
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AppModule, UserRole } from '../../types'; 
import { APP_MODULES_CONFIG, SidebarItemConfig, SubModuleLink } from '../../constants'; 
import { useAuth } from '../../contexts/AuthContext'; 
import { ChevronDownIcon } from '../icons';

interface SidebarProps {
    isOpen: boolean;
    currentModule: AppModule;
    setSidebarOpen: (isOpen: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, currentModule, setSidebarOpen }) => {
  const location = useLocation();
  const { currentUser } = useAuth();
  const moduleConfig = APP_MODULES_CONFIG.find(m => m.name === currentModule);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  let subModulesToDisplay: SidebarItemConfig[] = []; 

  if (currentUser?.role === UserRole.EMPLOYEE) {
    if (currentModule === AppModule.POS && moduleConfig) {
        const cashierSubModule = moduleConfig.subModulesPOS.find(sm => sm.type === 'link' && sm.path === '/pos/cashier') as SubModuleLink | undefined;
        if (cashierSubModule) {
            subModulesToDisplay = [cashierSubModule];
        }
    }
  } else if (moduleConfig) { 
    if (currentModule === AppModule.PROJECT_MANAGEMENT) subModulesToDisplay = moduleConfig.subModulesProject;
    else if (currentModule === AppModule.POS) subModulesToDisplay = moduleConfig.subModulesPOS;
    else if (currentModule === AppModule.ECOMMERCE) subModulesToDisplay = moduleConfig.subModulesEcommerce;
  }

  const handleLinkClick = () => {
    if (isOpen && window.innerWidth < 1024) { 
      setSidebarOpen(false);
    }
  };

  const toggleGroup = (groupName: string) => {
    setOpenGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  if (currentUser?.role === UserRole.EMPLOYEE && currentModule !== AppModule.POS) {
      return null; 
  }
  if (currentUser?.role === UserRole.EMPLOYEE && subModulesToDisplay.length === 0) {
      return null; 
  }

  const renderSidebarItem = (item: SidebarItemConfig, index: number) => {
    if (item.type === 'group') {
      const isGroupOpen = openGroups[item.name] || false;
      return (
        <div key={`${item.name}-${index}`}>
          <button
            onClick={() => toggleGroup(item.name)}
            className={`flex items-center justify-between w-full py-2.5 px-4 rounded-md transition duration-200 text-neutral-600 dark:text-neutral-300 hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 dark:hover:text-white focus:outline-none`}
            aria-expanded={isGroupOpen}
            aria-controls={`group-content-${item.name}`}
          >
            <div className="flex items-center">
              {item.icon && <span className="mr-3">{item.icon}</span>}
              {item.name}
            </div>
            <ChevronDownIcon className={`w-4 h-4 transition-transform duration-200 ${isGroupOpen ? 'transform rotate-180' : ''}`} />
          </button>
          <div 
            id={`group-content-${item.name}`}
            className={`overflow-hidden transition-all duration-300 ease-in-out ${isGroupOpen ? 'max-h-screen' : 'max-h-0'}`}
          >
            <div className="pt-1 pl-4"> {/* Indentation for group children */}
              {item.children.map((child, childIndex) => renderSidebarItem(child, childIndex))}
            </div>
          </div>
        </div>
      );
    }
    // item.type === 'link'
    return (
      <Link
        key={item.path}
        to={item.path}
        onClick={handleLinkClick}
        className={`flex items-center py-2 px-3 rounded-md transition duration-200 text-sm ${location.pathname.startsWith(item.path) ? 'bg-primary text-white font-medium' : 'text-neutral-600 dark:text-neutral-300 hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 dark:hover:text-white'}`}
      >
        {item.icon && <span className="mr-2.5 w-5 h-5 flex items-center justify-center">{item.icon}</span>}
        {item.name}
      </Link>
    );
  };

  return (
    <aside className={`bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 w-64 space-y-1 py-7 px-2 fixed inset-y-0 left-0 top-[64px] transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-200 ease-in-out z-10 shadow-lg border-r border-neutral-200 dark:border-neutral-700`}>
      <nav className="mt-4">
        {subModulesToDisplay.map((item, index) => renderSidebarItem(item, index))}
      </nav>
    </aside>
  );
};
