
import React, { useState, createContext, useContext, useEffect } from 'react';
import { User, UserRole } from '../types';
import { DEFAULT_USERS, ADMIN_EMAIL, ADMIN_PASSWORD } from '../constants';

export interface AuthContextType {
  currentUser: User | null;
  login: (email: string, pass: string) => Promise<boolean>;
  register: (name: string, lastName: string, email: string, pass: string, role: UserRole) => Promise<boolean>;
  logout: () => void;
  allUsers: (User & { password?: string })[];
  updateUserPassword: (userId: string, currentPasswordPlain: string, newPasswordPlain: string) => Promise<{success: boolean, message: string}>;
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
    let determinedRole: UserRole | null = null;

    const existingUser = allUsers.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === pass);
    if (existingUser) {
        userToLogin = existingUser;
        determinedRole = existingUser.role;
    } else if (email.toLowerCase() === ADMIN_EMAIL && pass === ADMIN_PASSWORD) { 
        determinedRole = UserRole.MANAGER;
        userToLogin = { id: 'admin-user', email: ADMIN_EMAIL, role: determinedRole, name: 'Admin', lastName: 'Pazzi' };
    } 

    if (userToLogin && determinedRole) {
        // Ensure roles like CLIENT_ECOMMERCE and CLIENT_PROJECT are correctly set
        if (determinedRole === UserRole.CLIENT_ECOMMERCE || determinedRole === UserRole.CLIENT_PROJECT || determinedRole === UserRole.EMPLOYEE || determinedRole === UserRole.MANAGER) {
            setCurrentUser({ ...userToLogin, role: determinedRole }); 
            return true;
        } else {
            // Handle potential old "CLIENT" role or other invalid roles if necessary
            // For now, we assume roles are one of the above valid ones.
             alert('Rol de usuario no reconocido.');
             return false;
        }
    }
    
    alert('Credenciales incorrectas.');
    return false;
  };

  const register = async (name: string, lastName: string, email: string, pass: string, role: UserRole): Promise<boolean> => {
    if (allUsers.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      alert('El email ya está registrado.');
      return false;
    }
    // Ensure only valid assignable roles can be registered
    if (![UserRole.CLIENT_ECOMMERCE, UserRole.CLIENT_PROJECT, UserRole.MANAGER, UserRole.EMPLOYEE].includes(role)) {
        alert('Tipo de cuenta inválido para registro.');
        return false;
    }
    const newUser: User & {password: string} = { id: `user-${Date.now()}`, email, name, lastName, role, password: pass };
    setAllUsers(prev => [...prev, newUser]);
    alert('Registro exitoso. Por favor, inicie sesión.');
    return true;
  };

  const logout = () => {
    setCurrentUser(null);
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
        setCurrentUser(prev => prev ? { ...prev, password: newPasswordPlain } : null);
    }
    
    return { success: true, message: "Contraseña actualizada correctamente." };
  };


  return (
    <AuthContext.Provider value={{ currentUser, login, register, logout, allUsers, updateUserPassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
