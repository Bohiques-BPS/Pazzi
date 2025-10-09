import React from 'react';
import { ChatMessage } from '../../types'; // Adjusted path

interface ChatMessageItemProps {
    message: ChatMessage;
    isCurrentUser: boolean;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({ message, isCurrentUser }) => {
    const alignClass = isCurrentUser ? 'items-end' : 'items-start';
    const bubbleClass = isCurrentUser 
        ? 'bg-primary text-white dark:bg-primary' 
        : 'bg-neutral-200 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-100';

    return (
        <div className={`flex flex-col mb-3 ${alignClass}`}>
            <div className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg shadow ${bubbleClass}`}>
                {!isCurrentUser && <p className="text-xs font-semibold mb-0.5 opacity-80">{message.senderName}</p>}
                <div className="text-sm prose dark:prose-invert max-w-none prose-p:my-0 prose-ul:my-1 prose-ol:my-1" dangerouslySetInnerHTML={{ __html: message.text }}></div>
                <p className={`text-xs mt-1 opacity-70 ${isCurrentUser ? 'text-right' : 'text-left'}`}>
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
            </div>
        </div>
    );
};
