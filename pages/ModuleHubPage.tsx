import React, { useEffect, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { APP_MODULES_CONFIG, SidebarItemConfig } from '../constants';
import { AppModule, UserRole } from '../types';
import { usePermissions } from '../hooks/usePermissions';
import { useModules } from '../hooks/useModules';
import { useAuth } from '../contexts/AuthContext';
import { useAppContext } from '../contexts/AppContext';
import { useTranslation } from '../contexts/GlobalSettingsContext';
import { MODULE_SLUG } from '../utils/moduleNav';

interface HubItem { name: string; path: string; group?: string; Icon?: React.ComponentType<any>; }

export const ModuleHubPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const { can, canAny } = usePermissions();
  const { isModuleEnabled } = useModules();
  const { setCurrentModule } = useAppContext();

  const module = (slug && MODULE_SLUG[slug]) || AppModule.TIENDA;
  // Sincroniza el módulo activo (sidebar/navbar) con el hub abierto.
  useEffect(() => { setCurrentModule(module); }, [module]); // eslint-disable-line

  const isManager = currentUser?.role === UserRole.MANAGER;
  const allowed = (perm?: string | string[]): boolean => {
    if (isManager) return true;
    if (!perm) return true;
    return Array.isArray(perm) ? canAny(...perm) : can(perm);
  };

  const items = useMemo<HubItem[]>(() => {
    const cfg = APP_MODULES_CONFIG.find(m => m.name === module);
    if (!cfg) return [];
    const lists: SidebarItemConfig[] = [
      ...((cfg as any).subModulesTienda || []),
      ...((cfg as any).subModulesProject || []),
      ...((cfg as any).subModulesPOS || []),
      ...((cfg as any).subModulesEcommerce || []),
      ...((cfg as any).subModulesAdmin || []),
    ];
    const out: HubItem[] = [];
    for (const item of lists) {
      if (item.type === 'group') {
        for (const l of item.children) {
          if (l.path && allowed((l as any).permission)) out.push({ name: l.name, path: l.path, group: item.name, Icon: (l as any).icon || item.icon });
        }
      } else if (item.path && allowed((item as any).permission)) {
        out.push({ name: item.name, path: item.path, Icon: (item as any).icon });
      }
    }
    return out;
  }, [module, currentUser]); // eslint-disable-line

  if (!isModuleEnabled(module)) {
    return <div className="p-8 text-center text-neutral-500">{t('hub.disabled') || 'Este módulo está desactivado.'}</div>;
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-3xl font-bold text-neutral-800 dark:text-neutral-100">{t(`module.${module}`)}</h1>
      </div>
      <p className="text-neutral-500 dark:text-neutral-400 -mt-4 mb-6">{t('hub.subtitle') || 'Elige una sección o usa Ctrl+K para saltar directo.'}</p>

      {items.length === 0 ? (
        <p className="text-neutral-400">{t('hub.empty') || 'No tienes accesos disponibles en este módulo.'}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {items.map((it) => {
            const Icon = it.Icon;
            return (
              <Link
                key={it.path}
                to={it.path}
                onClick={() => setCurrentModule(module)}
                className="group bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-primary/40 transition flex flex-col gap-3"
              >
                <span className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition">
                  {Icon ? <Icon className="w-5 h-5" /> : <span className="font-bold">{it.name.slice(0, 1)}</span>}
                </span>
                <div>
                  <div className="font-semibold text-neutral-800 dark:text-neutral-100">{it.name}</div>
                  {it.group && <div className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">{it.group}</div>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ModuleHubPage;
