import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../contexts/GlobalSettingsContext';
import { UserRole } from '../../types';
import { API_URL } from '../../services/api';

interface EventRow {
    id: string;
    at: string;
    type?: string;
    ipAddress?: string | null;
    name: string;
    email?: string | null;
    role?: string | null;
}
interface ActiveUser {
    userId: string;
    name: string;
    role?: string | null;
    lastSeenAt?: string | null;
    lastLoginAt?: string | null;
}

const roleLabel = (role?: string | null) => {
    switch (role) {
        case 'MANAGER': return 'Administrador';
        case 'EMPLOYEE': return 'Colaborador';
        default: return role || '—';
    }
};
const typeLabel = (type?: string) => (type === 'SESSION' ? 'Actividad' : 'Inicio de sesión');

/** "hace X" relativo, corto. */
const relative = (iso?: string | null) => {
    if (!iso) return 'Nunca';
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'Ahora mismo';
    if (m < 60) return `hace ${m} min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `hace ${h} h`;
    const d = Math.floor(h / 24);
    return `hace ${d} d`;
};

/**
 * Bitácora de accesos + actividad reciente del negocio. Solo MANAGER.
 * Como la sesión no expira, se muestra la "última actividad" (heartbeat) por
 * colaborador, además del log de inicios de sesión y sesiones retomadas.
 */
export const LoginActivityLog: React.FC = () => {
    const { currentUser } = useAuth();
    const { t } = useTranslation();
    const [events, setEvents] = useState<EventRow[]>([]);
    const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = () => {
        setLoading(true); setError('');
        fetch(`${API_URL}/settings/login-events`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('pazzi_token')}` } })
            .then(r => r.ok ? r.json() : Promise.reject())
            .then(data => {
                // Compat: la respuesta puede ser un array (versión vieja) o { activeUsers, events }.
                if (Array.isArray(data)) { setEvents(data); setActiveUsers([]); }
                else { setEvents(data.events || []); setActiveUsers(data.activeUsers || []); }
            })
            .catch(() => setError(t('adminx.logins.error')))
            .finally(() => setLoading(false));
    };

    useEffect(() => { if (currentUser?.role === UserRole.MANAGER) load(); }, [currentUser]);

    if (currentUser?.role !== UserRole.MANAGER) return null;

    return (
        <div className="space-y-6">
            {/* Actividad reciente por colaborador (última vez activo) */}
            <div className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow-md">
                <div className="flex items-center justify-between gap-3 mb-1 flex-wrap">
                    <h2 className="text-xl font-semibold text-primary">{t('adminx.logins.active_title')}</h2>
                    <button onClick={load} className="text-sm text-primary hover:underline">{t('adminx.logins.refresh')}</button>
                </div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">{t('adminx.logins.active_subtitle')}</p>
                {loading ? (
                    <p className="py-4 text-center text-neutral-500 dark:text-neutral-400">{t('adminx.logins.loading')}</p>
                ) : activeUsers.length === 0 ? (
                    <p className="py-4 text-center text-neutral-500 dark:text-neutral-400">—</p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {activeUsers.map(u => {
                            const online = u.lastSeenAt && (Date.now() - new Date(u.lastSeenAt).getTime()) < 6 * 60 * 1000;
                            return (
                                <div key={u.userId} className="flex items-center gap-3 border border-neutral-200 dark:border-neutral-700 rounded-lg p-3">
                                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${online ? 'bg-green-500' : 'bg-neutral-300 dark:bg-neutral-600'}`} title={online ? 'Activo ahora' : ''} />
                                    <div className="min-w-0">
                                        <div translate="no" className="font-medium text-neutral-800 dark:text-neutral-100 truncate">{u.name}</div>
                                        <div className="text-xs text-neutral-500 dark:text-neutral-400">{roleLabel(u.role)} · {relative(u.lastSeenAt || u.lastLoginAt)}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Log de accesos */}
            <div className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold text-primary mb-1">{t('adminx.logins.title')}</h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">{t('adminx.logins.subtitle')}</p>
                {loading ? (
                    <p className="py-6 text-center text-neutral-500 dark:text-neutral-400">{t('adminx.logins.loading')}</p>
                ) : error ? (
                    <p className="py-6 text-center text-red-600 dark:text-red-400">{error}</p>
                ) : events.length === 0 ? (
                    <p className="py-6 text-center text-neutral-500 dark:text-neutral-400">{t('adminx.logins.empty')}</p>
                ) : (
                    <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700 max-h-[50vh]">
                        <table className="min-w-full text-sm">
                            <thead className="bg-neutral-50 dark:bg-neutral-900/50 border-b border-neutral-200 dark:border-neutral-700 sticky top-0">
                                <tr>
                                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{t('adminx.logins.col_who')}</th>
                                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{t('adminx.logins.col_role')}</th>
                                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{t('adminx.logins.col_type')}</th>
                                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{t('adminx.logins.col_when')}</th>
                                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">IP</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700/60 text-neutral-700 dark:text-neutral-200">
                                {events.map(r => (
                                    <tr key={r.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/30">
                                        <td className="px-3 py-2">
                                            <div translate="no" className="font-medium text-neutral-800 dark:text-neutral-100">{r.name}</div>
                                            {r.email && <div className="text-xs text-neutral-400">{r.email}</div>}
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap text-xs text-neutral-500 dark:text-neutral-400">{roleLabel(r.role)}</td>
                                        <td className="px-3 py-2 whitespace-nowrap">
                                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${r.type === 'SESSION' ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300' : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'}`}>{typeLabel(r.type)}</span>
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap text-neutral-600 dark:text-neutral-300">{new Date(r.at).toLocaleString()}</td>
                                        <td className="px-3 py-2 whitespace-nowrap text-xs text-neutral-400 dark:text-neutral-500">{r.ipAddress || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LoginActivityLog;
