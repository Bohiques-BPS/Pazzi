import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Project, ProjectFormData, ProjectStatus, ChatMessage as ChatMessageType, Client, Employee, UserRole, ProjectWorkMode, WorkDayTimeRange, Product as ProductType, ProjectResource } from '../../types';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Modal } from '../../components/Modal';
import { inputFormStyle, BUTTON_SECONDARY_SM_CLASSES, BUTTON_PRIMARY_SM_CLASSES, PROJECT_STATUS_OPTIONS, ADMIN_USER_ID } from '../../constants';
import { PaperAirplaneIcon, UserGroupIcon, ChatBubbleLeftRightIcon, VideoCameraIcon, PhoneIcon, SparklesIcon, TrashIconMini, CalendarDaysIcon, ClockIcon, PlusIcon, DocumentArrowDownIcon, DocumentArrowUpIcon } from '../../components/icons'; // Added DocumentArrowDownIcon
import { ChatMessageItem } from './ChatMessageItem';
import { CallModal } from '../../components/CallModal';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

interface ProjectFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    project: Project | null;
    initialTab?: 'details' | 'chat';
    onGenerateInvoice?: (project: Project) => void; // Callback for invoice generation
    onViewInvoicePDF?: (project: Project) => void; // Callback for viewing invoice PDF
}

type ActiveTab = 'details' | 'chat';

const defaultWorkDayTime: WorkDayTimeRange = { date: new Date().toISOString().split('T')[0], startTime: '09:00', endTime: '17:00' };
const defaultToday = new Date().toISOString().split('T')[0];

