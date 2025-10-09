import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../Modal';
import { Task, TaskComment, Employee } from '../../types';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { inputFormStyle, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import { ArchiveBoxIcon, PaperAirplaneIcon } from '../icons';
import { RichTextEditor } from '../ui/RichTextEditor';

interface TaskDetailModalProps {
    task: Task;
    onClose: () => void;
    onSave: (taskId: string, updates: Partial<Omit<Task, 'id'>>) => void;
    onArchive: (taskId: string) => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ task, onClose, onSave, onArchive }) => {
    const { currentUser } = useAuth();
    const { taskComments, addTaskComment, getAllEmployees } = useData();
    const [title, setTitle] = useState(task.title);
    const [description, setDescription] = useState(task.description || '');
    const [assignedIds, setAssignedIds] = useState<string[]>(task.assignedEmployeeIds || []);
    const [newComment, setNewComment] = useState('');

    const allEmployees = useMemo(() => getAllEmployees(), [getAllEmployees]);

    const commentsForTask = useMemo(() => {
        return taskComments
            .filter(c => c.taskId === task.id)
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }, [taskComments, task.id]);

    const handleSave = () => {
        onSave(task.id, { title, description, assignedEmployeeIds: assignedIds });
        onClose();
    };
    
    const handleEmployeeToggle = (empId: string) => {
        setAssignedIds(prev =>
            prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
        );
    };

    const handleArchive = () => {
        if (window.confirm("¿Está seguro que desea archivar esta tarea?")) {
            onArchive(task.id);
            onClose();
        }
    };

    const handleAddComment = () => {
        if (newComment.trim() && currentUser) {
            addTaskComment({
                taskId: task.id,
                senderId: currentUser.id,
                text: newComment
            });
            setNewComment('');
        }
    };

    return (
        <Modal isOpen={true} onClose={onClose} title="Detalles de la Tarea" size="2xl">
            <div className="space-y-4">
                <div>
                    <label className="block text-base font-medium">Título</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className={inputFormStyle}
                    />
                </div>
                <div>
                    <label className="block text-base font-medium">Descripción</label>
                    <RichTextEditor
                        value={description}
                        onChange={setDescription}
                        placeholder="Añada una descripción más detallada..."
                    />
                </div>

                <fieldset className="border dark:border-neutral-600 p-3 rounded">
                    <legend className="text-base font-medium px-1 text-neutral-700 dark:text-neutral-300">Asignar Colaboradores</legend>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto mt-2">
                        {allEmployees.map(emp => (
                            <label key={emp.id} className="flex items-center space-x-2 p-1.5 bg-neutral-100 dark:bg-neutral-700 rounded cursor-pointer hover:bg-neutral-200 dark:hover:bg-neutral-600">
                                <input
                                    type="checkbox"
                                    checked={assignedIds.includes(emp.id)}
                                    onChange={() => handleEmployeeToggle(emp.id)}
                                    className="form-checkbox h-4 w-4 text-primary focus:ring-primary dark:bg-neutral-600 dark:border-neutral-500"
                                />
                                <span className="text-base text-neutral-700 dark:text-neutral-200">{emp.name} {emp.lastName}</span>
                            </label>
                        ))}
                    </div>
                </fieldset>

                <div className="border-t dark:border-neutral-700 pt-4">
                    <h4 className="text-base font-semibold mb-2">Comentarios</h4>
                    <div className="space-y-3 max-h-48 overflow-y-auto pr-2 bg-neutral-50 dark:bg-neutral-700/50 p-2 rounded-md">
                        {commentsForTask.length > 0 ? commentsForTask.map(comment => (
                            <div key={comment.id} className="text-base">
                                <div className="flex justify-between items-baseline">
                                    <span className="font-semibold text-primary/80 dark:text-accent/80">{comment.senderName}</span>
                                    <span className="text-xs text-neutral-400">{new Date(comment.timestamp).toLocaleString()}</span>
                                </div>
                                <p className="text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-600/50 p-1.5 rounded">{comment.text}</p>
                            </div>
                        )) : <p className="text-sm text-center text-neutral-500">No hay comentarios.</p>}
                    </div>
                     <div className="flex items-center space-x-2 mt-3">
                        <input
                            type="text"
                            value={newComment}
                            onChange={e => setNewComment(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddComment(); } }}
                            placeholder="Añadir un comentario..."
                            className={inputFormStyle + " flex-grow"}
                        />
                        <button onClick={handleAddComment} className={BUTTON_SECONDARY_SM_CLASSES}><PaperAirplaneIcon className="w-4 h-4" /></button>
                    </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t dark:border-neutral-700">
                    <button onClick={handleArchive} className={`${BUTTON_SECONDARY_SM_CLASSES} text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/50 flex items-center`}>
                        <ArchiveBoxIcon className="w-4 h-4 mr-1" /> Archivar Tarea
                    </button>
                    <div className="space-x-2">
                        <button onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button>
                        <button onClick={handleSave} className={BUTTON_PRIMARY_SM_CLASSES}>Guardar Cambios</button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};