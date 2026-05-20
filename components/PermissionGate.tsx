import React, { ReactNode } from 'react';
import { usePermissions } from '../hooks/usePermissions';

interface PermissionGateProps {
  /** Permiso(s) requerido(s). Si es array → cualquiera de ellos basta (OR). */
  require: string | string[];
  /** Si se debe exigir TODOS los permisos del array (AND) en vez de cualquiera (OR). */
  all?: boolean;
  /** Contenido alternativo a mostrar cuando el usuario NO tiene permiso. Por defecto: null. */
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Renderiza children solo si el usuario tiene el/los permiso(s) requerido(s).
 *
 * Uso:
 *   <PermissionGate require="products.delete">
 *     <DeleteButton />
 *   </PermissionGate>
 *
 *   <PermissionGate require={['products.edit', 'products.delete']} all>
 *     <AdvancedActions />
 *   </PermissionGate>
 */
export const PermissionGate: React.FC<PermissionGateProps> = ({ require, all, fallback = null, children }) => {
  const { can, canAll, canAny } = usePermissions();

  const keys = Array.isArray(require) ? require : [require];
  const ok = keys.length === 1 ? can(keys[0]) : all ? canAll(...keys) : canAny(...keys);

  return <>{ok ? children : fallback}</>;
};
