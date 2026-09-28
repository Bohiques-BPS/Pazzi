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
    /** Hora inicial "HH:mm" (ej. clic en una franja del calendario). */
    initialTime?: string;
    defaultProjectId?: string;
    onCreated?: () => void;
}

const todayISO = () => new Date().toISOString().split('T')[0];
const hoursBetween = (s: string, e: string) => {
    const toMin = (x: string) => { const [h, m] = (x || '').split(':').map(Number); return (h || 0) * 60 + (m || 0); };
    const a = toMin(s), b = toMin(e);
    return b > a ? (b - a) / 60 : 1;
};
const openPicker = (e: React.MouseEvent<HTMLInputElement>) => { try { (e.currentTarget as any).showPicker?.(); } catch { /* no soportado */ } };

/** Agenda una reunión de seguimiento para un proyecto (con selector de proyecto). */
export const ScheduleMeetingModal: React.FC<Props> = ({ isOpen, onClose, initialDate, initialTime, defaultProjectId, onCreated }) => {
    const { projects, employees, getClientById } = useData();
    const [projectId, setProjectId] = useState('');
    const [title, setTitle] = useState('');
    const [date, setDate] = useState(todayISO());
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('10:00');
    const [employeeIds, setEmployeeIds] = useState<string[]>([]);
    const [inviteClient, setInviteClient] = useState(false);
    const [notes, setNotes] = useState('');
    const [addToGcal, setAddToGcal] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setProjectId(defaultProjectId || '');
            const st = initialTime || '09:00';
            const [h, m] = st.split(':').map(Number);
            const endMin = Math.min(23 * 60 + 59, (h || 0) * 60 + (m || 0) + 60);
            setTitle(''); setDate(initialDate || todayISO()); setStartTime(st);
            setEndTime(`${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`);
            setEmployeeIds([]); setInviteClient(false); setNotes(''); setAddToGcal(false);
        }
    }, [isOpen, initialDate, initialTime, defaultProjectId]); // eslint-disable-line

    const project = useMemo(() => projects.find(p => p.id === projectId), [projects, projectId]);
    const client = project?.clientId ? getClientById(project.clientId) : null;
    const activeEmployees = useMemo(() => employees.filter(e => !!e), [employees]);
    const toggleEmp = (id: string) => setEmployeeIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

    const create = async () => {
        if (!title.trim()) { toast.error('Escribe un título para la reunión.'); return; }
        if (hoursBetween(startTime, endTime) <= 0) { toast.error('La hora de fin debe ser después de la de inicio.'); return; }
        const dur = hoursBetween(startTime, endTime);
        setSaving(true);
        try {
            const created = await projectMeetingsService.create({
                projectId, title: title.trim(), date, startTime,
                durationHours: dur, employeeIds, inviteClient, notes: notes.trim() || null,
            });
            toast.success('Seguimiento agendado.');
            // Solo abre Google Calendar si el usuario lo pidió (no automático).
            if (addToGcal) {
                const guests: string[] = [];
                employeeIds.forEach(id => { const e = employees.find(x => x.id === id); if (e?.email) guests.push(e.email); });
                if (inviteClient && client?.email) guests.push(client.email);
                const url = googleCalendarLink({ title: created.title, date, startTime, durationHours: dur, details: notes, guests });
                window.open(url, '_blank', 'noopener');
            }
            onCreated?.();
            onClose();
        } catch (err) { toast.error(err instanceof ApiError ? err.message : 'No se pudo agendar el seguimiento.'); }
        finally { setSaving(false); }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Programar seguimiento" size="lg">
            <div className="space-y-3">
                <div>
                    <label className="block text-xs text-neutral-500 mb-1">Proyecto (opcional)</label>
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
                    <div><label className="block text-xs text-neutral-500 mb-1">Fecha</label><input type="date" value={date} onClick={openPicker} onChange={e => setDate(e.target.value)} className={`${INPUT_SM_CLASSES} w-full`} /></div>
                    <div><label className="block text-xs text-neutral-500 mb-1">Hora inicio</label><input type="time" value={startTime} onClick={openPicker} onChange={e => setStartTime(e.target.value)} className={`${INPUT_SM_CLASSES} w-full`} /></div>
                    <div><label className="block text-xs text-neutral-500 mb-1">Hora fin</label><input type="time" value={endTime} onClick={openPicker} onChange={e => setEndTime(e.target.value)} className={`${INPUT_SM_CLASSES} w-full`} /></div>
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
                <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-200">
                    <input type="checkbox" checked={addToGcal} onChange={e => setAddToGcal(e.target.checked)} className="h-4 w-4" />
                    Añadir a Google Calendar al agendar
                </label>
                <div className="flex justify-end gap-2 pt-2">
                    <button onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button>
                    <button onClick={create} disabled={saving} className={`${BUTTON_PRIMARY_SM_CLASSES} disabled:opacity-50`}>{saving ? 'Agendando…' : 'Agendar seguimiento'}</button>
                </div>
            </div>
        </Modal>
    );
};
