import React from 'react';
import { Task, Employee } from '../../types';
import { ChatBubbleLeftRightIcon, CalendarDaysIcon, ExclamationTriangleIcon } from '../icons';

interface ChecklistSummary { total: number; done: number; }

interface TaskCardProps extends React.HTMLAttributes<HTMLDivElement> {
    task: Task;
    commentCount: number;
    assignedEmployees: Employee[];
    checklistSummary?: ChecklistSummary;
}

const PRIORITY_CONFIG = {
    urgent: { label: 'Urgente', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
    high:   { label: 'Alta',    cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' },
    medium: { label: 'Media',   cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' },
    low:    { label: 'Baja',    cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
};

export const TaskCard: React.FC<TaskCardProps> = ({ task, commentCount, assignedEmployees, checklistSummary, ...props }) => {
    const priorityCfg = task.priority ? PRIORITY_CONFIG[task.priority] : null;

    const dueDateStr = task.dueDate ? task.dueDate.split('T')[0] : null;
    const dueDate = dueDateStr ? new Date(dueDateStr + 'T00:00:00') : null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const isOverdue = dueDate && dueDate < today && task.status !== 'Hecho';
    const isDueSoon = dueDate && !isOverdue && dueDate <= new Date(today.getTime() + 2 * 86400000);

    const hasFooter = commentCount > 0 || assignedEmployees.length > 0 || dueDateStr || (checklistSummary && checklistSummary.total > 0);

    return (
        <div
            {...props}
            className="bg-white dark:bg-slate-700 p-3 rounded-lg shadow hover:shadow-lg cursor-grab border-b-2 border-transparent transition-all duration-150"
        >
            {/* Priority badge */}
            {priorityCfg && (
                <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded mb-1.5 ${priorityCfg.cls}`}>
                    {priorityCfg.label}
                </span>
            )}

            <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100 leading-snug">{task.title}</p>

            {task.description && (
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-2">
                    {task.description.replace(/<[^>]+>/g, '')}
                </p>
            )}

            {hasFooter && (
                <div className="mt-2.5 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                        {/* Due date */}
                        {dueDateStr && (
                            <span className={`flex items-center text-[11px] font-medium px-1.5 py-0.5 rounded gap-0.5
                                ${isOverdue
                                    ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                                    : isDueSoon
                                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300'
                                        : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-600 dark:text-neutral-300'
                                }`}
                            >
                                {isOverdue
                                    ? <ExclamationTriangleIcon className="w-3 h-3" />
                                    : <CalendarDaysIcon className="w-3 h-3" />
                                }
                                {new Date(dueDateStr + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                            </span>
                        )}

                        {/* Checklist progress */}
                        {checklistSummary && checklistSummary.total > 0 && (
                            <span className={`flex items-center text-[11px] font-medium px-1.5 py-0.5 rounded gap-0.5
                                ${checklistSummary.done === checklistSummary.total
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                                    : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-600 dark:text-neutral-300'}`}
                            >
                                ☑ {checklistSummary.done}/{checklistSummary.total}
                            </span>
                        )}

                        {/* Comment count */}
                        {commentCount > 0 && (
                            <span className="flex items-center text-xs text-gray-500 dark:text-gray-400 gap-0.5">
                                <ChatBubbleLeftRightIcon className="w-3.5 h-3.5" />
                                {commentCount}
                            </span>
                        )}
                    </div>

                    {/* Assigned avatars */}
                    <div className="flex -space-x-1.5 overflow-hidden">
                        {assignedEmployees.map(emp => (
                            emp.profilePictureUrl ? (
                                <img
                                    key={emp.id}
                                    className="h-5 w-5 rounded-full ring-2 ring-white dark:ring-slate-700 object-cover"
                                    src={emp.profilePictureUrl}
                                    alt={emp.name}
                                    title={`${emp.name} ${emp.lastName}`}
                                />
                            ) : (
                                <div
                                    key={emp.id}
                                    className="h-5 w-5 rounded-full ring-2 ring-white dark:ring-slate-700 bg-primary text-white text-[9px] font-bold flex items-center justify-center"
                                    title={`${emp.name} ${emp.lastName}`}
                                >
                                    {emp.name[0]}{emp.lastName?.[0]}
                                </div>
                            )
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
