import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { ProjectStatus, Employee, UserRole } from '../../types';
import { ChatMessageItem } from './ChatMessageItem';
import { UserGroupIcon, PaperAirplaneIcon, VideoCameraIcon, PhoneIcon } from '../../components/icons';
import { inputFormStyle, BUTTON_PRIMARY_CLASSES } from '../../constants';
import { CallModal } from '../../components/CallModal';
import { chatService, type ChatMessageRecord } from '../../services/chat';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';
import { useTranslation } from '../../contexts/GlobalSettingsContext';

const POLLING_INTERVAL_MS = 7000;

export const ProjectChatPage: React.FC = () => {
    const { t } = useTranslation();
    const { projects: allProjectsContext, getClientById, getEmployeeById } = useData();
    const { currentUser } = useAuth();
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [projectMessages, setProjectMessages] = useState<ChatMessageRecord[]>([]);
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    const [isCallModalOpen, setIsCallModalOpen] = useState(false);
    const [callType, setCallType] = useState<'video' | 'audio'>('video');
    const [callParticipants, setCallParticipants] = useState<string[]>([]);

    const isEmployeeView = currentUser?.role === UserRole.EMPLOYEE;

    const activeProjects = useMemo(() => {
        const baseProjects = allProjectsContext.filter(p => p.status === ProjectStatus.ACTIVE || p.status === ProjectStatus.PENDING);
        if (isEmployeeView && currentUser) {
            return baseProjects.filter(p => (p.assignedEmployeeIds ?? []).includes(currentUser.id));
        }
        return baseProjects;
    }, [allProjectsContext, currentUser, isEmployeeView]);

    const selectedProject = selectedProjectId ? allProjectsContext.find(p => p.id === selectedProjectId) : null;

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [projectMessages]);

    // Carga y polling de mensajes para el proyecto seleccionado
    const fetchMessages = useCallback(async (projectId: string) => {
        try {
            const msgs = await chatService.getMessages(projectId);
            setProjectMessages(msgs);
        } catch (err) {
            if (err instanceof ApiError) console.error('chat fetch:', err.message);
        }
    }, []);

    useEffect(() => {
        if (!selectedProjectId) {
            setProjectMessages([]);
            return;
        }
        fetchMessages(selectedProjectId);
        const interval = setInterval(() => fetchMessages(selectedProjectId), POLLING_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [selectedProjectId, fetchMessages]);

     // Auto-select first project if list changes and current selection is invalid or none
    useEffect(() => {
        if (activeProjects.length > 0 && (!selectedProjectId || !activeProjects.find(p => p.id === selectedProjectId))) {
            setSelectedProjectId(activeProjects[0].id);
        } else if (activeProjects.length === 0) {
            setSelectedProjectId(null);
        }
    }, [activeProjects, selectedProjectId]);


    const handleSendMessage = async () => {
        if (!newMessage.trim() || !selectedProjectId || !currentUser) return;
        const text = newMessage.trim();
        setSending(true);
        try {
            const message = await chatService.sendMessage({
                projectId: selectedProjectId,
                text,
                senderName: `${currentUser.name} ${currentUser.lastName || ''}`.trim() || currentUser.email,
            });
            setProjectMessages(prev => [...prev, message]);
            setNewMessage('');
        } catch (err) {
            toast.error(err instanceof ApiError ? err.message : t('pm2x.chat.send_error'));
        } finally {
            setSending(false);
        }
    };

    if (!currentUser) {
        return <div className="p-6 text-center text-neutral-500 dark:text-neutral-400">{t('pm2x.chat.login_required')}</div>;
    }

    const projectClient = selectedProject ? getClientById(selectedProject.clientId) : null;
    const projectAssignedEmployees = selectedProject ? selectedProject.assignedEmployeeIds.map(id => getEmployeeById(id)).filter(Boolean) as Employee[] : [];

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
        <div className="flex h-full bg-white dark:bg-neutral-800 shadow-lg rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700">
            {/* Sidebar: Project List */}
            <div className="w-full sm:w-1/3 md:w-1/4 border-r border-neutral-200 dark:border-neutral-700 flex flex-col">
                <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
                    <h2 className="text-lg font-semibold text-primary">{t('pm2x.chat.projects')}</h2>
                </div>
                <div className="flex-grow overflow-y-auto p-2 space-y-1 scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-600">
                    {activeProjects.length > 0 ? activeProjects.map(project => (
                        <button
                            key={project.id}
                            onClick={() => setSelectedProjectId(project.id)}
                            className={`w-full text-left p-2.5 rounded-md text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50
                                ${selectedProjectId === project.id 
                                    ? 'bg-primary text-white font-medium shadow-sm' 
                                    : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}
                        >
                            {project.name}
                             <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                                project.status === ProjectStatus.ACTIVE ? 'bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-200' :
                                project.status === ProjectStatus.PENDING ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-700 dark:text-yellow-200' : ''
                             }`}>
                                {project.status}
                             </span>
                        </button>
                    )) : (
                        <p className="p-3 text-xs text-center text-neutral-500 dark:text-neutral-400">{t('pm2x.chat.no_projects')}</p>
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col">
                {!selectedProject ? (
                    <div className="flex-1 flex items-center justify-center p-4">
                        <p className="text-neutral-500 dark:text-neutral-400 text-center">{t('pm2x.chat.select_project')}</p>
                    </div>
                ) : (
                    <>
                        {/* Chat Header */}
                        <div className="p-3 sm:p-4 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
                            <div>
                                <h3 className="text-base sm:text-lg font-semibold text-neutral-800 dark:text-neutral-100 truncate max-w-xs sm:max-w-md md:max-w-lg">{selectedProject.name}</h3>
                                <div className="flex items-center text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                                    <UserGroupIcon />
                                    <span className="ml-1.5 truncate">
                                        {projectClient?.name}{projectClient ? ", " : ""} 
                                        {projectAssignedEmployees.slice(0,2).map(e => e?.name).join(', ')}
                                        {projectAssignedEmployees.length > 2 ? ` ${t('pm2x.common.and_more', { n: projectAssignedEmployees.length - 2 })}` : ''}
                                        {(!projectClient && projectAssignedEmployees.length === 0) && t('pm2x.chat.no_participants')}
                                    </span>
                                </div>
                            </div>
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

                        {/* Messages Area */}
                        <div className="flex-1 p-3 sm:p-4 space-y-4 overflow-y-auto bg-neutral-50 dark:bg-neutral-800/30 scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-600">
                            {projectMessages.length > 0 ? projectMessages.map(msg => (
                                <ChatMessageItem 
                                    key={msg.id} 
                                    message={msg} 
                                    isCurrentUser={currentUser.id === msg.senderId} 
                                />
                            )) : (
                                <p className="text-center text-sm text-neutral-400 dark:text-neutral-500 pt-10">{t('pm2x.chat.no_messages_yet')}</p>
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