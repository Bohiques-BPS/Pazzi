import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useGlobalSettings } from '../../contexts/GlobalSettingsContext';
import { UserRole, AppModule } from '../../types';
import { TOGGLEABLE_MODULES } from '../../constants';
import {
    Squares2X2Icon,
    Cog6ToothIcon,
    BriefcaseIcon,
    CashBillIcon,
    ShoppingCartIcon,
} from '../icons';

// Metadatos de presentación por módulo apagable.
const MODULE_META: Record<string, { icon: React.ComponentType<{ className?: string }>; description: string }> = {
    [AppModule.TIENDA]: {
        icon: Cog6ToothIcon,
        description: 'Productos, inventario, categorías, clientes, empleados, sucursales y proveedores.',
    },
    [AppModule.PROJECT_MANAGEMENT]: {
        icon: BriefcaseIcon,
        description: 'Proyectos, tareas, calendario, chat y reportes de gestión de proyectos.',
    },
    [AppModule.POS]: {
        icon: CashBillIcon,
        description: 'Caja registradora, ventas, estimados, apartados, cuentas y facturación.',
    },
    [AppModule.ECOMMERCE]: {
        icon: ShoppingCartIcon,
        description: 'Tienda online, pedidos web, proveedores y configuración de la tienda.',
    },
};

/**
 * Interruptor maestro de módulos del negocio.
 *
 * El MANAGER activa/desactiva los módulos principales para él y para todos sus
 * empleados. La preferencia vive en GlobalSettings (per negocio) y se persiste al
 * instante. Un módulo apagado desaparece del selector, del dashboard y bloquea el
 * acceso por URL directa.
 */
export const ModulesConfiguration: React.FC = () => {
    const { currentUser } = useAuth();
    const { settings, updateSettings } = useGlobalSettings();

    if (currentUser?.role !== UserRole.MANAGER) return null;

    const enabledModules = settings.enabledModules || {};
    const isOn = (module: AppModule) => enabledModules[module] !== false; // ausente o true = activo

    const handleToggle = (module: AppModule) => {
        updateSettings({
            enabledModules: { ...enabledModules, [module]: !isOn(module) },
        });
    };

    return (
        <div className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-primary mb-1 flex items-center">
                <Squares2X2Icon className="w-5 h-5 mr-2" />
                Módulos del Sistema
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                Activa o desactiva los módulos principales para tu negocio. El cambio aplica para ti y para
                todos tus colaboradores. El módulo de Administración permanece siempre activo.
            </p>

            <div className="space-y-4">
                {TOGGLEABLE_MODULES.map(module => {
                    const meta = MODULE_META[module];
                    const Icon = meta?.icon || Squares2X2Icon;
                    const on = isOn(module);
                    return (
                        <div
                            key={module}
                            className="flex items-start justify-between gap-4 border-b dark:border-neutral-700 pb-4 last:border-b-0 last:pb-0"
                        >
                            <div className="flex items-start min-w-0">
                                <span className={`flex-shrink-0 mr-3 mt-0.5 ${on ? 'text-primary dark:text-accent' : 'text-neutral-400 dark:text-neutral-500'}`}>
                                    <Icon className="w-6 h-6" />
                                </span>
                                <div className="min-w-0">
                                    <h4 className="font-medium text-neutral-800 dark:text-neutral-100">{module}</h4>
                                    <p className="text-sm text-neutral-500 dark:text-neutral-400">{meta?.description}</p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-1">
                                <input
                                    type="checkbox"
                                    checked={on}
                                    onChange={() => handleToggle(module)}
                                    className="sr-only peer"
                                    aria-label={`Activar módulo ${module}`}
                                />
                                <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 dark:peer-focus:ring-primary/80 rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-neutral-600 peer-checked:bg-primary"></div>
                            </label>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
