import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { Project, ProjectFormData, UserRole, ProjectStatus, ChatMessage as ChatMessageType, Client, Employee, ProjectWorkMode, WorkDayTimeRange, Product as ProductType, ProjectResource, ProjectPriority, CustomProjectResource } from '../../types';
import { ProjectTaskBoard } from '../../components/tasks/ProjectTaskBoard';
import { ArrowUturnLeftIcon, PaperAirplaneIcon, UserGroupIcon, ChatBubbleLeftRightIcon, VideoCameraIcon, PhoneIcon, SparklesIcon, TrashIconMini, CalendarDaysIcon, ClockIcon, PlusIcon, DocumentArrowDownIcon, DocumentArrowUpIcon, ChevronDownIcon, EyeIcon } from '../../components/icons';
import { inputFormStyle, BUTTON_SECONDARY_SM_CLASSES, BUTTON_PRIMARY_SM_CLASSES, PROJECT_STATUS_OPTIONS, ADMIN_USER_ID } from '../../constants';
import { RichTextEditor } from '../../components/ui/RichTextEditor';
import { useAuth } from '../../contexts/AuthContext';
import { ChatMessageItem } from './ChatMessageItem';
import { CallModal } from '../../components/CallModal';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ConfirmationModal } from '../../components/Modal';
import { ClientDetailViewModal } from '../../components/ui/ClientDetailViewModal';


type ActiveTab = 'details' | 'chat' | 'tasks';

export const ProjectDetailPage: React.FC = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const { getProjectById, projects } = useData();

    const [project, setProject] = useState<Project | null | 'new'>(null);
    const [activeTab, setActiveTab] = useState<ActiveTab>( (searchParams.get('tab') as ActiveTab) || 'details');

    useEffect(() => {
        if (projectId === 'new') {
            setProject('new');
        } else if (projectId) {
            const foundProject = getProjectById(projectId);
            setProject(foundProject || null);
        }
    }, [projectId, getProjectById, projects]);

    const handleTabChange = (tab: ActiveTab) => {
        setActiveTab(tab);
        setSearchParams({ tab });
    };

    const handleProjectCreated = (newProject: Project) => {
        navigate(`/pm/projects/${newProject.id}?tab=details`, { replace: true });
    };

    if (project === null && projectId !== 'new') {
        return (
            <div className="text-center p-8">
                <h2 className="text-xl font-semibold text-neutral-700 dark:text-neutral-200">Proyecto no encontrado</h2>
                <p className="text-neutral-500 dark:text-neutral-400 mt-2">El proyecto que buscas no existe o ha sido eliminado.</p>
                <Link to="/pm/projects" className="mt-4 inline-block text-primary hover:underline">Volver a la lista de proyectos</Link>
            </div>
        );
    }
    
    const isNewProject = project === 'new';
    const projectData = isNewProject ? null : project as Project;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <Link to="/pm/projects" className="text-sm text-neutral-500 dark:text-neutral-400 hover:underline flex items-center">
                        <ArrowUturnLeftIcon className="w-4 h-4 mr-1" />
                        Volver a Proyectos
                    </Link>
                    <h1 className="text-2xl font-semibold text-neutral-800 dark:text-neutral-100">
                        {isNewProject ? 'Crear Nuevo Proyecto' : (projectData && projectData.name)}
                    </h1>
                </div>
            </div>

            <div className="flex border-b border-neutral-200 dark:border-neutral-700">
                <button onClick={() => handleTabChange('details')} className={`px-4 py-2 text-base font-medium ${activeTab === 'details' ? 'border-b-2 border-primary text-primary' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'}`}>
                    Detalles
                </button>
                {!isNewProject && (
                    <>
                        <button onClick={() => handleTabChange('chat')} className={`px-4 py-2 text-base font-medium ${activeTab === 'chat' ? 'border-b-2 border-primary text-primary' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'}`}>
                            Chat del Proyecto
                        </button>
                        <button onClick={() => handleTabChange('tasks')} className={`px-4 py-2 text-base font-medium ${activeTab === 'tasks' ? 'border-b-2 border-primary text-primary' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'}`}>
                            Tareas
                        </button>
                    </>
                )}
            </div>

            <div className="bg-white dark:bg-neutral-800 p-4 rounded-b-lg shadow-sm">
                {activeTab === 'details' && (
                    <ProjectForm 
                        project={projectData}
                        onSuccess={isNewProject ? handleProjectCreated : () => {}}
                    />
                )}
                {!isNewProject && projectData && activeTab === 'chat' && (
                    <ProjectChatView project={projectData} />
                )}
                 {!isNewProject && projectData && activeTab === 'tasks' && (
                    <ProjectTaskBoard projectId={projectData.id} />
                )}
            </div>
        </div>
    );
};

