
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Project, ProjectFormData, ProjectStatus, ChatMessage as ChatMessageType, Client, Employee, UserRole, ProjectWorkMode, WorkDayTimeRange, Product as ProductType, ProjectResource } from '../../types';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Modal, ConfirmationModal } from '../../components/Modal';
import { inputFormStyle, BUTTON_SECONDARY_SM_CLASSES, BUTTON_PRIMARY_SM_CLASSES, PROJECT_STATUS_OPTIONS, ADMIN_USER_ID } from '../../constants';
import { PaperAirplaneIcon, UserGroupIcon, ChatBubbleLeftRightIcon, VideoCameraIcon, PhoneIcon, SparklesIcon, TrashIconMini, CalendarDaysIcon, ClockIcon, PlusIcon, DocumentArrowDownIcon, DocumentArrowUpIcon } from '../../components/icons'; // Added DocumentArrowDownIcon
import { ChatMessageItem } from './ChatMessageItem';
import { CallModal } from '../../components/CallModal';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { RichTextEditor } from '../../components/ui/RichTextEditor';
import { useTranslation } from '../../contexts/GlobalSettingsContext';

interface ProjectFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    project: Project | null;
    initialTab?: 'details' | 'chat';
    onGenerateInvoice?: (project: Project) => void; // Callback for invoice generation
    onViewInvoicePDF?: (project: Project) => void; // Callback for viewing invoice PDF
}

type ActiveTab = 'details' | 'chat';
type ActiveDetailsTab = 'Detalles' | 'Programación' | 'Recursos' | 'Facturación';

const defaultWorkDayTime: WorkDayTimeRange = { date: new Date().toISOString().split('T')[0], startTime: '09:00', endTime: '17:00' };
const defaultToday = new Date().toISOString().split('T')[0];

