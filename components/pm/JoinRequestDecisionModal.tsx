import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Modal } from '../Modal';
import { useTranslation } from '../../contexts/GlobalSettingsContext';
import { projectsService, type ProjectJoinRequestItem } from '../../services/projects';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import { joinRequestErrorMessage } from './ClientProjectsPanel';

/** Datos que vienen de la notificación "Solicitud para unirse a un proyecto". */
export interface JoinRequestTarget { projectId: string; requestId?: string; context?: string }

/**
 * Detecta si el enlace de una notificación es de una solicitud para unirse
 * (`/pm/projects/<id>?...joinRequests=1[&joinRequest=<id>]`). Así la campanita abre este modal
 * para decidir ahí mismo en lugar de navegar al proyecto.
 */
export function parseJoinRequestLink(link?: string | null, context?: string): JoinRequestTarget | null {
    if (!link) return null;
    const to = link.startsWith('#') ? link.slice(1) : link;
    const m = /^\/pm\/projects\/([^/?#]+)\?(.*)$/.exec(to);
    if (!m) return null;
    const params = new URLSearchParams(m[2]);
    if (params.get('joinRequests') !== '1') return null;
    return { projectId: m[1], requestId: params.get('joinRequest') || undefined, context };
}

/** Modal para aprobar / rechazar una solicitud para unirse a un proyecto, desde la notificación. */
export const JoinRequestDecisionModal: React.FC<{ target: JoinRequestTarget | null; onClose: () => void }> = ({ target, onClose }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [requests, setRequests] = useState<ProjectJoinRequestItem[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);

    useEffect(() => {
        if (!target) return;
        let alive = true;
        setRequests(null); setError(null);
        projectsService.listJoinRequests(target.projectId, 'all')
            .then(list => {
                if (!alive) return;
                const all = Array.isArray(list) ? list : [];
                // Con id: esa solicitud (sea cual sea su estado). Sin id (notificaciones viejas): las pendientes.
                setRequests(target.requestId ? all.filter(r => r.id === target.requestId) : all.filter(r => r.status === 'pending'));
            })
            .catch(err => { if (alive) setError(joinRequestErrorMessage(err, t, 'pm2x.joinreq.load_error')); });
        return () => { alive = false; };
    }, [target, t]);

    const decide = async (r: ProjectJoinRequestItem, decision: 'approve' | 'reject') => {
        if (!target) return;
        setBusyId(r.id);
        try {
            const name = r.user.name || r.user.email;
            if (decision === 'approve') {
                await projectsService.approveJoinRequest(target.projectId, r.id);
                toast.success(t('pm2x.joinreq.approved_toast', { name }));
            } else {
                await projectsService.rejectJoinRequest(target.projectId, r.id);
                toast.success(t('pm2x.joinreq.rejected_toast', { name }));
            }
            setRequests(prev => (prev || []).map(x => x.id === r.id ? { ...x, status: decision === 'approve' ? 'approved' : 'rejected', decidedAt: new Date().toISOString() } : x));
        } catch (err) {
            toast.error(joinRequestErrorMessage(err, t, 'pm2x.joinreq.decide_error'));
        } finally {
            setBusyId(null);
        }
    };

    const statusLabel = (s: string) =>
        s === 'approved' ? t('pm2x.joinreq.status_approved') : s === 'rejected' ? t('pm2x.joinreq.status_rejected') : s === 'cancelled' ? t('pm2x.joinreq.status_cancelled') : '';
    const statusCls = (s: string) =>
        s === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
            : s === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                : 'bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300';
    const initials = (name: string) => name.split(' ').filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase()).join('') || '?';

    const openProject = () => {
        if (!target) return;
        onClose();
        navigate(`/pm/projects/${target.projectId}?tab=details`);
    };

    return (
        <Modal
            isOpen={!!target}
            onClose={onClose}
            title={t('pm2x.joinreq.decision_title')}
            size="md"
            footer={
                <div className="flex justify-between gap-2">
                    <button type="button" onClick={openProject} className={BUTTON_SECONDARY_SM_CLASSES}>{t('pm2x.joinreq.open_project')}</button>
                    <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>{t('pm2x.joinreq.close')}</button>
                </div>
            }
        >
            <div className="space-y-4">
                {target?.context && (
                    <p className="text-sm text-neutral-600 dark:text-neutral-300"><span translate="no">{target.context}</span></p>
                )}
                {error ? (
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                ) : requests === null ? (
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('pm2x.joinreq.loading')}</p>
                ) : requests.length === 0 ? (
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('pm2x.joinreq.none_pending')}</p>
                ) : (
                    <ul className="space-y-3">
                        {requests.map(r => {
                            const name = r.user.name || r.user.email;
                            const pending = r.status === 'pending';
                            return (
                                <li key={r.id} className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 p-3">
                                    <div className="flex items-start gap-3">
                                        {r.user.profilePictureUrl
                                            ? <img src={r.user.profilePictureUrl} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                                            : <span className="w-10 h-10 rounded-full bg-primary/15 text-primary text-sm font-semibold flex items-center justify-center flex-shrink-0" translate="no">{initials(name)}</span>}
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100"><span translate="no">{name}</span></p>
                                                {!pending && <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${statusCls(r.status)}`}>{statusLabel(r.status)}</span>}
                                            </div>
                                            <p className="text-xs text-neutral-500 dark:text-neutral-400"><span translate="no">{r.user.email} · {new Date(r.createdAt).toLocaleString()}</span></p>
                                            <div className="mt-2">
                                                <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{t('pm2x.joinreq.message_label')}</p>
                                                <p className="text-sm text-neutral-700 dark:text-neutral-200 whitespace-pre-wrap"><span translate="no">{r.message?.trim() || t('pm2x.joinreq.no_message')}</span></p>
                                            </div>
                                            {r.alreadyMember && <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{t('pm2x.joinreq.already_member_note')}</p>}
                                            {!pending && r.decidedByName && (
                                                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1"><span translate="no">{t('pm2x.joinreq.decided_by', { name: r.decidedByName })}</span></p>
                                            )}
                                        </div>
                                    </div>
                                    {pending && (
                                        <div className="flex justify-end gap-2 mt-3">
                                            <button type="button" onClick={() => decide(r, 'reject')} disabled={busyId === r.id} className={BUTTON_SECONDARY_SM_CLASSES + ' disabled:opacity-50'}>{t('pm2x.joinreq.reject')}</button>
                                            <button type="button" onClick={() => decide(r, 'approve')} disabled={busyId === r.id} className={BUTTON_PRIMARY_SM_CLASSES + ' disabled:opacity-50'}>{t('pm2x.joinreq.approve')}</button>
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </Modal>
    );
};
