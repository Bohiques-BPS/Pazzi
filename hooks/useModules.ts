import { useMemo } from 'react';
import { AppModule } from '../types';
import { TOGGLEABLE_MODULES } from '../constants';
import { useGlobalSettings } from '../contexts/GlobalSettingsContext';

/**
 * Interruptor maestro de módulos por negocio.
 *
 * La configuración vive en GlobalSettings.enabledModules (per negocio, resuelto al
 * storeOwnerId), así que aplica por igual al MANAGER y a todos sus empleados.
 *
 * Semántica: un módulo se considera ACTIVO salvo que su clave esté explícitamente en
 * `false`. Los módulos que NO están en TOGGLEABLE_MODULES (Administración, Portal
 * Cliente) están siempre activos y no se pueden apagar.
 *
 * Nota: esto es un gate de UX/navegación a nivel de todo el negocio, distinto de los
 * permisos por-empleado (usePermissions). Si un módulo está apagado aquí, nadie lo ve.
 */
export function useModules() {
  const { settings } = useGlobalSettings();

  return useMemo(() => {
    const map = settings.enabledModules || {};

    const isModuleEnabled = (module: AppModule | null | undefined): boolean => {
      if (!module) return true;
      if (!TOGGLEABLE_MODULES.includes(module)) return true; // no apagable → siempre activo
      return map[module] !== false; // ausente o true = activo
    };

    return { isModuleEnabled, enabledModules: map, toggleableModules: TOGGLEABLE_MODULES };
  }, [settings.enabledModules]);
}
