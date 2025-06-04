
import React, { useState, createContext, useContext, useEffect, useCallback } from 'react';
import { ECommerceSettings, UserRole } from '../types';
import { DEFAULT_ECOMMERCE_SETTINGS, ADMIN_USER_ID, ECOMMERCE_CLIENT_ID } from '../constants'; // Changed PREDEFINED_CLIENT_ID to ECOMMERCE_CLIENT_ID
import { useAuth } from './AuthContext';

export interface ECommerceSettingsContextType {
  getSettingsForClient: (clientId: string) => ECommerceSettings;
  updateSettingsForClient: (clientId: string, newSettings: Partial<ECommerceSettings>) => void;
  getDefaultSettings: () => ECommerceSettings; // For admin page to edit defaults
  updateDefaultSettings: (newDefaultSettings: Partial<ECommerceSettings>) => void; // For admin page
}

export const ECommerceSettingsContext = createContext<ECommerceSettingsContextType | null>(null);

const DEFAULT_SETTINGS_KEY = "pazziDefaultEcommerceSettings";

export const ECommerceSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [allClientSettings, setAllClientSettings] = useState<{ [clientId: string]: ECommerceSettings }>(() => {
        const storedSettings = localStorage.getItem('pazziAllClientEcommerceSettings');
        if (storedSettings) {
            return JSON.parse(storedSettings);
        }
        // Initialize with default settings for admin and predefined client for demo purposes
        return {
            [DEFAULT_SETTINGS_KEY]: { ...DEFAULT_ECOMMERCE_SETTINGS, storeName: "Pazzi Tienda Por Defecto" },
            [ADMIN_USER_ID]: { ...DEFAULT_ECOMMERCE_SETTINGS, storeName: "Tienda Oficial Pazzi Admin", logoUrl: "https://picsum.photos/seed/pazziadminlogo/150/50", primaryColor: "#D97706" },
            [ECOMMERCE_CLIENT_ID]: { ...DEFAULT_ECOMMERCE_SETTINGS, storeName: "Ferretería Cliente Demo", logoUrl: "https://picsum.photos/seed/clientdemologo/150/50", primaryColor: "#2563EB" }, // Changed PREDEFINED_CLIENT_ID to ECOMMERCE_CLIENT_ID
        };
    });

    useEffect(() => {
        localStorage.setItem('pazziAllClientEcommerceSettings', JSON.stringify(allClientSettings));
    }, [allClientSettings]);

    const getDefaultSettings = useCallback((): ECommerceSettings => {
        return allClientSettings[DEFAULT_SETTINGS_KEY] || DEFAULT_ECOMMERCE_SETTINGS;
    }, [allClientSettings]);

    const updateDefaultSettings = useCallback((newDefaultSettings: Partial<ECommerceSettings>) => {
        setAllClientSettings(prev => ({
            ...prev,
            [DEFAULT_SETTINGS_KEY]: { ...(prev[DEFAULT_SETTINGS_KEY] || DEFAULT_ECOMMERCE_SETTINGS), ...newDefaultSettings }
        }));
    }, []);

    const getSettingsForClient = useCallback((clientId: string): ECommerceSettings => {
        return allClientSettings[clientId] || getDefaultSettings();
    }, [allClientSettings, getDefaultSettings]);

    const updateSettingsForClient = useCallback((clientId: string, newSettings: Partial<ECommerceSettings>) => {
        setAllClientSettings(prev => ({
            ...prev,
            [clientId]: { ...(prev[clientId] || getDefaultSettings()), ...newSettings }
        }));
    }, [getDefaultSettings]);


    return (
        <ECommerceSettingsContext.Provider value={{ getSettingsForClient, updateSettingsForClient, getDefaultSettings, updateDefaultSettings }}>
            {children}
        </ECommerceSettingsContext.Provider>
    );
};

export const useECommerceSettings = () => {
    const context = useContext(ECommerceSettingsContext);
    if (!context) throw new Error('useECommerceSettings must be used within an ECommerceSettingsProvider');
    return context;
};
