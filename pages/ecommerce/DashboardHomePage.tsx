
import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext, useAppContext } from '../contexts/AppContext'; // Adjusted path
import { AppModule } from '../types'; // Adjusted path
import { APP_MODULES_CONFIG } from '../constants'; // Adjusted path

export const DashboardHomePage: React.FC = () => {
    const appContextValue = useAppContext();
    const navigate = useNavigate();

    if (!appContextValue) return <div>Loading...</div>; 
    const { currentModule, setCurrentModule } = appContextValue;

    const handleModuleClick = (module: AppModule) => {
        setCurrentModule(module);
        const moduleConfig = APP_MODULES_CONFIG.find(m => m.name === module);
        if (moduleConfig) {
            let firstSubModulePath = '';
            if (module === AppModule.PROJECT_MANAGEMENT && moduleConfig.subModulesProject.length > 0) firstSubModulePath = moduleConfig.subModulesProject[0].path;
            else if (module === AppModule.POS && moduleConfig.subModulesPOS.length > 0) firstSubModulePath = moduleConfig.subModulesPOS[0].path;
            else if (module === AppModule.ECOMMERCE && moduleConfig.subModulesEcommerce.length > 0) firstSubModulePath = moduleConfig.subModulesEcommerce[0].path;
            
            if (firstSubModulePath) navigate(firstSubModulePath);
            else navigate(moduleConfig.path); 
        }
    };
    
    return (
        <div className="p-6">
            <h1 className="text-3xl font-semibold text-neutral-700 dark:text-neutral-200">Bienvenido al Dashboard de Pazzi</h1>
            <p className="mt-2 text-neutral-600 dark:text-neutral-300">Módulo actual: <span className="font-semibold text-primary">{currentModule}</span>. Selecciona una opción del menú lateral o cambia de módulo usando el selector en la barra de navegación.</p>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                {APP_MODULES_CONFIG.map(module => (
                    <button 
                        key={module.path} 
                        onClick={() => handleModuleClick(module.name)}
                        className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow-lg hover:shadow-xl dark:hover:shadow-primary/20 transition-shadow duration-300 text-left"
                    >
                        <h2 className="text-xl font-semibold text-primary mb-2">{module.name}</h2>
                        <p className="text-neutral-600 dark:text-neutral-300 text-sm">Accede a las herramientas de {module.name.toLowerCase()}.</p>
                    </button>
                ))}
            </div>
        </div>
    );
};
