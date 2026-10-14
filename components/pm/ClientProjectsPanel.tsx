import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useTranslation } from '../../contexts/GlobalSettingsContext';
import { useAuth } from '../../contexts/AuthContext';
import { projectsService, type ClientProjectSummary } from '../../services/projects';
import { ApiError } from '../../services/api';
import { Modal } from '../Modal';
import { ChevronDownIcon, InformationCircleIcon, UserPlusIcon } from '../icons';
import { inputFormStyle, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import { ProjectStatus, UserRole } from '../../types';

/** Cuántos proyectos se muestran antes de "Ver todos". */
const COLLAPSED_COUNT = 3;
const ROW_BTN = ' !text-xs !py-1 !px-2.5';

const STATUS_COLORS: Record<string, string> = {
    [ProjectStatus.ACTIVE]: 'bg-blue-100 text-blue-700 dark:bg-blue-700 dark:text-blue-100',
    [ProjectStatus.COMPLETED]: 'bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-100',
    [ProjectStatus.PAUSED]: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-600 dark:text-yellow-100',
    [ProjectStatus.PENDING]: 'bg-orange-100 text-orange-700 dark:bg-orange-600 dark:text-orange-100',
};

/** Mensaje de error traducido según el `code` del backend (si se conoce). */
export function joinRequestErrorMessage(err: unknown, t: (k: string, p?: any) => string, fallbackKey: string): string {
    if (err instanceof ApiError) {
        const map: Record<string, string> = {
            join_not_eligible: 'pm2x.joinreq.err_not_eligible',
            join_already_member: 'pm2x.joinreq.err_already_member',
            join_already_pending: 'pm2x.joinreq.err_already_pending',
            join_manager: 'pm2x.joinreq.err_manager',
            join_already_decided: 'pm2x.joinreq.err_already_decided',
        };
        if (err.code && map[err.code]) return t(map[err.code]);
        if (err.message) return err.message;
    }
    return t(fallbackKey);
}

/**
 * "Proyectos de este cliente" en el formulario de Crear Nuevo Proyecto: lista mínima de los
 * proyectos existentes del cliente para evitar duplicados, con acceso directo ("Abrir") o
 * "Solicitar unirme" para quien no es miembro.
 */
export const ClientProjectsPanel: React.FC<{ clientId: string }> = ({ clientId }) => {
    const { t, lang } = useTranslation();
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const isManager = currentUser?.role === UserRole.MANAGER;

    const [items, setItems] = useState<ClientProjectSummary[]>([]);
    const [loading, setLoading] = useState(false);
    const [failed, setFailed] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const [showAll, setShowAll] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);
    // Modal de "Solicitar unirme".
    const [requestFor, setRequestFor] = useState<ClientProjectSummary | null>(null);
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);

    const load = useCallback(async () => {
        if (!clientId) return;
        setLoading(true);
        setFailed(false);
        try {
            const r = await projectsService.getClientSummary(clientId);
            setItems(Array.isArray(r?.projects) ? r.projects : []);
        } catch {
            setItems([]);
            setFailed(true);
        } finally {
            setLoading(false);
        }
    }, [clientId]);

    useEffect(() => {
        setShowAll(false);
        setCollapsed(false);
        load();
    }, [load]);

    const fmtDate = (iso?: string | null) => {
        if (!iso) return '';
        const d = new Date(String(iso).split('T')[0] + 'T00:00:00');
        return isNaN(d.getTime()) ? '' : d.toLocaleDateString(lang === 'en' ? 'en-US' : 'es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const datesLabel = (p: ClientProjectSummary) => {
        const start = fmtDate(p.workStartDate);
        const end = fmtDate(p.workEndDate);
        if (start && end) return t('pm2x.joinreq.dates_range', { start, end });
        if (start) return t('pm2x.joinreq.dates_start', { start });
        const visit = fmtDate(p.visitDate);
        if (visit) return t('pm2x.joinreq.dates_visit', { date: visit });
        return t('pm2x.joinreq.dates_created', { date: fmtDate(p.createdAt) });
    };

    const openRequest = (p: ClientProjectSummary) => { setMessage(''); setRequestFor(p); };

    const sendRequest = async () => {
        if (!requestFor || sending) return;
        setSending(true);
        try {
            await projectsService.requestJoin(requestFor.id, message.trim() || undefined);
            toast.success(t('pm2x.joinreq.sent_toast'));
            setRequestFor(null);
            await load();
        } catch (err) {
            toast.error(joinRequestErrorMessage(err, t, 'pm2x.joinreq.send_error'));
            if (err instanceof ApiError && (err.code === 'join_already_pending' || err.code === 'join_already_member')) {
                setRequestFor(null);
                load();
            }
        } finally {
            setSending(false);
        }
    };

    const cancelRequest = async (p: ClientProjectSummary) => {
        if (!p.joinRequest.id) return;
        setBusyId(p.id);
        try {
            await projectsService.cancelJoinRequest(p.id, p.joinRequest.id);
            toast.success(t('pm2x.joinreq.cancelled_toast'));
            await load();
        } catch (err) {
            toast.error(joinRequestErrorMessage(err, t, 'pm2x.joinreq.cancel_error'));
            load();
        } finally {
            setBusyId(null);
        }
    };

    if (!clientId) return null;

    const visible = showAll ? items : items.slice(0, COLLAPSED_COUNT);

    return (
        <div className="mt-2">
            <button
                type="button"
                onClick={() => setCollapsed(c => !c)}
                className="flex items-center gap-1 text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1 hover:text-primary"
                aria-expanded={!collapsed}
            >
                <ChevronDownIcon className={`w-4 h-4 transition-transform ${collapsed ? '-rotate-90' : ''}`} />
                <span translate="no">{t('pm2x.joinreq.client_projects', { n: loading ? '…' : items.length })}</span>
            </button>

            {!collapsed && (
                <div className="p-3 border border-neutral-200 dark:border-neutral-700 rounded-md space-y-2">
                    {loading && items.length === 0 ? (
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">{t('pm2x.joinreq.loading')}</p>
                    ) : failed ? (
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">{t('pm2x.joinreq.load_error')}</p>
                    ) : items.length === 0 ? (
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">{t('pm2x.joinreq.no_projects')}</p>
                    ) : (
                        <>
                            <div className="flex items-start gap-2 text-xs text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2">
                                <InformationCircleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                <span>{t('pm2x.joinreq.duplicate_hint')}</span>
                            </div>
                            <ul className="space-y-2">
                                {visible.map(p => {
                                    const jr = p.joinRequest?.status || 'none';
                                    const canRequest = !isManager && !p.isMember;
                                    return (
                                        <li key={p.id} className="p-2.5 rounded-md bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 flex flex-col sm:flex-row sm:items-center gap-2">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    <span className="text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate" translate="no">{p.name}</span>
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p.status] || 'bg-neutral-100 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200'}`}>{p.status}</span>
                                                    {p.isMember && (
                                                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">{t('pm2x.joinreq.member_badge')}</span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                                                    <span translate="no">{datesLabel(p)}</span>
                                                    <span> · </span>
                                                    <span translate="no">{t('pm2x.joinreq.members_count', { n: p.memberCount })}</span>
                                                </p>
                                                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                                    <span translate="no">{p.managers.length ? t('pm2x.joinreq.managers', { names: p.managers.join(', ') }) : t('pm2x.joinreq.no_managers')}</span>
                                                </p>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2 sm:justify-end flex-shrink-0">
                                                {p.canOpen && (
                                                    <button type="button" onClick={() => navigate(`/pm/projects/${p.id}?tab=details`)} className={BUTTON_SECONDARY_SM_CLASSES + ROW_BTN}>
                                                        {t('pm2x.joinreq.open')}
                                                    </button>
                                                )}
                                                {canRequest && jr === 'none' && (
                                                    <button type="button" onClick={() => openRequest(p)} className={BUTTON_PRIMARY_SM_CLASSES + ROW_BTN + ' inline-flex items-center gap-1'}>
                                                        <UserPlusIcon className="w-4 h-4" />
                                                        {t('pm2x.joinreq.request')}
                                                    </button>
                                                )}
                                                {canRequest && jr === 'pending' && (
                                                    <>
                                                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-600 dark:text-yellow-100">{t('pm2x.joinreq.pending_badge')}</span>
                                                        <button type="button" onClick={() => cancelRequest(p)} disabled={busyId === p.id} className="text-xs text-red-600 dark:text-red-400 hover:underline disabled:opacity-50">
                                                            {t('pm2x.joinreq.cancel_request')}
                                                        </button>
                                                    </>
                                                )}
                                                {canRequest && jr === 'rejected' && (
                                                    <>
                                                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" title={p.joinRequest.decidedAt ? fmtDate(p.joinRequest.decidedAt) : undefined}>{t('pm2x.joinreq.rejected_badge')}</span>
                                                        <button type="button" onClick={() => openRequest(p)} className={BUTTON_SECONDARY_SM_CLASSES + ROW_BTN}>
                                                            {t('pm2x.joinreq.request_again')}
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                            {items.length > COLLAPSED_COUNT && (
                                <button type="button" onClick={() => setShowAll(s => !s)} className="text-xs text-primary hover:underline">
                                    {showAll ? t('pm2x.joinreq.show_less') : t('pm2x.joinreq.show_all', { n: items.length })}
                                </button>
                            )}
                        </>
                    )}
                </div>
            )}

            <Modal
                isOpen={!!requestFor}
                onClose={() => { if (!sending) setRequestFor(null); }}
                title={t('pm2x.joinreq.modal_title')}
                size="md"
                footer={
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setRequestFor(null)} disabled={sending} className={BUTTON_SECONDARY_SM_CLASSES}>{t('common.cancel')}</button>
                        <button type="button" onClick={sendRequest} disabled={sending} className={BUTTON_PRIMARY_SM_CLASSES}>{sending ? t('pm2x.joinreq.sending') : t('pm2x.joinreq.send')}</button>
                    </div>
                }
            >
                {requestFor && (
                    <div className="space-y-3">
                        <p className="text-sm text-neutral-700 dark:text-neutral-200">
                            <span translate="no">{t('pm2x.joinreq.modal_desc', { name: requestFor.name })}</span>
                        </p>
                        <div>
                            <label htmlFor="join-request-message" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">{t('pm2x.joinreq.message_label')}</label>
                            <textarea
                                id="join-request-message"
                                value={message}
                                onChange={e => setMessage(e.target.value.slice(0, 500))}
                                rows={3}
                                maxLength={500}
                                placeholder={t('pm2x.joinreq.message_placeholder')}
                                className={inputFormStyle + ' !h-auto !text-sm'}
                            />
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};
