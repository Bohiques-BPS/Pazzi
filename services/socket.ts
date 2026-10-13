import { io, type Socket } from 'socket.io-client';
import { API_BASE } from './api';

// El servidor de Socket.IO está montado en el origin (no bajo /api).
const SOCKET_URL = API_BASE.replace(/\/api\/?$/, '');

let socket: Socket | null = null;

/** Conexión única de Socket.IO, autenticada con el JWT actual. Se crea al primer uso. */
export function getSocket(): Socket {
    if (!socket) {
        socket = io(SOCKET_URL, {
            // `auth` como función: socket.io la reevalúa en CADA (re)conexión, así el socket
            // siempre usa el token vigente (aunque se haya refrescado desde el último connect).
            auth: (cb) => cb({ token: localStorage.getItem('pazzi_token') || '' }),
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1500,
            autoConnect: true,
        });
    }
    return socket;
}

/** Se une a la sala del proyecto para recibir sus mensajes en tiempo real. */
export function joinProjectRoom(projectId: string) {
    if (!projectId) return;
    const s = getSocket();
    const emitJoin = () => s.emit('join', projectId);
    if (s.connected) emitJoin();
    // Re-unirse tras cada (re)conexión (el server pierde las salas al reconectar).
    s.on('connect', emitJoin);
    return () => { s.off('connect', emitJoin); s.emit('leave', projectId); };
}

/**
 * Se une a la sala de la conversación de un lead (`lead:<id>`); el servidor valida permiso y visibilidad.
 * Los mensajes nuevos/actualizados llegan como evento `lead_message`.
 */
export function joinLeadRoom(leadId: string) {
    if (!leadId) return;
    const s = getSocket();
    const emitJoin = () => s.emit('lead:join', leadId);
    if (s.connected) emitJoin();
    s.on('connect', emitJoin);
    return () => { s.off('connect', emitJoin); s.emit('lead:leave', leadId); };
}

/** Cierra la conexión (p. ej. al cerrar sesión). */
export function disconnectSocket() {
    if (socket) { socket.disconnect(); socket = null; }
}
