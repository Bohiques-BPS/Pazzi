import React, { useState } from 'react';
import { ChatMessage } from '../../types'; // Adjusted path

interface ChatMessageItemProps {
    message: ChatMessage;
    isCurrentUser: boolean;
    /** Mostrar el nombre del remitente (Telegram: solo en el primer mensaje de una racha). */
    showName?: boolean;
    /** Mostrar el avatar (Telegram: solo en el último mensaje de una racha); si no, deja el hueco. */
    showAvatar?: boolean;
}

// Colores estables por remitente para el avatar de iniciales y el nombre (estilo Telegram).
const PALETTE = [
    { bg: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
    { bg: 'bg-sky-500', text: 'text-sky-600 dark:text-sky-400' },
    { bg: 'bg-violet-500', text: 'text-violet-600 dark:text-violet-400' },
    { bg: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' },
    { bg: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400' },
    { bg: 'bg-indigo-500', text: 'text-indigo-600 dark:text-indigo-400' },
    { bg: 'bg-orange-500', text: 'text-orange-600 dark:text-orange-400' },
    { bg: 'bg-teal-500', text: 'text-teal-600 dark:text-teal-400' },
];
const colorFor = (key: string) => {
    let h = 0;
    for (const ch of key || '') h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return PALETTE[h % PALETTE.length];
};
const initialsOf = (name: string) =>
    (name || '?').replace(/\s*\(WhatsApp\)\s*$/, '').trim().split(/\s+/).slice(0, 2).map(w => w.charAt(0)).join('').toUpperCase() || '?';

/** Avatar del remitente: su foto (o logo del negocio si es el gerente) o iniciales de color. */
const SenderAvatar: React.FC<{ name: string; url?: string | null; colorKey: string }> = ({ name, url, colorKey }) => {
    const [failed, setFailed] = useState(false);
    if (url && !failed) {
        return <img src={url} alt={name} title={name} onError={() => setFailed(true)} className="w-8 h-8 rounded-full object-cover bg-white border border-neutral-200 dark:border-neutral-600 flex-shrink-0" />;
    }
    return (
        <span title={name} className={`w-8 h-8 rounded-full ${colorFor(colorKey).bg} text-white text-xs font-semibold flex items-center justify-center flex-shrink-0`}>
            {initialsOf(name)}
        </span>
    );
};

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({ message, isCurrentUser, showName = true, showAvatar = true }) => {
    const bubbleClass = isCurrentUser
        ? 'bg-primary text-white dark:bg-primary'
        : 'bg-neutral-200 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-100';
    const colorKey = message.senderId || message.senderName;

    return (
        <div className={`flex items-end gap-2 mb-1 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
            {/* Avatar solo en mensajes de otros; si no toca mostrarlo, se deja el hueco para alinear la racha. */}
            {!isCurrentUser && (showAvatar
                ? <SenderAvatar name={message.senderName} url={message.senderAvatarUrl} colorKey={colorKey} />
                : <span className="w-8 flex-shrink-0" />)}
            <div className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg shadow ${bubbleClass}`}>
                {!isCurrentUser && showName && <p className={`text-xs font-semibold mb-0.5 ${colorFor(colorKey).text}`}>{message.senderName}</p>}

                {/* Adjunto (imagen / video / archivo) alojado en Cloudinary. */}
                {message.attachmentUrl && (
                    <div className="mb-1.5">
                        {message.attachmentType === 'image' ? (
                            <a href={message.attachmentUrl} target="_blank" rel="noopener noreferrer">
                                <img src={message.attachmentUrl} alt={message.attachmentName || 'imagen'} className="rounded-lg max-h-64 w-auto object-cover" />
                            </a>
                        ) : message.attachmentType === 'video' ? (
                            <video src={message.attachmentUrl} controls className="rounded-lg max-h-64 w-full" />
                        ) : (
                            <a href={message.attachmentUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 underline break-all">
                                📎 {message.attachmentName || 'Archivo adjunto'}
                            </a>
                        )}
                    </div>
                )}

                {message.text && (
                    <div className="text-sm prose dark:prose-invert max-w-none prose-p:my-0 prose-ul:my-1 prose-ol:my-1" dangerouslySetInnerHTML={{ __html: message.text }}></div>
                )}
                <p
                    className={`text-xs mt-1 opacity-70 ${isCurrentUser ? 'text-right' : 'text-left'}`}
                    title={new Date(message.timestamp).toLocaleString([], { dateStyle: 'full', timeStyle: 'short' })}
                >
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
            </div>
        </div>
    );
};
