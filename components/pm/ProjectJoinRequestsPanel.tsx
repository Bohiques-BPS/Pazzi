import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from '../../contexts/GlobalSettingsContext';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { projectsService, type ProjectJoinRequestItem } from '../../services/projects';
import { getSocket } from '../../services/socket';
import { UserPlusIcon } from '../icons';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import { UserRole, type Project } from '../../types';
import { joinRequestErrorMessage } from './ClientProjectsPanel';

const ROW_BTN = ' !text-xs !py-1 !px-2.5';

/**
 * Solicitudes PENDIENTES para unirse al proyecto. Solo visible para quien decide: MANAGER,
 * permiso projects.edit / projects.assignEmployees, o encargado del proyecto (managerUserIds).
 * Mismo criterio que el backend (que es quien valida de verdad).
 */
export const ProjectJoinRequestsPanel: React.FC<{
    project: Project;
    /** Tras aprobar: el proyecto ya tiene un miembro nuevo (refrescar miembros). */
    onApproved?: (userId: string) => void;
    /** Desplazar el panel a la vista al cargar (p. ej. al llegar desde la notificación). */
    focus?: boolean;
}> = ({ project, onApproved, focus }) => {
    const { t, lang } = useTranslation();
    const { currentUser } = useAuth();
    const { can } = usePermissions();
    const ref = useRef<HTMLDivElement | null>(null);

    const canDecide = !!currentUser && (
        currentUser.role === UserRole.MANAGER
        || can('projects.edit')
        || can('projects.assignEmployees')
        || (project.managerUserIds || []).includes(currentUser.id)
    );

    const [requests, setRequests] = useState<ProjectJoinRequestItem[]>([]);
    const [busyId, setBusyId] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!canDecide) return;
        try {
            const list = await projectsService.listJoinRequests(project.id, 'pending');
            setRequests(Array.isArray(list) ? list : []);
        } catch {
            setRequests([]);
        }
    }, [canDecide, project.id]);

    useEffect(() => { load(); }, [load]);

    // Tiempo real: una notificación nueva de solicitud para ESTE proyecto refresca la lista.
    useEffect(() => {
        if (!canDecide) return;
        const socket = getSocket();
        const onNotif = (n: any) => {
            const link = String(n?.link || '');
            if (link.includes(`/pm/projects/${project.id}`) && link.includes('joinRequests')) load();
        };
        socket.on('notification:new', onNotif);
        return () => { socket.off('notification:new', onNotif); };
    }, [canDecide, project.id, load]);

    useEffect(() => {
        if (focus && requests.length && ref.current) ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, [focus, requests.length]);

    const decide = async (r: ProjectJoinRequestItem, decision: 'approve' | 'reject') => {
        setBusyId(r.id);
        try {
            if (decision === 'approve') {
                await projectsService.approveJoinRequest(project.id, r.id);
                toast.success(t('pm2x.joinreq.approved_toast', { name: r.user.name || r.user.email }));
                onApproved?.(r.userId);
            } else {
                await projectsService.rejectJoinRequest(project.id, r.id);
                toast.success(t('pm2x.joinreq.rejected_toast', { name: r.user.name || r.user.email }));
            }
            setRequests(prev => prev.filter(x => x.id !== r.id));
        } catch (err) {
            toast.error(joinRequestErrorMessage(err, t, 'pm2x.joinreq.decide_error'));
            load();
        } finally {
            setBusyId(null);
        }
    };

    if (!canDecide || requests.length === 0) return null;

    const fmt = (iso: string) => {
        const d = new Date(iso);
        return isNaN(d.getTime()) ? '' : d.toLocaleString(lang === 'en' ? 'en-US' : 'es-ES', { dateStyle: 'medium', timeStyle: 'short' });
    };
    const initials = (name: string) => name.split(' ').filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase()).join('') || '?';

    return (
        <div ref={ref} className="bg-white dark:bg-neutral-800 p-4 rounded-lg shadow-sm border border-primary/30">
            <div className="flex items-center gap-2 mb-3">
                <UserPlusIcon className="w-5 h-5 text-primary" />
                <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100" translate="no">{t('pm2x.joinreq.pending_title', { n: requests.length })}</h3>
            </div>
            <ul className="space-y-2">
                {requests.map(r => (
                    <li key={r.id} className="p-2.5 rounded-md bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 flex flex-col sm:flex-row sm:items-center gap-2">
                        <div className="flex items-start gap-2 min-w-0 flex-1">
                            {r.user.profilePictureUrl
                                ? <img src={r.user.profilePictureUrl} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                                : <span className="w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center flex-shrink-0">{initials(r.user.name || r.user.email)}</span>}
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate" translate="no">{r.user.name || r.user.email}</p>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400" translate="no">{r.user.email} · {fmt(r.createdAt)}</p>
                                {r.message && <p className="text-xs text-neutral-700 dark:text-neutral-300 mt-1 whitespace-pre-wrap break-words" translate="no">"{r.message}"</p>}
                                {r.alreadyMember && <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{t('pm2x.joinreq.already_member_note')}</p>}
                            </div>
                        </div>
                        <div className="flex items-center gap-2 sm:justify-end flex-shrink-0">
                            <button type="button" onClick={() => decide(r, 'reject')} disabled={busyId === r.id} className={BUTTON_SECONDARY_SM_CLASSES + ROW_BTN + ' disabled:opacity-50'}>
                                {t('pm2x.joinreq.reject')}
                            </button>
                            <button type="button" onClick={() => decide(r, 'approve')} disabled={busyId === r.id} className={BUTTON_PRIMARY_SM_CLASSES + ROW_BTN + ' disabled:opacity-50'}>
                                {t('pm2x.joinreq.approve')}
                            </button>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};
