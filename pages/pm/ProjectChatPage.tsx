import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { ProjectStatus, Employee, UserRole } from '../../types';
import { ChatMessageItem } from './ChatMessageItem';
import { UserGroupIcon, PaperAirplaneIcon, VideoCameraIcon, PhoneIcon, DocumentArrowUpIcon, MagnifyingGlassIcon } from '../../components/icons';
import { inputFormStyle, BUTTON_PRIMARY_CLASSES } from '../../constants';
import { CallModal } from '../../components/CallModal';
import { chatService, type ChatMessageRecord, type ChatLastMessage } from '../../services/chat';
import { whatsappService } from '../../services/whatsapp';
import { getSocket, joinProjectRoom } from '../../services/socket';
import { useChatUnread, markProjectChatRead } from '../../hooks/useChatUnread';
import { usePermissions } from '../../hooks/usePermissions';
import { ApiError, API_URL } from '../../services/api';
import { toast } from '../../hooks/useToast';
import { useTranslation } from '../../contexts/GlobalSettingsContext';

// Con socket en tiempo real, el polling es solo respaldo lento (por si el socket se cae).
const POLLING_INTERVAL_MS = 20000;

/** Hora del último mensaje en la lista (estilo Telegram): hoy → hora, ayer → "Ayer", semana → día, si no fecha corta. */
const listTime = (iso: string): string => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const diff = Math.round((startOf(new Date()) - startOf(d)) / 86400000);
    if (diff <= 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diff === 1) return 'Ayer';
    if (diff < 7) { const w = d.toLocaleDateString(undefined, { weekday: 'short' }); return w.charAt(0).toUpperCase() + w.slice(1); }
    return d.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: '2-digit' });
};

/** Iniciales para el avatar de un proyecto sin logo. */
const initials = (name: string): string =>
    (name || '?').trim().split(/\s+/).slice(0, 2).map(w => w.charAt(0)).join('').toUpperCase() || '?';

/** Color estable (por nombre) para el avatar de iniciales. */
const AVATAR_COLORS = ['bg-emerald-500', 'bg-sky-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500', 'bg-teal-500', 'bg-indigo-500', 'bg-orange-500'];
const avatarColor = (name: string): string => {
    let h = 0;
    for (const ch of name || '') h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return AVATAR_COLORS[h % AVATAR_COLORS.length];
};

/** Clave del día local (YYYY-MM-DD) de un mensaje, para agrupar por fecha. */
const dayKey = (iso: string): string => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

/** Etiqueta del separador de día estilo WhatsApp: Hoy, Ayer, día de la semana (última semana) o fecha. */
const dayLabel = (iso: string): string => {
    const d = new Date(iso);
    const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const diffDays = Math.round((startOf(new Date()) - startOf(d)) / 86400000);
    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays > 1 && diffDays < 7) {
        const w = d.toLocaleDateString(undefined, { weekday: 'long' });
        return w.charAt(0).toUpperCase() + w.slice(1);
    }
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
};

/** Convierte un mensaje completo en la vista previa de la lista. */
const toPreview = (m: ChatMessageRecord): ChatLastMessage => ({
    senderId: m.senderId,
    senderName: m.senderName,
    text: String(m.text || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120),
    attachmentType: m.attachmentType ?? null,
    timestamp: m.timestamp,
});

/** Ordena los mensajes cronológicamente (por fecha; desempate por id) para que nunca se vean desordenados. */
const sortMessages = (msgs: ChatMessageRecord[]): ChatMessageRecord[] =>
    [...msgs].sort((a, b) => {
        const ta = new Date(a.timestamp).getTime();
        const tb = new Date(b.timestamp).getTime();
        if (ta !== tb) return ta - tb;
        return String(a.id).localeCompare(String(b.id));
    });