export const ProjectFormModal: React.FC<ProjectFormModalProps> = ({isOpen, onClose, project, initialTab = 'details', onGenerateInvoice, onViewInvoicePDF}) => {
    const { t } = useTranslation();
    const { projects, setProjects, clients, products: allProductsHookData, employees: allEmployeesHook, getChatMessagesForProject, addChatMessage, getClientById, getEmployeeById, generateInvoiceForProject } = useData();
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
    
    const [currentProduct, setCurrentProduct] = useState<string>('');
    const [currentQuantity, setCurrentQuantity] = useState<number>(1);

    const [activeTab, setActiveTab] = useState<ActiveTab>(initialTab);
    
    const detailTabLabels = [
        { id: 'Detalles', label: t('project.tab.details') },
        { id: 'Programación', label: t('project.tab.schedule') },
        { id: 'Recursos', label: t('project.tab.resources') },
        { id: 'Facturación', label: t('project.tab.invoicing') }
    ];
    const [activeDetailsTab, setActiveDetailsTab] = useState<string>(detailTabLabels[0].label);

    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    const [isCallModalOpen, setIsCallModalOpen] = useState(false);
    const [callType, setCallType] = useState<'video' | 'audio'>('video');
    const [callParticipants, setCallParticipants] = useState<string[]>([]);

    const [isAiGenerating, setIsAiGenerating] = useState(false); 

    const [currentSingleWorkDay, setCurrentSingleWorkDay] = useState<string>(defaultToday);
    const [currentWorkDayRange, setCurrentWorkDayRange] = useState<WorkDayTimeRange>({...defaultWorkDayTime});
    
    const [conflictDetails, setConflictDetails] = useState<{
        conflictingProjects: { project: Project; employee: Employee }[];
        date: string;
        actionToConfirm: () => void;
    } | null>(null);
    const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);


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
            setActiveDetailsTab(detailTabLabels[0].label); 
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
    
    // --- Conflict Detection and Resolution Logic ---
    const isDateInProjectSchedule = (dateStr: string, p: Project): boolean => {
        const checkDate = new Date(dateStr + 'T00:00:00');
        switch(p.workMode) {
            case 'daysOnly':
                return p.workDays?.includes(dateStr) ?? false;
            case 'daysAndTimes':
                return p.workDayTimeRanges?.some(r => r.date === dateStr) ?? false;
            case 'dateRange':
                if (p.workStartDate && p.workEndDate) {
                    const start = new Date(p.workStartDate + 'T00:00:00');
                    const end = new Date(p.workEndDate + 'T00:00:00');
                    return checkDate >= start && checkDate <= end;
                }
                return false;
            default:
                return false;
        }
    };

    const findConflicts = (employeeIds: string[], dateStr: string): { project: Project; employee: Employee }[] => {
        const conflictingAssignments: { project: Project; employee: Employee }[] = [];
        const otherProjects = projects.filter(p => p.id !== project?.id);

        for (const empId of employeeIds) {
            const employee = getEmployeeById(empId);
            if (!employee) continue;

            for (const otherProject of otherProjects) {
                if (otherProject.assignedEmployeeIds.includes(empId) && isDateInProjectSchedule(dateStr, otherProject)) {
                    conflictingAssignments.push({ project: otherProject, employee });
                }
            }
        }
        return conflictingAssignments;
    };

    const handleConflictResolution = (confirmReschedule: boolean) => {
        if (!conflictDetails) return;

        if (confirmReschedule) {
            const { conflictingProjects, date: conflictingDateStr } = conflictDetails;
            
            const projectsToUpdate = new Map<string, Project>();
            
            conflictingProjects.forEach(({ project: p }) => {
                const newDate = new Date(conflictingDateStr + 'T00:00:00');
                newDate.setDate(newDate.getDate() + 1);
                const newDateStr = newDate.toISOString().split('T')[0];

                let updatedProject = projectsToUpdate.get(p.id) || { ...p };

                switch(updatedProject.workMode) {
                    case 'daysOnly':
                        updatedProject.workDays = updatedProject.workDays?.map(d => d === conflictingDateStr ? newDateStr : d);
                        break;
                    case 'daysAndTimes':
                        updatedProject.workDayTimeRanges = updatedProject.workDayTimeRanges?.map(r => 
                            r.date === conflictingDateStr ? { ...r, date: newDateStr } : r
                        );
                        break;
                    case 'dateRange':
                         if (updatedProject.workStartDate === conflictingDateStr) {
                            const originalStartDate = new Date(updatedProject.workStartDate + 'T00:00:00');
                            const originalEndDate = new Date(updatedProject.workEndDate + 'T00:00:00');
                            const duration = (originalEndDate.getTime() - originalStartDate.getTime());

                            const newStartDate = new Date(conflictingDateStr + 'T00:00:00');
                            newStartDate.setDate(newStartDate.getDate() + 1);
                            
                            const newEndDate = new Date(newStartDate.getTime() + duration);

                            updatedProject.workStartDate = newStartDate.toISOString().split('T')[0];
                            updatedProject.workEndDate = newEndDate.toISOString().split('T')[0];
                        } else {
                            console.warn(`Cannot auto-reschedule a conflict in the middle of a date range for project ${p.name}. Manual adjustment needed.`);
                        }
                        break;
                }
                projectsToUpdate.set(p.id, updatedProject);
            });
            
            setProjects(prevProjects => prevProjects.map(p => projectsToUpdate.get(p.id) || p));
            conflictDetails.actionToConfirm();
        }

        setIsConflictModalOpen(false);
        setConflictDetails(null);
    };
    
    const checkForConflictsAndExecute = (action: () => void, employeeIds: string[], dates: string[]) => {
        if (!canEditDetails) {
            action();
            return;
        }

        const allConflicts = dates.flatMap(date => findConflicts(employeeIds, date));
        
        if (allConflicts.length > 0) {
            setConflictDetails({
                conflictingProjects: allConflicts,
                date: dates[0], // Show conflict for the first problematic date
                actionToConfirm: action,
            });
            setIsConflictModalOpen(true);
        } else {
            action();
        }
    };


    const handleSingleWorkDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCurrentSingleWorkDay(e.target.value);
    };
    
    const handleAddSingleWorkDay = () => {
        if (!canEditDetails || !currentSingleWorkDay) return;
        
        const action = () => {
            if (!formData.workDays.includes(currentSingleWorkDay)) {
                setFormData(prev => ({ ...prev, workDays: [...prev.workDays, currentSingleWorkDay].sort() }));
            }
        };
        checkForConflictsAndExecute(action, formData.assignedEmployeeIds, [currentSingleWorkDay]);
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
        if (!canEditDetails || !currentWorkDayRange.date || !currentWorkDayRange.startTime || !currentWorkDayRange.endTime) {
            alert("Por favor, complete todos los campos para el rango de trabajo.");
            return;
        }
        if (currentWorkDayRange.endTime <= currentWorkDayRange.startTime) {
            alert("La hora de fin debe ser posterior a la hora de inicio.");
            return;
        }

        const action = () => {
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
        checkForConflictsAndExecute(action, formData.assignedEmployeeIds, [currentWorkDayRange.date]);
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
        const isCurrentlyAssigned = formData.assignedEmployeeIds.includes(employeeId);
        
        const action = () => {
             setFormData(prev => ({
                ...prev,
                assignedEmployeeIds: isCurrentlyAssigned 
                    ? prev.assignedEmployeeIds.filter(id => id !== employeeId)
                    : [...prev.assignedEmployeeIds, employeeId]
            }));
        };

        if (!isCurrentlyAssigned) {
            // Check conflicts for the employee being added across all existing dates
            const scheduledDates = [...new Set([
                ...(formData.workDays || []),
                ...(formData.workDayTimeRanges?.map(r => r.date) || [])
            ])];
            if (scheduledDates.length > 0) {
                 checkForConflictsAndExecute(action, [employeeId], scheduledDates);
            } else {
                 action(); // No dates scheduled, no conflicts to check
            }
        } else {
            action(); // Removing an employee doesn't cause a conflict
        }
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
                model: "gemini-2.5-flash",
                contents: `Genera una respuesta breve para un chat de proyecto sobre "${project.name}"`,
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

    const availableDetailTabs = detailTabLabels.filter(tab => project ? true : tab.id !== 'Facturación');
    
    return (
        <>
        <Modal isOpen={isOpen} onClose={onClose} title={project ? (isEmployeeView ? t('project.form.edit') : t('project.form.edit')) : t('project.form.create')} size="5xl">
            <div className="flex border-b border-neutral-200 dark:border-neutral-700 mb-4">
                <button onClick={() => setActiveTab('details')} className={`px-4 py-2 text-sm font-medium ${activeTab === 'details' ? 'border-b-2 border-primary text-primary' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'}`}>
                    {t('project.tab.details')}
                </button>
                {project && (
                    <button onClick={() => setActiveTab('chat')} className={`px-4 py-2 text-sm font-medium ${activeTab === 'chat' ? 'border-b-2 border-primary text-primary' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'}`}>
                        {t('Chat de Proyectos')}
                    </button>
                )}
            </div>
            
            {activeTab === 'details' && (
                <form onSubmit={handleSubmit}>
                    <div className="flex border-b border-neutral-200 dark:border-neutral-700 mb-3 -mx-4 px-4">
                        {availableDetailTabs.map(tab => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveDetailsTab(tab.label)}
                                className={`px-3 py-2 text-sm font-medium ${activeDetailsTab === tab.label ? 'border-b-2 border-primary text-primary' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'}`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                    
                    <div className="max-h-[55vh] overflow-y-auto pr-2 space-y-4">
                        {/* Detalles Tab */}
                        <fieldset className={activeDetailsTab === t('project.tab.details') ? 'space-y-4' : 'hidden'} disabled={!canEditDetails}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label htmlFor="projectName" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">{t('project.field.name')}</label>
                                    <input type="text" name="name" id="projectName" value={formData.name} onChange={handleChange} className={inputFormStyle} required/>
                                </div>
                                <div>
                                    <label htmlFor="clientId" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">{t('project.field.client')}</label>
                                    <select name="clientId" id="clientId" value={formData.clientId} onChange={handleChange} className={inputFormStyle} required>
                                        {clients.map(c => <option key={c.id} value={c.id}>{c.name} {c.lastName}</option>)}
                                        {clients.length === 0 && <option value="" disabled>No hay clientes</option>}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label htmlFor="projectStatus" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">{t('project.field.status')}</label>
                                <select name="status" id="projectStatus" value={formData.status} onChange={handleChange} className={inputFormStyle} required>
                                    {PROJECT_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="projectDescription" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">{t('project.field.description')}</label>
                                <RichTextEditor 
                                    value={formData.description} 
                                    onChange={(value) => setFormData(prev => ({...prev, description: value}))} 
                                    placeholder="Descripción detallada del proyecto..."
                                />
                            </div>
                        </fieldset>

                        {/* Programación Tab */}
                        <fieldset className={activeDetailsTab === t('project.tab.schedule') ? 'space-y-4' : 'hidden'} disabled={!canEditDetails}>
                            <div>
                                <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">{t('project.schedule.initial_visit')}</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label htmlFor="visitDate" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">{t('project.schedule.visit_date')}</label>
                                        <input type="date" name="visitDate" id="visitDate" value={formData.visitDate || ''} onChange={handleChange} className={inputFormStyle}/>
                                    </div>
                                    <div>
                                        <label htmlFor="visitTime" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">{t('project.schedule.visit_time')}</label>
                                        <input type="time" name="visitTime" id="visitTime" value={formData.visitTime || ''} onChange={handleChange} className={inputFormStyle}/>
                                    </div>
                                </div>
                            </div>
                            <div className="pt-4 border-t dark:border-neutral-700">
                                <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">{t('project.schedule.work_type')}</h4>
                                <div className="flex space-x-4 mb-3">
                                    <label className="flex items-center text-xs text-neutral-700 dark:text-neutral-300"><input type="radio" name="workMode" value="daysOnly" checked={formData.workMode === 'daysOnly'} onChange={() => handleWorkModeChange('daysOnly')} className="form-radio mr-1"/> {t('project.schedule.mode.days_only')}</label>
                                    <label className="flex items-center text-xs text-neutral-700 dark:text-neutral-300"><input type="radio" name="workMode" value="daysAndTimes" checked={formData.workMode === 'daysAndTimes'} onChange={() => handleWorkModeChange('daysAndTimes')} className="form-radio mr-1"/> {t('project.schedule.mode.days_times')}</label>
                                    <label className="flex items-center text-xs text-neutral-700 dark:text-neutral-300"><input type="radio" name="workMode" value="dateRange" checked={formData.workMode === 'dateRange'} onChange={() => handleWorkModeChange('dateRange')} className="form-radio mr-1"/> {t('project.schedule.mode.range')}</label>
                                </div>
                                {formData.workMode === 'daysOnly' && (
                                    <div className="space-y-2">
                                        <div className="flex items-end gap-2">
                                            <div className="flex-grow">
                                                <label htmlFor="singleWorkDay" className="block text-xs font-medium">{t('project.schedule.add_work_day')}</label>
                                                <input type="date" id="singleWorkDay" value={currentSingleWorkDay} onChange={handleSingleWorkDayChange} className={inputFormStyle} />
                                            </div>
                                            <button type="button" onClick={handleAddSingleWorkDay} className={BUTTON_SECONDARY_SM_CLASSES}>{t('common.add')}</button>
                                        </div>
                                        {formData.workDays.length > 0 && (
                                            <ul className="list-disc list-inside space-y-1 max-h-24 overflow-y-auto bg-neutral-50 dark:bg-neutral-700/50 p-2 rounded text-xs">
                                                {formData.workDays.map(day => (
                                                    <li key={day} className="flex justify-between items-center">
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
                                                <label htmlFor="rangeDate" className="block text-xs font-medium">{t('project.schedule.date')}</label>
                                                <input type="date" name="date" id="rangeDate" value={currentWorkDayRange.date} onChange={handleWorkDayRangeChange} className={inputFormStyle} />
                                            </div>
                                            <div>
                                                <label htmlFor="rangeStartTime" className="block text-xs font-medium">{t('project.schedule.start_time')}</label>
                                                <input type="time" name="startTime" id="rangeStartTime" value={currentWorkDayRange.startTime} onChange={handleWorkDayRangeChange} className={inputFormStyle} />
                                            </div>
                                            <div>
                                                <label htmlFor="rangeEndTime" className="block text-xs font-medium">{t('project.schedule.end_time')}</label>
                                                <input type="time" name="endTime" id="rangeEndTime" value={currentWorkDayRange.endTime} onChange={handleWorkDayRangeChange} className={inputFormStyle} />
                                            </div>
                                        </div>
                                        <button type="button" onClick={handleAddWorkDayTimeRange} className={`${BUTTON_SECONDARY_SM_CLASSES} w-full`}><PlusIcon className="w-4 h-4 mr-1" />{t('project.schedule.add_range')}</button>
                                        {formData.workDayTimeRanges.length > 0 && (
                                            <ul className="list-disc list-inside space-y-1 max-h-24 overflow-y-auto bg-neutral-50 dark:bg-neutral-700/50 p-2 rounded text-xs">
                                                {formData.workDayTimeRanges.map((range, index) => (
                                                    <li key={index} className="flex justify-between items-center">
                                                        <span>{new Date(range.date + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })} de {range.startTime} a {range.endTime}</span>
                                                        <button type="button" onClick={() => handleRemoveWorkDayTimeRange(index)} className="text-red-500 hover:text-red-700 text-xs p-0.5" aria-label={`Quitar rango ${index}`}><TrashIconMini/></button>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                )}
                                {formData.workMode === 'dateRange' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label htmlFor="workStartDate" className="block text-xs font-medium">{t('project.schedule.range_start')}</label>
                                            <input type="date" name="workStartDate" id="workStartDate" value={formData.workStartDate || ''} onChange={handleChange} className={inputFormStyle} />
                                        </div>
                                        <div>
                                            <label htmlFor="workEndDate" className="block text-xs font-medium">{t('project.schedule.range_end')}</label>
                                            <input type="date" name="workEndDate" id="workEndDate" value={formData.workEndDate || ''} onChange={handleChange} className={inputFormStyle} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </fieldset>
                        
                        {/* Recursos Tab */}
                        <fieldset className={activeDetailsTab === t('project.tab.resources') ? 'space-y-4' : 'hidden'} disabled={!canEditDetails}>
                            {/* Product and Employee assignment fields */}
                            <div className="mb-3">
                                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">{t('project.resources.assign_catalog')}</label>
                                <div className="flex items-center gap-2 mb-1">
                                    <select value={currentProduct} onChange={e => setCurrentProduct(e.target.value)} className={inputFormStyle + " flex-grow !text-xs"}>{projectRelevantProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                                    <input type="number" value={currentQuantity} onChange={e => setCurrentQuantity(Math.max(1, parseInt(e.target.value) || 1))} className={inputFormStyle + " w-20 !text-xs"} min="1"/>
                                    <button type="button" onClick={handleProductAdd} className={BUTTON_SECONDARY_SM_CLASSES + " !text-xs"}>{t('common.add')}</button>
                                </div>
                                {formData.assignedProducts.length > 0 && (
                                    <ul className="list-disc list-inside space-y-0.5 max-h-20 overflow-y-auto bg-neutral-50 dark:bg-neutral-700/50 p-1.5 rounded text-xs scrollbar-thin">{formData.assignedProducts.map(ap => { const product = projectRelevantProducts.find(p => p.id === ap.productId); return (<li key={ap.productId} className="flex justify-between items-center"><span>{product?.name || 'Producto Desconocido'} (x{ap.quantity})</span><button type="button" onClick={() => handleProductRemove(ap.productId)} className="text-red-500 hover:text-red-700 p-0.5" aria-label={`Quitar ${product?.name}`}><TrashIconMini/></button></li>); })}</ul>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">{t('project.resources.assign_employees')}</label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-24 overflow-y-auto bg-neutral-50 dark:bg-neutral-700/50 p-1.5 rounded scrollbar-thin">{allEmployeesHook.map(emp => (<label key={emp.id} className="flex items-center space-x-2 text-xs p-1 bg-white dark:bg-neutral-700 rounded cursor-pointer"><input type="checkbox" checked={formData.assignedEmployeeIds.includes(emp.id)} onChange={() => handleEmployeeToggle(emp.id)} className="form-checkbox text-primary focus:ring-primary dark:bg-neutral-600 dark:border-neutral-500" /><span>{emp.name} {emp.lastName}</span></label>))}</div>
                            </div>
                        </fieldset>

                        {/* Facturación Tab */}
                        {project && (
                            <div className={activeDetailsTab === t('project.tab.invoicing') ? 'space-y-4' : 'hidden'}>
                                {project.invoiceGenerated ? (
                                    <div className="space-y-1 text-xs text-neutral-700 dark:text-neutral-300">
                                        <p><strong>Nº Factura:</strong> {project.invoiceNumber}</p>
                                        <p><strong>Fecha Factura:</strong> {project.invoiceDate ? new Date(project.invoiceDate + 'T00:00:00').toLocaleDateString() : 'N/A'}</p>
                                        <p><strong>Monto:</strong> ${project.invoiceAmount?.toFixed(2) || '0.00'}</p>
                                        <p><strong>Vencimiento:</strong> {project.paymentDueDate ? new Date(project.paymentDueDate + 'T00:00:00').toLocaleDateString() : 'N/A'}</p>
                                        <button type="button" onClick={() => onViewInvoicePDF && onViewInvoicePDF(project)} className={`${BUTTON_SECONDARY_SM_CLASSES} !text-xs flex items-center mt-2`}>
                                            <DocumentArrowDownIcon className="w-3 h-3 mr-1"/> Ver/Descargar PDF
                                        </button>
                                    </div>
                                ) : (
                                    <div>
                                        <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-2">Aún no se ha generado una factura.</p>
                                        {project.status === ProjectStatus.COMPLETED && canEditDetails && (
                                            <button type="button" onClick={handleGenerateInvoiceClick} className={`${BUTTON_PRIMARY_SM_CLASSES} !text-xs flex items-center`}>
                                                <DocumentArrowUpIcon className="w-3 h-3 mr-1"/> Generar Factura Ahora
                                            </button>
                                        )}
                                        {project.status !== ProjectStatus.COMPLETED && <p className="text-xs text-amber-600 dark:text-amber-400">El proyecto debe estar completado para facturar.</p>}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    
                    {canEditDetails && (
                        <div className="flex justify-end space-x-2 pt-4 border-t border-neutral-200 dark:border-neutral-700 mt-4">
                            <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>{t('common.cancel')}</button>
                            <button type="submit" className={BUTTON_PRIMARY_SM_CLASSES}>{t('common.save')}</button>
                        </div>
                    )}
                    {!canEditDetails && (
                        <div className="flex justify-end pt-4 border-t border-neutral-200 dark:border-neutral-700 mt-4">
                            <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>Cerrar Vista</button>
                        </div>
                    )}
                </form>
            )}

            {activeTab === 'chat' && project && currentUser && (
                 <div className="flex-1 flex flex-col h-[65vh]">
                    <div className="p-3 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between flex-shrink-0">
                        <div>
                            <h3 className="text-base font-semibold text-neutral-800 dark:text-neutral-100 flex items-center">
                                <UserGroupIcon className="w-5 h-5 mr-2" /> Participantes
                            </h3>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 truncate max-w-xs">
                                {projectClient?.name}, {projectAssignedEmployeesForCall.map(e => e.name).join(', ')}
                            </p>
                        </div>
                        <div className="flex items-center space-x-2">
                            <button 
                                onClick={() => handleInitiateCall('audio')} 
                                className="p-1.5 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-full"
                                title="Iniciar llamada de audio"
                            >
                                <PhoneIcon className="w-5 h-5" />
                            </button>
                            <button 
                                onClick={() => handleInitiateCall('video')} 
                                className="p-1.5 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-full"
                                title="Iniciar videollamada"
                            >
                                <VideoCameraIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 p-3 space-y-4 overflow-y-auto bg-neutral-50 dark:bg-neutral-800/30 scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-600">
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
                    <div className="p-3 border-t border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 flex-shrink-0">
                        <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex items-center space-x-2">
                            {!isEmployeeView && (
                                <button
                                    type="button"
                                    onClick={handleGenerateAiResponse}
                                    className={`${BUTTON_SECONDARY_SM_CLASSES} !py-2 !px-2.5 rounded-lg`}
                                    disabled={isAiGenerating}
                                    title="Generar respuesta con IA"
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
                                className={`${BUTTON_PRIMARY_SM_CLASSES} !py-2 !px-3 rounded-lg flex items-center justify-center`}
                                disabled={!newMessage.trim() || isAiGenerating}
                            >
                                <PaperAirplaneIcon className="w-4 h-4" />
                                <span className="ml-1.5 hidden sm:inline text-xs">Enviar</span>
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
        {isConflictModalOpen && conflictDetails && (
            <ConfirmationModal
                isOpen={isConflictModalOpen}
                onClose={() => handleConflictResolution(false)}
                onConfirm={() => handleConflictResolution(true)}
                title="Conflicto de Agendamiento"
                message={
                    <div>
                        <p className="mb-2 text-sm">
                            El colaborador <strong className="font-semibold">{conflictDetails.conflictingProjects[0].employee.name} {conflictDetails.conflictingProjects[0].employee.lastName}</strong> ya está asignado en la fecha <strong className="font-semibold">{new Date(conflictDetails.date + 'T00:00:00').toLocaleDateString()}</strong>.
                        </p>
                        <p className="text-xs mb-2 text-neutral-600 dark:text-neutral-400">Proyectos en conflicto:</p>
                        <ul className="list-disc list-inside text-xs bg-neutral-100 dark:bg-neutral-700 p-2 rounded-md max-h-24 overflow-y-auto">
                            {[...new Set(conflictDetails.conflictingProjects.map(c => c.project.name))].map(projectName => (
                                <li key={projectName}>
                                    <strong>{projectName}</strong>
                                </li>
                            ))}
                        </ul>
                        <p className="mt-4 text-sm">¿Desea mover las fechas de estos proyectos al siguiente día para resolver el conflicto?</p>
                    </div>
                }
                confirmButtonText="Sí, Mover Proyectos"
                cancelButtonText="No, Cancelar"
            />
        )}
        </>
    );
};
