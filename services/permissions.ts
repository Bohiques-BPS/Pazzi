import { api } from './api';
import type { EmployeePermissions, PermissionCategory } from '../types';

export const permissionsService = {
  /** Catálogo de permisos disponibles (agrupado por categoría) para renderizar checkboxes. */
  getCatalog: () => api.get<{ categories: PermissionCategory[] }>('/permissions/catalog'),

  /** Permisos efectivos del usuario autenticado. */
  getMine: () => api.get<{ permissions: EmployeePermissions }>('/permissions/me'),
};
