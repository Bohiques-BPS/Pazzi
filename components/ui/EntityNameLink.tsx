import React from 'react';
import { useNavigate } from 'react-router-dom';

const baseCls = 'text-primary hover:underline hover:text-secondary dark:text-teal-400 dark:hover:text-teal-300 text-left';

/**
 * Nombre de cliente clickeable → abre su perfil (edición) en la lista de clientes.
 * Si no hay `clientId`, muestra el nombre como texto plano.
 */
export const ClientNameLink: React.FC<{ clientId?: string | null; name?: React.ReactNode; className?: string }> = ({ clientId, name, className }) => {
    const navigate = useNavigate();
    const label = name || '—';
    if (!clientId) return <span className={className}>{label}</span>;
    return (
        <button
            type="button"
            onClick={(e) => { e.stopPropagation(); navigate(`/tienda/clients?edit=${clientId}`); }}
            className={`${baseCls} ${className || ''}`}
            title="Ver / editar cliente"
        >
            {label}
        </button>
    );
};

/**
 * Nombre de empleado/cajero clickeable → abre su perfil (edición) en la lista de colaboradores.
 * Acepta `employeeId` (directo) o `userId` (cajero: se resuelve al empleado por su userId).
 */
export const EmployeeNameLink: React.FC<{ employeeId?: string | null; userId?: string | null; name?: React.ReactNode; className?: string }> = ({ employeeId, userId, name, className }) => {
    const navigate = useNavigate();
    const label = name || '—';
    const target = employeeId ? `/tienda/employees?edit=${employeeId}` : userId ? `/tienda/employees?editUser=${userId}` : null;
    if (!target) return <span className={className}>{label}</span>;
    return (
        <button
            type="button"
            onClick={(e) => { e.stopPropagation(); navigate(target); }}
            className={`${baseCls} ${className || ''}`}
            title="Ver / editar colaborador"
        >
            {label}
        </button>
    );
};
