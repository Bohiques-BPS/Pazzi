import React, { useMemo, useState } from 'react';

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
}

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
    <span className={direction === 'asc' ? 'text-primary' : 'text-neutral-300 dark:text-neutral-500'}>▲</span>
    <span className={direction === 'desc' ? 'text-primary' : 'text-neutral-300 dark:text-neutral-500'}>▼</span>
  </span>
);

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
}: TableProps<T>): React.ReactNode => {
  const controlled = typeof onSortChange === 'function';
  const [internalSort, setInternalSort] = useState<SortState | null>(defaultSort);
  const activeSort = controlled ? (sortState ?? null) : internalSort;

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

  const sortedData = useMemo(() => {
    if (controlled || !activeSort) return data;
    const col = columns.find(c => columnSortKey(c) === activeSort.key);
    if (!col) return data;
    const dir = activeSort.direction === 'asc' ? 1 : -1;
    return [...data].sort((a, b) => compareValues(getSortValue(col, a), getSortValue(col, b)) * dir);
  }, [data, columns, activeSort, controlled]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onSelectionChange) {
      if (e.target.checked) {
        onSelectionChange(sortedData.map(item => item.id));
      } else {
        onSelectionChange([]);
      }
    }
  };

  const handleSelectOne = (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    if (onSelectionChange && selectedIds) {
      if (e.target.checked) {
        onSelectionChange([...selectedIds, id]);
      } else {
        onSelectionChange(selectedIds.filter(selectedId => selectedId !== id));
      }
    }
  };

  const isAllSelected = selectedIds && sortedData.length > 0 && selectedIds.length === sortedData.length;

  return (
    <div className={`overflow-x-auto min-w-0 bg-white dark:bg-neutral-800 shadow-md rounded-lg ${containerClassName}`}>
      <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
        <thead className="bg-neutral-50 dark:bg-neutral-700">
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
            {columns.map((col, idx) => {
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
                      aria-label={`Ordenar por ${typeof col.header === 'string' ? col.header : key}`}
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
            {actions && <th scope="col" className="px-4 py-2 text-left text-sm font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider">Acciones</th>}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-700">
          {sortedData.map((item) => (
            <tr
              key={item.id}
              className={`hover:bg-neutral-50 dark:hover:bg-neutral-700 ${onRowClick ? 'cursor-pointer' : ''} ${selectedRowId === item.id ? 'bg-primary/10 dark:bg-primary/20' : ''}`}
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
              {columns.map((col, idx) => (
                <td key={idx} className={`px-4 py-2 text-base text-neutral-700 dark:text-neutral-200 ${col.noWrap !== false ? 'whitespace-nowrap' : ''} ${col.className || ''}`}>
                  {typeof col.accessor === 'function' ? col.accessor(item) : String(item[col.accessor] ?? '')}
                </td>
              ))}
              {actions && <td className="px-4 py-2 whitespace-nowrap text-base font-medium space-x-2">{actions(item)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
       {sortedData.length === 0 && <p className="p-4 text-center text-neutral-500 dark:text-neutral-400">No hay datos disponibles.</p>}
    </div>
  );
};
