import { useCallback } from 'react';
import { APP_MODULES_CONFIG, SidebarItemConfig } from '../constants';
import { AppModule, UserRole } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from './usePermissions';
import { useModules } from './useModules';

/** Enlaces (aplanando grupos) de las listas de un módulo que cuentan para el acceso de un colaborador. */
export function moduleLinks(mod: any): SidebarItemConfig[] {
  const lists: SidebarItemConfig[] = [
    ...(mod?.subModulesTienda || []),
    ...(mod?.subModulesProject || []),
    ...(mod?.subModulesPOS || []),
    ...(mod?.subModulesEcommerce || []),
    ...(mod?.subModulesLeads || []),
  ];
  const out: any[] = [];
  for (const item of lists) {
    if (item.type === 'group') out.push(...item.children);
    else out.push(item);
  }
  return out;
}

/** Permisos declarados en los enlaces de un módulo. */
export function modulePermissionKeys(mod: any): string[] {
  const keys: string[] = [];
  for (const l of moduleLinks(mod) as any[]) {
    if (l.permission) keys.push(...(Array.isArray(l.permission) ? l.permission : [l.permission]));
  }
  return keys;
}

/**
 * ¿Puede el usuario ver un módulo? Misma regla en Home, selector de módulos y rutas:
 *  - Apagado por el negocio → nadie.
 *  - MANAGER → todos (menos el portal de cliente).
 *  - EMPLOYEE → si tiene al menos un permiso de alguno de los enlaces del módulo.
 */
export function useModuleAccess() {
  const { currentUser } = useAuth();
  const { canAny } = usePermissions();
  const { isModuleEnabled } = useModules();

  const canAccessModule = useCallback((name: AppModule): boolean => {
    if (!isModuleEnabled(name)) return false;
    if (name === AppModule.PROJECT_CLIENT_DASHBOARD) return false;
    if (currentUser?.role === UserRole.MANAGER) return true;
    if (currentUser?.role === UserRole.EMPLOYEE) {
      const keys = modulePermissionKeys(APP_MODULES_CONFIG.find(m => m.name === name));
      return keys.length > 0 && canAny(...keys);
    }
    return false;
  }, [currentUser, canAny, isModuleEnabled]);

  /** ¿Puede abrir esta ruta concreta? (si el enlace del menú declara un permiso). */
  const canAccessPath = useCallback((name: AppModule, pathname: string): boolean => {
    if (currentUser?.role !== UserRole.EMPLOYEE) return true;
    const link = (moduleLinks(APP_MODULES_CONFIG.find(m => m.name === name)) as any[]).find(l => l.path === pathname);
    if (!link?.permission) return true;
    return canAny(...(Array.isArray(link.permission) ? link.permission : [link.permission]));
  }, [currentUser, canAny]);

  return { canAccessModule, canAccessPath };
}
