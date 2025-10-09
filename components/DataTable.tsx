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
  // New props for multi-selection
  selectedIds?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
}
export const DataTable = <T extends {id: string}>({ data, columns, actions, onRowClick, selectedRowId, selectedIds, onSelectionChange }: TableProps<T>): React.ReactNode => {
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onSelectionChange) {
      if (e.target.checked) {
        onSelectionChange(data.map(item => item.id));
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

  const isAllSelected = selectedIds && data.length > 0 && selectedIds.length === data.length;
  
  return (
    <div className="overflow-x-auto bg-white dark:bg-neutral-800 shadow-md rounded-lg">
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
            {columns.map((col, idx) => (
              <th key={idx} scope="col" className={`px-4 py-2 text-left text-sm font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider ${col.className || ''}`}>
                <React.Fragment>{col.header}</React.Fragment> {/* Wrapped col.header */}
              </th>
            ))}
            {actions && <th scope="col" className="px-4 py-2 text-left text-sm font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider">Acciones</th>}
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
                <td key={idx} className={`px-4 py-2 whitespace-nowrap text-base text-neutral-700 dark:text-neutral-200 ${col.className || ''}`}>
                  {typeof col.accessor === 'function' ? col.accessor(item) : String(item[col.accessor] ?? '')}
                </td>
              ))}
              {actions && <td className="px-4 py-2 whitespace-nowrap text-base font-medium space-x-2">{actions(item)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
       {data.length === 0 && <p className="p-4 text-center text-neutral-500 dark:text-neutral-400">No hay datos disponibles.</p>}
    </div>
  );
};