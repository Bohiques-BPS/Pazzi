import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { APP_MODULES_CONFIG, SidebarItemConfig, BUTTON_PRIMARY_SM_CLASSES } from '../../constants';
import { AppModule, UserRole } from '../../types';
import { usePermissions } from '../../hooks/usePermissions';
import { useModules } from '../../hooks/useModules';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../contexts/GlobalSettingsContext';
import { PlusIcon } from '../icons';

interface NavEntry { id: string; module: AppModule; name: string; path: string; Icon?: React.ComponentType<any>; }

// Acciones de creación rápida ("+ Nuevo"). `path` abre la pantalla; `?new=1` hace que la
// página abra directamente su formulario de creación (las páginas que lo soportan lo leen).
interface CreateAction { id: string; label: string; en: string; path: string; module: AppModule; perm?: string | string[]; }
const CREATE_ACTIONS: CreateAction[] = [
  { id: 'product',  label: 'Agregar producto',   en: 'Add product',       path: '/tienda/products?new=1',        module: AppModule.TIENDA,              perm: 'products.view' },
  { id: 'sale',     label: 'Abrir caja / cobrar', en: 'Open register / sell', path: '/pos/cashier',               module: AppModule.POS,                 perm: 'pos.access' },
  { id: 'invoice',  label: 'Nueva factura',       en: 'New invoice',        path: '/pos/invoices?new=1',           module: AppModule.POS,                 perm: 'pos.viewHistory' },
  { id: 'estimate', label: 'Nueva cotización',    en: 'New estimate',       path: '/pos/estimates?new=1',          module: AppModule.POS,                 perm: 'pos.viewHistory' },
  { id: 'recurring',label: 'Nuevo pago recurrente', en: 'New recurring payment', path: '/pos/recurring?new=1',     module: AppModule.POS,                 perm: 'pos.viewHistory' },
  { id: 'client',   label: 'Nuevo cliente',       en: 'New client',         path: '/tienda/clients?new=1',         module: AppModule.TIENDA,              perm: 'clients.view' },
  { id: 'supplierOrder', label: 'Pedido a proveedor', en: 'Supplier order',  path: '/tienda/supplier-orders?new=1', module: AppModule.TIENDA,              perm: 'supplierOrders.manage' },
  { id: 'project',  label: 'Nuevo proyecto',      en: 'New project',        path: '/pm/projects/new',              module: AppModule.PROJECT_MANAGEMENT,  perm: 'projects.view' },
];

const FREQ_NAV = 'pazzi_nav_freq';
const FREQ_CREATE = 'pazzi_create_freq';
const readFreq = (key: string): Record<string, number> => { try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch { return {}; } };
const bumpFreq = (key: string, id: string) => { try { const f = readFreq(key); f[id] = (f[id] || 0) + 1; localStorage.setItem(key, JSON.stringify(f)); } catch { /* sin storage */ } };

interface Props {
  setCurrentModule: (m: AppModule) => void;
}

