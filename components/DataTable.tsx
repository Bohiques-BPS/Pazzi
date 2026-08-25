import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from '../contexts/GlobalSettingsContext';

export type SortDirection = 'asc' | 'desc';
export interface SortState { key: string; direction: SortDirection; }

export interface TableColumn<T> {
  header: string | React.ReactNode; // Changed from string to string | React.ReactNode
  accessor: keyof T | ((item: T) => React.ReactNode);
  className?: string;
  noWrap?: boolean; // New prop to control text wrapping
  /** Fuerza si la columna es ordenable. Por defecto: ordenable si accessor es una clave (no función). */
  sortable?: boolean;
  /** Identificador de la columna al ordenar. Por defecto: el nombre de la clave del accessor. */
  sortKey?: string;
  /** Valor usado para ordenar (útil cuando accessor es una función de render). */
  sortValue?: (item: T) => string | number | boolean | null | undefined;
  /** Valor usado para buscar/filtrar (útil cuando accessor es una función de render). Cae a sortValue/accessor. */
  filterValue?: (item: T) => string | number | boolean | null | undefined;
  /** Tipo de control de filtro por columna. 'none' oculta el filtro de esa columna. Por defecto: automático. */
  filterType?: 'select' | 'text' | 'none';
}
export interface TableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  actions?: (item: T) => React.ReactNode;
  onRowClick?: (item:T) => void;
  selectedRowId?: string | null;
  // New props for multi-selection
  selectedIds?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  containerClassName?: string; // New prop for custom container styling
  /** Ordenamiento inicial (modo interno). */
  defaultSort?: SortState | null;
  /** Estado de orden controlado. Si se pasa junto a onSortChange, el padre gestiona el orden. */
  sortState?: SortState | null;
  /** Callback de orden controlado. Al pasarse, DataTable NO ordena internamente (ej. orden en servidor). */
  onSortChange?: (sort: SortState | null) => void;
  /** Buscador integrado (filtra por todas las columnas). Por defecto ON si el orden es interno. */
  searchable?: boolean;
  /** Placeholder del buscador integrado. */
  searchPlaceholder?: string;
  /** Filtros por columna (fila de filtros con dropdown/texto). Por defecto ON si el orden es interno. */
  filterable?: boolean;
  /** Paginación con selector de filas por página. Por defecto ON si el orden es interno. */
  paginated?: boolean;
  /** Opciones del selector de filas por página. 'all' = todas. */
  pageSizeOptions?: (number | 'all')[];
  /** Filas por página inicial. */
  initialPageSize?: number;
  /** Contenido extra en la barra de herramientas (a la izquierda del buscador). */
  toolbarExtra?: React.ReactNode;
  /** Identificador estable de la tabla para recordar (por usuario/navegador) qué columnas se ocultan. */
  tableId?: string;
}

/** Id estable de una columna, para recordar cuáles se ocultan. */
const columnId = <T,>(col: TableColumn<T>, idx: number): string => {
  if (col.sortKey) return col.sortKey;
  if (typeof col.accessor !== 'function') return String(col.accessor);
  if (typeof col.header === 'string') return col.header;
  return `col_${idx}`;
};

const columnSortKey = <T,>(col: TableColumn<T>): string | undefined => {
  if (col.sortKey) return col.sortKey;
  if (typeof col.accessor !== 'function') return String(col.accessor);
  return undefined;
};

const isColumnSortable = <T,>(col: TableColumn<T>): boolean => {
  if (col.sortable !== undefined) return col.sortable;
  return typeof col.accessor !== 'function';
};

const getSortValue = <T,>(col: TableColumn<T>, item: T): string | number | boolean | null | undefined => {
  if (col.sortValue) return col.sortValue(item);
  if (typeof col.accessor !== 'function') return item[col.accessor] as any;
  return undefined;
};

/** Texto para buscar/filtrar en una columna. Cae a filterValue → sortValue → accessor-clave. */
const getFilterText = <T,>(col: TableColumn<T>, item: T): string => {
  let v: unknown;
  if (col.filterValue) v = col.filterValue(item);
  else if (col.sortValue) v = col.sortValue(item);
  else if (typeof col.accessor !== 'function') v = item[col.accessor];
  else return '';
  return v === null || v === undefined ? '' : String(v);
};

const compareValues = (a: any, b: any): number => {
  const aEmpty = a === null || a === undefined || a === '';
  const bEmpty = b === null || b === undefined || b === '';
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1;  // vacíos al final
  if (bEmpty) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'boolean' && typeof b === 'boolean') return a === b ? 0 : (a ? 1 : -1);
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
};

