import React, { ReactNode } from 'react';

/**
 * Empty state reutilizable para listas vacías, búsquedas sin resultados, etc.
 *
 * Uso:
 *   <EmptyState
 *     icon={<UserIcon className="w-12 h-12" />}
 *     title="Sin colaboradores"
 *     description="Aún no tienes colaboradores. Crea uno para empezar."
 *     cta={<button onClick={openForm} className={BUTTON_PRIMARY_SM_CLASSES}>+ Nuevo colaborador</button>}
 *   />
 */

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  cta?: ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, cta, className = '' }) => (
  <div
    className={`flex flex-col items-center justify-center text-center py-12 px-6 ${className}`}
    role="status"
  >
    {icon && (
      <div className="mb-4 text-neutral-400 dark:text-neutral-500">
        {icon}
      </div>
    )}
    <h3 className="text-base font-semibold text-neutral-800 dark:text-neutral-200">{title}</h3>
    {description && (
      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400 max-w-md">{description}</p>
    )}
    {cta && <div className="mt-4">{cta}</div>}
  </div>
);
