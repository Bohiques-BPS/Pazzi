
import React from 'react';

export interface TableColumn<T> {
  header: string | React.ReactNode; // Changed from string to string | React.ReactNode
  accessor: keyof T | ((item: T) => React.ReactNode);
  className?: string; 
}
export interface TableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  actions?: (item: T) => React.ReactNode;
  onRowClick?: (item:T) => void;
  selectedRowId?: string | null;
}
export const DataTable = <T extends {id: string}, >({ data, columns, actions, onRowClick, selectedRowId }: TableProps<T>): React.ReactNode => {
  return (
    <div className="overflow-x-auto bg-white dark:bg-neutral-800 shadow-md rounded-lg">
      <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
        <thead className="bg-neutral-50 dark:bg-neutral-700">
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} scope="col" className={`px-4 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider ${col.className || ''}`}>
                <React.Fragment>{col.header}</React.Fragment> {/* Wrapped col.header */}
              </th>
            ))}
            {actions && <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider">Acciones</th>}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-700">
          {data.map((item) => (
            <tr 
              key={item.id} 
              className={`hover:bg-neutral-50 dark:hover:bg-neutral-700 ${onRowClick ? 'cursor-pointer' : ''} ${selectedRowId === item.id ? 'bg-primary/10 dark:bg-primary/20' : ''}`}
              onClick={() => onRowClick?.(item)}
              aria-selected={selectedRowId === item.id}
            >
              {columns.map((col, idx) => (
                <td key={idx} className={`px-4 py-2 whitespace-nowrap text-sm text-neutral-700 dark:text-neutral-200 ${col.className || ''}`}>
                  {typeof col.accessor === 'function' ? col.accessor(item) : String(item[col.accessor] ?? '')}
                </td>
              ))}
              {actions && <td className="px-4 py-2 whitespace-nowrap text-sm font-medium space-x-2">{actions(item)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
       {data.length === 0 && <p className="p-4 text-center text-neutral-500 dark:text-neutral-400">No hay datos disponibles.</p>}
    </div>
  );
};
    