
import React, { createContext, useContext, useState, useMemo } from 'react';
import { AppModule } from '../types';

export interface AppContextType {
    currentModule: AppModule;
    setCurrentModule: (module: AppModule) => void;
}

export const AppContext = createContext<AppContextType | null>(null);

// Helper function to determine the initial module
export const getInitialAppModule = (): AppModule => {
    try {
        const storedModule = localStorage.getItem('pazziCurrentModule');
        if (storedModule) {
            const parsedModule = JSON.parse(storedModule) as AppModule;
            if (Object.values(AppModule).includes(parsedModule)) {
                return parsedModule;
            }
        }
    } catch (error) {
        console.error("Error parsing initial module from localStorage:", error);
    }
    return AppModule.PROJECT_MANAGEMENT; // Default module
};

export const AppContextProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [currentModule, setCurrentModuleState] = useState<AppModule>(getInitialAppModule);

  const setCurrentModule = (module: AppModule) => {
    setCurrentModuleState(module);
    localStorage.setItem('pazziCurrentModule', JSON.stringify(module));
  };
  const appContextValue = useMemo(() => ({ currentModule, setCurrentModule }), [currentModule]);

  return (
    <AppContext.Provider value={appContextValue}>
        {children}
    </AppContext.Provider>
  )
}


export const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error('useAppContext must be used within an AppContextProvider');
    return context;
};