
import React, { useState, createContext, useContext, useEffect } from 'react';
import { Theme } from '../types';

export interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}
export const ThemeContext = createContext<ThemeContextType | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [theme, setThemeState] = useState<Theme>(() => {
        const storedTheme = localStorage.getItem('pazziTheme') as Theme | null;
        return storedTheme || Theme.LIGHT;
    });

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
        localStorage.setItem('pazziTheme', newTheme);
    };

    useEffect(() => {
        const root = window.document.documentElement;
        if (theme === Theme.DARK) {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) throw new Error('useTheme must be used within a ThemeProvider');
    return context;
};