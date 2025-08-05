

import React, { useState, useEffect, useContext } from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import { Navbar } from './Navbar'; // Adjusted path
import { Sidebar } from './Sidebar'; // Adjusted path
import { AppContext, useAppContext } from '../../contexts/AppContext'; // Adjusted path
import { AppModule } from '../../types'; // Adjusted path
import { APP_MODULES_CONFIG } from '../../constants'; // Adjusted path

export const MainLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const appContextValue = useAppContext(); 
  
  if (!appContextValue) {
      return <div>Error: AppContext not found.</div>; 
  }
  const { currentModule, setCurrentModule } = appContextValue;

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const currentPath = location.pathname;
    const matchedModule = APP_MODULES_CONFIG.find(m => currentPath.startsWith(m.path));
    
    if (matchedModule) {
        if (matchedModule.name !== currentModule) {
            setCurrentModule(matchedModule.name);
        }
    }
    // If no matchedModule (e.g. /settings), currentModule remains as is, which is fine.
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
  const isPOSCashierPage = location.pathname === '/pos/cashier';


  return (
    <div className="flex flex-col min-h-screen">
      {!isPOSCashierPage && <Navbar onToggleSidebar={toggleSidebar} currentModule={currentModule} setCurrentModule={setCurrentModule} />}
      <div className={`flex flex-1 ${!isPOSCashierPage ? 'pt-[65px]' : ''}`}>
        {!isPOSCashierPage && <Sidebar isOpen={sidebarOpen} currentModule={currentModule} setSidebarOpen={setSidebarOpen} />}
        <main className={`flex-1 bg-neutral-100 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 overflow-y-auto ${!isPOSCashierPage ? 'lg:ml-64' : ''} ${isPOSCashierPage ? '' : 'p-6'}`}>
          <Outlet /> 
        </main>
      </div>
    </div>
  );
};
