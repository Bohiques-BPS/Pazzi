
import React from 'react';
import { AlertsConfiguration } from '../../components/admin/AlertsConfiguration';
import { useTranslation } from '../../contexts/GlobalSettingsContext';

export const AdminDashboardPage: React.FC = () => {
    const { t } = useTranslation();
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-neutral-800 dark:text-neutral-100">
                    {t('admin.dashboard.title')}
                </h1>
                <p className="mt-1 text-lg text-neutral-500 dark:text-neutral-400">
                    {t('admin.dashboard.subtitle')}
                </p>
            </div>

            <AlertsConfiguration />

            {/* Future admin components can be added here */}
        </div>
    );
};