export const ProjectFormModal: React.FC<ProjectFormModalProps> = ({isOpen, onClose, project, initialTab = 'details', onGenerateInvoice, onViewInvoicePDF}) => {
    const { setProjects, clients, products: allProductsHookData, employees: allEmployeesHook, getChatMessagesForProject, addChatMessage, getClientById, getEmployeeById, generateInvoiceForProject } = useData();
    const { currentUser } = useAuth();
    
    const projectRelevantProducts = useMemo(() => allProductsHookData.filter(p => p.storeOwnerId === ADMIN_USER_ID || !p.storeOwnerId), [allProductsHookData]);

    const getInitialFormData = (): ProjectFormData => ({
        name: '', 
        clientId: clients[0]?.id || '', 
        status: ProjectStatus.PENDING, 
        description: '', 
        assignedProducts: [], 
        assignedEmployeeIds: [],
        visitDate: '',
        visitTime: '',
        workMode: 'daysOnly' as ProjectWorkMode,
        workDays: [],
        workDayTimeRanges: [],
        workStartDate: '',
        workEndDate: '',
    });
    
    const [formData, setFormData] = useState<ProjectFormData>(getInitialFormData());
    
    const [currentProduct, setCurrentProduct] = useState<string>(''); // Initialize as empty
    const [currentQuantity, setCurrentQuantity] = useState<number>(1);

    const [activeTab, setActiveTab] = useState<ActiveTab>(initialTab);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    const [isCallModalOpen, setIsCallModalOpen] = useState(false);
    const [callType, setCallType] = useState<'video' | 'audio'>('video');
    const [callParticipants, setCallParticipants] = useState<string[]>([]);

    const [isAiGenerating, setIsAiGenerating] = useState(false); 

    const [currentSingleWorkDay, setCurrentSingleWorkDay] = useState<string>(defaultToday);
    const [currentWorkDayRange, setCurrentWorkDayRange] = useState<WorkDayTimeRange>({...defaultWorkDayTime});


    const projectMessages = useMemo(() => project ? getChatMessagesForProject(project.id) : [], [project, getChatMessagesForProject]);
    const isEmployeeView = currentUser?.role === UserRole.EMPLOYEE;
    const canEditDetails = !isEmployeeView;


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
                    status: project.status,
                    description: project.description || '',
                    assignedProducts: project.assignedProducts || [],
                    assignedEmployeeIds: project.assignedEmployeeIds || [],
                    visitDate: project.visitDate || '',
                    visitTime: project.visitTime || '',
                    workMode: project.workMode || 'daysOnly',
                    workDays: project.workDays || [],
                    workDayTimeRanges: project.workDayTimeRanges || [],
                    workStartDate: project.workStartDate || '',
                    workEndDate: project.workEndDate || '',
                });
            } else {
                 setFormData(getInitialFormData());
            }
            
            if (projectRelevantProducts.length > 0) {
                setCurrentProduct(projectRelevantProducts[0].id);
            } else {
                setCurrentProduct('');
            }
            setCurrentQuantity(1);
            setNewMessage('');
            setCurrentSingleWorkDay(defaultToday);
            setCurrentWorkDayRange({...defaultWorkDayTime});
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [project, isOpen, clients, initialTab, projectRelevantProducts]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        if (isEmployeeView && activeTab === 'details') return; 
        setFormData(prev => ({...prev, [e.target.name]: e.target.value}));
    };

    const handleWorkModeChange = (mode: ProjectWorkMode) => {
        if (!canEditDetails) return;
        setFormData(prev => ({ 
            ...prev, 
            workMode: mode, 
            workDays: mode === 'daysOnly' ? prev.workDays : [], 
            workDayTimeRanges: mode === 'daysAndTimes' ? prev.workDayTimeRanges : [],
            workStartDate: mode === 'dateRange' ? (prev.workStartDate || defaultToday) : '',
            workEndDate: mode === 'dateRange' ? (prev.workEndDate || defaultToday) : '',
        }));
    };

    const handleSingleWorkDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCurrentSingleWorkDay(e.target.value);
    };
    
    const handleAddSingleWorkDay = () => {
        if (!canEditDetails || !currentSingleWorkDay) return;
        if (!formData.workDays.includes(currentSingleWorkDay)) {
            setFormData(prev => ({ ...prev, workDays: [...prev.workDays, currentSingleWorkDay].sort() }));
        }
    };

    const handleRemoveSingleWorkDay = (dateToRemove: string) => {
        if (!canEditDetails) return;
        setFormData(prev => ({ ...prev, workDays: prev.workDays.filter(d => d !== dateToRemove) }));
    };

    const handleWorkDayRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setCurrentWorkDayRange(prev => ({...prev, [name]: value }));
    };

    const handleAddWorkDayTimeRange = () => {
        if (!canEditDetails) return;
        if (!currentWorkDayRange.date || !currentWorkDayRange.startTime || !currentWorkDayRange.endTime) {
            alert("Por favor, complete todos los campos para el rango de trabajo.");
            return;
        }
        if (currentWorkDayRange.endTime <= currentWorkDayRange.startTime) {
            alert("La hora de fin debe ser posterior a la hora de inicio.");
            return;
        }
        setFormData(prev => ({ 
            ...prev, 
            workDayTimeRanges: [...prev.workDayTimeRanges, currentWorkDayRange].sort((a,b) => {
                if (a.date < b.date) return -1;
                if (a.date > b.date) return 1;
                return a.startTime.localeCompare(b.startTime);
            })
        }));
        setCurrentWorkDayRange({...defaultWorkDayTime, date: defaultToday}); 
    };
    
    const handleRemoveWorkDayTimeRange = (indexToRemove: number) => {
        if (!canEditDetails) return;
        setFormData(prev => ({ 
            ...prev, 
            workDayTimeRanges: prev.workDayTimeRanges.filter((_, index) => index !== indexToRemove)
        }));
    };

    const handleProductAdd = () => {
        if (!canEditDetails) return;
        if (currentProduct && currentQuantity > 0) {
            const existingProductIndex = formData.assignedProducts.findIndex(p => p.productId === currentProduct);
            if (existingProductIndex > -1) {
                const updatedProducts = [...formData.assignedProducts];
                updatedProducts[existingProductIndex].quantity += currentQuantity;
                setFormData(prev => ({...prev, assignedProducts: updatedProducts}));
            } else {
                setFormData(prev => ({...prev, assignedProducts: [...prev.assignedProducts, {productId: currentProduct, quantity: currentQuantity}]}));
            }
        }
    };
    
    const handleProductRemove = (productIdToRemove: string) => {
        if (!canEditDetails) return;
        setFormData(prev => ({...prev, assignedProducts: prev.assignedProducts.filter(p => p.productId !== productIdToRemove)}));
    };

    const handleEmployeeToggle = (employeeId: string) => {
        if (!canEditDetails) return;
        setFormData(prev => {
            const isAssigned = prev.assignedEmployeeIds.includes(employeeId);
            return {
                ...prev,
                assignedEmployeeIds: isAssigned 
                    ? prev.assignedEmployeeIds.filter(id => id !== employeeId)
                    : [...prev.assignedEmployeeIds, employeeId]
            };
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.workMode === 'dateRange' && formData.workStartDate && formData.workEndDate && formData.workStartDate > formData.workEndDate) {
            alert("La fecha de fin del rango de trabajo no puede ser anterior a la fecha de inicio.");
            return;
        }
        if (project) { 
            const updatedProjectData = { 
                ...project, 
                ...formData,
                invoiceGenerated: project.invoiceGenerated,
                invoiceDate: project.invoiceDate,
                invoiceNumber: project.invoiceNumber,
                invoiceAmount: project.invoiceAmount,
                paymentDueDate: project.paymentDueDate,
            };
            setProjects(prevProjects => prevProjects.map(p => p.id === project.id ? updatedProjectData : p));
        } else { 
            const newProjectData: Project = { 
                id: `proj-${Date.now()}`, 
                ...formData,
            };
            setProjects(prevProjects => [...prevProjects, newProjectData]);
        }
        onClose();
    };
    
    const handleGenerateInvoiceClick = () => {
        if (project && canEditDetails) {
            const success = generateInvoiceForProject(project.id);
            if (success) {
                alert("Factura generada exitosamente. Los detalles se actualizarán al reabrir el modal o en la lista de proyectos.");
            }
        }
    };


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

    const handleGenerateAiResponse = async () => {
        if (!project || !currentUser || isAiGenerating || isEmployeeView) return;
        setIsAiGenerating(true);
         try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
             const response: GenerateContentResponse = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-04-17",
                contents: [{ parts: [{ text: `Genera una respuesta breve para un chat de proyecto sobre "${project.name}"` }] }],
            });
            setNewMessage(response.text.trim());
        } catch (error) {
            console.error("Error AI:", error);
            alert("Error al generar respuesta.");
        }
        setIsAiGenerating(false);
    };

    const projectClient = project ? getClientById(project.clientId) : null;
    const projectAssignedEmployeesForCall = project ? project.assignedEmployeeIds.map(id => getEmployeeById(id)).filter(Boolean) as Employee[] : [];

    const getProjectParticipantsForCall = (): string[] => {
        if (!project) return [];
        const participants: string[] = [];
        if (projectClient) participants.push(`${projectClient.name} ${projectClient.lastName}`);
        projectAssignedEmployeesForCall.forEach(emp => {
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
    };
    
    return (
        <>
        <Modal isOpen={isOpen} onClose={onClose} title={project ? (isEmployeeView ? 'Ver Detalles del Proyecto' : 'Editar Proyecto') : 'Crear Proyecto'} size="2xl">
            <div className="flex border-b border-neutral-200 dark:border-neutral-700 mb-4">
                <button onClick={() => setActiveTab('details')} className={`px-4 py-2 text-sm font-medium ${activeTab === 'details' ? 'border-b-2 border-primary text-primary' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'}`}>
                    Detalles
                </button>
                {project && (
                    <button onClick={() => setActiveTab('chat')} className={`px-4 py-2 text-sm font-medium ${activeTab === 'chat' ? 'border-b-2 border-primary text-primary' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'}`}>
                        Chat del Proyecto
                    </button>
                )}
            </div>
            
            {activeTab === 'details' && (
                <form onSubmit={handleSubmit} className="space-y-4 max-h-[65vh] overflow-y-auto pr-2">
                    {/* Basic Info */}
                    <fieldset className="border dark:border-neutral-600 p-3 rounded" disabled={!canEditDetails}>
                        <legend className="text-sm font-medium px-1 text-neutral-700 dark:text-neutral-300">Información Básica</legend>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label htmlFor="projectName" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">Nombre del Proyecto</label>
                                <input type="text" name="name" id="projectName" value={formData.name} onChange={handleChange} className={inputFormStyle} required/>
                            </div>
                            <div>
                                <label htmlFor="clientId" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">Cliente</label>
                                <select name="clientId" id="clientId" value={formData.clientId} onChange={handleChange} className={inputFormStyle} required>
                                    {clients.map(c => <option key={c.id} value={c.id}>{c.name} {c.lastName}</option>)}
                                    {clients.length === 0 && <option value="" disabled>No hay clientes</option>}
                                </select>
                            </div>
                        </div>
                        <div className="mt-3">
                            <label htmlFor="projectStatus" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">Estado</label>
                            <select name="status" id="projectStatus" value={formData.status} onChange={handleChange} className={inputFormStyle} required>
                                {PROJECT_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="mt-3">
                            <label htmlFor="projectDescription" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">Descripción</label>
                            <textarea name="description" id="projectDescription" value={formData.description} onChange={handleChange} rows={3} className={inputFormStyle}/>
                        </div>
                    </fieldset>
                    
                    {/* Visit Scheduling */}
                    <fieldset className="border dark:border-neutral-600 p-3 rounded" disabled={!canEditDetails}>
                        <legend className="text-sm font-medium px-1 text-neutral-700 dark:text-neutral-300">Programación de Visita Inicial</legend>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label htmlFor="visitDate" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">Fecha Visita</label>
                                <input type="date" name="visitDate" id="visitDate" value={formData.visitDate || ''} onChange={handleChange} className={inputFormStyle}/>
                            </div>
                            <div>
                                <label htmlFor="visitTime" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">Hora Visita</label>
                                <input type="time" name="visitTime" id="visitTime" value={formData.visitTime || ''} onChange={handleChange} className={inputFormStyle}/>
                            </div>
                        </div>
                    </fieldset>

                    {/* Work Scheduling */}
                    <fieldset className="border dark:border-neutral-600 p-3 rounded" disabled={!canEditDetails}>
                        <legend className="text-sm font-medium px-1 text-neutral-700 dark:text-neutral-300">Programación de Trabajo del Proyecto</legend>
                        <div className="flex space-x-4 mb-3">
                            <label className="flex items-center text-xs text-neutral-700 dark:text-neutral-300">
                                <input type="radio" name="workMode" value="daysOnly" checked={formData.workMode === 'daysOnly'} onChange={() => handleWorkModeChange('daysOnly')} className="form-radio mr-1 text-primary focus:ring-primary"/> Solo Días
                            </label>
                            <label className="flex items-center text-xs text-neutral-700 dark:text-neutral-300">
                                <input type="radio" name="workMode" value="daysAndTimes" checked={formData.workMode === 'daysAndTimes'} onChange={() => handleWorkModeChange('daysAndTimes')} className="form-radio mr-1 text-primary focus:ring-primary"/> Días y Horas Específicas
                            </label>
                            <label className="flex items-center text-xs text-neutral-700 dark:text-neutral-300">
                                <input type="radio" name="workMode" value="dateRange" checked={formData.workMode === 'dateRange'} onChange={() => handleWorkModeChange('dateRange')} className="form-radio mr-1 text-primary focus:ring-primary"/> Rango de Fechas Continuo
                            </label>
                        </div>

                        {formData.workMode === 'daysOnly' && (
                            <div className="space-y-2">
                                <div className="flex items-end gap-2">
                                    <div className="flex-grow">
                                        <label htmlFor="singleWorkDay" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">Día de Trabajo</label>
                                        <input type="date" id="singleWorkDay" value={currentSingleWorkDay} onChange={handleSingleWorkDayChange} className={inputFormStyle}/>
                                    </div>
                                    <button type="button" onClick={handleAddSingleWorkDay} className={`${BUTTON_SECONDARY_SM_CLASSES} flex items-center`}><PlusIcon className="w-4 h-4 mr-1"/>Añadir Día</button>
                                </div>
                                {formData.workDays.length > 0 && (
                                    <ul className="list-disc list-inside space-y-0.5 max-h-24 overflow-y-auto bg-neutral-50 dark:bg-neutral-700/50 p-1.5 rounded text-xs scrollbar-thin">
                                        {formData.workDays.map(day => (
                                            <li key={day} className="text-neutral-700 dark:text-neutral-200 flex justify-between items-center">
                                                {new Date(day + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                                                <button type="button" onClick={() => handleRemoveSingleWorkDay(day)} className="text-red-500 hover:text-red-700 text-xs p-0.5" aria-label={`Quitar día ${day}`}><TrashIconMini/></button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}

                        {formData.workMode === 'daysAndTimes' && (
                            <div className="space-y-2">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
                                    <div className="md:col-span-2">
                                        <label htmlFor="rangeDate" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">Fecha</label>
                                        <input type="date" name="date" id="rangeDate" value={currentWorkDayRange.date} onChange={handleWorkDayRangeChange} className={inputFormStyle}/>
                                    </div>
                                    <div>
                                        <label htmlFor="rangeStartTime" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">Hora Inicio</label>
                                        <input type="time" name="startTime" id="rangeStartTime" value={currentWorkDayRange.startTime} onChange={handleWorkDayRangeChange} className={inputFormStyle}/>
                                    </div>
                                    <div>
                                        <label htmlFor="rangeEndTime" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">Hora Fin</label>
                                        <input type="time" name="endTime" id="rangeEndTime" value={currentWorkDayRange.endTime} onChange={handleWorkDayRangeChange} className={inputFormStyle}/>
                                    </div>
                                    <button type="button" onClick={handleAddWorkDayTimeRange} className={`${BUTTON_SECONDARY_SM_CLASSES} md:col-span-4 flex items-center justify-center`}><PlusIcon className="w-4 h-4 mr-1"/>Añadir Rango</button>
                                </div>
                                 {formData.workDayTimeRanges.length > 0 && (
                                    <ul className="list-disc list-inside space-y-0.5 max-h-24 overflow-y-auto bg-neutral-50 dark:bg-neutral-700/50 p-1.5 rounded text-xs scrollbar-thin">
                                        {formData.workDayTimeRanges.map((range, index) => (
                                            <li key={index} className="text-neutral-700 dark:text-neutral-200 flex justify-between items-center">
                                                {new Date(range.date + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'short', month: 'short', day: 'numeric' })} de {range.startTime} a {range.endTime}
                                                <button type="button" onClick={() => handleRemoveWorkDayTimeRange(index)} className="text-red-500 hover:text-red-700 text-xs p-0.5" aria-label={`Quitar rango ${index}`}><TrashIconMini/></button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                        
                        {formData.workMode === 'dateRange' && (
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                                <div>
                                    <label htmlFor="workStartDate" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">Fecha de Inicio del Trabajo</label>
                                    <input type="date" name="workStartDate" id="workStartDate" value={formData.workStartDate || ''} onChange={handleChange} className={inputFormStyle}/>
                                </div>
                                <div>
                                    <label htmlFor="workEndDate" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">Fecha de Fin del Trabajo</label>
                                    <input type="date" name="workEndDate" id="workEndDate" value={formData.workEndDate || ''} onChange={handleChange} className={inputFormStyle}/>
                                </div>
                            </div>
                        )}
                    </fieldset>

                    {/* Products & Employees */}
                    <fieldset className="border dark:border-neutral-600 p-3 rounded" disabled={!canEditDetails}>
                        <legend className="text-sm font-medium px-1 text-neutral-700 dark:text-neutral-300">Recursos y Equipo</legend>
                        <div className="mb-3">
                            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">Asignar Productos</label>
                            <div className="flex items-center gap-2 mb-1">
                                <select value={currentProduct} onChange={e => setCurrentProduct(e.target.value)} className={inputFormStyle + " flex-grow !text-xs"}>
                                    <option value="" disabled>Seleccionar producto</option>
                                    {projectRelevantProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    {projectRelevantProducts.length === 0 && <option value="" disabled>No hay productos</option>}
                                </select>
                                <input type="number" value={currentQuantity} onChange={e => setCurrentQuantity(Math.max(1, parseInt(e.target.value) || 1))} className={inputFormStyle + " w-20 !text-xs"} min="1"/>
                                <button type="button" onClick={handleProductAdd} className={BUTTON_SECONDARY_SM_CLASSES + " !text-xs"}>Añadir</button>
                            </div>
                            {formData.assignedProducts.length > 0 && (
                                <ul className="list-disc list-inside space-y-0.5 max-h-20 overflow-y-auto bg-neutral-50 dark:bg-neutral-700/50 p-1.5 rounded text-xs scrollbar-thin">
                                    {formData.assignedProducts.map(ap => {
                                        const prod = projectRelevantProducts.find(p => p.id === ap.productId);
                                        return (
                                            <li key={ap.productId} className="text-neutral-700 dark:text-neutral-200 flex justify-between items-center">
                                                {prod?.name || 'Producto Desconocido'} (x{ap.quantity})
                                                <button type="button" onClick={() => handleProductRemove(ap.productId)} className="text-red-500 hover:text-red-700 text-xs p-0.5" aria-label={`Quitar ${prod?.name || 'producto'}`}><TrashIconMini/></button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">Asignar Empleados</label>
                             <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-24 overflow-y-auto bg-neutral-50 dark:bg-neutral-700/50 p-1.5 rounded scrollbar-thin">
                                {allEmployeesHook.map(emp => (
                                    <label key={emp.id} className="flex items-center space-x-1.5 p-1 rounded cursor-pointer hover:bg-neutral-200 dark:hover:bg-neutral-600">
                                        <input type="checkbox" checked={formData.assignedEmployeeIds.includes(emp.id)} onChange={() => handleEmployeeToggle(emp.id)} className="form-checkbox text-primary focus:ring-primary dark:bg-neutral-600 dark:border-neutral-500 text-xs"/>
                                        <span className="text-xs text-neutral-700 dark:text-neutral-200">{emp.name} {emp.lastName}</span>
                                    </label>
                                ))}
                                {allEmployeesHook.length === 0 && <p className="text-xs text-neutral-500 dark:text-neutral-400 col-span-full text-center py-2">No hay empleados disponibles.</p>}
                            </div>
                        </div>
                    </fieldset>

                    {/* Invoice Section */}
                    {project && (
                        <fieldset className="border dark:border-neutral-600 p-3 rounded">
                            <legend className="text-sm font-medium px-1 text-neutral-700 dark:text-neutral-300">Facturación</legend>
                            {project.invoiceGenerated ? (
                                <div className="space-y-1 text-xs text-neutral-700 dark:text-neutral-300">
                                    <p><strong>Factura Generada:</strong> Sí</p>
                                    <p><strong>Nº Factura:</strong> {project.invoiceNumber}</p>
                                    <p><strong>Fecha Factura:</strong> {project.invoiceDate ? new Date(project.invoiceDate + 'T00:00:00').toLocaleDateString() : 'N/A'}</p>
                                    <p><strong>Monto Facturado:</strong> ${project.invoiceAmount?.toFixed(2) || 'N/A'}</p>
                                    <p><strong>Vencimiento:</strong> {project.paymentDueDate ? new Date(project.paymentDueDate + 'T00:00:00').toLocaleDateString() : 'N/A'}</p>
                                    {onViewInvoicePDF && (
                                        <button type="button" onClick={() => onViewInvoicePDF(project)} className={`${BUTTON_SECONDARY_SM_CLASSES} !text-xs mt-2 flex items-center`}>
                                            <DocumentArrowDownIcon className="w-3 h-3 mr-1"/>Ver Factura PDF
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div>
                                    <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-2">Aún no se ha generado una factura para este proyecto.</p>
                                    {project.status === ProjectStatus.COMPLETED && canEditDetails && (
                                        <button 
                                            type="button" 
                                            onClick={handleGenerateInvoiceClick} 
                                            className={`${BUTTON_PRIMARY_SM_CLASSES} !text-xs flex items-center`}
                                        >
                                          <DocumentArrowUpIcon className="w-3 h-3 mr-1"/>  Generar Factura Ahora
                                        </button>
                                    )}
                                     {project.status !== ProjectStatus.COMPLETED && <p className="text-xs text-amber-600 dark:text-amber-400">El proyecto debe estar completado para generar la factura.</p>}
                                </div>
                            )}
                        </fieldset>
                    )}
                    
                    {canEditDetails && (
                        <div className="flex justify-end space-x-2 pt-2">
                            <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button>
                            <button type="submit" className={BUTTON_PRIMARY_SM_CLASSES}>Guardar Proyecto</button>
                        </div>
                    )}
                     {!canEditDetails && (
                        <div className="flex justify-end pt-2">
                            <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>Cerrar Vista</button>
                        </div>
                    )}
                </form>
            )}

            {activeTab === 'chat' && project && currentUser && (
                <div className="flex-1 flex flex-col h-[65vh]">
                    <div className="p-2 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between bg-neutral-50 dark:bg-neutral-700/30">
                        <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200 truncate max-w-xs">
                            Chat: {project.name}
                        </h4>
                        <div className="flex items-center space-x-1.5">
                            <button 
                                onClick={() => handleInitiateCall('audio')} 
                                className="p-1 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded-full"
                                title="Iniciar llamada de audio"
                            > <PhoneIcon className="w-4 h-4" /> </button>
                            <button 
                                onClick={() => handleInitiateCall('video')} 
                                className="p-1 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded-full"
                                title="Iniciar videollamada"
                            > <VideoCameraIcon className="w-4 h-4" /> </button>
                        </div>
                    </div>
                    <div className="flex-1 p-3 space-y-3 overflow-y-auto bg-neutral-50 dark:bg-neutral-800/30 scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-600">
                        {projectMessages.length > 0 ? projectMessages.map(msg => (
                            <ChatMessageItem 
                                key={msg.id} 
                                message={msg} 
                                isCurrentUser={currentUser.id === msg.senderId} 
                            />
                        )) : (
                            <p className="text-center text-xs text-neutral-400 dark:text-neutral-500 py-8">No hay mensajes aún.</p>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                    <div className="p-2 border-t border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
                        <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex items-center space-x-2">
                            {!isEmployeeView && (
                                <button
                                    type="button"
                                    onClick={handleGenerateAiResponse}
                                    className={`${BUTTON_SECONDARY_SM_CLASSES} !py-1.5 !px-2 rounded-md`}
                                    disabled={isAiGenerating}
                                    title="Generar respuesta con IA"
                                > <SparklesIcon className={`w-4 h-4 ${isAiGenerating ? 'animate-pulse' : ''}`} /> </button>
                            )}
                            <textarea
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
                                }}
                                placeholder={isAiGenerating ? "Generando..." : "Escribe un mensaje..."}
                                className={`${inputFormStyle} flex-grow !py-1.5 text-sm resize-none max-h-20`}
                                rows={1}
                                disabled={isAiGenerating}
                            />
                            <button type="submit" className={`${BUTTON_PRIMARY_SM_CLASSES} !py-1.5 rounded-md`} disabled={!newMessage.trim() || isAiGenerating}>
                                <PaperAirplaneIcon className="w-4 h-4" />
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </Modal>
        <CallModal
            isOpen={isCallModalOpen}
            onClose={() => setIsCallModalOpen(false)}
            callType={callType}
            participants={callParticipants}
        />
        </>
    );
};