const SortIndicator: React.FC<{ direction: SortDirection | null }> = ({ direction }) => (
  <span className="inline-flex flex-col ml-1 -space-y-1 align-middle leading-none">
    <span className={direction === 'asc' ? 'text-primary' : 'text-neutral-300 dark:text-neutral-400'}>▲</span>
    <span className={direction === 'desc' ? 'text-primary' : 'text-neutral-300 dark:text-neutral-400'}>▼</span>
  </span>
);

const FilterIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
    <path fillRule="evenodd" d="M2.628 1.601C5.028 1.206 7.49 1 10 1s4.973.206 7.372.601a.75.75 0 0 1 .628.74v2.288a2.25 2.25 0 0 1-.659 1.59l-4.682 4.683a2.25 2.25 0 0 0-.659 1.59v3.037c0 .684-.31 1.33-.844 1.757l-1.937 1.55A.75.75 0 0 1 8 20.25v-7.155a2.25 2.25 0 0 0-.659-1.591L2.659 6.82A2.25 2.25 0 0 1 2 5.23V2.34a.75.75 0 0 1 .628-.74Z" clipRule="evenodd" />
  </svg>
);

const ColumnsIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
    <path fillRule="evenodd" d="M2 4.5A1.5 1.5 0 0 1 3.5 3h13A1.5 1.5 0 0 1 18 4.5v11a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 2 15.5v-11ZM8.5 4.5h-5v11h5v-11Zm1.5 0v11h5v-11h-5Z" clipRule="evenodd" />
  </svg>
);

const MAX_SELECT_OPTIONS = 12; // si una columna tiene ≤ N valores distintos → dropdown; si no → texto

