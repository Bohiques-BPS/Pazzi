import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Notification } from '../types';
import { notificationsService } from '../services/notifications';
import { useData } from '../contexts/DataContext';
import { useAppContext } from '../contexts/AppContext';
import { AppModule } from '../types';
import { useTranslation } from '../contexts/GlobalSettingsContext';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import { BUTTON_SECONDARY_SM_CLASSES } from '../constants';

const PAGE_SIZE = 20;

const formatWhen = (iso: string) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString();
};

export const NotificationsPage: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { markNotificationAsRead, markAllNotificationsAsRead } = useData();
    const { setCurrentModule } = useAppContext();

    const [items, setItems] = useState<Notification[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    const load = useCallback(async (p: number) => {
        setLoading(true);
        try {
            const res = await notificationsService.listPaged(p, PAGE_SIZE);
            setItems(res.items || []);
            setTotal(res.total || 0);
            setPage(res.page || p);
        } catch {
            setItems([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(page); }, [page, load]);

    const onClickNotification = (n: Notification) => {
        if (!n.read) {
            markNotificationAsRead(n.id);
            setItems(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
        }
        if (n.link) {
            let to = n.link.startsWith('#') ? n.link.slice(1) : n.link;
            if (to.startsWith('/pos/invoices') && !/[?&]invoice=/.test(to)) {
                const m = /#(\d+)/.exec(n.message || '');
                if (m) to += (to.includes('?') ? '&' : '?') + 'invoiceNo=' + m[1];
            }
            if (to.startsWith('/pos')) setCurrentModule(AppModule.POS);
            navigate(to);
        }
    };

    const onMarkAll = async () => {
        markAllNotificationsAsRead();
        setItems(prev => prev.map(x => ({ ...x, read: true })));
    };

    return (
        <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between gap-3 mb-5">
                <div>
                    <h1 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">{t('cmp.navbar.notifications') || 'Notificaciones'}</h1>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">{total} {total === 1 ? 'notificación' : 'notificaciones'}</p>
                </div>
                <button type="button" onClick={onMarkAll} className={BUTTON_SECONDARY_SM_CLASSES}>
                    {t('cmp.navbar.mark_all_read') || 'Marcar todas como leídas'}
                </button>
            </div>

            <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-4"><LoadingSkeleton variant="list" rows={8} /></div>
                ) : items.length === 0 ? (
                    <p className="text-center text-neutral-500 dark:text-neutral-400 py-12">{t('cmp.navbar.no_notifications') || 'No tienes notificaciones.'}</p>
                ) : (
                    <ul className="divide-y divide-neutral-100 dark:divide-neutral-700/60">
                        {items.map(n => (
                            <li key={n.id}>
                                <button
                                    type="button"
                                    onClick={() => onClickNotification(n)}
                                    className={`w-full text-left px-4 py-3.5 flex items-start gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-700/40 transition-colors ${!n.read ? 'bg-primary/5 dark:bg-primary/10' : ''}`}
                                >
                                    <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${!n.read ? 'bg-primary dark:bg-accent' : 'bg-transparent'}`} aria-hidden="true" />
                                    <div className="min-w-0 flex-1">
                                        <p className={`text-base font-medium ${!n.read ? 'text-primary dark:text-accent' : 'text-neutral-800 dark:text-neutral-100'}`}>{n.title}</p>
                                        <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-0.5">{n.message}</p>
                                        <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">{formatWhen(n.timestamp)}</p>
                                    </div>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                    <button
                        type="button"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page <= 1 || loading}
                        className={`${BUTTON_SECONDARY_SM_CLASSES} disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                        ← {t('common.previous') || 'Anterior'}
                    </button>
                    <span className="text-sm text-neutral-500 dark:text-neutral-400">
                        {t('common.page') || 'Página'} {page} / {totalPages}
                    </span>
                    <button
                        type="button"
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages || loading}
                        className={`${BUTTON_SECONDARY_SM_CLASSES} disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                        {t('common.next') || 'Siguiente'} →
                    </button>
                </div>
            )}
        </div>
    );
};