// --- Form Component (migrated from ProjectFormModal) ---
type ActiveDetailsTab = 'Detalles' | 'Programación' | 'Recursos' | 'Facturación';
const defaultWorkDayTime: WorkDayTimeRange = { date: new Date().toISOString().split('T')[0], startTime: '09:00', endTime: '17:00' };
const defaultToday = new Date().toISOString().split('T')[0];

const ProjectForm: React.FC<{ project: Project | null, onSuccess: (newProject: Project) => void }> = ({ project, onSuccess }) => {
    const { addProject, setProjects, clients, products: allProductsHookData, employees: allEmployeesHook, getEmployeeById, projects, generateInvoiceForProject, getClientById } = useData();
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    const selectFormStyle = inputFormStyle + " appearance-none pr-8";
    const disabledInputStyle = inputFormStyle + " !text-sm bg-neutral-100 dark:bg-neutral-700 cursor-default";

    const projectRelevantProducts = useMemo(() => allProductsHookData.filter(p => p.storeOwnerId === ADMIN_USER_ID || !p.storeOwnerId), [allProductsHookData]);

    const getInitialFormData = (): ProjectFormData => ({
        name: '', clientId: clients[0]?.id || '', status: ProjectStatus.PENDING, description: '', assignedProducts: [], customProducts: [], assignedEmployeeIds: [],
        visitDate: '', visitTime: '', workMode: 'daysOnly' as ProjectWorkMode, workDays: [], workDayTimeRanges: [], workStartDate: '', workEndDate: '',
        purchaseOrder: '', projectKey: '', priority: ProjectPriority.LOW,
    });
    
    const [formData, setFormData] = useState<ProjectFormData>(getInitialFormData());
    const [customProduct, setCustomProduct] = useState({ name: '', quantity: 1, unitPrice: 0 });
    const [currentProduct, setCurrentProduct] = useState<string>('');
    const [currentQuantity, setCurrentQuantity] = useState<number>(1);
    const [activeDetailsTab, setActiveDetailsTab] = useState<ActiveDetailsTab>('Detalles');
    const [currentSingleWorkDay, setCurrentSingleWorkDay] = useState<string>(defaultToday);
    const [currentWorkDayRange, setCurrentWorkDayRange] = useState<WorkDayTimeRange>({...defaultWorkDayTime});
    const [conflictDetails, setConflictDetails] = useState<{ conflictingProjects: { project: Project; employee: Employee }[]; date: string; actionToConfirm: () => void; } | null>(null);
    const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
    const [isClientDetailModalOpen, setIsClientDetailModalOpen] = useState(false);

    const isEmployeeView = currentUser?.role === UserRole.EMPLOYEE;
    const canEditDetails = !isEmployeeView;

    const selectedClientDetails = useMemo(() => getClientById(formData.clientId), [formData.clientId, getClientById]);

    useEffect(() => {
        if (project) {
            setFormData({
                name: project.name, clientId: project.clientId, status: project.status, description: project.description || '', assignedProducts: project.assignedProducts || [], customProducts: project.customProducts || [], assignedEmployeeIds: project.assignedEmployeeIds || [],
                visitDate: project.visitDate || '', visitTime: project.visitTime || '', workMode: project.workMode || 'daysOnly', workDays: project.workDays || [], workDayTimeRanges: project.workDayTimeRanges || [],
                workStartDate: project.workStartDate || '', workEndDate: project.workEndDate || '',
                purchaseOrder: project.purchaseOrder || '', projectKey: project.projectKey || '', priority: project.priority || ProjectPriority.LOW,
            });
        } else {
             setFormData(getInitialFormData());
        }
        
        if (projectRelevantProducts.length > 0) { setCurrentProduct(projectRelevantProducts[0].id); }
        setCurrentQuantity(1);
        setCurrentSingleWorkDay(defaultToday);
        setCurrentWorkDayRange({...defaultWorkDayTime});
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [project, clients, projectRelevantProducts]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        if (isEmployeeView) return; 
        const { name, value } = e.target;
        setFormData(prev => ({...prev, [name]: name === 'priority' ? parseInt(value, 10) : value}));
    };
    
    const isDateInProjectSchedule = (dateStr: string, p: Project): boolean => {
        const checkDate = new Date(dateStr + 'T00:00:00');
        switch(p.workMode) {
            case 'daysOnly': return p.workDays?.includes(dateStr) ?? false;
            case 'daysAndTimes': return p.workDayTimeRanges?.some(r => r.date === dateStr) ?? false;
            case 'dateRange': if (p.workStartDate && p.workEndDate) { const start = new Date(p.workStartDate + 'T00:00:00'); const end = new Date(p.workEndDate + 'T00:00:00'); return checkDate >= start && checkDate <= end; } return false;
            default: return false;
        }
    };
    
    const findConflicts = (employeeIds: string[], dateStr: string): { project: Project; employee: Employee }[] => {
        const conflictingAssignments: { project: Project; employee: Employee }[] = [];
        const otherProjects = projects.filter(p => p.id !== project?.id);
        for (const empId of employeeIds) {
            const employee = getEmployeeById(empId);
            if (!employee) continue;
            for (const otherProject of otherProjects) { if (otherProject.assignedEmployeeIds.includes(empId) && isDateInProjectSchedule(dateStr, otherProject)) { conflictingAssignments.push({ project: otherProject, employee }); } }
        }
        return conflictingAssignments;
    };
    
    const checkForConflictsAndExecute = (action: () => void, employeeIds: string[], dates: string[]) => {
        if (!canEditDetails) { action(); return; }
        const allConflicts = dates.flatMap(date => findConflicts(employeeIds, date));
        if (allConflicts.length > 0) { setConflictDetails({ conflictingProjects: allConflicts, date: dates[0], actionToConfirm: action }); setIsConflictModalOpen(true); } 
        else { action(); }
    };
    
    const handleProductAdd = () => { if (!canEditDetails) return; if (currentProduct && currentQuantity > 0) { const existingIdx = formData.assignedProducts.findIndex(p => p.productId === currentProduct); if (existingIdx > -1) { const updated = [...formData.assignedProducts]; updated[existingIdx].quantity += currentQuantity; setFormData(p => ({...p, assignedProducts: updated})); } else { setFormData(p => ({...p, assignedProducts: [...p.assignedProducts, {productId: currentProduct, quantity: currentQuantity}]})); } } };
    const handleProductRemove = (productId: string) => { if (!canEditDetails) return; setFormData(p => ({...p, assignedProducts: p.assignedProducts.filter(item => item.productId !== productId)})); };
    const handleEmployeeToggle = (empId: string) => { if (!canEditDetails) return; const isAssigned = formData.assignedEmployeeIds.includes(empId); const action = () => { setFormData(p => ({...p, assignedEmployeeIds: isAssigned ? p.assignedEmployeeIds.filter(id => id !== empId) : [...p.assignedEmployeeIds, empId]})); }; const dates = [...new Set([...(formData.workDays || []), ...(formData.workDayTimeRanges?.map(r => r.date) || [])])]; if (!isAssigned && dates.length > 0) { checkForConflictsAndExecute(action, [empId], dates); } else { action(); } };
    const handleWorkModeChange = (mode: ProjectWorkMode) => { if (!canEditDetails) return; setFormData(prev => ({ ...prev, workMode: mode, workDays: mode === 'daysOnly' ? prev.workDays : [], workDayTimeRanges: mode === 'daysAndTimes' ? prev.workDayTimeRanges : [], workStartDate: mode === 'dateRange' ? (prev.workStartDate || defaultToday) : '', workEndDate: mode === 'dateRange' ? (prev.workEndDate || defaultToday) : '', })); };
    const handleSingleWorkDayChange = (e: React.ChangeEvent<HTMLInputElement>) => { setCurrentSingleWorkDay(e.target.value); };
    const handleAddSingleWorkDay = () => { if (!canEditDetails || !currentSingleWorkDay) return; const action = () => { if (!formData.workDays.includes(currentSingleWorkDay)) { setFormData(prev => ({ ...prev, workDays: [...prev.workDays, currentSingleWorkDay].sort() })); } }; checkForConflictsAndExecute(action, formData.assignedEmployeeIds, [currentSingleWorkDay]); };
    const handleRemoveSingleWorkDay = (dateToRemove: string) => { if (!canEditDetails) return; setFormData(prev => ({ ...prev, workDays: prev.workDays.filter(d => d !== dateToRemove) })); };
    const handleWorkDayRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => { const { name, value } = e.target; setCurrentWorkDayRange(prev => ({...prev, [name]: value })); };
    const handleAddWorkDayTimeRange = () => { if (!canEditDetails || !currentWorkDayRange.date || !currentWorkDayRange.startTime || !currentWorkDayRange.endTime) { alert("Por favor, complete todos los campos para el rango de trabajo."); return; } if (currentWorkDayRange.endTime <= currentWorkDayRange.startTime) { alert("La hora de fin debe ser posterior a la hora de inicio."); return; } const action = () => { setFormData(prev => ({ ...prev, workDayTimeRanges: [...prev.workDayTimeRanges, currentWorkDayRange].sort((a,b) => { if (a.date < b.date) return -1; if (a.date > b.date) return 1; return a.startTime.localeCompare(b.startTime); }) })); setCurrentWorkDayRange({...defaultWorkDayTime, date: defaultToday}); }; checkForConflictsAndExecute(action, formData.assignedEmployeeIds, [currentWorkDayRange.date]); };
    const handleRemoveWorkDayTimeRange = (indexToRemove: number) => { if (!canEditDetails) return; setFormData(prev => ({ ...prev, workDayTimeRanges: prev.workDayTimeRanges.filter((_, index) => index !== indexToRemove) })); };

    const handleAddCustomProduct = () => { if (!canEditDetails || !customProduct.name.trim() || customProduct.quantity <= 0) { alert("Por favor, ingrese un nombre y una cantidad válida."); return; } const newCustom: CustomProjectResource = { id: `custom-${Date.now()}`, ...customProduct }; setFormData(prev => ({ ...prev, customProducts: [...(prev.customProducts || []), newCustom] })); setCustomProduct({ name: '', quantity: 1, unitPrice: 0 }); };
    const handleRemoveCustomProduct = (id: string) => { if (!canEditDetails) return; setFormData(prev => ({ ...prev, customProducts: prev.customProducts?.filter(p => p.id !== id) })); };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (project) { // Update
            const updatedProjectData = { ...project, ...formData };
            setProjects(prev => prev.map(p => (p.id === project.id ? updatedProjectData : p)));
            alert("Proyecto actualizado.");
            onSuccess(updatedProjectData);
        } else { // Create
            const newProject = addProject(formData);
            alert("Proyecto creado.");
            onSuccess(newProject);
        }
    };
    
    const detailTabs: ActiveDetailsTab[] = ['Detalles', 'Programación', 'Recursos'];
    if (project) detailTabs.push('Facturación');

    return (
        <>
        <form onSubmit={handleSubmit}>
             <div className="flex border-b border-neutral-200 dark:border-neutral-700 mb-3 -mx-4 px-4">
                {detailTabs.map(tab => (
                    <button key={tab} type="button" onClick={() => setActiveDetailsTab(tab)} className={`px-3 py-2 text-sm font-medium ${activeDetailsTab === tab ? 'border-b-2 border-primary text-primary' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'}`}>
                        {tab}
                    </button>
                ))}
            </div>
            <div className="max-h-[65vh] overflow-y-auto pr-2 space-y-4">
                 <fieldset className={activeDetailsTab === 'Detalles' ? 'space-y-4' : 'hidden'} disabled={!canEditDetails}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label htmlFor="projectName" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">Nombre del Proyecto</label>
                            <input type="text" name="name" id="projectName" value={formData.name} onChange={handleChange} className={inputFormStyle} required/>
                        </div>
                        <div>
                            <label htmlFor="clientId" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">Cliente</label>
                            <div className="flex items-center gap-2">
                                <div className="relative flex-grow">
                                    <select name="clientId" id="clientId" value={formData.clientId} onChange={handleChange} className={selectFormStyle} required>
                                        {clients.map(c => <option key={c.id} value={c.id}>{c.name} {c.lastName}</option>)}
                                        {clients.length === 0 && <option value="" disabled>No hay clientes</option>}
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-neutral-700 dark:text-neutral-200">
                                        <ChevronDownIcon className="w-4 h-4" />
                                    </div>
                                </div>
                                <button 
                                    type="button" 
                                    onClick={() => setIsClientDetailModalOpen(true)} 
                                    disabled={!selectedClientDetails || !canEditDetails}
                                    className="p-2 rounded-md bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                    aria-label="Ver detalles del cliente"
                                >
                                    <EyeIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    {selectedClientDetails && (
                        <div className="mt-2">
                             <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">Detalles del Cliente Seleccionado</label>
                            <div className="p-3 border rounded-md bg-neutral-50 dark:bg-neutral-700/50 space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Email</label>
                                        <input type="text" value={selectedClientDetails.email || ''} className={disabledInputStyle} readOnly tabIndex={-1} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Teléfono</label>
                                        <input type="text" value={selectedClientDetails.phone || ''} className={disabledInputStyle} readOnly tabIndex={-1} />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Dirección</label>
                                    <input type="text" value={selectedClientDetails.address || ''} className={disabledInputStyle} readOnly tabIndex={-1} />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Tipo Cliente</label>
                                        <input type="text" value={selectedClientDetails.clientType || ''} className={disabledInputStyle} readOnly tabIndex={-1} />
                                    </div>
                                    {selectedClientDetails.companyName && (
                                        <div>
                                            <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Compañía</label>
                                            <input type="text" value={selectedClientDetails.companyName} className={disabledInputStyle} readOnly tabIndex={-1} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label htmlFor="projectStatus" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">Estado</label>
                            <div className="relative">
                                <select name="status" id="projectStatus" value={formData.status} onChange={handleChange} className={selectFormStyle} required>
                                    {PROJECT_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-neutral-700 dark:text-neutral-200">
                                    <ChevronDownIcon className="w-4 h-4" />
                                </div>
                            </div>
                        </div>
                        {(currentUser?.role === UserRole.MANAGER || (currentUser?.role === UserRole.EMPLOYEE && currentUser.permissions?.manageProjects)) && (
                            <div>
                                <label htmlFor="priority" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">Prioridad (Interna)</label>
                                <div className="relative">
                                    <select name="priority" id="priority" value={formData.priority || 1} onChange={handleChange} className={selectFormStyle}>
                                        <option value={ProjectPriority.LOW}>Baja (1)</option>
                                        <option value={ProjectPriority.MEDIUM}>Media (2)</option>
                                        <option value={ProjectPriority.HIGH}>Alta (3)</option>
                                    </select>
                                     <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-neutral-700 dark:text-neutral-200">
                                        <ChevronDownIcon className="w-4 h-4" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label htmlFor="purchaseOrder" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">Nº Orden de Compra (PO) / ID Contrato</label>
                            <input type="text" name="purchaseOrder" id="purchaseOrder" value={formData.purchaseOrder || ''} onChange={handleChange} className={inputFormStyle} />
                        </div>
                        <div>
                            <label htmlFor="projectKey" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">Clave del Proyecto / Prefijo</label>
                            <input type="text" name="projectKey" id="projectKey" value={formData.projectKey || ''} onChange={handleChange} className={inputFormStyle} />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="projectDescription" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">Descripción</label>
                        <RichTextEditor 
                            value={formData.description} 
                            onChange={(value) => setFormData(prev => ({...prev, description: value}))} 
                            placeholder="Descripción detallada del proyecto..."
                        />
                    </div>
                 </fieldset>
                 <fieldset className={activeDetailsTab === 'Recursos' ? 'space-y-4' : 'hidden'} disabled={!canEditDetails}>
                    <div className="mb-3">
                        <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">Asignar Productos del Catálogo</label>
                        <div className="flex items-center gap-2 mb-1">
                             <div className="relative flex-grow">
                                <select value={currentProduct} onChange={e => setCurrentProduct(e.target.value)} className={selectFormStyle + " !text-xs"}>{projectRelevantProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-neutral-700 dark:text-neutral-200"><ChevronDownIcon className="w-4 h-4" /></div>
                            </div>
                            <input type="number" value={currentQuantity} onChange={e => setCurrentQuantity(Math.max(1, parseInt(e.target.value) || 1))} className={inputFormStyle + " w-20 !text-xs"} min="1"/>
                            <button type="button" onClick={handleProductAdd} className={BUTTON_SECONDARY_SM_CLASSES + " !text-xs"}>Añadir</button>
                        </div>
                        {formData.assignedProducts.length > 0 && (
                            <ul className="list-disc list-inside space-y-0.5 max-h-20 overflow-y-auto bg-neutral-50 dark:bg-neutral-700/50 p-1.5 rounded text-xs scrollbar-thin">{formData.assignedProducts.map(ap => { const product = projectRelevantProducts.find(p => p.id === ap.productId); return (<li key={ap.productId} className="flex justify-between items-center"><span>{product?.name || 'Producto Desconocido'} (x{ap.quantity})</span><button type="button" onClick={() => handleProductRemove(ap.productId)} className="text-red-500 hover:text-red-700 p-0.5" aria-label={`Quitar ${product?.name}`}><TrashIconMini/></button></li>); })}</ul>
                        )}
                    </div>
                    
                    <fieldset className="border p-3 rounded dark:border-neutral-600">
                        <legend className="text-xs font-medium px-1">Añadir Producto/Servicio Personalizado</legend>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
                            <div className="md:col-span-2"><label className="block text-xs">Nombre</label><input type="text" value={customProduct.name} onChange={e => setCustomProduct(p => ({...p, name: e.target.value}))} className={inputFormStyle + " !text-xs"}/></div>
                            <div><label className="block text-xs">Cantidad</label><input type="number" value={customProduct.quantity} onChange={e => setCustomProduct(p => ({...p, quantity: parseInt(e.target.value) || 1}))} className={inputFormStyle + " !text-xs"} min="1"/></div>
                            <div><label className="block text-xs">Precio Unit. (Opc)</label><input type="number" value={customProduct.unitPrice} onChange={e => setCustomProduct(p => ({...p, unitPrice: parseFloat(e.target.value) || 0}))} className={inputFormStyle + " !text-xs"} min="0" step="0.01"/></div>
                        </div>
                        <div className="mt-2 flex justify-end"><button type="button" onClick={handleAddCustomProduct} className={BUTTON_SECONDARY_SM_CLASSES + " !text-xs"}>Añadir Personalizado</button></div>
                        {formData.customProducts && formData.customProducts.length > 0 && (
                             <ul className="list-disc list-inside mt-2 space-y-0.5 max-h-20 overflow-y-auto text-xs">{formData.customProducts.map(cp => (<li key={cp.id} className="flex justify-between items-center"><span>{cp.name} (x{cp.quantity}) {cp.unitPrice ? `@ $${cp.unitPrice.toFixed(2)}` : ''}</span><button type="button" onClick={() => handleRemoveCustomProduct(cp.id)} className="text-red-500 hover:text-red-700 p-0.5" aria-label={`Quitar ${cp.name}`}><TrashIconMini/></button></li>))}</ul>
                        )}
                    </fieldset>

                    <div>
                        <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">Asignar Empleados</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-24 overflow-y-auto bg-neutral-50 dark:bg-neutral-700/50 p-1.5 rounded scrollbar-thin">{allEmployeesHook.map(emp => (<label key={emp.id} className="flex items-center space-x-2 text-xs p-1 bg-white dark:bg-neutral-700 rounded cursor-pointer"><input type="checkbox" checked={formData.assignedEmployeeIds.includes(emp.id)} onChange={() => handleEmployeeToggle(emp.id)} className="form-checkbox text-primary focus:ring-primary dark:bg-neutral-600 dark:border-neutral-500" /><span>{emp.name} {emp.lastName}</span></label>))}</div>
                    </div>
                 </fieldset>
                 {project && <fieldset className={activeDetailsTab === 'Facturación' ? 'space-y-4' : 'hidden'}><p>Contenido de Facturación aquí...</p></fieldset>}
                 {/* Programación Tab remains the same */}
                 <fieldset className={activeDetailsTab === 'Programación' ? 'space-y-4' : 'hidden'} disabled={!canEditDetails}>
                     <div>
                        <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Visita Inicial</h4>
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
                    </div>
                    <div className="pt-4 border-t dark:border-neutral-700">
                        <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Trabajo del Proyecto</h4>
                        <div className="flex space-x-4 mb-3">
                            <label className="flex items-center text-xs text-neutral-700 dark:text-neutral-300"><input type="radio" name="workMode" value="daysOnly" checked={formData.workMode === 'daysOnly'} onChange={() => handleWorkModeChange('daysOnly')} className="form-radio mr-1"/> Solo Días</label>
                            <label className="flex items-center text-xs text-neutral-700 dark:text-neutral-300"><input type="radio" name="workMode" value="daysAndTimes" checked={formData.workMode === 'daysAndTimes'} onChange={() => handleWorkModeChange('daysAndTimes')} className="form-radio mr-1"/> Días y Horas</label>
                            <label className="flex items-center text-xs text-neutral-700 dark:text-neutral-300"><input type="radio" name="workMode" value="dateRange" checked={formData.workMode === 'dateRange'} onChange={() => handleWorkModeChange('dateRange')} className="form-radio mr-1"/> Rango Continuo</label>
                        </div>
                        {formData.workMode === 'daysOnly' && (
                            <div className="space-y-2">
                                <div className="flex items-end gap-2">
                                    <div className="flex-grow">
                                        <label htmlFor="singleWorkDay" className="block text-xs font-medium">Añadir Día de Trabajo</label>
                                        <input type="date" id="singleWorkDay" value={currentSingleWorkDay} onChange={handleSingleWorkDayChange} className={inputFormStyle} />
                                    </div>
                                    <button type="button" onClick={handleAddSingleWorkDay} className={BUTTON_SECONDARY_SM_CLASSES}>Añadir</button>
                                </div>
                                {formData.workDays.length > 0 && <ul className="list-disc list-inside space-y-1 max-h-24 overflow-y-auto bg-neutral-50 dark:bg-neutral-700/50 p-2 rounded text-xs">{formData.workDays.map(day => (<li key={day} className="flex justify-between items-center">{new Date(day + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}<button type="button" onClick={() => handleRemoveSingleWorkDay(day)} className="text-red-500 hover:text-red-700 text-xs p-0.5" aria-label={`Quitar día ${day}`}><TrashIconMini/></button></li>))}</ul>}
                            </div>
                        )}
                        {formData.workMode === 'daysAndTimes' && <div className="space-y-2"><div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end"><div className="md:col-span-2"><label htmlFor="rangeDate" className="block text-xs font-medium">Fecha</label><input type="date" name="date" id="rangeDate" value={currentWorkDayRange.date} onChange={handleWorkDayRangeChange} className={inputFormStyle} /></div><div><label htmlFor="rangeStartTime" className="block text-xs font-medium">Hora Inicio</label><input type="time" name="startTime" id="rangeStartTime" value={currentWorkDayRange.startTime} onChange={handleWorkDayRangeChange} className={inputFormStyle} /></div><div><label htmlFor="rangeEndTime" className="block text-xs font-medium">Hora Fin</label><input type="time" name="endTime" id="rangeEndTime" value={currentWorkDayRange.endTime} onChange={handleWorkDayRangeChange} className={inputFormStyle} /></div></div><button type="button" onClick={handleAddWorkDayTimeRange} className={`${BUTTON_SECONDARY_SM_CLASSES} w-full`}><PlusIcon className="w-4 h-4 mr-1" />Añadir Rango</button>{formData.workDayTimeRanges.length > 0 && <ul className="list-disc list-inside space-y-1 max-h-24 overflow-y-auto bg-neutral-50 dark:bg-neutral-700/50 p-2 rounded text-xs">{formData.workDayTimeRanges.map((range, index) => (<li key={index} className="flex justify-between items-center"><span>{new Date(range.date + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })} de {range.startTime} a {range.endTime}</span><button type="button" onClick={() => handleRemoveWorkDayTimeRange(index)} className="text-red-500 hover:text-red-700 text-xs p-0.5" aria-label={`Quitar rango ${index}`}><TrashIconMini/></button></li>))}</ul>}</div>}
                        {formData.workMode === 'dateRange' && <div className="grid grid-cols-1 md:grid-cols-2 gap-3"><div><label htmlFor="workStartDate" className="block text-xs font-medium">Fecha Inicio Rango</label><input type="date" name="workStartDate" id="workStartDate" value={formData.workStartDate || ''} onChange={handleChange} className={inputFormStyle} /></div><div><label htmlFor="workEndDate" className="block text-xs font-medium">Fecha Fin Rango</label><input type="date" name="workEndDate" id="workEndDate" value={formData.workEndDate || ''} onChange={handleChange} className={inputFormStyle} /></div></div>}
                    </div>
                 </fieldset>
            </div>
            {canEditDetails && (
                <div className="flex justify-end space-x-2 pt-4 border-t border-neutral-200 dark:border-neutral-700 mt-4">
                    <button type="button" onClick={() => navigate('/pm/projects')} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button>
                    <button type="submit" className={BUTTON_PRIMARY_SM_CLASSES}>{project ? 'Guardar Cambios' : 'Crear Proyecto'}</button>
                </div>
            )}
        </form>
        <ClientDetailViewModal 
            isOpen={isClientDetailModalOpen} 
            onClose={() => setIsClientDetailModalOpen(false)} 
            client={selectedClientDetails} 
        />
        </>
    );
};


// --- Chat Component (migrated from ProjectFormModal) ---
const ProjectChatView: React.FC<{ project: Project }> = ({ project }) => {
    const { getChatMessagesForProject, addChatMessage, getClientById, getEmployeeById } = useData();
    const { currentUser } = useAuth();
    
    const [newMessage, setNewMessage] = useState('');
    const [isCallModalOpen, setIsCallModalOpen] = useState(false);
    const [callType, setCallType] = useState<'video' | 'audio'>('video');
    const [callParticipants, setCallParticipants] = useState<string[]>([]);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    const projectMessages = useMemo(() => getChatMessagesForProject(project.id), [project, getChatMessagesForProject]);
    
    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [projectMessages]);

    const handleSendMessage = () => { if (newMessage.trim() && currentUser) { addChatMessage({ projectId: project.id, senderId: currentUser.id, text: newMessage.trim() }); setNewMessage(''); } };
    const handleInitiateCall = (type: 'video' | 'audio') => { /* ... call logic ... */ setIsCallModalOpen(true); };

    if (!currentUser) return null;

    return (
        <div className="flex-1 flex flex-col h-[65vh]">
            <div className="flex-1 p-3 space-y-4 overflow-y-auto bg-neutral-50 dark:bg-neutral-800/30 scrollbar-thin">
                {projectMessages.length > 0 ? projectMessages.map(msg => (
                    <ChatMessageItem key={msg.id} message={msg} isCurrentUser={currentUser.id === msg.senderId} />
                )) : <p className="text-center text-sm text-neutral-400 pt-10">No hay mensajes.</p>}
                <div ref={messagesEndRef} />
            </div>
            <div className="p-3 border-t bg-white dark:bg-neutral-800">
                <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex items-center space-x-2">
                     <textarea value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Escribe un mensaje..." className={`${inputFormStyle} flex-grow !py-2 resize-none max-h-24`} rows={1} />
                    <button type="submit" className={`${BUTTON_PRIMARY_SM_CLASSES} !py-2 !px-3`} disabled={!newMessage.trim()}><PaperAirplaneIcon /></button>
                </form>
            </div>
            <CallModal isOpen={isCallModalOpen} onClose={() => setIsCallModalOpen(false)} callType={callType} participants={callParticipants} />
        </div>
    );
};