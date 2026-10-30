import { useCallback, useEffect, useState } from 'react';
import { chatService, type ChatLastMessage } from '../services/chat';

// Indicador de mensajes de chat sin leer, por proyecto. La marca de "leído" vive en el SERVIDOR
// (ChatRead, por usuario), así el conteo es el mismo en todos los dispositivos. localStorage solo
// se usa para migrar, una vez, lo que antes se guardaba en el navegador.

const LAST_READ_PREFIX = 'chat_lastread_';

// Throttle del POST de "marcar leído" con llamada final garantizada: si llegan varios mensajes
// con el chat abierto, se manda como mucho uno cada 5s pero el último siempre se envía.
const lastSent: Record<string, number> = {};
const pending: Record<string, ReturnType<typeof setTimeout> | undefined> = {};
const THROTTLE_MS = 5000;

const sendMarkRead = (projectId: string) => {
    lastSent[projectId] = Date.now();
    pending[projectId] = undefined;
    chatService.markRead(projectId)
        .catch(() => { /* fire-and-forget */ })
        .finally(() => {
            // Recalcular badges cuando el servidor ya guardó la marca.
            try { window.dispatchEvent(new CustomEvent('chat-read', { detail: { projectId } })); } catch { /* noop */ }
        });
};

// Chats que están abiertos AHORA en esta pestaña (contador por proyecto). Sirve para no mostrar
// el aviso "Mensajes sin leer en …" del chat que el usuario está leyendo.
const openChats: Record<string, number> = {};
/** Registra que el chat del proyecto está en pantalla; devuelve la función para quitarlo. */
export const registerOpenChat = (projectId: string) => {
    if (!projectId) return () => { /* noop */ };
    openChats[projectId] = (openChats[projectId] || 0) + 1;
    return () => { openChats[projectId] = Math.max(0, (openChats[projectId] || 0) - 1); };
};
/** ¿El usuario está viendo el chat de este proyecto (pestaña visible)? */
export const isChatOpen = (projectId?: string | null) =>
    !!projectId && (openChats[projectId] || 0) > 0
    && (typeof document === 'undefined' || document.visibilityState === 'visible');

/** Marca un proyecto como leído (al abrir su chat, enviar o recibir con el chat abierto). */
export const markProjectChatRead = (projectId: string) => {
    if (!projectId) return;
    try { localStorage.setItem(LAST_READ_PREFIX + projectId, String(Date.now())); }
    catch { /* almacenamiento no disponible */ }
    const wait = THROTTLE_MS - (Date.now() - (lastSent[projectId] || 0));
    if (wait <= 0) { sendMarkRead(projectId); return; }
    if (!pending[projectId]) pending[projectId] = setTimeout(() => sendMarkRead(projectId), wait);
};

/** Migración única (por carga de la app) de lo leído en el navegador hacia el servidor. */
let syncPromise: Promise<void> | null = null;
const syncLocalReadsOnce = (): Promise<void> => {
    if (syncPromise) return syncPromise;
    const reads: Record<string, number> = {};
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith(LAST_READ_PREFIX)) {
                const ts = Number(localStorage.getItem(k));
                if (ts > 0) reads[k.slice(LAST_READ_PREFIX.length)] = ts;
            }
        }
    } catch { /* sin localStorage */ }
    syncPromise = Object.keys(reads).length
        ? chatService.syncReads(reads).then(() => undefined).catch(() => undefined)
        : Promise.resolve();
    return syncPromise;
};

interface UnreadState {
    /** true si el proyecto tiene mensajes sin leer. */
    unreadByProject: Record<string, boolean>;
    /** Cantidad de mensajes sin leer por proyecto. */
    unreadCountByProject: Record<string, number>;
    /** Fecha (ms) del último mensaje (de cualquiera) por proyecto, para ordenar la lista. */
    lastMessageAtByProject: Record<string, number>;
    /** Último mensaje por proyecto (vista previa de la lista). */
    lastMessageByProject: Record<string, ChatLastMessage>;
    /** Proyectos con mensajes sin leer (badge del sidebar). */
    totalUnread: number;
    refresh: () => void;
}

/**
 * @param enabled  Si false, no consulta (p.ej. usuarios sin acceso a proyectos).
 * @param pollMs   Intervalo de refresco (default 45s). El socket ya empuja en vivo dentro del chat;
 *                 esto es para el badge global y la lista.
 */
export function useChatUnread(enabled: boolean, pollMs = 45000): UnreadState {
    const [unreadCountByProject, setUnreadCountByProject] = useState<Record<string, number>>({});
    const [lastMessageAtByProject, setLastMessageAtByProject] = useState<Record<string, number>>({});
    const [lastMessageByProject, setLastMessageByProject] = useState<Record<string, ChatLastMessage>>({});

    const refresh = useCallback(async () => {
        if (!enabled) { setUnreadCountByProject({}); setLastMessageAtByProject({}); setLastMessageByProject({}); return; }
        try {
            await syncLocalReadsOnce();
            const rows = await chatService.getOverview();
            const counts: Record<string, number> = {};
            const lastAt: Record<string, number> = {};
            const lastMsg: Record<string, ChatLastMessage> = {};
            for (const r of rows) {
                counts[r.projectId] = r.unreadCount || 0;
                if (r.lastMessageAt) lastAt[r.projectId] = new Date(r.lastMessageAt).getTime();
                if (r.lastMessage) lastMsg[r.projectId] = r.lastMessage;
            }
            setUnreadCountByProject(counts);
            setLastMessageAtByProject(lastAt);
            setLastMessageByProject(lastMsg);
        } catch { /* sin conexión: no cambia el estado */ }
    }, [enabled]);

    useEffect(() => {
        if (!enabled) return;
        refresh();
        const interval = setInterval(refresh, pollMs);
        // Recalcular cuando se marca un chat como leído en cualquier vista.
        const onRead = () => refresh();
        window.addEventListener('chat-read', onRead);
        return () => { clearInterval(interval); window.removeEventListener('chat-read', onRead); };
    }, [enabled, pollMs, refresh]);

    const unreadByProject: Record<string, boolean> = {};
    for (const [id, n] of Object.entries(unreadCountByProject)) unreadByProject[id] = n > 0;
    const totalUnread = Object.values(unreadCountByProject).filter(n => n > 0).length;
    return { unreadByProject, unreadCountByProject, lastMessageAtByProject, lastMessageByProject, totalUnread, refresh };
}