export const NavCommand: React.FC<Props> = ({ setCurrentModule }) => {
  const { t, lang } = useTranslation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { can, canAny } = usePermissions();
  const { isModuleEnabled } = useModules();

  const isManager = currentUser?.role === UserRole.MANAGER;
  const allowed = (perm?: string | string[]): boolean => {
    if (isManager) return true;
    if (!perm) return true;
    return Array.isArray(perm) ? canAny(...perm) : can(perm);
  };

  // Índice de TODAS las opciones de navegación de los módulos a los que el usuario tiene acceso.
  const navIndex = useMemo<NavEntry[]>(() => {
    const out: NavEntry[] = [];
    const seen = new Set<string>();
    for (const m of APP_MODULES_CONFIG) {
      const mod = m.name as AppModule;
      if (mod === AppModule.PROJECT_CLIENT_DASHBOARD) continue;
      if (!isModuleEnabled(mod)) continue;
      const lists: SidebarItemConfig[] = [
        ...((m as any).subModulesTienda || []),
        ...((m as any).subModulesProject || []),
        ...((m as any).subModulesPOS || []),
        ...((m as any).subModulesEcommerce || []),
        ...((m as any).subModulesAdmin || []),
      ];
      for (const item of lists) {
        const links = item.type === 'group' ? item.children : [item];
        for (const l of links) {
          if (!l.path || seen.has(l.path)) continue;
          if (!allowed((l as any).permission)) continue;
          seen.add(l.path);
          out.push({ id: l.path, module: mod, name: l.name, path: l.path, Icon: (l as any).icon });
        }
      }
    }
    return out;
  }, [currentUser, isModuleEnabled]); // eslint-disable-line

  const createActions = useMemo(() => CREATE_ACTIONS.filter(a => isModuleEnabled(a.module) && allowed(a.perm)), [currentUser, isModuleEnabled]); // eslint-disable-line

  // ── Buscador ──
  const [q, setQ] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  const results = useMemo<NavEntry[]>(() => {
    const freq = readFreq(FREQ_NAV);
    const sortByFreq = (a: NavEntry, b: NavEntry) => (freq[b.id] || 0) - (freq[a.id] || 0) || a.name.localeCompare(b.name);
    const query = q.trim().toLowerCase();
    if (!query) {
      // Sin texto: muestra las más usadas ("Frecuentes").
      return [...navIndex].filter(e => (freq[e.id] || 0) > 0).sort(sortByFreq).slice(0, 6);
    }
    return navIndex
      .filter(e => `${e.name} ${t(`module.${e.module}`)}`.toLowerCase().includes(query))
      .sort(sortByFreq)
      .slice(0, 8);
  }, [q, navIndex, t]);

  useEffect(() => { setHi(0); }, [q, searchOpen]);

  // Ctrl/Cmd+K enfoca el buscador.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        inputRef.current?.focus();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Cerrar los dropdowns al hacer clic fuera.
  const [createOpen, setCreateOpen] = useState(false);
  const createRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) setSearchOpen(false);
      if (createRef.current && !createRef.current.contains(e.target as Node)) setCreateOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const goTo = (e: NavEntry) => {
    bumpFreq(FREQ_NAV, e.id);
    setCurrentModule(e.module);
    navigate(e.path);
    setSearchOpen(false);
    setQ('');
    inputRef.current?.blur();
  };

  const onSearchKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi(h => Math.min(h + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi(h => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter') { if (results[hi]) goTo(results[hi]); }
    else if (e.key === 'Escape') { setSearchOpen(false); inputRef.current?.blur(); }
  };

  const runCreate = (a: CreateAction) => {
    bumpFreq(FREQ_CREATE, a.id);
    setCurrentModule(a.module);
    navigate(a.path);
    setCreateOpen(false);
  };

  // Acciones de creación ordenadas: las más usadas primero.
  const orderedCreate = useMemo(() => {
    const freq = readFreq(FREQ_CREATE);
    const top = [...createActions].filter(a => (freq[a.id] || 0) > 0).sort((a, b) => (freq[b.id] || 0) - (freq[a.id] || 0)).slice(0, 3);
    const topIds = new Set(top.map(a => a.id));
    const rest = createActions.filter(a => !topIds.has(a.id));
    return { top, rest };
  }, [createActions, createOpen]);

  const lbl = (a: CreateAction) => (lang === 'en' ? a.en : a.label);

  if (!currentUser || [UserRole.CLIENT_ECOMMERCE, UserRole.CLIENT_PROJECT].includes(currentUser.role)) return null;

  return (
    <div className="flex items-center gap-2 flex-1 min-w-0 justify-center px-2">
      {/* Buscador global */}
      <div ref={searchBoxRef} className="relative w-full max-w-md hidden sm:block">
        <div className="relative">
          <span className="absolute inset-y-0 left-3 flex items-center text-neutral-400 pointer-events-none">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
          </span>
          <input
            ref={inputRef}
            type="text"
            value={q}
            onChange={e => { setQ(e.target.value); setSearchOpen(true); }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={onSearchKey}
            placeholder={t('cmp.navcmd.search_ph') || 'Buscar o ir a…'}
            className="w-full pl-9 pr-12 py-1.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary/40"
            aria-label={t('cmp.navcmd.search_ph') || 'Buscar o ir a…'}
            autoComplete="off"
          />
          <span className="absolute inset-y-0 right-2.5 hidden md:flex items-center">
            <kbd className="text-[10px] font-sans text-neutral-400 border border-neutral-300 dark:border-neutral-600 rounded px-1 py-0.5">Ctrl K</kbd>
          </span>
        </div>

        {searchOpen && (
          <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-600 rounded-lg shadow-lg py-1 z-40 max-h-96 overflow-y-auto">
            {!q.trim() && results.length > 0 && (
              <div className="px-3 py-1 text-[10px] uppercase tracking-wide text-neutral-400">{t('cmp.navcmd.frequent') || 'Frecuentes'}</div>
            )}
            {results.length === 0 ? (
              <div className="px-3 py-3 text-sm text-neutral-400">{q.trim() ? (t('cmp.navcmd.no_results') || 'Sin resultados') : (t('cmp.navcmd.hint') || 'Escribe para buscar una sección…')}</div>
            ) : results.map((e, i) => {
              const Icon = e.Icon;
              return (
                <button
                  key={e.id}
                  type="button"
                  onMouseDown={(ev) => { ev.preventDefault(); goTo(e); }}
                  onMouseEnter={() => setHi(i)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm ${i === hi ? 'bg-primary/10 dark:bg-primary/20' : 'hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}
                >
                  {Icon ? <Icon className="w-4 h-4 text-neutral-400 flex-shrink-0" /> : <span className="w-4" />}
                  <span className="flex-1 truncate text-neutral-700 dark:text-neutral-100">{e.name}</span>
                  <span className="text-[11px] text-neutral-400 whitespace-nowrap">{t(`module.${e.module}`)}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Botón + Nuevo (creación rápida) */}
      {createActions.length > 0 && (
        <div ref={createRef} className="relative flex-shrink-0">
          <button
            type="button"
            onClick={() => setCreateOpen(o => !o)}
            className={`${BUTTON_PRIMARY_SM_CLASSES} inline-flex items-center gap-1 whitespace-nowrap`}
            aria-haspopup="true"
            aria-expanded={createOpen}
          >
            <PlusIcon className="w-4 h-4" />
            <span className="hidden sm:inline">{t('cmp.navcmd.new') || 'Nuevo'}</span>
          </button>
          {createOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-600 rounded-md shadow-lg py-1 z-40">
              {orderedCreate.top.length > 0 && (
                <>
                  <div className="px-3 py-1 text-[10px] uppercase tracking-wide text-neutral-400">{t('cmp.navcmd.frequent') || 'Frecuentes'}</div>
                  {orderedCreate.top.map(a => (
                    <button key={a.id} type="button" onClick={() => runCreate(a)} className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-neutral-700 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-700">
                      <PlusIcon className="w-4 h-4 text-primary flex-shrink-0" /><span className="flex-1 truncate">{lbl(a)}</span>
                    </button>
                  ))}
                  <div className="my-1 border-t border-neutral-100 dark:border-neutral-700" />
                </>
              )}
              <div className="px-3 py-1 text-[10px] uppercase tracking-wide text-neutral-400">{t('cmp.navcmd.quick_create') || 'Crear rápido'}</div>
              {orderedCreate.rest.map(a => (
                <button key={a.id} type="button" onClick={() => runCreate(a)} className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-neutral-700 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-700">
                  <PlusIcon className="w-4 h-4 text-neutral-400 flex-shrink-0" /><span className="flex-1 truncate">{lbl(a)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
