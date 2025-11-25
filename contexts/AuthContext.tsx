

import React, { useState, createContext, useContext, useEffect } from 'react';
import { User, UserRole, EmployeePermissions, AlertSettings } from '../types';
import { DEFAULT_USERS, ADMIN_EMAIL, ADMIN_PASSWORD } from '../constants';

export interface AuthContextType {
  currentUser: User | null;
  login: (email: string, pass: string) => Promise<boolean>;
  loginWithPin: (userId: string, pin: string) => Promise<boolean>;
  register: (name: string, lastName: string, email: string, pass: string, role: UserRole, options?: { profilePictureUrl?: string; permissions?: EmployeePermissions }) => Promise<boolean>;
  logout: () => void;
  allUsers: (User & { password?: string })[];
  updateUserPassword: (userId: string, currentPasswordPlain: string, newPasswordPlain: string) => Promise<{success: boolean, message: string}>;
  toggleUserEmergencyOrderMode: (userId: string) => Promise<boolean>; 
  updateUserAlertSettings: (userId: string, newSettings: AlertSettings) => Promise<boolean>;
  updateUser: (userId: string, updates: Partial<User & { password?: string; pin?: string }>) => Promise<boolean>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem('pazziCurrentUser');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [allUsers, setAllUsers] = useState<(User & { password?: string })[]>(() => { 
     const storedUsers = localStorage.getItem('pazziAllUsers');
     return storedUsers ? JSON.parse(storedUsers) : [...DEFAULT_USERS];
  });

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('pazziCurrentUser', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('pazziCurrentUser');
    }
  }, [currentUser]);
  
  useEffect(() => {
    localStorage.setItem('pazziAllUsers', JSON.stringify(allUsers));
  }, [allUsers]);


  const login = async (email: string, pass: string): Promise<boolean> => {
    let userToLogin: User | null = null;

    const existingUser = allUsers.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === pass);
    if (existingUser) {
        userToLogin = existingUser;
    }

    if (userToLogin) {
        setCurrentUser(userToLogin);
        return true;
    }
    
    alert('Credenciales incorrectas.');
    return false;
  };

  const loginWithPin = async (userId: string, pin: string): Promise<boolean> => {
    const userToLogin = allUsers.find(u => u.id === userId);
    if (userToLogin && userToLogin.pin === pin) {
        setCurrentUser(userToLogin);
        return true;
    }
    return false;
  };

  const register = async (name: string, lastName: string, email: string, pass: string, role: UserRole, options?: { profilePictureUrl?: string; permissions?: EmployeePermissions }): Promise<boolean> => {
    if (allUsers.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      alert('El email ya está registrado.');
      return false;
    }
    // Ensure only valid assignable roles can be registered
    if (![UserRole.CLIENT_ECOMMERCE, UserRole.CLIENT_PROJECT, UserRole.MANAGER, UserRole.EMPLOYEE].includes(role)) {
        alert('Tipo de cuenta inválido para registro.');
        return false;
    }
    const newUser: User & {password: string} = { 
        id: `user-${Date.now()}`, 
        email, 
        name, 
        lastName, 
        role, 
        password: pass, 
        isEmergencyOrderActive: false, // Default for new users
        profilePictureUrl: options?.profilePictureUrl || '',
        permissions: options?.permissions,
    };
    setAllUsers(prev => [...prev, newUser]);
    alert('Registro exitoso. Por favor, inicie sesión.');
    return true;
  };

  const logout = () => {
    setCurrentUser(null);
  };
  
  const updateUser = async (userId: string, updates: Partial<User & { password?: string }>): Promise<boolean> => {
    const userIndex = allUsers.findIndex(u => u.id === userId);
    if (userIndex === -1) {
        console.error("User not found for update");
        return false;
    }

    const updatedUsers = [...allUsers];
    updatedUsers[userIndex] = { ...updatedUsers[userIndex], ...updates };
    setAllUsers(updatedUsers);
    
    if (currentUser && currentUser.id === userId) {
        setCurrentUser(prev => prev ? { ...prev, ...updates } : null);
    }
    return true;
  };

  const updateUserPassword = async (userId: string, currentPasswordPlain: string, newPasswordPlain: string): Promise<{success: boolean, message: string}> => {
    const userIndex = allUsers.findIndex(u => u.id === userId);
    if (userIndex === -1) {
        return { success: false, message: "Usuario no encontrado." };
    }
    const userToUpdate = allUsers[userIndex];
    if (userToUpdate.password !== currentPasswordPlain) {
        return { success: false, message: "La contraseña actual es incorrecta." };
    }
    
    const updatedUsers = [...allUsers];
    updatedUsers[userIndex] = { ...userToUpdate, password: newPasswordPlain };
    setAllUsers(updatedUsers);
    
    if (currentUser && currentUser.id === userId) {
        setCurrentUser(prev => prev ? { ...prev } : null); // Password isn't stored in currentUser directly for display
    }
    
    return { success: true, message: "Contraseña actualizada correctamente." };
  };

  const toggleUserEmergencyOrderMode = async (userId: string): Promise<boolean> => {
    const userIndex = allUsers.findIndex(u => u.id === userId);
    if (userIndex === -1) {
        console.error("User not found for emergency mode toggle");
        return false;
    }
    
    const updatedUsers = [...allUsers];
    const currentEmergencyStatus = updatedUsers[userIndex].isEmergencyOrderActive || false;
    updatedUsers[userIndex] = { ...updatedUsers[userIndex], isEmergencyOrderActive: !currentEmergencyStatus };
    setAllUsers(updatedUsers);
    
    if (currentUser && currentUser.id === userId) {
        setCurrentUser(prev => prev ? { ...prev, isEmergencyOrderActive: !currentEmergencyStatus } : null);
    }
    return true;
  };

  const updateUserAlertSettings = async (userId: string, newSettings: AlertSettings): Promise<boolean> => {
    const userIndex = allUsers.findIndex(u => u.id === userId);
    if (userIndex === -1) {
        console.error("User not found for updating alert settings");
        return false;
    }
    
    const updatedUsers = [...allUsers];
    updatedUsers[userIndex] = { ...updatedUsers[userIndex], alertSettings: newSettings };
    setAllUsers(updatedUsers);
    
    if (currentUser && currentUser.id === userId) {
        setCurrentUser(prev => prev ? { ...prev, alertSettings: newSettings } : null);
    }
    return true;
  };


  return (
    <AuthContext.Provider value={{ currentUser, login, register, logout, allUsers, updateUserPassword, toggleUserEmergencyOrderMode, updateUserAlertSettings, loginWithPin, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};