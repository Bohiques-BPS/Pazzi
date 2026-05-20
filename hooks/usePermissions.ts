import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';

/**
 * Hook de evaluación de permisos en el FE.
 *
 * - MANAGER → `can(...)` siempre true.
 * - EMPLOYEE → consulta `currentUser.permissions`.
 * - CLIENT_* → siempre false (sus accesos van por rutas dedicadas).
 *
 * Uso:
 *   const { can } = usePermissions();
 *   {can('products.delete') && <DeleteButton />}
 *
 * Nota: esto es UX (esconder botones). La seguridad real está en el backend
 * (middleware `requirePermission`). Nunca confíes solo en `can()` para
 * decisiones sensibles.
 */
export function usePermissions() {
  const { currentUser } = useAuth();

  return useMemo(() => {
    const isManager = currentUser?.role === UserRole.MANAGER;
    const isEmployee = currentUser?.role === UserRole.EMPLOYEE;
    const perms = currentUser?.permissions || {};

    const can = (key: string): boolean => {
      if (!currentUser) return false;
      if (isManager) return true;
      if (!isEmployee) return false;
      return perms[key] === true;
    };

    /** True si tiene AL MENOS uno de los permisos. */
    const canAny = (...keys: string[]): boolean => keys.some(can);
    /** True si tiene TODOS los permisos. */
    const canAll = (...keys: string[]): boolean => keys.every(can);

    return {
      can,
      canAny,
      canAll,
      isManager,
      isEmployee,
      role: currentUser?.role,
    };
  }, [currentUser]);
}
