import { useCallback, useEffect, useState } from 'react';
import { chatService } from '../services/chat';

// Evita disparar el POST de "marcar leído" repetidamente para el mismo proyecto en poco tiempo.
const recentlyMarked: Record<string, number> = {};

// Indicador de mensajes de chat sin leer, por proyecto. "Leído" se guarda por navegador
// (localStorage): al abrir/enviar en un chat se marca la marca de tiempo actual, y un proyecto
// cuenta como no leído si su último mensaje es posterior a esa marca.

const LAST_READ_PREFIX = 'chat_lastread_';

const readTs = (projectId: string): number => {
    try { return Number(localStorage.getItem(LAST_READ_PREFIX + projectId)) || 0; }
    catch { return 0; }
};

/** Marca un proyecto como leído (al abrir su chat o al enviar un mensaje). */
export const markProjectChatRead = (projectId: string) => {
    if (!projectId) return;
    try { localStorage.setItem(LAST_READ_PREFIX + projectId, String(Date.now())); }
    catch { /* almacenamiento no disponible */ }
    try { window.dispatchEvent(new CustomEvent('chat-read', { detail: { projectId } })); } catch { /* noop */ }
    // Limpia la notificación (campanita) de chat de ese proyecto en el backend. Throttle 5s para
    // no spamear el endpoint cuando llegan varios mensajes con el chat abierto.
    const now = Date.now();
    if (now - (recentlyMarked[projectId] || 0) > 5000) {
        recentlyMarked[projectId] = now;
        chatService.markRead(projectId).catch(() => { /* fire-and-forget */ });
    }
};

interface UnreadState {
    unreadByProject: Record<string, boolean>;
    totalUnread: number;
    refresh: () => void;
}

/**
 * @param enabled  Si false, no consulta (p.ej. usuarios sin acceso a proyectos).
 * @param pollMs   Intervalo de refresco (default 45s). El socket ya empuja en vivo dentro del chat;
 *                 esto es para el badge global.
 */
export function useChatUnread(enabled: boolean, pollMs = 45000): UnreadState {
    const [unreadByProject, setUnreadByProject] = useState<Record<string, boolean>>({});

    const refresh = useCallback(async () => {
        if (!enabled) { setUnreadByProject({}); return; }
        try {
            const rows = await chatService.getOverview();
            const map: Record<string, boolean> = {};
            for (const r of rows) {
                if (!r.lastMessageAt) continue;
                const last = new Date(r.lastMessageAt).getTime();
                map[r.projectId] = last > readTs(r.projectId);
            }
            setUnreadByProject(map);
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

    const totalUnread = Object.values(unreadByProject).filter(Boolean).length;
    return { unreadByProject, totalUnread, refresh };
}
