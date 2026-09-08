import React, { useEffect, useState } from 'react';
import { projectsService, ProjectActivityItem } from '../../services/projects';
import { ActivityHistoryView } from '../../components/pm/ProjectHistoryTab';
import { useTranslation } from '../../contexts/GlobalSettingsContext';

/** Histórico GLOBAL: actividad de todos los proyectos accesibles. */
export const ProjectsHistoryPage: React.FC = () => {
    const { t } = useTranslation();
    const [items, setItems] = useState<ProjectActivityItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;
        setLoading(true); setError('');
        projectsService.getAllActivity()
            .then(data => { if (active) setItems(Array.isArray(data) ? data : []); })
            .catch(() => { if (active) setError('No se pudo cargar el histórico.'); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, []);

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-neutral-800 dark:text-neutral-100">{t('pm2x.history.title')}</h1>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">{t('pm2x.history.subtitle')}</p>
            </div>
            <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 shadow-sm">
                <ActivityHistoryView items={items} loading={loading} error={error} showProject maxHeightClass="max-h-[70vh]" />
            </div>
        </div>
    );
};

export default ProjectsHistoryPage;
