import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from '../../contexts/GlobalSettingsContext';

/**
 * Utilidades para dar orden por columna + paginación a tablas CUSTOM (con acordeón, agrupaciones,
 * etc.) que no pueden usar <DataTable/>. Mantienen el markup de la tabla; solo aportan la lógica y
 * dos piezas de UI (encabezado ordenable y pie de paginación).
 */

export type SortDirection = 'asc' | 'desc';
export interface SortState { key: string; direction: SortDirection; }

export const compareValues = (a: any, b: any): number => {
  const aEmpty = a === null || a === undefined || a === '';
  const bEmpty = b === null || b === undefined || b === '';
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1;
  if (bEmpty) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'boolean' && typeof b === 'boolean') return a === b ? 0 : (a ? 1 : -1);
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
};

/** Orden por columna en cliente. `getValue(row, key)` devuelve el valor a comparar de esa columna. */
export function useSortableRows<T>(rows: T[], getValue: (row: T, key: string) => any, initial: SortState | null = null) {
  const [sort, setSort] = useState<SortState | null>(initial);
  const toggle = (key: string) => setSort(s =>
    !s || s.key !== key ? { key, direction: 'asc' } : s.direction === 'asc' ? { key, direction: 'desc' } : null
  );
  const sorted = useMemo(() => {
    if (!sort) return rows;
    const dir = sort.direction === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => compareValues(getValue(a, sort.key), getValue(b, sort.key)) * dir);
  }, [rows, sort, getValue]);
  return { sorted, sort, toggle };
}

/** Paginación en cliente con selector de filas por página. */
export function usePagination<T>(rows: T[], initialSize: number | 'all' = 25) {
  const [pageSize, setPageSize] = useState<number | 'all'>(initialSize);
  const [page, setPage] = useState(1);
  const total = rows.length;
  const size = pageSize === 'all' ? (total || 1) : pageSize;
  const pageCount = Math.max(1, Math.ceil(total / size));
  const current = Math.min(page, pageCount);
  const paged = useMemo(
    () => (pageSize === 'all' ? rows : rows.slice((current - 1) * size, current * size)),
    [rows, pageSize, current, size]
  );
  useEffect(() => { setPage(1); }, [total, pageSize]);
  const from = total === 0 ? 0 : (current - 1) * size + 1;
  const to = pageSize === 'all' ? total : Math.min(current * size, total);
  return { paged, page: current, setPage, pageSize, setPageSize, total, pageCount, from, to };
}

const SortIndicator: React.FC<{ direction: SortDirection | null }> = ({ direction }) => (
  <span className="inline-flex flex-col ml-1 -space-y-1 align-middle leading-none">
    <span className={direction === 'asc' ? 'text-primary' : 'text-neutral-300 dark:text-neutral-400'}>▲</span>
    <span className={direction === 'desc' ? 'text-primary' : 'text-neutral-300 dark:text-neutral-400'}>▼</span>
  </span>
);

/** <th> ordenable con el mismo look que <DataTable/>. */
export const SortableTh: React.FC<{
  label: React.ReactNode;
  colKey: string;
  sort: SortState | null;
  onSort: (key: string) => void;
  align?: 'left' | 'right' | 'center';
  className?: string;
}> = ({ label, colKey, sort, onSort, align = 'left', className = '' }) => {
  const dir = sort?.key === colKey ? sort.direction : null;
  const alignCls = align === 'right' ? 'text-right justify-end' : align === 'center' ? 'text-center justify-center' : 'text-left';
  return (
    <th scope="col" className={`px-4 py-2 text-sm font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider ${align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'} ${className}`}>
      <button
        type="button"
        onClick={() => onSort(colKey)}
        className={`group inline-flex items-center uppercase tracking-wider font-medium hover:text-primary focus:outline-none ${alignCls}`}
      >
        <span>{label}</span>
        <SortIndicator direction={dir} />
      </button>
    </th>
  );
};

/** Pie de paginación con selector de filas por página (mismo estilo que <DataTable/>). */
export const PaginationFooter: React.FC<{
  total: number;
  page: number;
  pageCount: number;
  pageSize: number | 'all';
  from: number;
  to: number;
  onPage: (p: number) => void;
  onPageSize: (s: number | 'all') => void;
  options?: (number | 'all')[];
}> = ({ total, page, pageCount, pageSize, from, to, onPage, onPageSize, options = [10, 25, 50, 100, 'all'] }) => {
  const { t } = useTranslation();
  if (total === 0) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 border-t border-neutral-200 dark:border-neutral-700 text-sm text-neutral-600 dark:text-neutral-300">
      <div className="flex items-center gap-2">
        <span>{t('cmp.datatable.rows_per_page')}</span>
        <select
          value={String(pageSize)}
          onChange={e => onPageSize(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          className="px-2 py-1 rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-200 focus:ring-1 focus:ring-primary"
        >
          {options.map(o => <option key={String(o)} value={String(o)}>{o === 'all' ? t('cmp.datatable.all') : o}</option>)}
        </select>
      </div>
      <div className="flex items-center gap-3">
        <span>{t('cmp.datatable.showing', { from: String(from), to: String(to), total: String(total) })}</span>
        {pageSize !== 'all' && pageCount > 1 && (
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => onPage(Math.max(1, page - 1))} disabled={page <= 1}
              className="px-2 py-1 rounded border border-neutral-300 dark:border-neutral-600 disabled:opacity-40 hover:bg-neutral-50 dark:hover:bg-neutral-700">‹</button>
            <span className="px-1">{page} / {pageCount}</span>
            <button type="button" onClick={() => onPage(Math.min(pageCount, page + 1))} disabled={page >= pageCount}
              className="px-2 py-1 rounded border border-neutral-300 dark:border-neutral-600 disabled:opacity-40 hover:bg-neutral-50 dark:hover:bg-neutral-700">›</button>
          </div>
        )}
      </div>
    </div>
  );
};
