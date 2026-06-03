import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, UserRole } from '../types';
import { authService, type InvitationInfo } from '../services/auth';
import { ApiError } from '../services/api';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: true } | { success: false; error: string; code?: string }>;
  register: (name: string, lastName: string, email: string, password: string, role: UserRole, extra?: { phone?: string; companyName?: string }) => Promise<{ success: true } | { success: false; error: string }>;
  logout: () => Promise<void>;
  getInvitation: (token: string) => Promise<InvitationInfo>;
  activate: (token: string, password: string) => Promise<{ success: true } | { success: false; error: string }>;
  updateUserPassword: (userId: string, currentPassword: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  toggleUserEmergencyOrderMode: (userId: string) => Promise<boolean>;
  updateUserAlertSettings: (userId: string, settings: Record<string, unknown>) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function persistSession(user: User, token: string, refreshToken: string) {
  localStorage.setItem('pazzi_token', token);
  localStorage.setItem('pazzi_refresh_token', refreshToken);
  localStorage.setItem('pazzi_user', JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem('pazzi_token');
  localStorage.removeItem('pazzi_refresh_token');
  localStorage.removeItem('pazzi_user');
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Verificación de sesión al cargar la app
  useEffect(() => {
    const verifySession = async () => {
      const token = localStorage.getItem('pazzi_token');
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const user = await authService.me();
        setCurrentUser(user);
        localStorage.setItem('pazzi_user', JSON.stringify(user));
      } catch (error) {
        // El refresh-token automático ya se intentó en services/api;
        // si llegamos aquí es porque tampoco se pudo refrescar.
        clearSession();
      } finally {
        setLoading(false);
      }
    };
    verifySession();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const { user, token, refreshToken } = await authService.login(email, password);
      persistSession(user, token, refreshToken);
      setCurrentUser(user);
      return { success: true as const };
    } catch (err) {
      if (err instanceof ApiError) {
        return { success: false as const, error: err.message, code: err.code };
      }
      return { success: false as const, error: 'Error de conexión con el servidor' };
    }
  }, []);

  const register = useCallback(async (
    name: string, lastName: string, email: string, password: string, role: UserRole,
    extra?: { phone?: string; companyName?: string }
  ) => {
    try {
      const { user, token, refreshToken } = await authService.register({
        email, password, name, lastName, role, ...extra,
      });
      persistSession(user, token, refreshToken);
      setCurrentUser(user);
      return { success: true as const };
    } catch (err) {
      if (err instanceof ApiError) {
        return { success: false as const, error: err.message };
      }
      return { success: false as const, error: 'Error de conexión con el servidor' };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // Ignorar errores de logout del server — limpiamos local de todas formas
    }
    clearSession();
    setCurrentUser(null);
  }, []);

  const getInvitation = useCallback((token: string) => authService.getInvitation(token), []);

  const activate = useCallback(async (token: string, password: string) => {
    try {
      const { user, token: accessToken, refreshToken } = await authService.activate(token, password);
      persistSession(user, accessToken, refreshToken);
      setCurrentUser(user);
      return { success: true as const };
    } catch (err) {
      if (err instanceof ApiError) {
        return { success: false as const, error: err.message };
      }
      return { success: false as const, error: 'Error de conexión con el servidor' };
    }
  }, []);

  const updateUserPassword = useCallback(async (_userId: string, currentPassword: string, newPassword: string) => {
    try {
      await authService.updatePassword(currentPassword, newPassword);
      return { success: true as const, message: 'Contraseña actualizada correctamente.' };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar contraseña';
      return { success: false as const, message: msg };
    }
  }, []);

  const toggleUserEmergencyOrderMode = useCallback(async (_userId: string) => {
    try {
      const user = await authService.toggleEmergencyOrder();
      setCurrentUser(user);
      localStorage.setItem('pazzi_user', JSON.stringify(user));
      return true;
    } catch {
      return false;
    }
  }, []);

  const updateUserAlertSettings = useCallback(async (_userId: string, settings: Record<string, unknown>) => {
    try {
      await authService.updateAlertSettings(settings);
      const updated = { ...currentUser!, alertSettings: settings } as User;
      setCurrentUser(updated);
      localStorage.setItem('pazzi_user', JSON.stringify(updated));
      return true;
    } catch {
      return false;
    }
  }, [currentUser]);

  return (
    <AuthContext.Provider value={{ currentUser, loading, login, register, logout, getInvitation, activate, updateUserPassword, toggleUserEmergencyOrderMode, updateUserAlertSettings }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de un AuthProvider');
  return context;
};
