import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../contexts/GlobalSettingsContext';
import { UserRole } from '../../types';
import { API_URL } from '../../services/api';

interface LoginEventRow {
    id: string;
    at: string;
    ipAddress?: string | null;
    name: string;
    email?: string | null;
    role?: string | null;
}

const roleLabel = (role?: string | null) => {
    switch (role) {
        case 'MANAGER': return 'Administrador';
        case 'EMPLOYEE': return 'Colaborador';
        default: return role || '—';
    }
};

/**
 * Bitácora de accesos (logins) del negocio. Solo MANAGER.
 * Muestra cuándo entró cada empleado a la web (fecha/hora, rol e IP).
 */
export const LoginActivityLog: React.FC = () => {
    const { currentUser } = useAuth();
    const { t } = useTranslation();
    const [rows, setRows] = useState<LoginEventRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = () => {
        setLoading(true); setError('');
        fetch(`${API_URL}/settings/login-events`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('pazzi_token')}` } })
            .then(r => r.ok ? r.json() : Promise.reject())
            .then(data => setRows(Array.isArray(data) ? data : []))
            .catch(() => setError(t('adminx.logins.error')))
            .finally(() => setLoading(false));
    };

    useEffect(() => { if (currentUser?.role === UserRole.MANAGER) load(); }, [currentUser]);

    if (currentUser?.role !== UserRole.MANAGER) return null;

    return (
        <div className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between gap-3 mb-1 flex-wrap">
                <h2 className="text-xl font-semibold text-primary">{t('adminx.logins.title')}</h2>
                <button onClick={load} className="text-sm text-primary hover:underline">{t('adminx.logins.refresh')}</button>
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">{t('adminx.logins.subtitle')}</p>

            {loading ? (
                <p className="py-6 text-center text-neutral-500 dark:text-neutral-400">{t('adminx.logins.loading')}</p>
            ) : error ? (
                <p className="py-6 text-center text-red-600 dark:text-red-400">{error}</p>
            ) : rows.length === 0 ? (
                <p className="py-6 text-center text-neutral-500 dark:text-neutral-400">{t('adminx.logins.empty')}</p>
            ) : (
                <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700 max-h-[50vh]">
                    <table className="min-w-full text-sm">
                        <thead className="bg-neutral-50 dark:bg-neutral-900/50 border-b border-neutral-200 dark:border-neutral-700 sticky top-0">
                            <tr>
                                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{t('adminx.logins.col_who')}</th>
                                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{t('adminx.logins.col_role')}</th>
                                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{t('adminx.logins.col_when')}</th>
                                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">IP</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700/60 text-neutral-700 dark:text-neutral-200">
                            {rows.map(r => (
                                <tr key={r.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/30">
                                    <td className="px-3 py-2">
                                        <div translate="no" className="font-medium text-neutral-800 dark:text-neutral-100">{r.name}</div>
                                        {r.email && <div className="text-xs text-neutral-400">{r.email}</div>}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-neutral-500 dark:text-neutral-400">{roleLabel(r.role)}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-neutral-600 dark:text-neutral-300">{new Date(r.at).toLocaleString()}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-neutral-400 dark:text-neutral-500">{r.ipAddress || '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default LoginActivityLog;
