import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from '../Modal';
import { MicButton } from '../ui/MicButton';
import { RichTextEditor } from '../ui/RichTextEditor';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../contexts/GlobalSettingsContext';
import { tasksService, type TaskAttachment } from '../../services/tasks';
import { uploadImage } from '../../services/upload';
import { Task } from '../../types';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES, inputFormStyle } from '../../constants';
import { toast } from 'react-hot-toast';

const PRIORITY_OPTIONS: { value: Task['priority']; labelKey: string }[] = [
    { value: null, labelKey: 'cmpx.task.prio.none' },
    { value: 'low', labelKey: 'cmpx.task.prio.low' },
    { value: 'medium', labelKey: 'cmpx.task.prio.medium' },
    { value: 'high', labelKey: 'cmpx.task.prio.high' },
    { value: 'urgent', labelKey: 'cmpx.task.prio.urgent' },
];

const pad = (n: number) => String(n).padStart(2, '0');
const toLocalInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

interface Props {
    /** Columna/estado donde se crea; null = cerrado. */
    status: string | null;
    projectId: string;
    /** Sección activa del tablero (se precarga). */
    defaultSection?: string;
    /** Secciones existentes del proyecto (sugerencias). */
    sections: string[];
    /** "Asignármelas a mí": preferencia del tablero. */
    assignSelf: boolean;
    onToggleAssignSelf: (v: boolean) => void;
    /** Employee.id (o User.id) del usuario conectado, como lo usan las tareas. */
    myAssigneeId?: string;
    onClose: () => void;
    /** La tarea creada (y sus subtareas) para agregarlas al tablero. */
    onCreated: (tasks: any[]) => void;
}

/**
 * Crear tarea con TODOS los campos de "Detalles de la tarea" (título, prioridad, fecha, sección,
 * recordatorio, descripción, imágenes, colaboradores, subtareas y checklist), en una columna como
 * el editor y con los botones en un pie fijo (no hace falta bajar para guardar). Comentarios/aprobación quedan para después de crearla.
 */
