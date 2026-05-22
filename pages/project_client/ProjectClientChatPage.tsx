import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Project, UserRole } from '../../types';
import { ChatMessageItem } from '../pm/ChatMessageItem';
import { PaperAirplaneIcon, ArrowUturnLeftIcon } from '../../components/icons';
import { BUTTON_PRIMARY_CLASSES } from '../../constants';
import { RichTextEditor } from '../../components/ui/RichTextEditor';
import { chatService, type ChatMessageRecord } from '../../services/chat';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';

const POLLING_INTERVAL_MS = 7000;

export const ProjectClientChatPage: React.FC = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const { getProjectById } = useData();
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    const [project, setProject] = useState<Project | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [projectMessages, setProjectMessages] = useState<ChatMessageRecord[]>([]);
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const fetchMessages = useCallback(async (pid: string) => {
        try {
            const msgs = await chatService.getMessages(pid);
            setProjectMessages(msgs);
        } catch (err) {
            if (err instanceof ApiError && err.status !== 403) console.error('chat fetch:', err.message);
        }
    }, []);

    useEffect(() => {
        if (!projectId) return;
        fetchMessages(projectId);
        const interval = setInterval(() => fetchMessages(projectId), POLLING_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [projectId, fetchMessages]);

    useEffect(() => {
        if (projectId && currentUser && currentUser.role === UserRole.CLIENT_PROJECT) {
            const foundProject = getProjectById(projectId);
            if (foundProject) {
                if (foundProject.clientId === currentUser.id) {
                    setProject(foundProject);
                } else {
                    console.warn("Client access denied: Project does not belong to this client.");
                    navigate('/project-client/dashboard'); 
                }
            } else {
                console.warn("Project not found.");
                navigate('/project-client/dashboard');
            }
        } else if (!currentUser || currentUser.role !== UserRole.CLIENT_PROJECT) {
            navigate('/login'); // Or to a generic access denied page
        }
    }, [projectId, getProjectById, currentUser, navigate]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [projectMessages]);

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !project || !currentUser) return;
        setSending(true);
        try {
            const message = await chatService.sendMessage({
                projectId: project.id,
                text: newMessage.trim(),
                senderName: `${currentUser.name} ${currentUser.lastName || ''}`.trim() || currentUser.email,
            });
            setProjectMessages(prev => [...prev, message]);
            setNewMessage('');
        } catch (err) {
            toast.error(err instanceof ApiError ? err.message : 'Error al enviar mensaje');
        } finally {
            setSending(false);
        }
    };

    if (!currentUser || currentUser.role !== UserRole.CLIENT_PROJECT) {
        return <p className="p-6 text-center text-neutral-500 dark:text-neutral-400">Acceso denegado.</p>;
    }
    if (!project) {
        return <p className="p-6 text-center text-neutral-500 dark:text-neutral-400">Cargando chat del proyecto...</p>;
    }

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] bg-white dark:bg-neutral-800 shadow-lg rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700">
            <div className="p-3 sm:p-4 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
                <RouterLink to="/project-client/dashboard" className="flex items-center text-sm text-primary hover:text-secondary p-1 -ml-1">
                    <ArrowUturnLeftIcon />
                    <span className="ml-1">Volver al Dashboard</span>
                </RouterLink>
                <h3 className="text-base sm:text-lg font-semibold text-neutral-800 dark:text-neutral-100 truncate">{project.name}</h3>
                <div className="w-32 text-right"> {/* Spacer or Project Status */}
                    <span className={`text-xs px-2 py-1 rounded-full ${
                         project.status === 'Activo' ? 'bg-green-100 text-green-700' : 
                         project.status === 'Pendiente' ? 'bg-yellow-100 text-yellow-700' : 
                         'bg-gray-100 text-gray-700'
                    }`}>
                        {project.status}
                    </span>
                </div>
            </div>

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

            <div className="p-3 sm:p-4 border-t border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
                <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex items-start space-x-2 sm:space-x-3">
                    <div className="flex-grow">
                        <RichTextEditor value={newMessage} onChange={setNewMessage} placeholder="Escribe tu mensaje..." />
                    </div>
                    <button
                        type="submit"
                        className={`${BUTTON_PRIMARY_CLASSES} !py-2 !px-3 sm:!px-4 rounded-lg flex items-center justify-center flex-shrink-0 self-end`}
                        disabled={!newMessage.trim() || sending}
                        aria-label="Enviar mensaje"
                    >
                        <PaperAirplaneIcon />
                        <span className="ml-1.5 hidden sm:inline text-sm">{sending ? 'Enviando...' : 'Enviar'}</span>
                    </button>
                </form>
            </div>
        </div>
    );
};