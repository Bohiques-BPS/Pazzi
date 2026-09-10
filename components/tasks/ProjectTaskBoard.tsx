import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { Task, TaskStatus, Employee } from '../../types';
import { TaskCard } from './TaskCard';
import { TaskDetailModal } from './TaskDetailModal';
import { InputModal } from '../InputModal';
import { ConfirmationModal } from '../Modal';
import { MicButton } from '../ui/MicButton';
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

const DEFAULT_COLUMNS = [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.FOR_APPROVAL, TaskStatus.DONE] as string[];

export const ProjectTaskBoard: React.FC<ProjectTaskBoardProps> = ({ projectId }) => {
    const { t } = useTranslation();
    const { tasks, setTasks, addTask, updateTask, taskComments, getAllEmployees, projects, setProjects } = useData();
    const [draggedTask, setDraggedTask] = useState<Task | null>(null);
    const [isCreatingInStatus, setIsCreatingInStatus] = useState<string | null>(null);
    // Gestión de columnas del tablero.
    const [colModal, setColModal] = useState<{ mode: 'add' | 'rename'; name?: string } | null>(null);
    const [colMenuFor, setColMenuFor] = useState<string | null>(null);
    const [deleteCol, setDeleteCol] = useState<string | null>(null);
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

    // Todas las tareas del proyecto (incluye subtareas) — para contar hijas por tarea.
    const allProjectTasks = useMemo(() => tasks.filter(t => t.projectId === projectId && !t.archived), [tasks, projectId]);
    // El tablero muestra solo tareas de nivel superior (las subtareas se gestionan dentro del padre).
    const projectTasks = useMemo(() => {
        return allProjectTasks.filter(t => !(t as any).parentTaskId).sort((a, b) => a.order - b.order);
    }, [allProjectTasks]);
    // Resumen de subtareas por tarea padre: { total, done }.
    const subtaskSummaryByParent = useMemo(() => {
        const m = new Map<string, { total: number; done: number }>();
        for (const t of allProjectTasks) {
            const pid = (t as any).parentTaskId as string | undefined;
            if (!pid) continue;
            const s = m.get(pid) || { total: 0, done: 0 };
            s.total += 1;
            if (t.status === 'Hecho') s.done += 1;
            m.set(pid, s);
        }
        return m;
    }, [allProjectTasks]);

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

    // Columnas del tablero: personalizadas del proyecto o las 4 por defecto.
    const columnNames = useMemo(() => {
        const custom = projects.find(p => p.id === projectId)?.taskColumns;
        return (custom && custom.length) ? custom : DEFAULT_COLUMNS;
    }, [projects, projectId]);

    // Agrupa las tareas visibles por columna; las que quedaron sin columna válida
    // (p. ej. tras borrar una columna) caen en la primera.
    const columns = useMemo(() => {
        const map: Record<string, Task[]> = {};
        columnNames.forEach(c => { map[c] = []; });
        const fallback = columnNames[0];
        for (const t of visibleTasks) {
            (map[t.status] ? map[t.status] : map[fallback]).push(t);
        }
        Object.keys(map).forEach(k => map[k].sort((a, b) => a.order - b.order));
        return map;
    }, [visibleTasks, columnNames]);

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

    // ── Gestión de columnas del tablero (renombrar / crear / eliminar) ──
    const applyColumns = (cols: string[]) => setProjects(prev => prev.map(p => p.id === projectId ? { ...p, taskColumns: cols } : p));

    const handleAddColumn = async (name: string) => {
        setColModal(null);
        const clean = name.trim();
        if (!clean) return;
        if (columnNames.includes(clean)) { toast.error('Ya existe una columna con ese nombre.'); return; }
        const prev = columnNames;
        applyColumns([...columnNames, clean]);
        try { const r = await projectsService.manageTaskColumn(projectId, { op: 'add', name: clean }); applyColumns(r.taskColumns); }
        catch { toast.error('No se pudo crear la columna.'); applyColumns(prev); }
    };

    const handleRenameColumn = async (from: string, to: string) => {
        setColModal(null);
        const clean = to.trim();
        if (!clean || clean === from) return;
        if (columnNames.includes(clean)) { toast.error('Ya existe una columna con ese nombre.'); return; }
        applyColumns(columnNames.map(c => c === from ? clean : c));
        setTasks(prev => prev.map(t => t.projectId === projectId && t.status === from ? { ...t, status: clean as any } : t));
        try { const r = await projectsService.manageTaskColumn(projectId, { op: 'rename', name: from, newName: clean }); applyColumns(r.taskColumns); }
        catch { toast.error('No se pudo renombrar la columna.'); reloadTasks(); }
    };

    const handleDeleteColumn = async (name: string) => {
        setDeleteCol(null);
        if (columnNames.length <= 1) { toast.error('Debe quedar al menos una columna.'); return; }
        const remaining = columnNames.filter(c => c !== name);
        const moveTo = remaining[0];
        applyColumns(remaining);
        setTasks(prev => prev.map(t => t.projectId === projectId && t.status === name ? { ...t, status: moveTo as any } : t));
        try { const r = await projectsService.manageTaskColumn(projectId, { op: 'delete', name, moveTo }); applyColumns(r.taskColumns); }
        catch { toast.error('No se pudo eliminar la columna.'); reloadTasks(); }
    };

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, task: Task) => {
        setDraggedTask(task);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetStatus: string) => {
        e.preventDefault();
        if (!draggedTask) return;

        const sourceStatus = draggedTask.status;

        // Find the element being dragged over to determine the new order
        const dropTarget = (e.target as HTMLElement).closest('[data-task-id]');
        const targetId = dropTarget?.getAttribute('data-task-id');
        const targetTask = projectTasks.find(t => t.id === targetId);

        // Orden destino calculado con el estado ACTUAL (fuera del setState) para poder
        // persistirlo al backend. Antes `newOrder` vivía dentro del callback de setTasks
        // y la línea de persistencia (fuera) lanzaba ReferenceError → el cambio de columna
        // nunca se guardaba y al recargar volvía a su lugar.
        const targetColBefore = projectTasks
            .filter(t => t.projectId === projectId && t.status === targetStatus && t.id !== draggedTask.id)
            .sort((a, b) => a.order - b.order);
        const newOrder = (targetTask && targetTask.id !== draggedTask.id) ? targetTask.order : targetColBefore.length;

        setTasks(currentTasks => {
            const otherTasks = currentTasks.filter(t => t.id !== draggedTask.id);
            const updatedMovedTask = { ...draggedTask, status: targetStatus as any, order: newOrder };
            let finalTasks = [...otherTasks, updatedMovedTask];

            // Re-indexa el orden en las columnas origen y destino tras el movimiento.
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

        // Persistir el cambio de estado/orden. Si falla, recargar desde el backend (revertir).
        tasksService.update(draggedTask.id, { status: targetStatus as any, order: newOrder }).catch(() => {
            toast.error(t('cmpx.task.sync_error'));
            reloadTasks();
        });

        setDraggedTask(null);
    };

    const handleCreateTask = async (status: string) => {
        if (!newTaskTitle.trim()) {
            setIsCreatingInStatus(null);
            return;
        }
        try {
            const saved = await tasksService.create({ projectId, title: newTaskTitle, status: status as any, section: activeSection || undefined });
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
            <div className="flex gap-4 overflow-x-auto pb-2 items-start">
                {columnNames.map((status) => { const tasksInColumn = columns[status] || []; return (
                    <div
                        key={status}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, status)}
                        className="bg-slate-100 dark:bg-slate-800 rounded-xl p-2 flex flex-col w-72 flex-shrink-0"
                    >
                        <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-3 px-2 flex justify-between items-center text-lg gap-1">
                           <span className="truncate" title={status}>{status}</span>
                           <span className="flex items-center gap-1 flex-shrink-0">
                               <span className="text-sm text-gray-500">{tasksInColumn.length}</span>
                               <div className="relative">
                                   <button type="button" onClick={() => setColMenuFor(colMenuFor === status ? null : status)} onBlur={() => setTimeout(() => setColMenuFor(f => f === status ? null : f), 150)} className="p-1 rounded text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700" aria-label="Opciones de la columna">⋯</button>
                                   {colMenuFor === status && (
                                       <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-neutral-700 rounded-md shadow-lg py-1 z-20 border border-neutral-200 dark:border-neutral-600 text-sm font-normal">
                                           <button onMouseDown={() => { setColMenuFor(null); setColModal({ mode: 'rename', name: status }); }} className="block w-full text-left px-3 py-1.5 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-600">✏️ Renombrar</button>
                                           <button onMouseDown={() => { setColMenuFor(null); setDeleteCol(status); }} className="block w-full text-left px-3 py-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/40">🗑 Eliminar</button>
                                       </div>
                                   )}
                               </div>
                           </span>
                        </h3>
                        {/* Crear tarea SIEMPRE arriba de la columna (no hay que hacer scroll hasta el final). */}
                        {isCreatingInStatus === status ? (
                             <div className="mb-2 p-1">
                                <textarea
                                    value={newTaskTitle}
                                    onChange={(e) => setNewTaskTitle(e.target.value)}
                                    placeholder={t('cmpx.task.title_ph')}
                                    className="w-full p-2 text-sm border-neutral-300 rounded-md shadow-sm focus:ring-primary focus:border-primary dark:bg-neutral-600 dark:border-neutral-500"
                                    rows={3}
                                    autoFocus
                                    onBlur={() => {if(!newTaskTitle) setIsCreatingInStatus(null)}}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateTask(status); } }}
                                />
                                <div className="mt-2 flex items-center gap-2">
                                    <button onClick={() => handleCreateTask(status)} className={BUTTON_PRIMARY_SM_CLASSES}>{t('cmpx.task.add_task_btn')}</button>
                                    <MicButton
                                        value={newTaskTitle}
                                        onChange={setNewTaskTitle}
                                        title="Dictar el título de la tarea"
                                    />
                                </div>
                            </div>
                        ) : (
                            <button onClick={() => setIsCreatingInStatus(status)} className="mb-2 w-full text-left p-2 rounded-lg text-base font-medium text-primary hover:bg-primary/10 flex items-center transition-colors">
                                <PlusIcon className="w-4 h-4 mr-1" /> {t('cmpx.task.add_task')}
                            </button>
                        )}
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
                                    subtaskSummary={subtaskSummaryByParent.get(task.id)}
                                    data-task-id={task.id}
                                />
                            )})}
                        </div>
                    </div>
                ); })}
                {/* Añadir columna */}
                <button
                    type="button"
                    onClick={() => setColModal({ mode: 'add' })}
                    className="w-56 flex-shrink-0 self-start rounded-xl border-2 border-dashed border-neutral-300 dark:border-neutral-600 text-neutral-500 dark:text-neutral-400 hover:border-primary hover:text-primary p-3 flex items-center justify-center gap-1 text-sm font-medium"
                >
                    <PlusIcon className="w-4 h-4" /> Añadir columna
                </button>
            </div>
            {selectedTask && (
                <TaskDetailModal
                    task={selectedTask}
                    onClose={() => setSelectedTask(null)}
                    onSave={(taskId, updates) => { updateTask(taskId, updates); setSelectedTask(null); }}
                    onArchive={(taskId) => { updateTask(taskId, { archived: true }); setSelectedTask(null); }}
                    onDelete={(taskId) => { setTasks(prev => prev.filter(t => t.id !== taskId)); setSelectedTask(null); }}
                    onOpenTask={(tk) => setSelectedTask(tk)}
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
            {/* Crear / renombrar columna */}
            <InputModal
                isOpen={!!colModal}
                title={colModal?.mode === 'rename' ? 'Renombrar columna' : 'Nueva columna'}
                label="Nombre de la columna:"
                placeholder="Ej. En revisión"
                initialValue={colModal?.mode === 'rename' ? (colModal?.name || '') : ''}
                confirmText={colModal?.mode === 'rename' ? 'Guardar' : 'Añadir'}
                cancelText={t('common.cancel') || 'Cancelar'}
                onConfirm={(val) => { if (colModal?.mode === 'rename' && colModal.name) handleRenameColumn(colModal.name, val); else handleAddColumn(val); }}
                onClose={() => setColModal(null)}
            />
            <ConfirmationModal
                isOpen={!!deleteCol}
                onClose={() => setDeleteCol(null)}
                onConfirm={() => deleteCol && handleDeleteColumn(deleteCol)}
                title="Eliminar columna"
                message={`¿Eliminar la columna "${deleteCol}"? Las tareas que tenga se moverán a la primera columna.`}
                confirmButtonText="Eliminar"
            />
        </>
    );
};