import React, { useState, useMemo, useEffect } from 'react';
import { Modal } from '../Modal';
import { Task } from '../../types';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { inputFormStyle, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import { ArchiveBoxIcon, PaperAirplaneIcon, ExclamationTriangleIcon } from '../icons';
import { RichTextEditor } from '../ui/RichTextEditor';
import { tasksService, type TaskCommentRecord } from '../../services/tasks';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';

interface TaskDetailModalProps {
    task: Task;
    onClose: () => void;
    onSave: (taskId: string, updates: Partial<Omit<Task, 'id'>>) => void;
    onArchive: (taskId: string) => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ task, onClose, onSave, onArchive }) => {
    const { currentUser } = useAuth();
    const { getAllEmployees } = useData();
    const [title, setTitle] = useState(task.title);
    const [description, setDescription] = useState(task.description || '');
    const [assignedIds, setAssignedIds] = useState<string[]>(task.assignedEmployeeIds || []);
    const [newComment, setNewComment] = useState('');
    const [comments, setComments] = useState<TaskCommentRecord[]>(((task as any).comments as TaskCommentRecord[]) || []);
    const [submitting, setSubmitting] = useState(false);
    const [sendingComment, setSendingComment] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const allEmployees = useMemo(() => getAllEmployees(), [getAllEmployees]);

    useEffect(() => {
        setComments(((task as any).comments as TaskCommentRecord[]) || []);
    }, [task]);

    const handleSave = async () => {
        if (!title.trim()) {
            setError('El título es requerido.');
            return;
        }
        setSubmitting(true);
        setError(null);
        try {
            await tasksService.update(task.id, {
                title,
                description,
                assignedEmployeeIds: assignedIds,
            });
            onSave(task.id, { title, description, assignedEmployeeIds: assignedIds } as any);
            toast.success('Tarea actualizada');
            onClose();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Error al guardar la tarea');
        } finally {
            setSubmitting(false);
        }
    };

    const handleEmployeeToggle = (empId: string) => {
        setAssignedIds(prev =>
            prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
        );
    };

    const handleArchive = async () => {
        if (!window.confirm('¿Está seguro que desea archivar esta tarea?')) return;
        try {
            await tasksService.update(task.id, { archived: true });
            onArchive(task.id);
            toast.success('Tarea archivada');
            onClose();
        } catch (err) {
            toast.error(err instanceof ApiError ? err.message : 'Error al archivar la tarea');
        }
    };

    const handleAddComment = async () => {
        const text = newComment.trim();
        if (!text || !currentUser) return;
        setSendingComment(true);
        try {
            const comment = await tasksService.addComment(task.id, text);
            setComments(prev => [...prev, comment]);
            setNewComment('');
        } catch (err) {
            toast.error(err instanceof ApiError ? err.message : 'Error al enviar comentario');
        } finally {
            setSendingComment(false);
        }
    };

    const sortedComments = useMemo(
        () => [...comments].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
        [comments]
    );

    return (
        <Modal isOpen={true} onClose={onClose} title="Detalles de la tarea" size="2xl">
            <div className="space-y-4">
                {error && (
                    <div className="p-3 rounded-md bg-red-50 border border-red-200 flex items-center text-red-700 text-sm">
                        <ExclamationTriangleIcon className="w-5 h-5 mr-2 flex-shrink-0" />
                        {error}
                    </div>
                )}

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
                    <legend className="text-base font-medium px-1 text-neutral-700 dark:text-neutral-300">Asignar colaboradores</legend>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto mt-2">
                        {allEmployees.map(emp => (
                            <label key={emp.id} className="flex items-center space-x-2 p-1.5 bg-neutral-100 dark:bg-neutral-700 rounded cursor-pointer hover:bg-neutral-200 dark:hover:bg-neutral-600">
                                <input
                                    type="checkbox"
                                    checked={assignedIds.includes(emp.id)}
                                    onChange={() => handleEmployeeToggle(emp.id)}
                                    className="form-checkbox h-4 w-4 text-primary focus:ring-primary"
                                />
                                <span className="text-base text-neutral-700 dark:text-neutral-200">{emp.name} {emp.lastName}</span>
                            </label>
                        ))}
                    </div>
                </fieldset>

                <div className="border-t dark:border-neutral-700 pt-4">
                    <h4 className="text-base font-semibold mb-2">Comentarios ({sortedComments.length})</h4>
                    <div className="space-y-3 max-h-48 overflow-y-auto pr-2 bg-neutral-50 dark:bg-neutral-700/50 p-2 rounded-md">
                        {sortedComments.length > 0 ? sortedComments.map(comment => (
                            <div key={comment.id} className="text-base">
                                <div className="flex justify-between items-baseline">
                                    <span className="font-semibold text-primary/80 dark:text-accent/80">{comment.senderName || 'Usuario'}</span>
                                    <span className="text-xs text-neutral-400">{new Date(comment.timestamp).toLocaleString()}</span>
                                </div>
                                <p className="text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-600/50 p-1.5 rounded whitespace-pre-wrap">{comment.text}</p>
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
                            disabled={sendingComment}
                        />
                        <button onClick={handleAddComment} className={BUTTON_SECONDARY_SM_CLASSES} disabled={sendingComment || !newComment.trim()}>
                            <PaperAirplaneIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t dark:border-neutral-700">
                    <button onClick={handleArchive} className={`${BUTTON_SECONDARY_SM_CLASSES} text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/50 flex items-center`}>
                        <ArchiveBoxIcon className="w-4 h-4 mr-1" /> Archivar tarea
                    </button>
                    <div className="space-x-2">
                        <button onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES} disabled={submitting}>Cancelar</button>
                        <button onClick={handleSave} className={BUTTON_PRIMARY_SM_CLASSES} disabled={submitting}>
                            {submitting ? 'Guardando...' : 'Guardar cambios'}
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};
