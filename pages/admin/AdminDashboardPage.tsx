
import React from 'react';
import { AlertsConfiguration } from '../../components/admin/AlertsConfiguration';

export const AdminDashboardPage: React.FC = () => {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-neutral-800 dark:text-neutral-100">
                    Panel de Administración
                </h1>
                <p className="mt-1 text-lg text-neutral-500 dark:text-neutral-400">
                    Configure las opciones globales y las alertas del sistema.
                </p>
            </div>

            <AlertsConfiguration />

            {/* Future admin components can be added here */}
            {/* 
            <div className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold text-primary mb-4">Otra Sección de Admin</h2>
                <p>Contenido futuro...</p>
            </div> 
            */}
        </div>
    );
};