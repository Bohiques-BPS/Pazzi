
import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { Task, TaskStatus, Employee } from '../../types';
import { TaskCard } from './TaskCard';
import { TaskDetailModal } from './TaskDetailModal';
import { PlusIcon } from '../icons';
import { BUTTON_PRIMARY_SM_CLASSES } from '../../constants';
import { useTranslation } from '../../contexts/GlobalSettingsContext'; // Import translations

interface ProjectTaskBoardProps {
    projectId: string;
}

export const ProjectTaskBoard: React.FC<ProjectTaskBoardProps> = ({ projectId }) => {
    const { t } = useTranslation(); // Hook
    const { tasks, setTasks, addTask, updateTask, taskComments, getAllEmployees } = useData();
    const [draggedTask, setDraggedTask] = useState<Task | null>(null);
    const [isCreatingInStatus, setIsCreatingInStatus] = useState<TaskStatus | null>(null);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    
    const allEmployees = getAllEmployees();

    const projectTasks = useMemo(() => {
        return tasks.filter(t => t.projectId === projectId && !t.archived).sort((a, b) => a.order - b.order);
    }, [tasks, projectId]);

    const columns = useMemo(() => ({
        [TaskStatus.TODO]: projectTasks.filter(t => t.status === TaskStatus.TODO),
        [TaskStatus.IN_PROGRESS]: projectTasks.filter(t => t.status === TaskStatus.IN_PROGRESS),
        [TaskStatus.FOR_APPROVAL]: projectTasks.filter(t => t.status === TaskStatus.FOR_APPROVAL),
        [TaskStatus.DONE]: projectTasks.filter(t => t.status === TaskStatus.DONE),
    }), [projectTasks]);

    // Mapping for display titles
    const columnTitles: Record<TaskStatus, string> = {
        [TaskStatus.TODO]: t('tasks.status.todo'),
        [TaskStatus.IN_PROGRESS]: t('tasks.status.in_progress'),
        [TaskStatus.FOR_APPROVAL]: t('tasks.status.for_approval'),
        [TaskStatus.DONE]: t('tasks.status.done'),
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

        setDraggedTask(null);
    };

    const handleCreateTask = (status: TaskStatus) => {
        if (!newTaskTitle.trim()) {
            setIsCreatingInStatus(null);
            return;
        }
        addTask({
            projectId,
            title: newTaskTitle,
            status,
        });
        setNewTaskTitle('');
        setIsCreatingInStatus(null);
    };

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {Object.entries(columns).map(([status, tasksInColumn]: [string, Task[]]) => (
                    <div
                        key={status}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, status as TaskStatus)}
                        className="bg-slate-100 dark:bg-slate-800 rounded-xl p-2 flex flex-col"
                    >
                        <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-3 px-2 flex justify-between items-center text-lg">
                           <span>{columnTitles[status as TaskStatus]}</span>
                           <span className="text-sm text-gray-500">{tasksInColumn.length}</span>
                        </h3>
                        <div className="space-y-2 overflow-y-auto flex-grow min-h-[100px] p-1">
                            {tasksInColumn.map(task => {
                                const commentCount = taskComments.filter(c => c.taskId === task.id).length;
                                const assignedEmployees = task.assignedEmployeeIds
                                    ?.map(id => allEmployees.find(e => e.id === id))
                                    .filter((e): e is Employee => !!e) || [];

                                return (
                                <TaskCard
                                    key={task.id}
                                    task={task}
                                    draggable="true"
                                    onDragStart={(e) => handleDragStart(e, task)}
                                    onClick={() => setSelectedTask(task)}
                                    commentCount={commentCount}
                                    assignedEmployees={assignedEmployees}
                                    data-task-id={task.id}
                                />
                            )})}
                        </div>
                        {isCreatingInStatus === status ? (
                             <div className="mt-2 p-1">
                                <textarea
                                    value={newTaskTitle}
                                    onChange={(e) => setNewTaskTitle(e.target.value)}
                                    placeholder={t('tasks.add_placeholder')}
                                    className="w-full p-2 text-sm border-neutral-300 rounded-md shadow-sm focus:ring-primary focus:border-primary dark:bg-neutral-600 dark:border-neutral-500"
                                    rows={3}
                                    autoFocus
                                    onBlur={() => {if(!newTaskTitle) setIsCreatingInStatus(null)}}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateTask(status as TaskStatus); } }}
                                />
                                <div className="mt-2">
                                    <button onClick={() => handleCreateTask(status as TaskStatus)} className={BUTTON_PRIMARY_SM_CLASSES}>{t('tasks.add_btn')}</button>
                                </div>
                            </div>
                        ) : (
                            <button onClick={() => setIsCreatingInStatus(status as TaskStatus)} className="mt-2 w-full text-left p-2 rounded-lg text-base text-gray-500 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center transition-colors">
                                <PlusIcon className="w-4 h-4 mr-1" /> {t('tasks.add_trigger')}
                            </button>
                        )}
                    </div>
                ))}
            </div>
            {selectedTask && (
                <TaskDetailModal
                    task={selectedTask}
                    onClose={() => setSelectedTask(null)}
                    onSave={(taskId, updates) => updateTask(taskId, updates)}
                    onArchive={(taskId) => updateTask(taskId, { archived: true })}
                />
            )}
        </>
    );
};