export const TaskCreateModal: React.FC<Props> = ({ status, projectId, defaultSection, sections, assignSelf, onToggleAssignSelf, myAssigneeId, onClose, onCreated }) => {
    const { t } = useTranslation();
    const { getAllEmployees, projects } = useData();
    const { currentUser } = useAuth();
    const isOpen = status !== null;

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState<Task['priority']>(null);
    const [dueDate, setDueDate] = useState('');
    const [section, setSection] = useState('');
    const [reminderOn, setReminderOn] = useState(false);
    const [remindAt, setRemindAt] = useState('');
    const [assignedIds, setAssignedIds] = useState<string[]>([]);
    const [images, setImages] = useState<TaskAttachment[]>([]);
    const [subtasks, setSubtasks] = useState<string[]>([]);
    const [newSubtask, setNewSubtask] = useState('');
    const [checklist, setChecklist] = useState<string[]>([]);
    const [newCheck, setNewCheck] = useState('');
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    // Reinicia el formulario cada vez que se abre.
    useEffect(() => {
        if (!isOpen) return;
        setTitle(''); setDescription(''); setPriority(null); setDueDate(''); setSection(defaultSection || '');
        setReminderOn(false); setRemindAt(''); setImages([]); setSubtasks([]); setNewSubtask(''); setChecklist([]); setNewCheck('');
        setAssignedIds(assignSelf && myAssigneeId ? [myAssigneeId] : []);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    // Solo personas asignadas al proyecto (+ el usuario conectado), igual que en "Detalles de la tarea".
    const employees = useMemo(() => {
        const project = projects.find(p => p.id === projectId);
        const base: any[] = !project
            ? [...getAllEmployees()]
            : getAllEmployees().filter((e: any) => {
                const assigned = new Set((project.assignedEmployeeIds || []).map(String));
                return assigned.has(String(e.userId)) || assigned.has(String(e.id)) || assigned.has(String(e.user?.id));
            });
        if (currentUser && !base.some((e: any) => String(e.id) === currentUser.id || String(e.userId) === currentUser.id)) {
            base.push({ id: currentUser.id, userId: currentUser.id, name: currentUser.name, lastName: (currentUser as any).lastName });
        }
        return base;
    }, [getAllEmployees, projects, projectId, currentUser]);

    const isDirty = !!(title.trim() || description.replace(/<[^>]*>/g, '').trim() || images.length || dueDate || priority || subtasks.length || checklist.length || newSubtask.trim() || newCheck.trim());

    const handleImageFiles = async (files: File[]) => {
        const list = files.filter(f => f.type.startsWith('image/'));
        if (!list.length) return;
        setUploading(true);
        try {
            for (const file of list) {
                if (file.size > 5 * 1024 * 1024) { toast.error(`"${file.name || 'imagen'}" supera 5 MB.`); continue; }
                const url = await uploadImage(file);
                setImages(prev => [...prev, { url, name: file.name || 'imagen' }]);
            }
        } catch { toast.error('No se pudo subir la imagen.'); }
        finally { setUploading(false); }
    };
    const onPaste = (e: React.ClipboardEvent) => {
        const files = Array.from(e.clipboardData?.files || []).filter(f => f.type.startsWith('image/'));
        if (files.length) { e.preventDefault(); handleImageFiles(files); }
    };

    const toggleReminder = (on: boolean) => {
        setReminderOn(on);
        if (on && !remindAt) {
            const base = dueDate ? new Date(dueDate + 'T09:00:00') : (() => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return d; })();
            setRemindAt(toLocalInput(base));
        }
    };

    const addSubtask = () => { const v = newSubtask.trim(); if (v) { setSubtasks(prev => [...prev, v]); setNewSubtask(''); } };
    const addCheck = () => { const v = newCheck.trim(); if (v) { setChecklist(prev => [...prev, v]); setNewCheck(''); } };

    const create = async () => {
        if (!status) return;
        if (!title.trim()) { toast.error(t('cmpx.task.title_required') || 'Escribe un título para la tarea.'); return; }
        if (reminderOn && !remindAt) { toast.error('Elige la fecha y hora del recordatorio o desactívalo.'); return; }
        setSaving(true);
        try {
            const saved: any = await tasksService.create({
                projectId, title: title.trim(), status: status as any,
                description: description || undefined,
                section: section.trim() || undefined,
                priority: priority || null,
                dueDate: dueDate || null,
                remindAt: reminderOn && remindAt ? new Date(remindAt).toISOString() : null,
                ...(images.length ? { attachments: images } : {}),
                ...(assignedIds.length ? { assignedEmployeeIds: assignedIds } : {}),
            } as any);
            const created: any[] = [{ ...saved, assignedEmployeeIds: saved.assignedEmployeeIds || [] }];
            // Lo pendiente (checklist y subtareas) se crea después, sobre la tarea ya guardada.
            const extraErrors: string[] = [];
            const items: any[] = [];
            for (const text of checklist) {
                try { items.push(await tasksService.addChecklistItem(saved.id, text)); } catch { extraErrors.push(text); }
            }
            if (items.length) created[0] = { ...created[0], checklists: items };
            for (const st of subtasks) {
                try {
                    const sub: any = await tasksService.create({ projectId, title: st, status: status as any, section: section.trim() || undefined, parentTaskId: saved.id } as any);
                    created.push({ ...sub, assignedEmployeeIds: sub.assignedEmployeeIds || [] });
                } catch { extraErrors.push(st); }
            }
            if (extraErrors.length) toast.error(`La tarea se creó, pero no se pudo agregar: ${extraErrors.slice(0, 3).join(', ')}${extraErrors.length > 3 ? '…' : ''}`);
            onCreated(created);
            onClose();
        } catch {
            toast.error(t('cmpx.task.create_error'));
        } finally { setSaving(false); }
    };

    const label = 'block text-sm font-medium text-neutral-700 dark:text-neutral-300';

    // Botones en el pie FIJO del modal: siempre visibles, sin tener que hacer scroll para guardar.
    const footer = (
        <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-neutral-400 hidden sm:block">Enter en el título para crear · Ctrl+V para pegar imágenes</p>
            <div className="flex gap-2 ml-auto">
                <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>{t('common.cancel') || 'Cancelar'}</button>
                <button type="button" onClick={create} disabled={uploading || saving} className={`${BUTTON_PRIMARY_SM_CLASSES} disabled:opacity-50`}>
                    {uploading ? 'Subiendo imagen…' : saving ? (t('common.saving') || 'Guardando…') : (t('cmpx.task.add_task_btn') || 'Añadir tarea')}
                </button>
            </div>
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`${t('cmpx.task.add_task') || 'Añadir tarea'}${status ? ` · ${status}` : ''}`} size="2xl" isDirty={isDirty && !saving} footer={footer}>
            {/* Mismo orden y estilo que "Detalles de la tarea", en una columna. */}
            <div className="space-y-4" onPaste={onPaste}>
                <div>
                    <label className={label}>{t('cmpx.task.title_label') || 'Título'}</label>
                    <div className="flex items-center gap-2">
                        <input
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder={t('cmpx.task.title_ph')}
                            className={inputFormStyle + ' flex-1'}
                            autoFocus
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); create(); } }}
                        />
                        <MicButton value={title} onChange={setTitle} title="Dictar el título de la tarea" />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className={label}>{t('cmpx.task.priority_label')}</label>
                        <select value={priority ?? ''} onChange={e => setPriority((e.target.value || null) as Task['priority'])} className={inputFormStyle}>
                            {PRIORITY_OPTIONS.map(o => <option key={o.value ?? 'none'} value={o.value ?? ''}>{t(o.labelKey)}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className={label}>{t('cmpx.task.due_date')}</label>
                        <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={inputFormStyle} />
                    </div>
                </div>

                <div>
                    <label className={label}>{t('cmpx.task.section_label')}</label>
                    <input value={section} onChange={e => setSection(e.target.value)} list="task-create-sections" placeholder={t('cmpx.task.section_none')} className={inputFormStyle} />
                    <datalist id="task-create-sections">{sections.map(s => <option key={s} value={s} />)}</datalist>
                </div>

                <div className="rounded-md border border-neutral-200 dark:border-neutral-700 p-3">
                    <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-200 cursor-pointer">
                        <input type="checkbox" checked={reminderOn} onChange={e => toggleReminder(e.target.checked)} className="h-4 w-4" />
                        🔔 Recordarme esta tarea
                    </label>
                    {reminderOn && <input type="datetime-local" value={remindAt} onChange={e => setRemindAt(e.target.value)} className={inputFormStyle + ' mt-2'} />}
                </div>

                <div>
                    <div className="flex items-center justify-between">
                        <label className={label}>{t('cmpx.task.description_label')}</label>
                        <MicButton onText={(text) => setDescription(prev => { const b = (prev || '').trim(); return b ? `${b} ${text}` : text; })} title="Dictar la descripción" />
                    </div>
                    <RichTextEditor value={description} onChange={setDescription} placeholder={t('cmpx.task.description_ph')} />
                </div>

                <div>
                    <div className="flex items-center justify-between">
                        <label className={label}>🖼️ Imágenes</label>
                        <button type="button" onClick={() => fileRef.current?.click()} className="text-xs text-primary hover:underline">{uploading ? 'Subiendo…' : '+ Adjuntar'}</button>
                        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => { handleImageFiles(Array.from(e.target.files || [])); e.currentTarget.value = ''; }} />
                    </div>
                    {images.length > 0 ? (
                        <div className="flex flex-wrap gap-2 mt-2">
                            {images.map((img, i) => (
                                <div key={i} className="relative">
                                    <img src={img.url} alt={img.name || 'imagen'} className="w-20 h-20 object-cover rounded border border-neutral-300 dark:border-neutral-600" />
                                    <button type="button" onClick={() => setImages(prev => prev.filter((_, j) => j !== i))} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center shadow" aria-label="Quitar imagen">✕</button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1 border border-dashed border-neutral-300 dark:border-neutral-600 rounded-md px-3 py-3 text-center">Pega una imagen aquí (Ctrl+V) o usa “+ Adjuntar”.</p>
                    )}
                </div>

                <fieldset className="border dark:border-neutral-600 p-3 rounded">
                    <legend className="text-base font-medium px-1 text-neutral-700 dark:text-neutral-300">{t('cmpx.task.assign_collaborators')}</legend>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto mt-2">
                        {employees.map((emp: any) => (
                            <label key={emp.id} className="flex items-center space-x-2 p-1.5 bg-neutral-100 dark:bg-neutral-700 rounded cursor-pointer hover:bg-neutral-200 dark:hover:bg-neutral-600">
                                <input type="checkbox" checked={assignedIds.includes(emp.id)} onChange={() => setAssignedIds(prev => prev.includes(emp.id) ? prev.filter(id => id !== emp.id) : [...prev, emp.id])} className="form-checkbox h-4 w-4 text-primary focus:ring-primary" />
                                <span className="text-base text-neutral-700 dark:text-neutral-200">{emp.name} {emp.lastName}</span>
                            </label>
                        ))}
                    </div>
                    <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300 cursor-pointer select-none mt-2">
                        <input type="checkbox" checked={assignSelf} onChange={e => onToggleAssignSelf(e.target.checked)} className="h-4 w-4 rounded accent-primary" />
                        Asignármelas a mí automáticamente
                    </label>
                </fieldset>

                {/* Subtareas y checklist: se crean junto con la tarea. */}
                <div className="border-t dark:border-neutral-700 pt-4">
                    <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200 mb-2">↳ Subtareas</h4>
                    {subtasks.length > 0 && (
                        <ul className="mb-2 space-y-1">
                            {subtasks.map((s, i) => (
                                <li key={i} className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-200">
                                    <span className="flex-1 truncate">• {s}</span>
                                    <button type="button" onClick={() => setSubtasks(prev => prev.filter((_, j) => j !== i))} className="text-neutral-400 hover:text-red-500" aria-label="Quitar">✕</button>
                                </li>
                            ))}
                        </ul>
                    )}
                    <div className="flex gap-2">
                        <input value={newSubtask} onChange={e => setNewSubtask(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSubtask(); } }} placeholder="Añadir subtarea…" className={inputFormStyle + ' flex-1'} />
                        <button type="button" onClick={addSubtask} className={BUTTON_SECONDARY_SM_CLASSES}>{t('common.add') || 'Añadir'}</button>
                    </div>
                </div>

                <div className="border-t dark:border-neutral-700 pt-4">
                    <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200 mb-2">Lista de verificación</h4>
                    {checklist.length > 0 && (
                        <ul className="mb-2 space-y-1">
                            {checklist.map((c, i) => (
                                <li key={i} className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-200">
                                    <span className="flex-1 truncate">☐ {c}</span>
                                    <button type="button" onClick={() => setChecklist(prev => prev.filter((_, j) => j !== i))} className="text-neutral-400 hover:text-red-500" aria-label="Quitar">✕</button>
                                </li>
                            ))}
                        </ul>
                    )}
                    <div className="flex gap-2">
                        <input value={newCheck} onChange={e => setNewCheck(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCheck(); } }} placeholder="Añadir ítem…" className={inputFormStyle + ' flex-1'} />
                        <button type="button" onClick={addCheck} className={BUTTON_SECONDARY_SM_CLASSES}>{t('common.add') || 'Añadir'}</button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};
