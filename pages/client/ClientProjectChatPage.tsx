
import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Project } from '../../types';
import { ChatMessageItem } from '../pm/ChatMessageItem'; 
import { PaperAirplaneIcon, ArrowUturnLeftIcon } from '../../components/icons';
import { inputFormStyle, BUTTON_PRIMARY_CLASSES } from '../../constants';

export const ClientProjectChatPage: React.FC = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const { getProjectById, getChatMessagesForProject, addChatMessage } = useData();
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    const [project, setProject] = useState<Project | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const projectMessages = projectId ? getChatMessagesForProject(projectId) : [];

    useEffect(() => {
        if (projectId) {
            const foundProject = getProjectById(projectId);
            if (foundProject) {
                // Verify client has access to this project
                if (currentUser && foundProject.clientId === currentUser.id) {
                    setProject(foundProject);
                } else {
                    console.warn("Client access denied or project not found for client.");
                    navigate('/client-dashboard'); // Redirect if not their project
                }
            } else {
                console.warn("Project not found.");
                navigate('/client-dashboard');
            }
        }
    }, [projectId, getProjectById, currentUser, navigate]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [projectMessages]);

    const handleSendMessage = () => {
        if (newMessage.trim() && project && currentUser) {
            addChatMessage({
                projectId: project.id,
                senderId: currentUser.id,
                text: newMessage.trim(),
            });
            setNewMessage('');
        }
    };

    if (!currentUser) {
        return <p className="p-6 text-center text-neutral-500 dark:text-neutral-400">Por favor, inicie sesión para ver el chat.</p>;
    }
    if (!project) {
        return <p className="p-6 text-center text-neutral-500 dark:text-neutral-400">Cargando chat del proyecto...</p>;
    }

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] bg-white dark:bg-neutral-800 shadow-lg rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700">
            {/* Chat Header */}
            <div className="p-3 sm:p-4 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
                <RouterLink to="/client-dashboard" className="flex items-center text-sm text-primary hover:text-secondary p-1 -ml-1">
                    <ArrowUturnLeftIcon />
                    <span className="ml-1">Volver</span>
                </RouterLink>
                <h3 className="text-base sm:text-lg font-semibold text-neutral-800 dark:text-neutral-100 truncate">{project.name}</h3>
                <div className="w-20"></div> {/* Spacer */}
            </div>

            {/* Messages Area */}
            <div className="flex-1 p-3 sm:p-4 space-y-4 overflow-y-auto bg-neutral-50 dark:bg-neutral-800/30 scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-600">
                {projectMessages.length > 0 ? projectMessages.map(msg => (
                    <ChatMessageItem 
                        key={msg.id} 
                        message={msg} 
                        isCurrentUser={currentUser.id === msg.senderId} 
                    />
                )) : (
                    <p className="text-center text-sm text-neutral-400 dark:text-neutral-500 pt-10">No hay mensajes aún en este proyecto.</p>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-3 sm:p-4 border-t border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
                <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex items-center space-x-2 sm:space-x-3">
                    <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                            }
                        }}
                        placeholder="Escribe tu mensaje..."
                        className={`${inputFormStyle} flex-grow !py-2 resize-none max-h-24`}
                        rows={1}
                        aria-label="Escribir mensaje"
                    />
                    <button 
                        type="submit" 
                        className={`${BUTTON_PRIMARY_CLASSES} !py-2 !px-3 sm:!px-4 rounded-lg flex items-center justify-center flex-shrink-0`}
                        disabled={!newMessage.trim()}
                        aria-label="Enviar mensaje"
                    >
                        <PaperAirplaneIcon />
                        <span className="ml-1.5 hidden sm:inline text-sm">Enviar</span>
                    </button>
                </form>
            </div>
        </div>
    );
};
