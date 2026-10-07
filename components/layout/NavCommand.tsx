import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { APP_MODULES_CONFIG, SidebarItemConfig, BUTTON_PRIMARY_SM_CLASSES } from '../../constants';
import { AppModule, UserRole } from '../../types';
import { usePermissions } from '../../hooks/usePermissions';
import { useModules } from '../../hooks/useModules';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { useTranslation } from '../../contexts/GlobalSettingsContext';
import { PlusIcon } from '../icons';

interface NavEntry { id: string; module: AppModule; name: string; path: string; Icon?: React.ComponentType<any>; }

// Búsqueda por entidad ("empleado: Andres"): alcance + cómo buscar registros y a dónde ir.
interface Scope { key: string; label: string; en: string; module: AppModule; perm?: string | string[]; }
const SCOPES: Scope[] = [
  { key: 'cliente',  label: 'Cliente',  en: 'Client',   module: AppModule.TIENDA,             perm: 'clients.view' },
  { key: 'empleado', label: 'Empleado', en: 'Employee', module: AppModule.TIENDA,             perm: 'employees.view' },
  { key: 'producto', label: 'Producto', en: 'Product',  module: AppModule.TIENDA,             perm: 'products.view' },
  { key: 'proyecto', label: 'Proyecto', en: 'Project',  module: AppModule.PROJECT_MANAGEMENT, perm: 'projects.view' },
  { key: 'factura',  label: 'Factura',  en: 'Invoice',  module: AppModule.POS,                perm: 'pos.viewHistory' },
];
const SCOPE_ALIASES: Record<string, string[]> = {
  cliente: ['cliente', 'clientes', 'client', 'clients'],
  empleado: ['empleado', 'empleados', 'employee', 'employees'],
  producto: ['producto', 'productos', 'product', 'products'],
  proyecto: ['proyecto', 'proyectos', 'project', 'projects'],
  factura: ['factura', 'facturas', 'invoice', 'invoices'],
};
interface RecordResult { id: string; label: string; sub?: string; href: string; module: AppModule; }
type Item = { kind: 'scope'; scope: Scope } | { kind: 'nav'; entry: NavEntry } | { kind: 'record'; rec: RecordResult };

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
  { id: 'supplierOrder', label: 'Pedido a proveedor', en: 'Supplier order',  path: '/tienda/supplier-orders?new=1', module: AppModule.POS,                 perm: 'supplierOrders.manage' },
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
  const { clients, employees, products, projects } = useData();

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
  const [scope, setScope] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  const allowedScopes = useMemo(() => SCOPES.filter(s => isModuleEnabled(s.module) && allowed(s.perm)), [currentUser, isModuleEnabled]); // eslint-disable-line
  const scopeObj = scope ? SCOPES.find(s => s.key === scope) || null : null;
  const scopeLbl = (s: Scope) => (lang === 'en' ? s.en : s.label);

  // Resultados de navegación (secciones).
  const navResults = useMemo<NavEntry[]>(() => {
    const freq = readFreq(FREQ_NAV);
    const sortByFreq = (a: NavEntry, b: NavEntry) => (freq[b.id] || 0) - (freq[a.id] || 0) || a.name.localeCompare(b.name);
    const query = q.trim().toLowerCase();
    if (!query) return [...navIndex].filter(e => (freq[e.id] || 0) > 0).sort(sortByFreq).slice(0, 6);
    return navIndex.filter(e => `${e.name} ${t(`module.${e.module}`)}`.toLowerCase().includes(query)).sort(sortByFreq).slice(0, 8);
  }, [q, navIndex, t]);

  // Búsqueda de registros dentro de un alcance (usa datos ya cargados).
  const recordSearch = (s: Scope, query: string): RecordResult[] => {
    const ql = query.trim().toLowerCase();
    if (s.key === 'cliente') {
      const list = (clients || []).filter((c: any) => !c.isDefault);
      return (ql ? list.filter((c: any) => `${c.name || ''} ${c.lastName || ''} ${c.companyName || ''} ${c.displayName || ''} ${c.email || ''}`.toLowerCase().includes(ql)) : list)
        .slice(0, 8).map((c: any) => ({ id: c.id, label: (c.displayName?.trim()) || `${c.name || ''} ${c.lastName || ''}`.trim() || c.companyName || 'Cliente', sub: c.companyName || c.email || '', href: `/tienda/clients?edit=${c.id}`, module: AppModule.TIENDA }));
    }
    if (s.key === 'empleado') {
      const list = employees || [];
      return (ql ? list.filter((e: any) => `${e.name || ''} ${e.lastName || ''} ${e.email || ''}`.toLowerCase().includes(ql)) : list)
        .slice(0, 8).map((e: any) => ({ id: e.id, label: `${e.name || ''} ${e.lastName || ''}`.trim() || e.email || 'Empleado', sub: e.email || e.role || '', href: `/tienda/employees?edit=${e.id}`, module: AppModule.TIENDA }));
    }
    if (s.key === 'producto') {
      const list = products || [];
      return (ql ? list.filter((p: any) => `${p.name || ''} ${(p.skus || []).join(' ')}`.toLowerCase().includes(ql)) : list)
        .slice(0, 8).map((p: any) => ({ id: p.id, label: p.name, sub: (p.skus || [])[0] || '', href: `/tienda/products?edit=${p.id}`, module: AppModule.TIENDA }));
    }
    if (s.key === 'proyecto') {
      const list = (projects || []).filter((p: any) => !p.billingOnly);
      return (ql ? list.filter((p: any) => (p.name || '').toLowerCase().includes(ql)) : list)
        .slice(0, 8).map((p: any) => ({ id: p.id, label: p.name, sub: p.status || '', href: `/pm/projects/${p.id}`, module: AppModule.PROJECT_MANAGEMENT }));
    }
    if (s.key === 'factura') {
      const n = ql.replace(/\D/g, '');
      return n ? [{ id: n, label: `Factura #${n}`, sub: '', href: `/pos/invoices?invoiceNo=${n}`, module: AppModule.POS }] : [];
    }
    return [];
  };

  // Lista unificada que se muestra y se navega con el teclado.
  const listItems = useMemo<Item[]>(() => {
    if (scopeObj) return recordSearch(scopeObj, q).map(rec => ({ kind: 'record', rec } as Item));
    const items: Item[] = [];
    const ql = q.trim().toLowerCase();
    if (ql) for (const s of allowedScopes) { if (SCOPE_ALIASES[s.key].some(a => a.startsWith(ql))) items.push({ kind: 'scope', scope: s }); }
    for (const e of navResults) items.push({ kind: 'nav', entry: e });
    return items;
  }, [scopeObj, q, navResults, allowedScopes, clients, employees, products, projects]); // eslint-disable-line

  useEffect(() => { setHi(0); }, [q, scope, searchOpen]);

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

  const closeSearch = () => { setSearchOpen(false); setQ(''); setScope(null); inputRef.current?.blur(); };

  const pickScope = (s: Scope, rest = '') => { setScope(s.key); setQ(rest); setSearchOpen(true); setTimeout(() => inputRef.current?.focus(), 0); };

  const activate = (item: Item) => {
    if (item.kind === 'scope') { pickScope(item.scope); return; }
    if (item.kind === 'nav') {
      bumpFreq(FREQ_NAV, item.entry.id);
      setCurrentModule(item.entry.module);
      navigate(item.entry.path);
      closeSearch();
      return;
    }
    // record
    setCurrentModule(item.rec.module);
    navigate(item.rec.href);
    closeSearch();
  };

  // Detecta "entidad: texto" al escribir (ej. "empleado: Andres") y activa el alcance.
  const onSearchChange = (val: string) => {
    setSearchOpen(true);
    if (!scope) {
      const m = /^\s*([A-Za-zÁÉÍÓÚáéíóúñÑ]+)\s*:\s*(.*)$/.exec(val);
      if (m) {
        const key = Object.keys(SCOPE_ALIASES).find(k => SCOPE_ALIASES[k].includes(m[1].toLowerCase()));
        const s = key ? allowedScopes.find(x => x.key === key) : null;
        if (s) { pickScope(s, m[2]); return; }
      }
    }
    setQ(val);
  };

  const onSearchKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi(h => Math.min(h + 1, listItems.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi(h => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter') { if (listItems[hi]) activate(listItems[hi]); }
    else if (e.key === 'Escape') { if (scope) { setScope(null); setQ(''); } else { setSearchOpen(false); inputRef.current?.blur(); } }
    else if (e.key === 'Backspace' && scope && q === '') { e.preventDefault(); setScope(null); }
    else if (e.key === 'Tab' && !scope && listItems[hi]?.kind === 'scope') { e.preventDefault(); activate(listItems[hi]); }
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
    <div className="flex items-center gap-2">
      {/* Buscador global */}
      <div ref={searchBoxRef} className="relative w-44 md:w-64 lg:w-72 hidden sm:block">
        <div className="flex items-center h-[38px] rounded-md border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-900 focus-within:ring-2 focus-within:ring-primary/40 overflow-hidden">
          {scopeObj ? (
            <span className="ml-2 inline-flex items-center gap-1 flex-shrink-0 text-xs font-semibold px-2 py-1 rounded bg-primary/15 text-primary">
              {scopeLbl(scopeObj)}:
              <button type="button" onMouseDown={(ev) => { ev.preventDefault(); setScope(null); inputRef.current?.focus(); }} className="font-bold hover:text-primary/70" aria-label="Quitar alcance">×</button>
            </span>
          ) : (
            <span className="pl-3 flex items-center text-neutral-400 pointer-events-none flex-shrink-0">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
            </span>
          )}
          <input
            ref={inputRef}
            type="text"
            value={q}
            onChange={e => onSearchChange(e.target.value)}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={onSearchKey}
            placeholder={scopeObj ? `${t('cmp.navcmd.search_in') || 'Buscar'} ${scopeLbl(scopeObj).toLowerCase()}…` : (t('cmp.navcmd.search_ph') || 'Buscar o ir a…')}
            className="flex-1 min-w-0 h-full px-2 bg-transparent text-sm text-neutral-700 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none"
            aria-label={t('cmp.navcmd.search_ph') || 'Buscar o ir a…'}
            autoComplete="off"
          />
          {!scopeObj && <span className="pr-2.5 hidden md:flex items-center flex-shrink-0"><kbd className="text-[10px] font-sans text-neutral-400 border border-neutral-300 dark:border-neutral-600 rounded px-1 py-0.5">Ctrl K</kbd></span>}
        </div>

        {searchOpen && (
          <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-600 rounded-lg shadow-lg py-1 z-40 max-h-96 overflow-y-auto">
            {!scope && !q.trim() && navResults.length > 0 && (
              <div className="px-3 py-1 text-[10px] uppercase tracking-wide text-neutral-400">{t('cmp.navcmd.frequent') || 'Frecuentes'}</div>
            )}
            {listItems.length === 0 ? (
              <div className="px-3 py-3 text-sm text-neutral-400">
                {scopeObj ? (q.trim() ? (t('cmp.navcmd.no_results') || 'Sin resultados') : `${t('cmp.navcmd.type_to_search') || 'Escribe para buscar'} ${scopeLbl(scopeObj).toLowerCase()}…`)
                  : (q.trim() ? (t('cmp.navcmd.no_results') || 'Sin resultados') : (t('cmp.navcmd.hint') || 'Escribe para buscar una sección…'))}
              </div>
            ) : listItems.map((item, i) => {
              const active = i === hi;
              if (item.kind === 'scope') {
                return (
                  <button key={`s-${item.scope.key}`} type="button" onMouseDown={(ev) => { ev.preventDefault(); activate(item); }} onMouseEnter={() => setHi(i)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm ${active ? 'bg-primary/10 dark:bg-primary/20' : 'hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}>
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-primary/15 text-primary text-xs font-bold flex-shrink-0">:</span>
                    <span className="flex-1 truncate text-neutral-700 dark:text-neutral-100"><b>{scopeLbl(item.scope)}:</b> {t('cmp.navcmd.search_records') || 'buscar registros'}</span>
                    <span className="text-[11px] text-neutral-400">↹</span>
                  </button>
                );
              }
              if (item.kind === 'nav') {
                const Icon = item.entry.Icon;
                return (
                  <button key={`n-${item.entry.id}`} type="button" onMouseDown={(ev) => { ev.preventDefault(); activate(item); }} onMouseEnter={() => setHi(i)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm ${active ? 'bg-primary/10 dark:bg-primary/20' : 'hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}>
                    {Icon ? <Icon className="w-4 h-4 text-neutral-400 flex-shrink-0" /> : <span className="w-4" />}
                    <span className="flex-1 truncate text-neutral-700 dark:text-neutral-100">{item.entry.name}</span>
                    <span className="text-[11px] text-neutral-400 whitespace-nowrap">{t(`module.${item.entry.module}`)}</span>
                  </button>
                );
              }
              // record
              return (
                <button key={`r-${item.rec.href}`} type="button" onMouseDown={(ev) => { ev.preventDefault(); activate(item); }} onMouseEnter={() => setHi(i)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm ${active ? 'bg-primary/10 dark:bg-primary/20' : 'hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                  <span className="flex-1 truncate text-neutral-700 dark:text-neutral-100">{item.rec.label}</span>
                  {item.rec.sub && <span className="text-[11px] text-neutral-400 truncate max-w-[40%]">{item.rec.sub}</span>}
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
            className={`${BUTTON_PRIMARY_SM_CLASSES} inline-flex items-center gap-1 whitespace-nowrap h-[38px]`}
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
