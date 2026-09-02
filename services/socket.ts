import { io, type Socket } from 'socket.io-client';
import { API_BASE } from './api';

// El servidor de Socket.IO está montado en el origin (no bajo /api).
const SOCKET_URL = API_BASE.replace(/\/api\/?$/, '');

let socket: Socket | null = null;

/** Conexión única de Socket.IO, autenticada con el JWT actual. Se crea al primer uso. */
export function getSocket(): Socket {
    if (!socket) {
        socket = io(SOCKET_URL, {
            auth: { token: localStorage.getItem('pazzi_token') || '' },
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

/** Cierra la conexión (p. ej. al cerrar sesión). */
export function disconnectSocket() {
    if (socket) { socket.disconnect(); socket = null; }
}
