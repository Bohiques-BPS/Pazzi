
import React from 'react';
import { VisitStatus } from '../../types'; // Adjusted path

interface VisitStatusBadgeProps {
    status: VisitStatus;
}

export const VisitStatusBadge: React.FC<VisitStatusBadgeProps> = ({ status }) => {
    const colors: Record<VisitStatus, string> = {
        [VisitStatus.PROGRAMADO]: 'bg-teal-100 text-teal-700 dark:bg-teal-700 dark:text-teal-100',
        [VisitStatus.REAGENDADO]: 'bg-amber-100 text-amber-700 dark:bg-amber-600 dark:text-amber-100',
        [VisitStatus.COMPLETADO]: 'bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-100',
        [VisitStatus.CANCELADO]: 'bg-red-100 text-red-700 dark:bg-red-600 dark:text-red-100',
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status]}`}>{status}</span>;
};
