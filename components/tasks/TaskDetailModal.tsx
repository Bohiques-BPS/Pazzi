import React, { useState, useMemo, useEffect } from 'react';
import { Modal, ConfirmationModal } from '../Modal';
import { Task } from '../../types';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { inputFormStyle, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import { ArchiveBoxIcon, PaperAirplaneIcon, ExclamationTriangleIcon, DeleteIcon } from '../icons';
import { RichTextEditor } from '../ui/RichTextEditor';
import { tasksService, type TaskCommentRecord, type ChecklistItem } from '../../services/tasks';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';
import { useTranslation } from '../../contexts/GlobalSettingsContext';

interface TaskDetailModalProps {
    task: Task;
    onClose: () => void;
    onSave: (taskId: string, updates: Partial<Omit<Task, 'id'>>) => void;
    onArchive: (taskId: string) => void;
    onDelete?: (taskId: string) => void;
}

const PRIORITY_OPTIONS: { value: Task['priority']; labelKey: string; cls: string }[] = [
    { value: null,     labelKey: 'cmpx.task.prio.none',   cls: '' },
    { value: 'low',    labelKey: 'cmpx.task.prio.low',    cls: 'text-blue-600' },
    { value: 'medium', labelKey: 'cmpx.task.prio.medium', cls: 'text-yellow-600' },
    { value: 'high',   labelKey: 'cmpx.task.prio.high',   cls: 'text-orange-600' },
    { value: 'urgent', labelKey: 'cmpx.task.prio.urgent', cls: 'text-red-600' },
];

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ task, onClose, onSave, onArchive, onDelete }) => {
    const { t } = useTranslation();
    const { currentUser } = useAuth();
    const { getAllEmployees } = useData();
    const [title, setTitle] = useState(task.title);
    const [description, setDescription] = useState(task.description || '');
    const [assignedIds, setAssignedIds] = useState<string[]>(task.assignedEmployeeIds || []);
    const [dueDate, setDueDate] = useState<string>(task.dueDate ? task.dueDate.split('T')[0] : '');
    const [priority, setPriority] = useState<Task['priority']>(task.priority ?? null);
    const [newComment, setNewComment] = useState('');
    const [comments, setComments] = useState<TaskCommentRecord[]>(((task as any).comments as TaskCommentRecord[]) || []);
    const [submitting, setSubmitting] = useState(false);
    const [sendingComment, setSendingComment] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [checklists, setChecklists] = useState<ChecklistItem[]>(((task as any).checklists as ChecklistItem[]) || []);
    const [newCheckItem, setNewCheckItem] = useState('');
    const [addingCheck, setAddingCheck] = useState(false);

    const allEmployees = useMemo(() => getAllEmployees(), [getAllEmployees]);

    useEffect(() => {
        setComments(((task as any).comments as TaskCommentRecord[]) || []);
    }, [task]);

    const handleSave = async () => {
        if (!title.trim()) {
            setError(t('cmpx.task.title_required'));
            return;
        }
        setSubmitting(true);
        setError(null);
        try {
            await tasksService.update(task.id, {
                title,
                description,
                assignedEmployeeIds: assignedIds,
                dueDate: dueDate || null,
                priority: priority || null,
            });
            onSave(task.id, { title, description, assignedEmployeeIds: assignedIds, dueDate: dueDate || null, priority: priority || null } as any);
            toast.success(t('cmpx.task.updated_ok'));
            onClose();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : t('cmpx.task.save_error'));
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
        setShowArchiveConfirm(true);
    };

    const confirmArchive = async () => {
        setShowArchiveConfirm(false);
        try {
            await tasksService.update(task.id, { archived: true });
            onArchive(task.id);
            toast.success(t('cmpx.task.archived_ok'));
            onClose();
        } catch (err) {
            toast.error(err instanceof ApiError ? err.message : t('cmpx.task.archive_error'));
        }
    };

    const confirmDelete = async () => {
        setShowDeleteConfirm(false);
        try {
            await tasksService.delete(task.id);
            if (onDelete) onDelete(task.id);
            toast.success(t('cmpx.task.deleted_ok'));
            onClose();
        } catch (err) {
            toast.error(err instanceof ApiError ? err.message : t('cmpx.task.delete_error'));
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
            toast.error(err instanceof ApiError ? err.message : t('cmpx.task.comment_error'));
        } finally {
            setSendingComment(false);
        }
    };

    const handleAddCheckItem = async () => {
        const text = newCheckItem.trim();
        if (!text) return;
        setAddingCheck(true);
        try {
            const item = await tasksService.addChecklistItem(task.id, text);
            setChecklists(prev => [...prev, item]);
            setNewCheckItem('');
        } catch { toast.error(t('cmpx.task.check_add_error')); }
        finally { setAddingCheck(false); }
    };

    const handleToggleCheck = async (item: ChecklistItem) => {
        const updated = { ...item, checked: !item.checked };
        setChecklists(prev => prev.map(c => c.id === item.id ? updated : c));
        try { await tasksService.updateChecklistItem(task.id, item.id, { checked: updated.checked }); }
        catch { setChecklists(prev => prev.map(c => c.id === item.id ? item : c)); }
    };

    const handleDeleteCheckItem = async (itemId: string) => {
        setChecklists(prev => prev.filter(c => c.id !== itemId));
        try { await tasksService.deleteChecklistItem(task.id, itemId); }
        catch { toast.error(t('cmpx.task.check_delete_error')); }
    };

    const checkProgress = checklists.length > 0
        ? Math.round((checklists.filter(c => c.checked).length / checklists.length) * 100)
        : 0;

    const sortedComments = useMemo(
        () => [...comments].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
        [comments]
    );

    return (
        <>
        <Modal isOpen={true} onClose={onClose} title={t('cmpx.task.details_title')} size="2xl">
            <div className="space-y-4">
                {error && (
                    <div className="p-3 rounded-md bg-red-50 border border-red-200 flex items-center text-red-700 text-sm">
                        <ExclamationTriangleIcon className="w-5 h-5 mr-2 flex-shrink-0" />
                        {error}
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">{t('cmpx.task.title_label')}</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className={inputFormStyle}
                    />
                </div>

                {/* Priority + Due date in a row */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">{t('cmpx.task.priority_label')}</label>
                        <select
                            value={priority ?? ''}
                            onChange={e => setPriority((e.target.value || null) as Task['priority'])}
                            className={inputFormStyle}
                        >
                            {PRIORITY_OPTIONS.map(opt => (
                                <option key={opt.value ?? 'none'} value={opt.value ?? ''}>{t(opt.labelKey)}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">{t('cmpx.task.due_date')}</label>
                        <input
                            type="date"
                            value={dueDate}
                            onChange={e => setDueDate(e.target.value)}
                            className={inputFormStyle}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">{t('cmpx.task.description_label')}</label>
                    <RichTextEditor
                        value={description}
                        onChange={setDescription}
                        placeholder={t('cmpx.task.description_ph')}
                    />
                </div>

                <fieldset className="border dark:border-neutral-600 p-3 rounded">
                    <legend className="text-base font-medium px-1 text-neutral-700 dark:text-neutral-300">{t('cmpx.task.assign_collaborators')}</legend>
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

                {/* Checklist */}
                <div className="border-t dark:border-neutral-700 pt-4">
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                            ☑️ {t('cmpx.task.checklist')}
                            {checklists.length > 0 && (
                                <span className="ml-2 text-xs font-normal text-neutral-500">
                                    {checklists.filter(c => c.checked).length}/{checklists.length}
                                </span>
                            )}
                        </h4>
                    </div>
                    {checklists.length > 0 && (
                        <>
                            <div className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-600 rounded-full mb-2 overflow-hidden">
                                <div
                                    className="h-full bg-green-500 rounded-full transition-all duration-300"
                                    style={{ width: `${checkProgress}%` }}
                                />
                            </div>
                            <ul className="space-y-1 mb-2">
                                {checklists.map(item => (
                                    <li key={item.id} className="flex items-center gap-2 group p-1 rounded hover:bg-neutral-50 dark:hover:bg-neutral-700/50">
                                        <input
                                            type="checkbox"
                                            checked={item.checked}
                                            onChange={() => handleToggleCheck(item)}
                                            className="h-4 w-4 text-primary rounded border-neutral-300 dark:border-neutral-600 dark:bg-neutral-900 focus:ring-primary flex-shrink-0"
                                        />
                                        <span className={`flex-1 text-sm ${item.checked ? 'line-through text-neutral-400' : 'text-neutral-700 dark:text-neutral-200'}`}>
                                            {item.text}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteCheckItem(item.id)}
                                            className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-500 transition-opacity p-0.5"
                                            aria-label={t('cmpx.task.check_delete_aria')}
                                        >
                                            ✕
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newCheckItem}
                            onChange={e => setNewCheckItem(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCheckItem(); } }}
                            placeholder={t('cmpx.task.check_add_ph')}
                            className={inputFormStyle + ' flex-1 !py-1.5 text-sm'}
                            disabled={addingCheck}
                        />
                        <button
                            type="button"
                            onClick={handleAddCheckItem}
                            disabled={addingCheck || !newCheckItem.trim()}
                            className={BUTTON_SECONDARY_SM_CLASSES}
                        >
                            {t('common.add')}
                        </button>
                    </div>
                </div>

                <div className="border-t dark:border-neutral-700 pt-4">
                    <h4 className="text-base font-semibold mb-2">{t('cmpx.task.comments', { count: sortedComments.length })}</h4>
                    <div className="space-y-3 max-h-48 overflow-y-auto pr-2 bg-neutral-50 dark:bg-neutral-700/50 p-2 rounded-md">
                        {sortedComments.length > 0 ? sortedComments.map(comment => (
                            <div key={comment.id} className="text-base">
                                <div className="flex justify-between items-baseline">
                                    <span className="font-semibold text-primary/80 dark:text-accent/80">{comment.senderName || t('cmpx.common.user')}</span>
                                    <span className="text-xs text-neutral-400">{new Date(comment.timestamp).toLocaleString()}</span>
                                </div>
                                <p className="text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-600/50 p-1.5 rounded whitespace-pre-wrap">{comment.text}</p>
                            </div>
                        )) : <p className="text-sm text-center text-neutral-500">{t('cmpx.task.no_comments')}</p>}
                    </div>
                    <div className="flex items-center space-x-2 mt-3">
                        <input
                            type="text"
                            value={newComment}
                            onChange={e => setNewComment(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddComment(); } }}
                            placeholder={t('cmpx.task.comment_ph')}
                            className={inputFormStyle + " flex-grow"}
                            disabled={sendingComment}
                        />
                        <button onClick={handleAddComment} className={BUTTON_SECONDARY_SM_CLASSES} disabled={sendingComment || !newComment.trim()}>
                            <PaperAirplaneIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t dark:border-neutral-700">
                    <div className="flex gap-2">
                        <button onClick={handleArchive} className={`${BUTTON_SECONDARY_SM_CLASSES} text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 flex items-center`}>
                            <ArchiveBoxIcon className="w-4 h-4 mr-1" /> {t('cmpx.task.archive')}
                        </button>
                        {onDelete && (
                            <button onClick={() => setShowDeleteConfirm(true)} className={`${BUTTON_SECONDARY_SM_CLASSES} text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/50 flex items-center`}>
                                <DeleteIcon className="w-4 h-4 mr-1" /> {t('common.delete')}
                            </button>
                        )}
                    </div>
                    <div className="space-x-2">
                        <button onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES} disabled={submitting}>{t('common.cancel')}</button>
                        <button onClick={handleSave} className={BUTTON_PRIMARY_SM_CLASSES} disabled={submitting}>
                            {submitting ? t('common.saving') : t('cmpx.task.save_changes')}
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
        <ConfirmationModal
            isOpen={showArchiveConfirm}
            onClose={() => setShowArchiveConfirm(false)}
            onConfirm={confirmArchive}
            title={t('cmpx.task.archive_confirm_title')}
            message={t('cmpx.task.archive_confirm_msg')}
            confirmButtonText={t('cmpx.task.archive')}
        />
        <ConfirmationModal
            isOpen={showDeleteConfirm}
            onClose={() => setShowDeleteConfirm(false)}
            onConfirm={confirmDelete}
            title={t('cmpx.task.delete_confirm_title')}
            message={t('cmpx.task.delete_confirm_msg')}
            confirmButtonText={t('pmx.common.yes_delete')}
        />
        </>
    );
};
