import React from 'react';
import { Task, Employee } from '../../types';
import { ChatBubbleLeftRightIcon } from '../icons';

interface TaskCardProps extends React.HTMLAttributes<HTMLDivElement> {
    task: Task;
    commentCount: number;
    assignedEmployees: Employee[];
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, commentCount, assignedEmployees, ...props }) => {
    const hasFooter = commentCount > 0 || assignedEmployees.length > 0;

    return (
        <div
            {...props}
            className="bg-white dark:bg-slate-700 p-3 rounded-lg shadow hover:shadow-lg cursor-grab border-b-2 border-transparent transition-all duration-150"
        >
            <p className="text-lg text-neutral-800 dark:text-neutral-100">{task.title}</p>

            {hasFooter && (
                <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        {commentCount > 0 && (
                            <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                                <ChatBubbleLeftRightIcon className="w-4 h-4 mr-1" />
                                <span>{commentCount}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex -space-x-2 overflow-hidden">
                        {assignedEmployees.map(emp => (
                            <img 
                                key={emp.id} 
                                className="inline-block h-6 w-6 rounded-full ring-2 ring-white dark:ring-slate-700" 
                                src={emp.profilePictureUrl} 
                                alt={emp.name} 
                                title={`${emp.name} ${emp.lastName}`}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};