export const DataTable = <T extends {id: string}>({
  data,
  columns,
  actions,
  onRowClick,
  selectedRowId,
  selectedIds,
  onSelectionChange,
  containerClassName = '',
  defaultSort = null,
  sortState,
  onSortChange,
  searchable,
  searchPlaceholder,
  filterable,
  paginated,
  pageSizeOptions = [10, 25, 50, 100, 'all'],
  initialPageSize = 25,
  toolbarExtra,
  tableId,
}: TableProps<T>): React.ReactNode => {
  const { t } = useTranslation();
  // Clave para recordar columnas ocultas: tableId explícito, o firma de las cabeceras.
  const colPersistKey = 'pazzi_cols_' + (tableId || columns.map((c, i) => columnId(c, i)).join('|'));
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(() => {
    try { const raw = localStorage.getItem(colPersistKey); return raw ? new Set<string>(JSON.parse(raw)) : new Set(); }
    catch { return new Set(); }
  });
  const [showColMenu, setShowColMenu] = useState(false);
  const toggleCol = (id: string) => setHiddenCols(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    try { localStorage.setItem(colPersistKey, JSON.stringify([...next])); } catch { /* sin storage */ }
    return next;
  });
  // Columnas realmente visibles. Si el usuario ocultó todo, mostramos todas (evita tabla vacía).
  const visibleColumns = useMemo(() => {
    const vis = columns.filter((c, i) => !hiddenCols.has(columnId(c, i)));
    return vis.length ? vis : columns;
  }, [columns, hiddenCols]);
  const controlled = typeof onSortChange === 'function';
  // Por defecto, las funciones cliente (buscar/filtrar/paginar) se activan cuando el orden es interno.
  const enableSearch = searchable ?? !controlled;
  const enableFilters = filterable ?? !controlled;
  const enablePagination = paginated ?? !controlled;

  const [internalSort, setInternalSort] = useState<SortState | null>(defaultSort);
  const activeSort = controlled ? (sortState ?? null) : internalSort;

  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [colFilters, setColFilters] = useState<Record<string, string>>({});
  const [pageSize, setPageSize] = useState<number | 'all'>(enablePagination ? initialPageSize : 'all');
  const [page, setPage] = useState(1);

  const colKeyOf = (col: TableColumn<T>, idx: number) => columnSortKey(col) || `col_${idx}`;
  const isFilterable = (col: TableColumn<T>): boolean => {
    if (col.filterType === 'none') return false;
    return !!col.filterValue || !!col.sortValue || typeof col.accessor !== 'function';
  };

  const handleSort = (key: string) => {
    const next: SortState | null =
      !activeSort || activeSort.key !== key
        ? { key, direction: 'asc' }
        : activeSort.direction === 'asc'
          ? { key, direction: 'desc' }
          : null; // tercer clic limpia el orden
    if (controlled) {
      onSortChange!(next);
    } else {
      setInternalSort(next);
    }
  };

  // 1) Búsqueda global (por todas las columnas con texto derivable).
  const searchedData = useMemo(() => {
    if (!enableSearch || !search.trim()) return data;
    const q = search.trim().toLowerCase();
    return data.filter(item =>
      visibleColumns.some(col => getFilterText(col, item).toLowerCase().includes(q))
    );
  }, [data, visibleColumns, search, enableSearch]);

  // 2) Filtros por columna.
  const filteredData = useMemo(() => {
    if (!enableFilters) return searchedData;
    const active = Object.entries(colFilters).filter(([, v]) => v && v.trim());
    if (active.length === 0) return searchedData;
    return searchedData.filter(item =>
      active.every(([key, val]) => {
        const col = visibleColumns.find((c, i) => colKeyOf(c, i) === key);
        if (!col) return true;
        const text = getFilterText(col, item).toLowerCase();
        return text.includes(val.trim().toLowerCase());
      })
    );
  }, [searchedData, colFilters, visibleColumns, enableFilters]);

  // 3) Orden (interno).
  const sortedData = useMemo(() => {
    if (controlled || !activeSort) return filteredData;
    const col = columns.find(c => columnSortKey(c) === activeSort.key);
    if (!col) return filteredData;
    const dir = activeSort.direction === 'asc' ? 1 : -1;
    return [...filteredData].sort((a, b) => compareValues(getSortValue(col, a), getSortValue(col, b)) * dir);
  }, [filteredData, columns, activeSort, controlled]);

  // 4) Paginación.
  const total = sortedData.length;
  const effectivePageSize = pageSize === 'all' ? total || 1 : pageSize;
  const pageCount = enablePagination ? Math.max(1, Math.ceil(total / effectivePageSize)) : 1;
  const currentPage = Math.min(page, pageCount);
  const pagedData = useMemo(() => {
    if (!enablePagination || pageSize === 'all') return sortedData;
    const start = (currentPage - 1) * effectivePageSize;
    return sortedData.slice(start, start + effectivePageSize);
  }, [sortedData, enablePagination, pageSize, currentPage, effectivePageSize]);

  // Reset de página cuando cambian búsqueda/filtros/tamaño/total.
  useEffect(() => { setPage(1); }, [search, colFilters, pageSize]);
  useEffect(() => { if (page > pageCount) setPage(pageCount); }, [pageCount, page]);

  // Valores distintos por columna (para decidir dropdown vs texto), a partir de los datos actuales.
  const distinctByCol = useMemo(() => {
    if (!enableFilters || !showFilters) return {} as Record<string, string[]>;
    const map: Record<string, Set<string>> = {};
    visibleColumns.forEach((col, i) => {
      if (!isFilterable(col)) return;
      const key = colKeyOf(col, i);
      const set = new Set<string>();
      for (const item of searchedData) {
        const txt = getFilterText(col, item).trim();
        if (txt) set.add(txt);
        if (set.size > MAX_SELECT_OPTIONS) break;
      }
      map[key] = set;
    });
    const out: Record<string, string[]> = {};
    Object.entries(map).forEach(([k, s]) => { out[k] = [...s].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })); });
    return out;
  }, [visibleColumns, searchedData, enableFilters, showFilters]);

  const hasActiveFilters = Object.values(colFilters).some(v => v && v.trim());

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onSelectionChange) {
      onSelectionChange(e.target.checked ? sortedData.map(item => item.id) : []);
    }
  };

  const handleSelectOne = (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    if (onSelectionChange && selectedIds) {
      onSelectionChange(e.target.checked ? [...selectedIds, id] : selectedIds.filter(sid => sid !== id));
    }
  };

  const isAllSelected = selectedIds && sortedData.length > 0 && sortedData.every(it => selectedIds.includes(it.id));
  const colCount = visibleColumns.length + (onSelectionChange ? 1 : 0) + (actions ? 1 : 0);
  const showColumnChooser = columns.length > 1;
  const showToolbar = enableSearch || enableFilters || !!toolbarExtra || showColumnChooser;

  const from = total === 0 ? 0 : (currentPage - 1) * effectivePageSize + 1;
  const to = pageSize === 'all' ? total : Math.min(currentPage * effectivePageSize, total);

  // Barra de paginación (selector de filas + "Mostrando" + ‹ ›). Se muestra arriba y abajo.
  const paginationBar = (position: 'top' | 'bottom') => (!enablePagination || total === 0) ? null : (
    <div className={`flex flex-wrap items-center justify-between gap-3 px-3 py-2 ${position === 'top' ? 'border-b' : 'border-t'} border-neutral-200 dark:border-neutral-700 text-sm text-neutral-600 dark:text-neutral-300`}>
      <div className="flex items-center gap-2">
        <span>{t('cmp.datatable.rows_per_page')}</span>
        <select
          value={String(pageSize)}
          onChange={e => setPageSize(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          className="px-2 py-1 rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-200 focus:ring-1 focus:ring-primary"
        >
          {pageSizeOptions.map(o => (
            <option key={String(o)} value={String(o)}>{o === 'all' ? t('cmp.datatable.all') : o}</option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-3">
        <span>{t('cmp.datatable.showing', { from: String(from), to: String(to), total: String(total) })}</span>
        {pageSize !== 'all' && pageCount > 1 && (
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1}
              className="px-2 py-1 rounded border border-neutral-300 dark:border-neutral-600 disabled:opacity-40 hover:bg-neutral-50 dark:hover:bg-neutral-700">‹</button>
            <span className="px-1">{currentPage} / {pageCount}</span>
            <button type="button" onClick={() => setPage(p => Math.min(pageCount, p + 1))} disabled={currentPage >= pageCount}
              className="px-2 py-1 rounded border border-neutral-300 dark:border-neutral-600 disabled:opacity-40 hover:bg-neutral-50 dark:hover:bg-neutral-700">›</button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className={`min-w-0 bg-white dark:bg-neutral-800 shadow-md rounded-lg ${containerClassName}`}>
      {showToolbar && (
        <div className="flex flex-wrap items-center gap-2 p-3 border-b border-neutral-200 dark:border-neutral-700">
          {toolbarExtra}
          {enableSearch && (
            <div className="relative flex-grow min-w-[180px] max-w-sm">
              <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-neutral-400">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" /></svg>
              </span>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={searchPlaceholder || t('cmp.datatable.search_ph')}
                className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-100 focus:ring-1 focus:ring-primary focus:border-primary"
              />
            </div>
          )}
          {enableFilters && (
            <button
              type="button"
              onClick={() => setShowFilters(s => !s)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border transition-colors ${showFilters || hasActiveFilters ? 'border-primary text-primary bg-primary/10' : 'border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700'}`}
            >
              <FilterIcon />
              {t('cmp.datatable.filters')}
              {hasActiveFilters && <span className="ml-0.5 inline-flex items-center justify-center h-4 min-w-4 px-1 text-[10px] rounded-full bg-primary text-white">{Object.values(colFilters).filter(v => v && v.trim()).length}</span>}
            </button>
          )}
          {enableFilters && hasActiveFilters && (
            <button
              type="button"
              onClick={() => setColFilters({})}
              className="text-sm text-neutral-500 hover:text-red-500 underline"
            >
              {t('cmp.datatable.clear_filters')}
            </button>
          )}
          {showColumnChooser && (
            <div className="relative ml-auto">
              <button
                type="button"
                onClick={() => setShowColMenu(s => !s)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border transition-colors ${hiddenCols.size > 0 ? 'border-primary text-primary bg-primary/10' : 'border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700'}`}
              >
                <ColumnsIcon />
                {t('cmp.datatable.columns')}
                {hiddenCols.size > 0 && <span className="ml-0.5 inline-flex items-center justify-center h-4 min-w-4 px-1 text-[10px] rounded-full bg-primary text-white">{hiddenCols.size}</span>}
              </button>
              {showColMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowColMenu(false)} />
                  <div className="absolute right-0 mt-1 z-20 w-56 max-h-72 overflow-y-auto rounded-md border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 shadow-lg py-1">
                    <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500 border-b border-neutral-100 dark:border-neutral-700">{t('cmp.datatable.columns_show')}</div>
                    {columns.map((col, idx) => {
                      const id = columnId(col, idx);
                      const label = typeof col.header === 'string' ? col.header : id;
                      const checked = !hiddenCols.has(id);
                      return (
                        <label key={id} className="flex items-center gap-2 px-3 py-1.5 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 cursor-pointer">
                          <input type="checkbox" checked={checked} onChange={() => toggleCol(id)} className="h-4 w-4 rounded border-neutral-300 dark:border-neutral-600 text-primary focus:ring-primary" />
                          <span className="truncate">{label}</span>
                        </label>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {paginationBar('top')}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
          <thead className="bg-neutral-50 dark:bg-neutral-900">
            <tr>
              {onSelectionChange && (
                <th scope="col" className="px-4 py-2">
                  <input
                    type="checkbox"
                    className="form-checkbox h-4 w-4 text-primary rounded border-neutral-300 focus:ring-primary"
                    checked={!!isAllSelected}
                    onChange={handleSelectAll}
                    aria-label="Select all items"
                  />
                </th>
              )}
              {visibleColumns.map((col, idx) => {
                const key = columnSortKey(col);
                const sortable = isColumnSortable(col) && !!key;
                const direction = sortable && activeSort?.key === key ? activeSort.direction : null;
                return (
                  <th key={idx} scope="col" className={`px-4 py-2 text-left text-sm font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider ${col.className || ''}`}>
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => handleSort(key!)}
                        className="group inline-flex items-center uppercase tracking-wider font-medium hover:text-primary focus:outline-none"
                        aria-label={t('cmp.datatable.sort_by', { column: typeof col.header === 'string' ? col.header : key })}
                      >
                        <React.Fragment>{col.header}</React.Fragment>
                        <SortIndicator direction={direction} />
                      </button>
                    ) : (
                      <React.Fragment>{col.header}</React.Fragment>
                    )}
                  </th>
                );
              })}
              {actions && <th scope="col" className="px-4 py-2 text-left text-sm font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider">{t('common.actions')}</th>}
            </tr>
            {enableFilters && showFilters && (
              <tr className="bg-neutral-50/60 dark:bg-neutral-700/40">
                {onSelectionChange && <th className="px-4 py-1.5" />}
                {visibleColumns.map((col, idx) => {
                  const key = colKeyOf(col, idx);
                  if (!isFilterable(col)) return <th key={idx} className="px-2 py-1.5" />;
                  const options = distinctByCol[key] || [];
                  const useSelect = col.filterType === 'select' || (col.filterType !== 'text' && options.length > 0 && options.length <= MAX_SELECT_OPTIONS);
                  const val = colFilters[key] || '';
                  return (
                    <th key={idx} className="px-2 py-1.5 font-normal normal-case">
                      {useSelect ? (
                        <select
                          value={val}
                          onChange={e => setColFilters(f => ({ ...f, [key]: e.target.value }))}
                          className="w-full px-2 py-1 text-xs rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-200 focus:ring-1 focus:ring-primary"
                        >
                          <option value="">{t('cmp.datatable.all')}</option>
                          {options.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={val}
                          onChange={e => setColFilters(f => ({ ...f, [key]: e.target.value }))}
                          placeholder={t('cmp.datatable.filter_ph')}
                          className="w-full px-2 py-1 text-xs rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-200 focus:ring-1 focus:ring-primary"
                        />
                      )}
                    </th>
                  );
                })}
                {actions && <th className="px-2 py-1.5" />}
              </tr>
            )}
          </thead>
          <tbody className="bg-white dark:bg-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-700">
            {pagedData.map((item) => (
              <tr
                key={item.id}
                className={`hover:bg-neutral-50 dark:hover:bg-neutral-700/60 ${onRowClick ? 'cursor-pointer' : ''} ${selectedRowId === item.id ? 'bg-primary/10 dark:bg-primary/20' : ''}`}
                onClick={() => onRowClick?.(item)}
                aria-selected={selectedRowId === item.id}
              >
                {onSelectionChange && selectedIds && (
                  <td className="px-4 py-2">
                    <input
                      type="checkbox"
                      className="form-checkbox h-4 w-4 text-primary rounded border-neutral-300 focus:ring-primary"
                      checked={selectedIds.includes(item.id)}
                      onChange={(e) => handleSelectOne(e, item.id)}
                      onClick={(e) => e.stopPropagation()} // Prevent row click when clicking checkbox
                      aria-label={`Select item ${item.id}`}
                    />
                  </td>
                )}
                {visibleColumns.map((col, idx) => (
                  <td key={idx} className={`px-4 py-2 text-base text-neutral-700 dark:text-neutral-200 ${col.noWrap !== false ? 'whitespace-nowrap' : ''} ${col.className || ''}`}>
                    {typeof col.accessor === 'function' ? col.accessor(item) : String(item[col.accessor] ?? '')}
                  </td>
                ))}
                {actions && <td className="px-4 py-2 whitespace-nowrap text-base font-medium space-x-2" onClick={(e) => e.stopPropagation()}>{actions(item)}</td>}
              </tr>
            ))}
            {pagedData.length === 0 && (
              <tr>
                <td colSpan={colCount || 1} className="p-4 text-center text-neutral-500 dark:text-neutral-400">
                  {data.length === 0 ? t('cmp.datatable.no_data') : t('cmp.datatable.no_results')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {paginationBar('bottom')}
    </div>
  );
};
