
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Project, ProjectFormData, ProjectStatus, ChatMessage as ChatMessageType, Client, Employee, UserRole } from '../../types'; // Adjusted path, Added UserRole
import { useData } from '../../contexts/DataContext'; // Adjusted path
import { useAuth } from '../../contexts/AuthContext'; // Adjusted path
import { Modal, ConfirmationModal } from '../../components/Modal'; // Adjusted path
import { inputFormStyle, BUTTON_SECONDARY_SM_CLASSES, BUTTON_PRIMARY_SM_CLASSES } from '../../constants'; // Adjusted path
import { PaperAirplaneIcon, UserGroupIcon, ChatBubbleLeftRightIcon, VideoCameraIcon, PhoneIcon, SparklesIcon } from '../../components/icons'; // Added icons
import { ChatMessageItem } from './ChatMessageItem'; // Path to ChatMessageItem
import { CallModal } from '../../components/CallModal'; // Added CallModal
import { GoogleGenAI, GenerateContentResponse } from "@google/genai"; // Added Gemini

interface ProjectFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    project: Project | null;
    initialTab?: 'details' | 'chat';
}

type ActiveTab = 'details' | 'chat';

export const ProjectFormModal: React.FC<ProjectFormModalProps> = ({isOpen, onClose, project, initialTab = 'details'}) => {
    const { setProjects, clients, products: allProducts, employees: allEmployeesHook, getChatMessagesForProject, addChatMessage, getClientById, getEmployeeById } = useData();
    const { currentUser } = useAuth();
    const [formData, setFormData] = useState<ProjectFormData>({
        name: '', clientId: '', startDate: '', endDate: '', status: ProjectStatus.PENDING, description: '', assignedProducts: [], assignedEmployeeIds: []
    });
    
    const [currentProduct, setCurrentProduct] = useState<string>('');
    const [currentQuantity, setCurrentQuantity] = useState<number>(1);

    const [originalStartDate, setOriginalStartDate] = useState<string | null>(null);
    const [originalEndDate, setOriginalEndDate] = useState<string | null>(null);
    const [showDateChangeConfirmModal, setShowDateChangeConfirmModal] = useState(false);
    const [pendingFormData, setPendingFormData] = useState<ProjectFormData | null>(null);

    const [activeTab, setActiveTab] = useState<ActiveTab>(initialTab);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    const [isCallModalOpen, setIsCallModalOpen] = useState(false);
    const [callType, setCallType] = useState<'video' | 'audio'>('video');
    const [callParticipants, setCallParticipants] = useState<string[]>([]);

    const [isAiGenerating, setIsAiGenerating] = useState(false); // AI loading state

    const projectMessages = useMemo(() => project ? getChatMessagesForProject(project.id) : [], [project, getChatMessagesForProject]);
    const isEmployeeView = currentUser?.role === UserRole.EMPLOYEE;


    const scrollToBottomChat = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottomChat, [projectMessages, activeTab]);


    useEffect(() => {
        if (isOpen) {
            setActiveTab(project ? initialTab : 'details'); 
            if (project) {
                setFormData({
                    name: project.name,
                    clientId: project.clientId,
                    startDate: project.startDate,
                    endDate: project.endDate,
                    status: project.status,
                    description: project.description || '',
                    assignedProducts: project.assignedProducts || [],
                    assignedEmployeeIds: project.assignedEmployeeIds || []
                });
                setOriginalStartDate(project.startDate);
                setOriginalEndDate(project.endDate);
            } else {
                 setFormData({ name: '', clientId: clients[0]?.id || '', startDate: new Date().toISOString().split('T')[0], endDate: '', status: ProjectStatus.PENDING, description: '', assignedProducts: [], assignedEmployeeIds: []});
                 setOriginalStartDate(null);
                 setOriginalEndDate(null);
            }
            setShowDateChangeConfirmModal(false);
            setPendingFormData(null);
            setNewMessage('');
        }
    }, [project, isOpen, clients, initialTab]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        if (isEmployeeView && activeTab === 'details') return; // Prevent changes by employee on details tab
        setFormData(prev => ({...prev, [e.target.name]: e.target.value}));
    };

    const handleAddProduct = () => {
        if (isEmployeeView) return;
        if (currentProduct && currentQuantity > 0) {
            const existing = formData.assignedProducts.find(p => p.productId === currentProduct);
            if (existing) {
                setFormData(prev => ({...prev, assignedProducts: prev.assignedProducts.map(p => p.productId === currentProduct ? {...p, quantity: p.quantity + currentQuantity} : p)}));
            } else {
                setFormData(prev => ({...prev, assignedProducts: [...prev.assignedProducts, { productId: currentProduct, quantity: currentQuantity }]}));
            }
            setCurrentProduct('');
            setCurrentQuantity(1);
        }
    };
    
    const handleRemoveProduct = (productId: string) => {
        if (isEmployeeView) return;
        setFormData(prev => ({...prev, assignedProducts: prev.assignedProducts.filter(p => p.productId !== productId)}));
    };

    const handleEmployeeToggle = (employeeId: string) => {
        if (isEmployeeView) return;
        setFormData(prev => {
            const isAssigned = prev.assignedEmployeeIds.includes(employeeId);
            if (isAssigned) {
                return { ...prev, assignedEmployeeIds: prev.assignedEmployeeIds.filter(id => id !== employeeId) };
            } else {
                return { ...prev, assignedEmployeeIds: [...prev.assignedEmployeeIds, employeeId] };
            }
        });
    };

    const performSave = (dataToSave: ProjectFormData) => {
        if (project) {
            setProjects(prev => prev.map(p => p.id === project.id ? {...project, ...dataToSave} : p));
        } else {
            setProjects(prev => [...prev, {id: `proj-${Date.now()}`, ...dataToSave}]);
        }
        onClose();
    };

    const handleSubmitDetails = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEmployeeView) return; // Employees cannot save project details
        if (!formData.clientId) {
            alert("Por favor, seleccione un cliente.");
            return;
        }

        const currentData = { ...formData };

        if (project && originalStartDate && originalEndDate) { 
            const datesChanged = currentData.startDate !== originalStartDate || currentData.endDate !== originalEndDate;
            if (datesChanged) {
                setPendingFormData(currentData);
                setShowDateChangeConfirmModal(true);
                return; 
            }
        }
        performSave(currentData); 
    };

    const confirmDateChangeAndSave = () => {
        if (pendingFormData) {
            performSave(pendingFormData);
        }
        setShowDateChangeConfirmModal(false);
        setPendingFormData(null);
    };

    const handleSendChatMessage = () => {
        if (newMessage.trim() && project && currentUser) {
            addChatMessage({
                projectId: project.id,
                senderId: currentUser.id,
                text: newMessage.trim(),
            });
            setNewMessage('');
        }
    };

    const handleGenerateAiResponse = async () => {
        if (!project || !currentUser || isAiGenerating || isEmployeeView) return;

        setIsAiGenerating(true);
        const lastClientMessages = projectMessages
            .filter(msg => msg.senderId !== currentUser.id)
            .slice(-3) 
            .map(msg => `${msg.senderName}: ${msg.text}`)
            .join('\n');

        let contextPrompt = "El cliente no ha dicho nada recientemente.";
        if (lastClientMessages) {
            contextPrompt = `Historial reciente del chat (últimos mensajes del cliente/otra parte):\n${lastClientMessages}`;
        } else if (project.description) {
            contextPrompt = `El proyecto tiene la siguiente descripción: ${project.description}`;
        }
        
        const prompt = `Eres un asistente virtual para Pazzi, una empresa de remodelaciones.
Estás chateando sobre el proyecto: '${project.name}'.
${contextPrompt}

Por favor, genera una respuesta profesional y amigable. Si es una pregunta sobre el estado, intenta ser informativo si es posible, o indica que se verificará. Evita prometer cosas que no puedes asegurar.
La respuesta debe ser solo el texto para enviar al cliente, sin introducciones como "Aquí tienes una respuesta:" o similar.`;

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
            const response: GenerateContentResponse = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-04-17",
                contents: [{ parts: [{ text: prompt }] }],
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

    const getProjectParticipants = (): string[] => {
        if (!project) return [];
        const participants: string[] = [];
        const client = getClientById(project.clientId);
        if (client) participants.push(`${client.name} ${client.lastName}`);
        project.assignedEmployeeIds.forEach(empId => {
            const employee = getEmployeeById(empId);
            if (employee) participants.push(`${employee.name} ${employee.lastName}`);
        });
        if (currentUser && !participants.some(p => p.includes(currentUser.name || ''))) {
             participants.push(currentUser.name || currentUser.email || 'Tú');
        }
        return Array.from(new Set(participants)); // Unique names
    };

    const handleInitiateCall = (type: 'video' | 'audio') => {
        setCallParticipants(getProjectParticipants());
        setCallType(type);
        setIsCallModalOpen(true);
        console.log(`Initiating ${type} call with: ${getProjectParticipants().join(', ')} (simulated)`);
    };

    return (
        <>
            <Modal 
                isOpen={isOpen && !showDateChangeConfirmModal && !isCallModalOpen} 
                onClose={onClose} 
                title={project ? `Proyecto: ${project.name}` : "Crear Proyecto"} 
                size="2xl" 
            >
                {project && (
                    <div className="mb-4 border-b border-neutral-200 dark:border-neutral-700">
                        <nav className="flex space-x-1 -mb-px">
                            <button
                                onClick={() => setActiveTab('details')}
                                className={`px-3 py-2 font-medium text-sm rounded-t-md focus:outline-none ${activeTab === 'details' ? 'bg-primary text-white' : 'text-neutral-500 dark:text-neutral-400 hover:text-primary dark:hover:text-white hover:bg-primary/10 dark:hover:bg-primary/20'}`}
                            >
                                Detalles
                            </button>
                            <button
                                onClick={() => setActiveTab('chat')}
                                className={`px-3 py-2 font-medium text-sm rounded-t-md focus:outline-none ${activeTab === 'chat' ? 'bg-primary text-white' : 'text-neutral-500 dark:text-neutral-400 hover:text-primary dark:hover:text-white hover:bg-primary/10 dark:hover:bg-primary/20'}`}
                            >
                                <ChatBubbleLeftRightIcon className="inline w-4 h-4 mr-1.5" />
                                Chat
                            </button>
                        </nav>
                    </div>
                )}

                {activeTab === 'details' || !project ? (
                    <form onSubmit={handleSubmitDetails} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                        <fieldset disabled={isEmployeeView}> {/* Disable all fields in details tab for employee */}
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Nombre del Proyecto</label>
                                <input type="text" name="name" value={formData.name} onChange={handleChange} className={inputFormStyle + " w-full"} required/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Descripción</label>
                                <textarea name="description" value={formData.description} onChange={handleChange} className={inputFormStyle + " w-full"} rows={3}/>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Fecha de Inicio</label>
                                    <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} className={inputFormStyle + " w-full"} required/>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Fecha de Fin</label>
                                    <input type="date" name="endDate" value={formData.endDate} onChange={handleChange} className={inputFormStyle + " w-full"} required/>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Cliente</label>
                                <select name="clientId" value={formData.clientId} onChange={handleChange} className={inputFormStyle + " w-full"} required>
                                    <option value="">Seleccionar Cliente</option>
                                    {clients.map(c => <option key={c.id} value={c.id}>{c.name} {c.lastName}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Estado</label>
                                <select name="status" value={formData.status} onChange={handleChange} className={inputFormStyle + " w-full"}>
                                    {Object.values(ProjectStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>

                            <fieldset className="border dark:border-neutral-600 p-3 rounded">
                                <legend className="text-sm font-medium px-1 text-neutral-700 dark:text-neutral-300">Asignar Productos</legend>
                                <div className="flex items-end gap-2 mb-2">
                                    <select value={currentProduct} onChange={(e) => setCurrentProduct(e.target.value)} className={inputFormStyle + " flex-grow"} disabled={isEmployeeView}>
                                        <option value="">Seleccionar Producto</option>
                                        {allProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                    <input type="number" value={currentQuantity} onChange={(e) => setCurrentQuantity(parseInt(e.target.value))} min="1" className={inputFormStyle + " w-20"} disabled={isEmployeeView}/>
                                    <button type="button" onClick={handleAddProduct} className={BUTTON_SECONDARY_SM_CLASSES} disabled={isEmployeeView}>Añadir</button>
                                </div>
                                <ul className="max-h-32 overflow-y-auto">
                                    {formData.assignedProducts.map(ap => {
                                        const prod = allProducts.find(p => p.id === ap.productId);
                                        return <li key={ap.productId} className="text-sm flex justify-between items-center p-1 bg-neutral-100 dark:bg-neutral-700 rounded mb-1 text-neutral-700 dark:text-neutral-200"><span>{prod?.name} x {ap.quantity}</span> {!isEmployeeView && <button type="button" onClick={() => handleRemoveProduct(ap.productId)} className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-xs">Quitar</button>}</li>;
                                    })}
                                </ul>
                            </fieldset>

                            <fieldset className="border dark:border-neutral-600 p-3 rounded">
                                <legend className="text-sm font-medium px-1 text-neutral-700 dark:text-neutral-300">Asignar Empleados</legend>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                                    {allEmployeesHook.map(emp => (
                                        <label key={emp.id} className={`flex items-center space-x-2 p-1.5 bg-neutral-100 dark:bg-neutral-700 rounded ${isEmployeeView ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:bg-neutral-200 dark:hover:bg-neutral-600'}`}>
                                            <input type="checkbox" checked={formData.assignedEmployeeIds.includes(emp.id)} onChange={() => handleEmployeeToggle(emp.id)} className="form-checkbox text-primary focus:ring-primary dark:bg-neutral-600 dark:border-neutral-500" disabled={isEmployeeView}/>
                                            <span className="text-sm text-neutral-700 dark:text-neutral-200">{emp.name} {emp.lastName}</span>
                                        </label>
                                    ))}
                                </div>
                            </fieldset>
                        </fieldset>
                        <div className="flex justify-end space-x-2 pt-2">
                            <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button>
                            {!isEmployeeView && <button type="submit" className={BUTTON_PRIMARY_SM_CLASSES}>Guardar Proyecto</button>}
                        </div>
                    </form>
                ) : (
                    // Chat Tab Content
                    <div className="flex flex-col h-[calc(70vh-100px)]">
                        {/* Chat Header with Call Buttons */}
                        <div className="p-2 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-end space-x-2">
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
                        <div className="flex-1 p-1 space-y-3 overflow-y-auto bg-neutral-50 dark:bg-neutral-800/30 scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-600">
                            {projectMessages.length > 0 ? projectMessages.map(msg => (
                                <ChatMessageItem 
                                    key={msg.id} 
                                    message={msg} 
                                    isCurrentUser={currentUser?.id === msg.senderId} 
                                />
                            )) : (
                                <p className="text-center text-sm text-neutral-400 dark:text-neutral-500 pt-10">No hay mensajes aún. ¡Comienza la conversación!</p>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                        <div className="p-2 border-t border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
                            <form onSubmit={(e) => { e.preventDefault(); handleSendChatMessage(); }} className="flex items-center space-x-2">
                                {!isEmployeeView && ( // Only show AI button for Manager
                                     <button
                                        type="button"
                                        onClick={handleGenerateAiResponse}
                                        className={`${BUTTON_SECONDARY_SM_CLASSES} !py-1.5 !px-2.5 rounded-lg flex-shrink-0`}
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
                                            handleSendChatMessage();
                                        }
                                    }}
                                    placeholder={isAiGenerating ? "Generando respuesta AI..." : "Escribe un mensaje..."}
                                    className={`${inputFormStyle} flex-grow !py-1.5 resize-none max-h-20`}
                                    rows={1}
                                    aria-label="Escribir mensaje de chat"
                                    disabled={isAiGenerating}
                                />
                                <button 
                                    type="submit" 
                                    className={`${BUTTON_PRIMARY_SM_CLASSES} !py-1.5 !px-3 rounded-lg flex items-center justify-center flex-shrink-0`}
                                    disabled={!newMessage.trim() || !currentUser || isAiGenerating}
                                    aria-label="Enviar mensaje de chat"
                                >
                                    <PaperAirplaneIcon className="w-4 h-4" />
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </Modal>
            {!isEmployeeView && (
                <ConfirmationModal
                    isOpen={showDateChangeConfirmModal}
                    onClose={() => { setShowDateChangeConfirmModal(false); setPendingFormData(null); }}
                    onConfirm={confirmDateChangeAndSave}
                    title="Confirmar Cambio de Fechas"
                    message="Se notificará a todos los implicados (cliente y empleados asignados) sobre el cambio en las fechas del proyecto. ¿Desea continuar?"
                    confirmButtonText="Sí, Continuar y Notificar"
                />
            )}
            <CallModal
                isOpen={isCallModalOpen}
                onClose={() => setIsCallModalOpen(false)}
                callType={callType}
                participants={callParticipants}
            />
        </>
    );
};
