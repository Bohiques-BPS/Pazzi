import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from '../Modal';
import { useData } from '../../contexts/DataContext';
import { projectMeetingsService, googleCalendarLink } from '../../services/projectMeetings';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES, INPUT_SM_CLASSES } from '../../constants';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    /** Fecha inicial (yyyy-MM-dd). */
    initialDate?: string;
    defaultProjectId?: string;
    onCreated?: () => void;
}

const todayISO = () => new Date().toISOString().split('T')[0];

/** Agenda una reunión de seguimiento para un proyecto (con selector de proyecto). */
export const ScheduleMeetingModal: React.FC<Props> = ({ isOpen, onClose, initialDate, defaultProjectId, onCreated }) => {
    const { projects, employees, getClientById } = useData();
    const [projectId, setProjectId] = useState('');
    const [title, setTitle] = useState('');
    const [date, setDate] = useState(todayISO());
    const [startTime, setStartTime] = useState('09:00');
    const [durationHours, setDurationHours] = useState('1');
    const [employeeIds, setEmployeeIds] = useState<string[]>([]);
    const [inviteClient, setInviteClient] = useState(false);
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setProjectId(defaultProjectId || projects[0]?.id || '');
            setTitle(''); setDate(initialDate || todayISO()); setStartTime('09:00');
            setDurationHours('1'); setEmployeeIds([]); setInviteClient(false); setNotes('');
        }
    }, [isOpen, initialDate, defaultProjectId]); // eslint-disable-line

    const project = useMemo(() => projects.find(p => p.id === projectId), [projects, projectId]);
    const client = project?.clientId ? getClientById(project.clientId) : null;
    const activeEmployees = useMemo(() => employees.filter(e => !!e), [employees]);
    const toggleEmp = (id: string) => setEmployeeIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

    const create = async () => {
        if (!projectId) { toast.error('Elige un proyecto.'); return; }
        if (!title.trim()) { toast.error('Escribe un título para la reunión.'); return; }
        const dur = parseFloat(durationHours.replace(',', '.'));
        setSaving(true);
        try {
            const created = await projectMeetingsService.create({
                projectId, title: title.trim(), date, startTime,
                durationHours: dur > 0 ? dur : 1, employeeIds, inviteClient, notes: notes.trim() || null,
            });
            toast.success('Seguimiento agendado.');
            // Abrir Google Calendar para guardarlo (Google añade el Meet).
            const guests: string[] = [];
            employeeIds.forEach(id => { const e = employees.find(x => x.id === id); if (e?.email) guests.push(e.email); });
            if (inviteClient && client?.email) guests.push(client.email);
            const url = googleCalendarLink({ title: created.title, date, startTime, durationHours: dur > 0 ? dur : 1, details: notes, guests });
            window.open(url, '_blank', 'noopener');
            onCreated?.();
            onClose();
        } catch (err) { toast.error(err instanceof ApiError ? err.message : 'No se pudo agendar el seguimiento.'); }
        finally { setSaving(false); }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Programar seguimiento" size="lg">
            <div className="space-y-3">
                <div>
                    <label className="block text-xs text-neutral-500 mb-1">Proyecto</label>
                    <select value={projectId} onChange={e => setProjectId(e.target.value)} className={`${INPUT_SM_CLASSES} w-full`}>
                        <option value="">Selecciona un proyecto…</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs text-neutral-500 mb-1">Título</label>
                    <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej. Llamada de seguimiento" className={`${INPUT_SM_CLASSES} w-full`} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div><label className="block text-xs text-neutral-500 mb-1">Fecha</label><input type="date" value={date} onChange={e => setDate(e.target.value)} className={`${INPUT_SM_CLASSES} w-full`} /></div>
                    <div><label className="block text-xs text-neutral-500 mb-1">Hora</label><input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className={`${INPUT_SM_CLASSES} w-full`} /></div>
                    <div><label className="block text-xs text-neutral-500 mb-1">Duración (horas)</label><input type="number" step="0.5" min="0.5" value={durationHours} onChange={e => setDurationHours(e.target.value)} className={`${INPUT_SM_CLASSES} w-full`} /></div>
                </div>
                <div>
                    <label className="block text-xs text-neutral-500 mb-1">Participantes</label>
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto border border-neutral-200 dark:border-neutral-700 rounded-md p-2">
                        {activeEmployees.length === 0 ? <span className="text-sm text-neutral-400">No hay empleados.</span> : activeEmployees.map(e => (
                            <label key={e.id} className={`flex items-center gap-1.5 text-sm px-2 py-1 rounded-md cursor-pointer border ${employeeIds.includes(e.id) ? 'border-primary bg-primary/10 text-primary' : 'border-neutral-300 dark:border-neutral-600'}`}>
                                <input type="checkbox" checked={employeeIds.includes(e.id)} onChange={() => toggleEmp(e.id)} className="h-3.5 w-3.5" />
                                {e.name} {e.lastName}
                            </label>
                        ))}
                    </div>
                </div>
                <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-200">
                    <input type="checkbox" checked={inviteClient} onChange={e => setInviteClient(e.target.checked)} className="h-4 w-4" />
                    Invitar al cliente {client?.email ? `(${client.email})` : '(sin correo en su ficha)'}
                </label>
                <div>
                    <label className="block text-xs text-neutral-500 mb-1">Notas</label>
                    <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Agenda / temas a tratar" className={`${INPUT_SM_CLASSES} w-full`} />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                    <button onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button>
                    <button onClick={create} disabled={saving} className={`${BUTTON_PRIMARY_SM_CLASSES} disabled:opacity-50`}>{saving ? 'Agendando…' : 'Agendar y añadir a Google Calendar'}</button>
                </div>
            </div>
        </Modal>
    );
};
