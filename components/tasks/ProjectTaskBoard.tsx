import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { Task, TaskStatus, Employee } from '../../types';
import { TaskCard } from './TaskCard';
import { TaskDetailModal } from './TaskDetailModal';
import { InputModal } from '../InputModal';
import { ExtractTasksModal } from '../pm/ExtractTasksModal';
import { PlusIcon, DocumentTextIcon } from '../icons';
import { BUTTON_PRIMARY_SM_CLASSES } from '../../constants';
import { tasksService } from '../../services/tasks';
import { projectsService } from '../../services/projects';
import { toast } from 'react-hot-toast';
import { useTranslation } from '../../contexts/GlobalSettingsContext';

interface ProjectTaskBoardProps {
    projectId: string;
}

export const ProjectTaskBoard: React.FC<ProjectTaskBoardProps> = ({ projectId }) => {
    const { t } = useTranslation();
    const { tasks, setTasks, addTask, updateTask, taskComments, getAllEmployees, projects, setProjects } = useData();
    const [draggedTask, setDraggedTask] = useState<Task | null>(null);
    const [isCreatingInStatus, setIsCreatingInStatus] = useState<TaskStatus | null>(null);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    // Sección/área activa ('' = Todas).
    const [activeSection, setActiveSection] = useState('');
    // Secciones persistidas del proyecto (se guardan en la DB aunque no tengan tareas).
    const persistedSections = useMemo(
        () => (projects.find(p => p.id === projectId)?.sections) || [],
        [projects, projectId]
    );
    const [sectionModalOpen, setSectionModalOpen] = useState(false);
    const [extractOpen, setExtractOpen] = useState(false);
    const reloadTasks = () => { tasksService.getAll().then(d => setTasks(d as any)).catch(() => {}); };

    const allEmployees = getAllEmployees();

    const projectTasks = useMemo(() => {
        return tasks.filter(t => t.projectId === projectId && !t.archived).sort((a, b) => a.order - b.order);
    }, [tasks, projectId]);

    // Secciones a mostrar: las persistidas en la DB + las derivadas de las tareas (por si alguna
    // tarea tiene una sección que aún no está en la lista persistida).
    const sections = useMemo(
        () => Array.from(new Set([...persistedSections, ...(projectTasks.map(t => t.section).filter(Boolean) as string[])])),
        [persistedSections, projectTasks]
    );

    // Tareas visibles según la sección activa.
    const visibleTasks = useMemo(
        () => activeSection ? projectTasks.filter(t => (t.section || '') === activeSection) : projectTasks,
        [projectTasks, activeSection]
    );

    const columns = useMemo(() => ({
        [TaskStatus.TODO]: visibleTasks.filter(t => t.status === TaskStatus.TODO),
        [TaskStatus.IN_PROGRESS]: visibleTasks.filter(t => t.status === TaskStatus.IN_PROGRESS),
        [TaskStatus.FOR_APPROVAL]: visibleTasks.filter(t => t.status === TaskStatus.FOR_APPROVAL),
        [TaskStatus.DONE]: visibleTasks.filter(t => t.status === TaskStatus.DONE),
    }), [visibleTasks]);

    const addSection = () => setSectionModalOpen(true);
    const confirmAddSection = async (name: string) => {
        const clean = name.trim();
        setActiveSection(clean);
        setSectionModalOpen(false);
        if (!clean || persistedSections.includes(clean)) return;
        const nextSections = [...persistedSections, clean];
        // Optimista: refleja de inmediato en el estado global.
        setProjects(prev => prev.map(p => p.id === projectId ? { ...p, sections: nextSections } : p));
        try {
            await projectsService.update(projectId, { sections: nextSections });
        } catch {
            toast.error(t('cmpx.task.section_save_error') || 'No se pudo guardar la sección.');
            // Revertir si falla.
            setProjects(prev => prev.map(p => p.id === projectId ? { ...p, sections: persistedSections } : p));
        }
    };

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, task: Task) => {
        setDraggedTask(task);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetStatus: TaskStatus) => {
        e.preventDefault();
        if (!draggedTask) return;

        const sourceStatus = draggedTask.status;

        // Find the element being dragged over to determine the new order
        const dropTarget = (e.target as HTMLElement).closest('[data-task-id]');
        const targetId = dropTarget?.getAttribute('data-task-id');
        const targetTask = projectTasks.find(t => t.id === targetId);

        setTasks(currentTasks => {
            let tasksInTargetColumn = currentTasks
                .filter(t => t.projectId === projectId && t.status === targetStatus)
                .sort((a, b) => a.order - b.order);

            let newOrder = tasksInTargetColumn.length;
            
            if (targetTask) {
                newOrder = targetTask.order;
                 // Shift subsequent tasks
                tasksInTargetColumn = tasksInTargetColumn.map(t => t.order >= newOrder ? { ...t, order: t.order + 1 } : t);
            }
           
            const otherTasks = currentTasks.filter(t => t.id !== draggedTask.id);

            const updatedMovedTask = { ...draggedTask, status: targetStatus, order: newOrder };

            let finalTasks = [...otherTasks, updatedMovedTask];

            // Re-order source and destination columns after the move
             [sourceStatus, targetStatus].forEach(statusToReorder => {
                const columnTasks = finalTasks
                    .filter(t => t.projectId === projectId && t.status === statusToReorder)
                    .sort((a, b) => a.order - b.order);

                columnTasks.forEach((task, index) => {
                    const originalTaskIndex = finalTasks.findIndex(t => t.id === task.id);
                    if (originalTaskIndex !== -1 && finalTasks[originalTaskIndex].order !== index) {
                        finalTasks[originalTaskIndex] = { ...finalTasks[originalTaskIndex], order: index };
                    }
                });
            });

            return finalTasks;
        });

        // Persist status + new order to backend
        tasksService.update(draggedTask.id, { status: targetStatus, order: newOrder }).catch(() => {
            toast.error(t('cmpx.task.sync_error'));
        });

        setDraggedTask(null);
    };

    const handleCreateTask = async (status: TaskStatus) => {
        if (!newTaskTitle.trim()) {
            setIsCreatingInStatus(null);
            return;
        }
        try {
            const saved = await tasksService.create({ projectId, title: newTaskTitle, status, section: activeSection || undefined });
            setTasks(prev => [...prev, {
                ...saved,
                assignedEmployeeIds: saved.assignedEmployeeIds || [],
            } as unknown as Task]);
        } catch {
            toast.error(t('cmpx.task.create_error'));
        }
        setNewTaskTitle('');
        setIsCreatingInStatus(null);
    };

    return (
        <>
            {/* Pestañas de sección (áreas del proyecto: Diseño, Programación, etc.) */}
            <div className="flex items-center gap-2 mb-4 flex-wrap border-b border-neutral-200 dark:border-neutral-700 pb-2">
                <button
                    onClick={() => setActiveSection('')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${!activeSection ? 'bg-primary text-white' : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}
                >
                    {t('cmpx.task.all_sections') || 'Todas'} <span className="opacity-70">({projectTasks.length})</span>
                </button>
                {sections.map(sec => {
                    const count = projectTasks.filter(x => x.section === sec).length;
                    return (
                        <button
                            key={sec}
                            onClick={() => setActiveSection(sec)}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeSection === sec ? 'bg-primary text-white' : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}
                        >
                            {sec} <span className="opacity-70">({count})</span>
                        </button>
                    );
                })}
                <button onClick={addSection} className="px-3 py-1.5 rounded-md text-sm font-medium text-primary hover:bg-primary/10 flex items-center gap-1">
                    <PlusIcon className="w-4 h-4" /> {t('cmpx.task.add_section') || 'Sección'}
                </button>
                <button onClick={() => setExtractOpen(true)} className="ml-auto px-3 py-1.5 rounded-md text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 flex items-center gap-1" title={t('cmpx.task.analyze_doc_hint') || 'Analizar un documento o transcripción y sugerir tareas'}>
                    <DocumentTextIcon className="w-4 h-4" /> {t('cmpx.task.analyze_doc') || 'Analizar documento'}
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {Object.entries(columns).map(([status, tasksInColumn]: [string, Task[]]) => (
                    <div
                        key={status}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, status as TaskStatus)}
                        className="bg-slate-100 dark:bg-slate-800 rounded-xl p-2 flex flex-col"
                    >
                        <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-3 px-2 flex justify-between items-center text-lg">
                           <span>{status}</span>
                           <span className="text-sm text-gray-500">{tasksInColumn.length}</span>
                        </h3>
                        <div className="space-y-2 overflow-y-auto flex-grow min-h-[100px] p-1">
                            {tasksInColumn.map(task => {
                                const commentCount = taskComments.filter(c => c.taskId === task.id).length;
                                const assignedEmployees = task.assignedEmployeeIds
                                    ?.map(id => allEmployees.find(e => e.id === id))
                                    .filter((e): e is Employee => !!e) || [];

                                const taskChecklists = ((task as any).checklists as any[]) || [];
                                const checklistSummary = taskChecklists.length > 0
                                    ? { total: taskChecklists.length, done: taskChecklists.filter((c: any) => c.checked).length }
                                    : undefined;

                                return (
                                <TaskCard
                                    key={task.id}
                                    task={task}
                                    draggable="true"
                                    onDragStart={(e) => handleDragStart(e, task)}
                                    onClick={() => setSelectedTask(task)}
                                    commentCount={commentCount}
                                    assignedEmployees={assignedEmployees}
                                    checklistSummary={checklistSummary}
                                    data-task-id={task.id}
                                />
                            )})}
                        </div>
                        {isCreatingInStatus === status ? (
                             <div className="mt-2 p-1">
                                <textarea
                                    value={newTaskTitle}
                                    onChange={(e) => setNewTaskTitle(e.target.value)}
                                    placeholder={t('cmpx.task.title_ph')}
                                    className="w-full p-2 text-sm border-neutral-300 rounded-md shadow-sm focus:ring-primary focus:border-primary dark:bg-neutral-600 dark:border-neutral-500"
                                    rows={3}
                                    autoFocus
                                    onBlur={() => {if(!newTaskTitle) setIsCreatingInStatus(null)}}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateTask(status as TaskStatus); } }}
                                />
                                <div className="mt-2">
                                    <button onClick={() => handleCreateTask(status as TaskStatus)} className={BUTTON_PRIMARY_SM_CLASSES}>{t('cmpx.task.add_task_btn')}</button>
                                </div>
                            </div>
                        ) : (
                            <button onClick={() => setIsCreatingInStatus(status as TaskStatus)} className="mt-2 w-full text-left p-2 rounded-lg text-base text-gray-500 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center transition-colors">
                                <PlusIcon className="w-4 h-4 mr-1" /> {t('cmpx.task.add_task')}
                            </button>
                        )}
                    </div>
                ))}
            </div>
            {selectedTask && (
                <TaskDetailModal
                    task={selectedTask}
                    onClose={() => setSelectedTask(null)}
                    onSave={(taskId, updates) => { updateTask(taskId, updates); setSelectedTask(null); }}
                    onArchive={(taskId) => { updateTask(taskId, { archived: true }); setSelectedTask(null); }}
                    onDelete={(taskId) => { setTasks(prev => prev.filter(t => t.id !== taskId)); setSelectedTask(null); }}
                />
            )}
            <InputModal
                isOpen={sectionModalOpen}
                title={t('cmpx.task.new_section_title') || 'Nueva sección'}
                label={t('cmpx.task.new_section_prompt') || 'Nombre de la sección (ej. Diseño, Programación):'}
                placeholder={t('cmpx.task.new_section_ph') || 'Ej. Diseño'}
                confirmText={t('common.add') || 'Añadir'}
                cancelText={t('common.cancel') || 'Cancelar'}
                onConfirm={confirmAddSection}
                onClose={() => setSectionModalOpen(false)}
            />
            <ExtractTasksModal
                isOpen={extractOpen}
                onClose={() => setExtractOpen(false)}
                projectId={projectId}
                section={activeSection || undefined}
                onCreated={reloadTasks}
            />
        </>
    );
};