export const ProjectChatPage: React.FC = () => {
    const { t } = useTranslation();
    const { projects: allProjectsContext, getClientById, employees: allEmployees } = useData();
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const { can } = usePermissions();
    const { unreadCountByProject, lastMessageByProject } = useChatUnread(true);
    // Último mensaje visto en esta sesión (enviado/recibido): sube el chat y actualiza la vista
    // previa al instante, sin esperar al siguiente refresco del overview.
    const [localLast, setLocalLast] = useState<Record<string, ChatLastMessage>>({});
    // Último mensaje del chat abierto ya marcado como leído (para no repetir el POST en cada poll).
    const lastMarkedRef = useRef<string | null>(null);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [projectMessages, setProjectMessages] = useState<ChatMessageRecord[]>([]);
    const [sending, setSending] = useState(false);
    const [uploading, setUploading] = useState(false);
    // WhatsApp: envío OPT-IN. Solo se muestra el toggle si la tienda tiene WhatsApp activo.
    const [waEnabled, setWaEnabled] = useState(false);
    const [sendToWa, setSendToWa] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    const [isCallModalOpen, setIsCallModalOpen] = useState(false);
    const [callType, setCallType] = useState<'video' | 'audio'>('video');
    const [callParticipants, setCallParticipants] = useState<string[]>([]);

    const isEmployeeView = currentUser?.role === UserRole.EMPLOYEE;

    const activeProjects = useMemo(() => {
        // Mostrar TODOS los proyectos accesibles (incluye Completados): un proyecto cerrado puede
        // seguir teniendo conversación. Antes se filtraba a Activo/Pendiente y los completados
        // desaparecían de la lista de chat aunque tuvieran mensajes.
        // Excluye los proyectos "solo factura" (creados en caja) del chat de Gestión.
        const baseProjects = allProjectsContext.filter(p => !(p as any).billingOnly);
        // Un empleado con 'projects.viewAll' (encargado de proyectos) ve TODOS los chats; el resto,
        // solo los de proyectos asignados.
        if (isEmployeeView && currentUser && !can('projects.viewAll')) {
            return baseProjects.filter(p => (p.assignedEmployeeIds ?? []).includes(currentUser.id));
        }
        return baseProjects;
    }, [allProjectsContext, currentUser, isEmployeeView, can]);

    /** Último mensaje del proyecto: el más nuevo entre el overview del servidor y lo visto en la sesión. */
    const lastPreview = (id: string): ChatLastMessage | null => {
        const a = lastMessageByProject[id];
        const b = localLast[id];
        if (!a) return b || null;
        if (!b) return a;
        return new Date(b.timestamp).getTime() >= new Date(a.timestamp).getTime() ? b : a;
    };

    // Buscador de chats: por nombre de proyecto, nombre/empresa/alias del cliente.
    const [chatSearch, setChatSearch] = useState('');
    const displayProjects = useMemo(() => {
        const q = chatSearch.trim().toLowerCase();
        // Orden tipo WhatsApp: el chat con el mensaje más reciente arriba; los que no tienen
        // mensajes van al final en orden alfabético.
        const lastAt = (id: string) => {
            const m = lastPreview(id);
            return m ? new Date(m.timestamp).getTime() || 0 : 0;
        };
        const sorted = [...activeProjects].sort((a, b) => {
            const diff = lastAt(b.id) - lastAt(a.id);
            return diff !== 0 ? diff : (a.name || '').localeCompare(b.name || '');
        });
        if (!q) return sorted;
        return sorted.filter(p => {
            const c: any = getClientById(p.clientId);
            const hay = [
                p.name,
                c ? `${c.name || ''} ${c.lastName || ''}` : '',
                c?.companyName,
                c?.displayName,
                c?.alias,
            ].filter(Boolean).join(' ').toLowerCase();
            return hay.includes(q);
        });
    }, [activeProjects, chatSearch, getClientById, lastMessageByProject, localLast]);

    const selectedProject = selectedProjectId ? allProjectsContext.find(p => p.id === selectedProjectId) : null;

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [projectMessages]);

    // Carga y polling de mensajes para el proyecto seleccionado
    const fetchMessages = useCallback(async (projectId: string) => {
        try {
            const msgs = sortMessages(await chatService.getMessages(projectId));
            setProjectMessages(msgs);
            const last = msgs[msgs.length - 1];
            if (last) {
                setLocalLast(prev => ({ ...prev, [projectId]: toPreview(last) }));
                // Si llegó algo nuevo por polling (socket caído), el chat abierto queda leído.
                if (lastMarkedRef.current !== last.id) { lastMarkedRef.current = last.id; markProjectChatRead(projectId); }
            }
        } catch (err) {
            if (err instanceof ApiError) console.error('chat fetch:', err.message);
        }
    }, []);

    const appendMessage = useCallback((msg: ChatMessageRecord) => {
        // Dedupe por id y re-ordena por fecha: los mensajes que llegan por socket/polling
        // pueden arribar fuera de orden, así que siempre mantenemos la lista cronológica.
        setProjectMessages(prev => prev.some(m => m.id === msg.id) ? prev : sortMessages([...prev, msg]));
        // Sube ese chat al tope de la lista y actualiza su vista previa.
        setLocalLast(prev => {
            const cur = prev[msg.projectId];
            if (cur && new Date(cur.timestamp).getTime() > new Date(msg.timestamp).getTime()) return prev;
            return { ...prev, [msg.projectId]: toPreview(msg) };
        });
    }, []);

    useEffect(() => {
        if (!selectedProjectId) {
            setProjectMessages([]);
            return;
        }
        fetchMessages(selectedProjectId);
        markProjectChatRead(selectedProjectId); // al abrir el chat, se considera leído
        const interval = setInterval(() => fetchMessages(selectedProjectId), POLLING_INTERVAL_MS);
        // Tiempo real: unirse a la sala del proyecto y escuchar mensajes nuevos.
        const leave = joinProjectRoom(selectedProjectId);
        const socket = getSocket();
        const onMessage = (msg: ChatMessageRecord) => { if (msg?.projectId === selectedProjectId) { appendMessage(msg); markProjectChatRead(selectedProjectId); } };
        socket.on('chat:message', onMessage);
        return () => { clearInterval(interval); socket.off('chat:message', onMessage); leave?.(); };
    }, [selectedProjectId, fetchMessages, appendMessage]);

     // Auto-select first project if list changes and current selection is invalid or none
    useEffect(() => {
        if (activeProjects.length > 0 && (!selectedProjectId || !activeProjects.find(p => p.id === selectedProjectId))) {
            setSelectedProjectId(activeProjects[0].id);
        } else if (activeProjects.length === 0) {
            setSelectedProjectId(null);
        }
    }, [activeProjects, selectedProjectId]);


    // ¿La tienda tiene WhatsApp activo? (para mostrar el toggle de envío).
    useEffect(() => {
        let alive = true;
        whatsappService.getEnabled().then(r => { if (alive) setWaEnabled(!!r.enabled); }).catch(() => {});
        return () => { alive = false; };
    }, []);

    /** Avisa al usuario si pidió enviar por WhatsApp pero no se pudo. */
    const notifyWaResult = (message: ChatMessageRecord) => {
        const w = message.whatsapp;
        if (!w || !w.requested) return;
        if (w.sent) { toast.success('También enviado por WhatsApp.'); return; }
        const reasons: Record<string, string> = {
            not_configured: 'WhatsApp no está configurado.',
            no_thread: 'No se envió por WhatsApp: el cliente no ha escrito por WhatsApp aún.',
            outside_window: 'No se envió por WhatsApp: pasaron más de 24h desde el último mensaje del cliente (se requiere plantilla).',
            error: 'No se pudo enviar por WhatsApp.',
        };
        toast.error(reasons[w.reason || 'error'] || 'No se pudo enviar por WhatsApp.');
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !selectedProjectId || !currentUser) return;
        const text = newMessage.trim();
        setSending(true);
        try {
            const message = await chatService.sendMessage({
                projectId: selectedProjectId,
                text,
                senderName: `${currentUser.name} ${currentUser.lastName || ''}`.trim() || currentUser.email,
                sendWhatsapp: sendToWa && can('projects.sendWhatsapp'),
            });
            appendMessage(message);
            notifyWaResult(message);
            setNewMessage('');
        } catch (err) {
            toast.error(err instanceof ApiError ? err.message : t('pm2x.chat.send_error'));
        } finally {
            setSending(false);
        }
    };

    // Sube un archivo a Cloudinary (vía /upload) y envía el mensaje con el adjunto.
    // Lo usan tanto el botón de adjuntar como el pegado (Ctrl+V) de imágenes.
    const uploadAndSendFile = async (file: File) => {
        if (!file || !selectedProjectId || !currentUser || uploading) return;
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');
        // Límite razonable (Render/Cloudinary): 10 MB imágenes, 50 MB video.
        const maxMb = isVideo ? 50 : 10;
        if (file.size > maxMb * 1024 * 1024) { toast.error(`El archivo es muy grande (máx. ${maxMb} MB).`); return; }
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            const res = await fetch(`${API_URL}/upload`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${localStorage.getItem('pazzi_token')}` },
                body: fd,
            });
            if (!res.ok) throw new Error('No se pudo subir el archivo.');
            const { url } = await res.json();
            const message = await chatService.sendMessage({
                projectId: selectedProjectId,
                text: newMessage.trim(),
                senderName: `${currentUser.name} ${currentUser.lastName || ''}`.trim() || currentUser.email,
                attachmentUrl: url,
                attachmentType: isImage ? 'image' : isVideo ? 'video' : 'file',
                attachmentName: file.name,
                sendWhatsapp: sendToWa && can('projects.sendWhatsapp'),
            });
            appendMessage(message);
            notifyWaResult(message);
            setNewMessage('');
        } catch (err) {
            toast.error(err instanceof ApiError ? err.message : (err instanceof Error ? err.message : 'No se pudo enviar el adjunto.'));
        } finally {
            setUploading(false);
        }
    };

    // Adjuntar imagen/video desde el selector de archivos.
    const handleAttachFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (file) await uploadAndSendFile(file);
    };

    // Pegar (Ctrl+V) una imagen desde el portapapeles directo en el chat.
    const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (const item of Array.from(items)) {
            if (item.kind === 'file' && item.type.startsWith('image/')) {
                const file = item.getAsFile();
                if (file) {
                    e.preventDefault();
                    // Nombre legible para capturas de pantalla (suelen venir sin nombre).
                    const ext = (file.type.split('/')[1] || 'png').replace('jpeg', 'jpg');
                    const named = file.name ? file : new File([file], `imagen-pegada-${Date.now()}.${ext}`, { type: file.type });
                    void uploadAndSendFile(named);
                    return;
                }
            }
        }
    };

    if (!currentUser) {
        return <div className="p-6 text-center text-neutral-500 dark:text-neutral-400">{t('pm2x.chat.login_required')}</div>;
    }

    const projectClient = selectedProject ? getClientById(selectedProject.clientId) : null;
    // assignedEmployeeIds guarda User.id: el empleado se empareja por su userId (o id si no tiene cuenta).
    // Antes se buscaba solo por Employee.id y el encabezado nunca mostraba a los colaboradores.
    const projectAssignedEmployees = selectedProject
        ? (selectedProject.assignedEmployeeIds ?? [])
            .map(id => allEmployees.find(e => (e as any).userId === id || e.id === id))
            .filter(Boolean) as Employee[]
        : [];
    // Miembros del chat (estilo "Info del grupo" de Telegram): el cliente + los colaboradores asignados.
    const chatMembers: { key: string; name: string; subtitle: string; badge?: string }[] = [
        ...(projectClient ? [{
            key: `c-${projectClient.id}`,
            name: `${projectClient.name || ''} ${projectClient.lastName || ''}`.trim() || (projectClient as any).companyName || 'Cliente',
            subtitle: [(projectClient as any).companyName, projectClient.email].filter(Boolean).join(' · ') || 'Cliente',
            badge: 'Cliente',
        }] : []),
        ...projectAssignedEmployees.map(e => ({
            key: `e-${e.id}`,
            name: `${e.name || ''} ${e.lastName || ''}`.trim(),
            subtitle: [e.role, e.email].filter(Boolean).join(' · '),
        })),
    ];
    const [showMembers, setShowMembers] = useState(false);
    // Al cambiar de chat se cierra el panel de miembros.
    useEffect(() => { setShowMembers(false); }, [selectedProjectId]);

    const getProjectParticipantsForCall = (): string[] => {
        if (!selectedProject) return [];
        const participants: string[] = [];
        if (projectClient) participants.push(`${projectClient.name} ${projectClient.lastName}`);
        projectAssignedEmployees.forEach(emp => {
            if (emp) participants.push(`${emp.name} ${emp.lastName}`);
        });
         if (currentUser && !participants.some(p => p.includes(currentUser.name || ''))) {
             participants.push(currentUser.name || currentUser.email || t('pm2x.common.you'));
        }
        return Array.from(new Set(participants)); 
    };

    const handleInitiateCall = (type: 'video' | 'audio') => {
        setCallParticipants(getProjectParticipantsForCall());
        setCallType(type);
        setIsCallModalOpen(true);
        console.log(`Initiating ${type} call with: ${getProjectParticipantsForCall().join(', ')} (simulated)`);
    };


    return (
        <>
        <div className="flex h-full bg-white dark:bg-neutral-800 overflow-hidden">
            {/* Sidebar: Project List */}
            <div className="w-full sm:w-1/3 md:w-1/4 border-r border-neutral-200 dark:border-neutral-700 flex flex-col">
                <div className="p-4 border-b border-neutral-200 dark:border-neutral-700 space-y-3">
                    <h2 className="text-lg font-semibold text-primary">{t('pm2x.chat.projects')}</h2>
                    {/* Buscador de chats: proyecto, cliente, empresa, alias */}
                    <div className="relative">
                        <MagnifyingGlassIcon className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                        <input
                            type="text"
                            value={chatSearch}
                            onChange={e => setChatSearch(e.target.value)}
                            placeholder={t('pm2x.chat.search_ph') || 'Buscar por proyecto, cliente, empresa…'}
                            className="w-full pl-8 pr-8 py-1.5 text-sm rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                        />
                        {chatSearch && (
                            <button type="button" onClick={() => setChatSearch('')} className="absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200" aria-label={t('common.clear') || 'Limpiar'}>✕</button>
                        )}
                    </div>
                </div>
                <div className="flex-grow overflow-y-auto p-2 space-y-1 scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-600">
                    {displayProjects.length > 0 ? displayProjects.map(project => {
                        const selected = selectedProjectId === project.id;
                        const last = lastPreview(project.id);
                        const unread = selected ? 0 : (unreadCountByProject[project.id] || 0);
                        const mine = !!last && last.senderId === currentUser?.id;
                        const who = last ? (mine ? 'Tú' : (last.senderName || '').replace(/\s*\(WhatsApp\)\s*$/, '').trim().split(/\s+/)[0]) : '';
                        const body = last
                            ? (last.text || (last.attachmentType === 'image' ? '📷 Foto' : last.attachmentType === 'video' ? '🎥 Video' : last.attachmentType ? '📎 Archivo' : ''))
                            : '';
                        return (
                        <button
                            key={project.id}
                            onClick={() => { setSelectedProjectId(project.id); markProjectChatRead(project.id); }}
                            className={`w-full text-left px-2.5 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 flex items-center gap-3
                                ${selected
                                    ? 'bg-primary text-white shadow-sm'
                                    : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}
                        >
                            {/* Avatar uniforme: círculo fijo; el logo se ajusta sin deformarse. Sin logo → iniciales. */}
                            {project.imageUrl
                                ? <span className="w-11 h-11 rounded-full bg-white border border-neutral-200 dark:border-neutral-600 overflow-hidden flex items-center justify-center flex-shrink-0">
                                    <img src={project.imageUrl} alt="" className="w-full h-full object-contain p-1" />
                                  </span>
                                : <span className={`w-11 h-11 rounded-full ${avatarColor(project.name)} text-white flex items-center justify-center text-sm font-semibold flex-shrink-0`}>{initials(project.name)}</span>}
                            <span className="flex-1 min-w-0">
                                <span className="flex items-center gap-2">
                                    <span className="truncate font-semibold text-[14.75px]">{project.name}</span>
                                    {last && <span className={`ml-auto flex-shrink-0 text-[11.5px] ${selected ? 'text-white/80' : unread ? 'text-primary font-semibold' : 'text-neutral-400 dark:text-neutral-500'}`}>{listTime(last.timestamp)}</span>}
                                </span>
                                <span className="flex items-center gap-2 mt-0.5">
                                    <span className={`truncate text-[13px] ${selected ? 'text-white/85' : 'text-neutral-500 dark:text-neutral-400'}`}>
                                        {last
                                            ? <>{who && <span className={selected ? 'text-white' : 'text-neutral-700 dark:text-neutral-200'}>{who}: </span>}{body}</>
                                            : <span className="italic">Sin mensajes</span>}
                                    </span>
                                    {unread > 0 && (
                                        <span className="ml-auto flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-white text-[11px] font-bold flex items-center justify-center" aria-label={`${unread} sin leer`}>
                                            {unread > 99 ? '99+' : unread}
                                        </span>
                                    )}
                                </span>
                            </span>
                        </button>
                        );
                    }) : (
                        <p className="p-3 text-xs text-center text-neutral-500 dark:text-neutral-400">{chatSearch.trim() ? (t('pm2x.chat.no_results') || 'Sin resultados para la búsqueda.') : t('pm2x.chat.no_projects')}</p>
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="relative flex-1 flex flex-col min-w-0">
                {!selectedProject ? (
                    <div className="flex-1 flex items-center justify-center p-4">
                        <p className="text-neutral-500 dark:text-neutral-400 text-center">{t('pm2x.chat.select_project')}</p>
                    </div>
                ) : (
                    <>
                        {/* Chat Header (estilo Telegram): clic → info del chat con sus miembros. */}
                        <div className="px-3 sm:px-4 py-2.5 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between bg-white dark:bg-neutral-800">
                            <button
                                type="button"
                                onClick={() => setShowMembers(true)}
                                className="flex flex-1 items-center gap-3 min-w-0 -ml-1 mr-2 pl-1 pr-3 py-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700/60 transition-colors text-left"
                                title="Ver miembros del chat"
                            >
                                {selectedProject.imageUrl
                                    ? <span className="w-11 h-11 rounded-full bg-white border border-neutral-200 dark:border-neutral-600 overflow-hidden flex items-center justify-center flex-shrink-0">
                                        <img src={selectedProject.imageUrl} alt="" className="w-full h-full object-contain p-1" />
                                      </span>
                                    : <span className={`w-11 h-11 rounded-full ${avatarColor(selectedProject.name)} text-white flex items-center justify-center text-sm font-semibold flex-shrink-0`}>{initials(selectedProject.name)}</span>}
                                <span className="min-w-0">
                                    <span className="block text-base sm:text-[17px] font-semibold text-neutral-800 dark:text-neutral-100 truncate max-w-xs sm:max-w-md md:max-w-lg">{selectedProject.name}</span>
                                    <span className="block text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                                        {chatMembers.length === 0
                                            ? t('pm2x.chat.no_participants')
                                            : `${chatMembers.length} ${chatMembers.length === 1 ? 'miembro' : 'miembros'}`}
                                    </span>
                                </span>
                            </button>
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={() => handleInitiateCall('audio')}
                                    className="p-1.5 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-full"
                                    title={t('pm2x.chat.start_audio_call')}
                                    aria-label={t('pm2x.chat.start_audio_call')}
                                >
                                    <PhoneIcon className="w-5 h-5" />
                                </button>
                                <button 
                                    onClick={() => handleInitiateCall('video')} 
                                    className="p-1.5 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-full"
                                    title={t('pm2x.chat.start_video_call')}
                                    aria-label={t('pm2x.chat.start_video_call')}
                                >
                                    <VideoCameraIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Panel "Info del chat" (miembros), sobre el área del chat. */}
                        {showMembers && (
                            <div className="absolute inset-0 z-20 flex justify-end">
                                <div className="absolute inset-0 bg-black/30" onClick={() => setShowMembers(false)} />
                                <aside className="relative w-full max-w-sm h-full bg-white dark:bg-neutral-800 shadow-2xl border-l border-neutral-200 dark:border-neutral-700 flex flex-col">
                                    <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-700">
                                        <h4 className="font-semibold text-neutral-800 dark:text-neutral-100">Info del chat</h4>
                                        <button type="button" onClick={() => setShowMembers(false)} className="w-8 h-8 flex items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700" aria-label="Cerrar">✕</button>
                                    </div>
                                    <div className="flex-1 overflow-y-auto">
                                        <div className="flex flex-col items-center text-center px-4 pt-6 pb-5">
                                            {selectedProject.imageUrl
                                                ? <span className="w-24 h-24 rounded-full bg-white border border-neutral-200 dark:border-neutral-600 overflow-hidden flex items-center justify-center">
                                                    <img src={selectedProject.imageUrl} alt="" className="w-full h-full object-contain p-2" />
                                                  </span>
                                                : <span className={`w-24 h-24 rounded-full ${avatarColor(selectedProject.name)} text-white flex items-center justify-center text-3xl font-semibold`}>{initials(selectedProject.name)}</span>}
                                            <p className="mt-3 text-lg font-semibold text-neutral-800 dark:text-neutral-100">{selectedProject.name}</p>
                                            <p className="text-sm text-neutral-500 dark:text-neutral-400">{chatMembers.length} {chatMembers.length === 1 ? 'miembro' : 'miembros'}</p>
                                            <button type="button" onClick={() => navigate(`/pm/projects/${selectedProject.id}`)} className="mt-3 text-sm font-medium text-primary hover:underline">Ver proyecto</button>
                                        </div>
                                        <div className="px-3 pb-4">
                                            <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">Miembros</p>
                                            {chatMembers.length === 0 ? (
                                                <p className="px-2 text-sm text-neutral-500 dark:text-neutral-400">{t('pm2x.chat.no_participants')}</p>
                                            ) : (
                                                <ul className="space-y-0.5">
                                                    {chatMembers.map(m => (
                                                        <li key={m.key} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700/50">
                                                            <span className={`w-10 h-10 rounded-full ${avatarColor(m.name)} text-white flex items-center justify-center text-sm font-semibold flex-shrink-0`}>{initials(m.name)}</span>
                                                            <span className="min-w-0 flex-1">
                                                                <span className="block text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate">{m.name}</span>
                                                                {m.subtitle && <span className="block text-xs text-neutral-500 dark:text-neutral-400 truncate">{m.subtitle}</span>}
                                                            </span>
                                                            {m.badge && <span className="flex-shrink-0 text-[11px] font-medium text-primary">{m.badge}</span>}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    </div>
                                </aside>
                            </div>
                        )}

                        {/* Messages Area */}
                        <div className="flex-1 px-2 sm:px-3 py-4 overflow-y-auto bg-neutral-50 dark:bg-neutral-800/30 scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-600">
                            {projectMessages.length > 0 ? projectMessages.map((msg, i) => {
                                // Separador de día estilo WhatsApp cuando cambia la fecha local.
                                const day = dayKey(msg.timestamp);
                                const prev = projectMessages[i - 1];
                                const next = projectMessages[i + 1];
                                const showDay = i === 0 || dayKey(prev.timestamp) !== day;
                                // Rachas estilo Telegram: mismo remitente seguido el mismo día. Nombre en el
                                // primero de la racha, avatar en el último.
                                const firstOfRun = showDay || prev.senderId !== msg.senderId;
                                const lastOfRun = !next || next.senderId !== msg.senderId || dayKey(next.timestamp) !== day;
                                return (
                                    <React.Fragment key={msg.id}>
                                        {showDay && (
                                            <div className="flex justify-center my-2">
                                                <span className="px-3 py-1 rounded-lg bg-white dark:bg-neutral-700 text-xs font-medium text-neutral-600 dark:text-neutral-200 shadow-sm border border-neutral-200 dark:border-neutral-600">
                                                    {dayLabel(msg.timestamp)}
                                                </span>
                                            </div>
                                        )}
                                        <div className={firstOfRun && !showDay ? 'mt-3' : ''}>
                                            <ChatMessageItem
                                                message={msg}
                                                isCurrentUser={currentUser.id === msg.senderId}
                                                showName={firstOfRun}
                                                showAvatar={lastOfRun}
                                            />
                                        </div>
                                    </React.Fragment>
                                );
                            }) : (
                                <p className="text-center text-sm text-neutral-400 dark:text-neutral-500 pt-10">{t('pm2x.chat.no_messages_yet')}</p>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Message Input */}
                        <div className="px-2 sm:px-3 py-3 border-t border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
                            {waEnabled && can('projects.sendWhatsapp') && (
                                <label className="flex items-center gap-2 mb-2 text-xs text-neutral-600 dark:text-neutral-300 cursor-pointer select-none">
                                    <input type="checkbox" checked={sendToWa} onChange={e => setSendToWa(e.target.checked)} className="h-4 w-4 rounded accent-green-600" />
                                    <span>📲 Enviar también por WhatsApp al cliente</span>
                                    {sendToWa && <span className="text-[11px] text-green-600 dark:text-green-400">(este mensaje irá al chat y a WhatsApp)</span>}
                                </label>
                            )}
                            <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex items-center space-x-2 sm:space-x-3">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*,video/*"
                                    className="hidden"
                                    onChange={handleAttachFile}
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading || sending}
                                    title="Adjuntar imagen o video"
                                    aria-label="Adjuntar imagen o video"
                                    className="p-2 rounded-lg text-neutral-500 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 flex-shrink-0 disabled:opacity-50"
                                >
                                    {uploading ? <span className="text-xs">Subiendo…</span> : <DocumentArrowUpIcon className="w-5 h-5" />}
                                </button>
                                <textarea
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onPaste={handlePaste}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage();
                                        }
                                    }}
                                    placeholder={t('pm2x.chat.message_placeholder')}
                                    className={`${inputFormStyle} flex-grow !py-2 resize-none max-h-24`}
                                    rows={1}
                                    aria-label={t('pm2x.chat.write_message')}
                                />
                                <button
                                    type="submit"
                                    className={`${BUTTON_PRIMARY_CLASSES} !py-2 !px-3 sm:!px-4 rounded-lg flex items-center justify-center flex-shrink-0`}
                                    disabled={!newMessage.trim() || sending}
                                    aria-label={t('pm2x.chat.send_message')}
                                >
                                    <PaperAirplaneIcon />
                                    <span className="ml-1.5 hidden sm:inline text-sm">{sending ? t('pm2x.chat.sending') : t('pm2x.chat.send')}</span>
                                </button>
                            </form>
                        </div>
                    </>
                )}
            </div>
        </div>
        <CallModal
            isOpen={isCallModalOpen}
            onClose={() => setIsCallModalOpen(false)}
            callType={callType}
            participants={callParticipants}
        />
        </>
    );
};