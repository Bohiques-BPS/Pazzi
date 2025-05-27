import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithAccessCode: (accessCode: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock data - would be replaced with actual API calls
const MOCK_ADMIN: User = {
  id: '1',
  name: 'Admin User',
  email: 'admin@admin.com',
  role: 'admin',
};

const MOCK_EMPLOYEE: User = {
  id: '2',
  name: 'John Doe',
  email: 'john@pazzi.com',
  role: 'employee',
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('pazzi_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock authentication logic
    if ((email === 'admin@admin.com' || email === 'admin') && password === 'admin') {
      setUser(MOCK_ADMIN);
      localStorage.setItem('pazzi_user', JSON.stringify(MOCK_ADMIN));
    } else {
      throw new Error('Invalid credentials');
    }
    
    setIsLoading(false);
  };

  const loginWithAccessCode = async (accessCode: string) => {
    setIsLoading(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock access code authentication
    if (accessCode === '123456') {
      setUser(MOCK_EMPLOYEE);
      localStorage.setItem('pazzi_user', JSON.stringify(MOCK_EMPLOYEE));
    } else {
      throw new Error('Invalid access code');
    }
    
    setIsLoading(false);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('pazzi_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        loginWithAccessCode,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};