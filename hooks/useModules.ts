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
    const planModules = settings.planEntitlements?.modules;

    /** ¿Lo incluye el plan del negocio? Sin plan, todo. */
    const isInPlan = (module: AppModule): boolean => !planModules || planModules.includes(module);

    /** Preferencia del gerente, sin mirar el plan. */
    const isSwitchedOn = (module: AppModule): boolean => {
      // Caja sin valor propio (negocios de antes de separarla): sigue a Punto de Venta, para que
      // quien tenía POS apagado no vea aparecer la caja.
      if (module === AppModule.CAJA && map[module] === undefined) return map[AppModule.POS] !== false;
      return map[module] !== false; // ausente o true = activo
    };

    const isModuleEnabled = (module: AppModule | null | undefined): boolean => {
      if (!module) return true;
      if (!TOGGLEABLE_MODULES.includes(module)) return true; // no apagable → siempre activo
      return isInPlan(module) && isSwitchedOn(module);
    };

    return { isModuleEnabled, isInPlan, isSwitchedOn, enabledModules: map, toggleableModules: TOGGLEABLE_MODULES };
  }, [settings.enabledModules, settings.planEntitlements]);
}
