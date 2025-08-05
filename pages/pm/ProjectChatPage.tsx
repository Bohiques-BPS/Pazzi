import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useData } from '../../contexts/DataContext'; // Adjusted path
import { useAuth } from '../../contexts/AuthContext'; // Adjusted path
import { ProjectStatus, Client, Employee, UserRole } from '../../types'; // Adjusted path, Added UserRole
import { ChatMessageItem } from './ChatMessageItem'; // Adjusted path
import { UserGroupIcon, PaperAirplaneIcon, VideoCameraIcon, PhoneIcon, SparklesIcon } from '../../components/icons'; // Adjusted path
import { inputFormStyle, BUTTON_PRIMARY_CLASSES, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants'; // Adjusted path
import { CallModal } from '../../components/CallModal'; // Added CallModal
import { GoogleGenAI, GenerateContentResponse } from "@google/genai"; // Added Gemini

export const ProjectChatPage: React.FC = () => {
    const { projects: allProjectsContext, clients, employees: allEmployeesHook, chatMessages, addChatMessage, getChatMessagesForProject, getClientById, getEmployeeById } = useData();
    const { currentUser } = useAuth();
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    const [isCallModalOpen, setIsCallModalOpen] = useState(false);
    const [callType, setCallType] = useState<'video' | 'audio'>('video');
    const [callParticipants, setCallParticipants] = useState<string[]>([]);

    const [isAiGenerating, setIsAiGenerating] = useState(false); // AI loading state
    const isEmployeeView = currentUser?.role === UserRole.EMPLOYEE;

    const activeProjects = useMemo(() => {
        const baseProjects = allProjectsContext.filter(p => p.status === ProjectStatus.ACTIVE || p.status === ProjectStatus.PENDING);
        if (isEmployeeView && currentUser) {
            return baseProjects.filter(p => p.assignedEmployeeIds.includes(currentUser.id));
        }
        return baseProjects;
    }, [allProjectsContext, currentUser, isEmployeeView]);

    const selectedProject = selectedProjectId ? allProjectsContext.find(p => p.id === selectedProjectId) : null;

    const projectMessages = selectedProjectId ? getChatMessagesForProject(selectedProjectId) : [];

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [projectMessages]);

     // Auto-select first project if list changes and current selection is invalid or none
    useEffect(() => {
        if (activeProjects.length > 0 && (!selectedProjectId || !activeProjects.find(p => p.id === selectedProjectId))) {
            setSelectedProjectId(activeProjects[0].id);
        } else if (activeProjects.length === 0) {
            setSelectedProjectId(null);
        }
    }, [activeProjects, selectedProjectId]);


    const handleSendMessage = () => {
        if (newMessage.trim() && selectedProjectId && currentUser) {
            addChatMessage({
                projectId: selectedProjectId,
                senderId: currentUser.id,
                text: newMessage.trim(),
            });
            setNewMessage('');
        }
    };

    const handleGenerateAiResponse = async () => {
        if (!selectedProject || !currentUser || isAiGenerating || isEmployeeView) return;

        setIsAiGenerating(true);
        const lastClientMessages = projectMessages
            .filter(msg => msg.senderId !== currentUser.id)
            .slice(-3) 
            .map(msg => `${msg.senderName}: ${msg.text}`)
            .join('\n');

        let contextPrompt = "El cliente no ha dicho nada recientemente.";
        if (lastClientMessages) {
            contextPrompt = `Historial reciente del chat (últimos mensajes del cliente/otra parte):\n${lastClientMessages}`;
        } else if (selectedProject.description) {
            contextPrompt = `El proyecto tiene la siguiente descripción: ${selectedProject.description}`;
        }
        
        const prompt = `Eres un asistente virtual para Pazzi, una empresa de remodelaciones.
Estás chateando sobre el proyecto: '${selectedProject.name}'.
${contextPrompt}

Por favor, genera una respuesta profesional y amigable. Si es una pregunta sobre el estado, intenta ser informativo si es posible, o indica que se verificará. Evita prometer cosas que no puedes asegurar.
La respuesta debe ser solo el texto para enviar al cliente, sin introducciones como "Aquí tienes una respuesta:" o similar.`;

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
            const response: GenerateContentResponse = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
            });
            
            const aiText = response.text;
            if (aiText) {
                setNewMessage(aiText.trim());
            } else {
                alert("La IA no pudo generar una respuesta en este momento.");
            }
        } catch (error) {
            console.error("Error generating AI response:", error);
            alert("Error al contactar con el servicio de IA. Por favor, inténtelo más tarde.");
        } finally {
            setIsAiGenerating(false);
        }
    };
    
    if (!currentUser) {
        return <div className="p-6 text-center text-neutral-500 dark:text-neutral-400">Por favor, inicie sesión para usar el chat.</div>;
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
             participants.push(currentUser.name || currentUser.email || 'Tú');
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
                    <h2 className="text-lg font-semibold text-primary">Proyectos</h2>
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
                        <p className="p-3 text-xs text-center text-neutral-500 dark:text-neutral-400">No hay proyectos disponibles para chatear.</p>
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col">
                {!selectedProject ? (
                    <div className="flex-1 flex items-center justify-center p-4">
                        <p className="text-neutral-500 dark:text-neutral-400 text-center">Seleccione un proyecto de la lista para comenzar a chatear.</p>
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
                                        {projectAssignedEmployees.length > 2 ? ` y ${projectAssignedEmployees.length - 2} más` : ''}
                                        {(!projectClient && projectAssignedEmployees.length === 0) && "Sin participantes visibles."}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <button 
                                    onClick={() => handleInitiateCall('audio')} 
                                    className="p-1.5 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-full"
                                    title="Iniciar llamada de audio"
                                    aria-label="Iniciar llamada de audio"
                                >
                                    <PhoneIcon className="w-5 h-5" />
                                </button>
                                <button 
                                    onClick={() => handleInitiateCall('video')} 
                                    className="p-1.5 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-full"
                                    title="Iniciar videollamada"
                                    aria-label="Iniciar videollamada"
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
                                <p className="text-center text-sm text-neutral-400 dark:text-neutral-500 pt-10">No hay mensajes aún. ¡Comienza la conversación!</p>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Message Input */}
                        <div className="p-3 sm:p-4 border-t border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
                            <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex items-center space-x-2 sm:space-x-3">
                                {!isEmployeeView && ( // Only show AI button for Manager
                                    <button
                                        type="button"
                                        onClick={handleGenerateAiResponse}
                                        className={`${BUTTON_SECONDARY_SM_CLASSES} !py-2 !px-2.5 rounded-lg flex-shrink-0`}
                                        disabled={isAiGenerating}
                                        title="Generar respuesta con IA"
                                        aria-label="Generar respuesta con IA"
                                    >
                                        <SparklesIcon className={`${isAiGenerating ? 'animate-pulse' : ''}`} />
                                    </button>
                                )}
                                <textarea
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage();
                                        }
                                    }}
                                    placeholder={isAiGenerating ? "Generando respuesta AI..." : "Escribe un mensaje..."}
                                    className={`${inputFormStyle} flex-grow !py-2 resize-none max-h-24`}
                                    rows={1}
                                    aria-label="Escribir mensaje"
                                    disabled={isAiGenerating}
                                />
                                <button 
                                    type="submit" 
                                    className={`${BUTTON_PRIMARY_CLASSES} !py-2 !px-3 sm:!px-4 rounded-lg flex items-center justify-center flex-shrink-0`}
                                    disabled={!newMessage.trim() || isAiGenerating}
                                    aria-label="Enviar mensaje"
                                >
                                    <PaperAirplaneIcon />
                                    <span className="ml-1.5 hidden sm:inline text-sm">Enviar</span>
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