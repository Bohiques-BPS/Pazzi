import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, UserRole } from '../types';
import { authService, type InvitationInfo } from '../services/auth';
import { ApiError } from '../services/api';
import { listAccounts, upsertAccount, removeAccount, activateAccount, activeAccountId, type AccountInfo } from '../utils/accounts';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: true } | { success: false; error: string; code?: string }>;
  register: (name: string, lastName: string, email: string, password: string, role: UserRole, extra?: { phone?: string; companyName?: string }) => Promise<{ success: true } | { success: false; error: string }>;
  logout: () => Promise<void>;
  getInvitation: (token: string) => Promise<InvitationInfo>;
  activate: (token: string, password: string, pin?: string) => Promise<{ success: true } | { success: false; error: string }>;
  updateUserPassword: (userId: string, currentPassword: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  updateUserEmail: (currentPassword: string, newEmail: string) => Promise<{ success: boolean; message: string }>;
  toggleUserEmergencyOrderMode: (userId: string) => Promise<boolean>;
  updateUserAlertSettings: (userId: string, settings: Record<string, unknown>) => Promise<boolean>;
  // Multi-cuenta (estilo Google): cuentas conectadas en este dispositivo + cambiar/agregar.
  accounts: AccountInfo[];
  activeAccountId: string | null;
  /** Conecta OTRA cuenta sin cerrar la actual y cambia a ella (recarga la app). */
  addAccount: (email: string, password: string) => Promise<{ success: true } | { success: false; error: string; code?: string }>;
  /** Cambia a una cuenta ya conectada (recarga la app). */
  switchAccount: (userId: string) => void;
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
  const [accounts, setAccounts] = useState<AccountInfo[]>(listAccounts());
  const refreshAccounts = useCallback(() => setAccounts(listAccounts()), []);

  // Verificación de sesión al cargar la app
  useEffect(() => {
    const verifySession = async () => {
      const token = localStorage.getItem('pazzi_token');
      const refreshToken = localStorage.getItem('pazzi_refresh_token');
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const user = await authService.me();
        setCurrentUser(user);
        localStorage.setItem('pazzi_user', JSON.stringify(user));
        // Asegura que la sesión activa esté en la lista multi-cuenta.
        if (refreshToken) upsertAccount(user, localStorage.getItem('pazzi_token') || token, refreshToken);
        refreshAccounts();
      } catch (error) {
        // El refresh-token automático ya se intentó en services/api;
        // si llegamos aquí es porque tampoco se pudo refrescar.
        clearSession();
      } finally {
        setLoading(false);
      }
    };
    verifySession();
  }, [refreshAccounts]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const { user, token, refreshToken } = await authService.login(email, password);
      persistSession(user, token, refreshToken);
      upsertAccount(user, token, refreshToken);
      setCurrentUser(user);
      refreshAccounts();
      return { success: true as const };
    } catch (err) {
      if (err instanceof ApiError) {
        return { success: false as const, error: err.message, code: err.code };
      }
      return { success: false as const, error: 'Error de conexión con el servidor' };
    }
  }, [refreshAccounts]);

  /**
   * Conecta OTRA cuenta sin cerrar la sesión actual: hace login, la guarda en la lista,
   * la deja activa y recarga la app para reinicializar todos los contextos con el nuevo usuario.
   */
  const addAccount = useCallback(async (email: string, password: string) => {
    try {
      const { user, token, refreshToken } = await authService.login(email, password);
      upsertAccount(user, token, refreshToken);
      // Activar la nueva cuenta y recargar limpio.
      persistSession(user, token, refreshToken);
      window.location.href = '/';
      return { success: true as const };
    } catch (err) {
      if (err instanceof ApiError) {
        return { success: false as const, error: err.message, code: err.code };
      }
      return { success: false as const, error: 'Error de conexión con el servidor' };
    }
  }, []);

  /** Cambia a una cuenta ya conectada y recarga la app. */
  const switchAccount = useCallback((userId: string) => {
    if (userId === activeAccountId()) return;
    if (activateAccount(userId)) {
      window.location.href = '/';
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
    // Multi-cuenta: quitar SOLO la cuenta activa; si queda otra conectada, cambiar a ella.
    const activeId = activeAccountId();
    const next = activeId ? removeAccount(activeId) : null;
    if (next && activateAccount(next.id)) {
      window.location.href = '/';
      return;
    }
    clearSession();
    setCurrentUser(null);
    refreshAccounts();
  }, [refreshAccounts]);

  const getInvitation = useCallback((token: string) => authService.getInvitation(token), []);

  const activate = useCallback(async (token: string, password: string, pin?: string) => {
    try {
      const { user, token: accessToken, refreshToken } = await authService.activate(token, password, pin);
      persistSession(user, accessToken, refreshToken);
      upsertAccount(user, accessToken, refreshToken);
      setCurrentUser(user);
      refreshAccounts();
      return { success: true as const };
    } catch (err) {
      if (err instanceof ApiError) {
        return { success: false as const, error: err.message };
      }
      return { success: false as const, error: 'Error de conexión con el servidor' };
    }
  }, [refreshAccounts]);

  const updateUserPassword = useCallback(async (_userId: string, currentPassword: string, newPassword: string) => {
    try {
      await authService.updatePassword(currentPassword, newPassword);
      return { success: true as const, message: 'Contraseña actualizada correctamente.' };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar contraseña';
      return { success: false as const, message: msg };
    }
  }, []);

  const updateUserEmail = useCallback(async (currentPassword: string, newEmail: string) => {
    try {
      const user = await authService.updateEmail(currentPassword, newEmail);
      setCurrentUser(user);
      localStorage.setItem('pazzi_user', JSON.stringify(user));
      return { success: true as const, message: 'Correo actualizado correctamente.' };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar el correo';
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
    <AuthContext.Provider value={{ currentUser, loading, login, register, logout, getInvitation, activate, updateUserPassword, updateUserEmail, toggleUserEmergencyOrderMode, updateUserAlertSettings, accounts, activeAccountId: activeAccountId(), addAccount, switchAccount }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de un AuthProvider');
  return context;
};
