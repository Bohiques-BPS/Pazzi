import React, { useEffect, useMemo, useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { projectMeetingsService, googleCalendarLink, type ProjectMeeting, type MeetingTaskSuggestion } from '../../services/projectMeetings';
import { googleService, type GoogleStatus } from '../../services/google';
import { tasksService } from '../../services/tasks';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES, INPUT_SM_CLASSES } from '../../constants';
import { LoadingSkeleton } from '../ui/LoadingSkeleton';
import { EmptyState } from '../ui/EmptyState';
import { Modal } from '../Modal';
import { extractDocxText, isDocx } from '../../utils/docx';
import { DeleteIcon, CalendarDaysIcon, PlusIcon, ClipboardDocumentListIcon } from '../icons';

interface Props { projectId: string; }

const todayISO = () => new Date().toISOString().split('T')[0];

// Fila editable de tarea sugerida por la IA (el empleado decide si la acepta).
interface SuggestionRow {
    accepted: boolean;
    title: string;
    description: string;
    assigneeId: string;
    dueDate: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    dueHint?: string;
}

export const ProjectMeetingsTab: React.FC<Props> = ({ projectId }) => {
    const { employees, getProjectById, getClientById } = useData();
    const project = getProjectById?.(projectId);
    const client = project?.clientId ? getClientById(project.clientId) : null;

    const [items, setItems] = useState<ProjectMeeting[]>([]);
    const [loading, setLoading] = useState(false);
    const [gstatus, setGstatus] = useState<GoogleStatus | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form
    const [title, setTitle] = useState('');
    const [date, setDate] = useState(todayISO());
    const [startTime, setStartTime] = useState('09:00');
    const [durationHours, setDurationHours] = useState('1');
    const [employeeIds, setEmployeeIds] = useState<string[]>([]);
    const [inviteClient, setInviteClient] = useState(false);
    const [meetLink, setMeetLink] = useState('');
    const [notes, setNotes] = useState('');

    const activeEmployees = useMemo(() => employees.filter(e => !!e), [employees]);

    // Revisión de transcripción → tareas sugeridas
    const [reviewFor, setReviewFor] = useState<ProjectMeeting | null>(null);
    const [transcript, setTranscript] = useState('');
    const [analyzing, setAnalyzing] = useState(false);
    const [analyzed, setAnalyzed] = useState(false);
    const [rows, setRows] = useState<SuggestionRow[]>([]);
    const [creating, setCreating] = useState(false);

    const openReview = (m: ProjectMeeting) => { setReviewFor(m); setTranscript(m.transcript || ''); setRows([]); setAnalyzed(false); };
    const closeReview = () => { setReviewFor(null); setTranscript(''); setRows([]); setAnalyzed(false); };

    // Cargar la transcripción desde un archivo (.txt/.vtt/.srt/.md/.docx).
    const onTranscriptFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { toast.error('El archivo es muy grande (máx. 5 MB).'); return; }
        try {
            const text = isDocx(file) ? await extractDocxText(file) : await file.text();
            if (!text.trim()) { toast.error('El documento no contiene texto legible.'); return; }
            setTranscript(text); setRows([]); setAnalyzed(false);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'No se pudo leer el archivo.');
        }
    };

    // Empareja el nombre mencionado en la llamada con un empleado (para sugerir responsable).
    const matchEmp = (hint?: string): string => {
        if (!hint) return '';
        const h = hint.toLowerCase().trim();
        const e = employees.find(x => {
            const full = `${x.name} ${x.lastName || ''}`.toLowerCase().trim();
            return full.includes(h) || h.includes((x.name || '').toLowerCase()) || (!!x.name && h.includes(x.name.toLowerCase()));
        });
        return e?.id || '';
    };

    const analyze = async () => {
        if (!reviewFor) return;
        if (transcript.trim().length < 20) { toast.error('Pega la transcripción de la llamada.'); return; }
        setAnalyzing(true);
        try {
            const { suggestions } = await projectMeetingsService.extractTasks(reviewFor.id, transcript.trim());
            setRows((suggestions || []).map((s: MeetingTaskSuggestion) => ({
                accepted: true,
                title: s.title,
                description: s.description || '',
                assigneeId: matchEmp(s.assigneeHint),
                dueDate: '',
                priority: s.priority,
                dueHint: s.dueDateHint,
            })));
            setAnalyzed(true);
            setItems(list => list.map(x => x.id === reviewFor.id ? { ...x, transcript: transcript.trim() } : x));
            if (!suggestions || suggestions.length === 0) toast.info('No se detectaron tareas claras en la transcripción.');
        } catch (err) { toast.error(err instanceof ApiError ? err.message : 'No se pudo analizar la transcripción.'); }
        finally { setAnalyzing(false); }
    };

    const patchRow = (i: number, patch: Partial<SuggestionRow>) => setRows(rs => rs.map((r, idx) => idx === i ? { ...r, ...patch } : r));

    const createSelected = async () => {
        if (!reviewFor) return;
        const chosen = rows.filter(r => r.accepted && r.title.trim());
        if (chosen.length === 0) { toast.error('Selecciona al menos una tarea.'); return; }
        setCreating(true);
        try {
            for (const r of chosen) {
                await tasksService.create({
                    projectId: reviewFor.projectId,
                    title: r.title.trim(),
                    description: r.description.trim() || undefined,
                    status: 'Tareas por Realizar',
                    assignedEmployeeIds: r.assigneeId ? [r.assigneeId] : [],
                    dueDate: r.dueDate || null,
                    priority: r.priority || null,
                });
            }
            toast.success(`${chosen.length} tarea(s) creada(s) en el proyecto.`);
            closeReview();
        } catch (err) { toast.error(err instanceof ApiError ? err.message : 'No se pudieron crear las tareas.'); }
        finally { setCreating(false); }
    };

    const load = async () => {
        setLoading(true);
        try { setItems(await projectMeetingsService.list(projectId)); }
        catch (err) { toast.error(err instanceof ApiError ? err.message : 'No se pudieron cargar las reuniones.'); }
        finally { setLoading(false); }
    };
    useEffect(() => { load(); /* eslint-disable-next-line */ }, [projectId]);
    useEffect(() => { googleService.status().then(setGstatus).catch(() => setGstatus(null)); }, []);

    const connectGoogle = async () => {
        try { const { url } = await googleService.connectUrl(); window.location.href = url; }
        catch (err) { toast.error(err instanceof ApiError ? err.message : 'No se pudo iniciar la conexión con Google.'); }
    };
    const disconnectGoogle = async () => {
        try { await googleService.disconnect(); setGstatus(s => s ? { ...s, connected: false, email: null } : s); toast.success('Google desconectado.'); }
        catch (err) { toast.error(err instanceof ApiError ? err.message : 'No se pudo desconectar.'); }
    };

    const resetForm = () => {
        setTitle(''); setDate(todayISO()); setStartTime('09:00'); setDurationHours('1');
        setEmployeeIds([]); setInviteClient(false); setMeetLink(''); setNotes('');
    };

    const toggleEmp = (id: string) => setEmployeeIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

    const empName = (id: string) => { const e = employees.find(x => x.id === id); return e ? `${e.name} ${e.lastName || ''}`.trim() : id; };

    const gcalFor = (m: { title: string; date: string; startTime: string; durationHours: number; employeeIds: string[]; inviteClient: boolean; notes?: string | null; meetLink?: string | null; }) => {
        const guests: string[] = [];
        m.employeeIds.forEach(id => { const e = employees.find(x => x.id === id); if (e?.email) guests.push(e.email); });
        if (m.inviteClient && client?.email) guests.push(client.email);
        const details = [m.notes || '', m.meetLink ? `Google Meet: ${m.meetLink}` : ''].filter(Boolean).join('\n');
        return googleCalendarLink({ title: m.title, date: m.date, startTime: m.startTime, durationHours: m.durationHours, details, guests });
    };

    const create = async () => {
        if (!title.trim()) return toast.error('Escribe un título para la reunión.');
        const dur = parseFloat(durationHours.replace(',', '.'));
        setSaving(true);
        try {
            const created = await projectMeetingsService.create({
                projectId, title: title.trim(), date, startTime,
                durationHours: dur > 0 ? dur : 1, employeeIds, inviteClient,
                meetLink: meetLink.trim() || null, notes: notes.trim() || null,
            });
            setItems(prev => [created, ...prev]);
            toast.success('Reunión creada.');
            // Abrir el link de Google Calendar para que la guarde (y Google agregue el Meet).
            window.open(gcalFor(created), '_blank', 'noopener');
            resetForm(); setShowForm(false);
        } catch (err) { toast.error(err instanceof ApiError ? err.message : 'No se pudo crear la reunión.'); }
        finally { setSaving(false); }
    };

    const remove = async (m: ProjectMeeting) => {
        const prev = items;
        setItems(list => list.filter(x => x.id !== m.id));
        try { await projectMeetingsService.delete(m.id); toast.success('Reunión eliminada.'); }
        catch (err) { setItems(prev); toast.error(err instanceof ApiError ? err.message : 'No se pudo eliminar.'); }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">Seguimiento — Reuniones</h2>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Agenda reuniones y añádelas a Google Calendar (con Google Meet).</p>
                </div>
                <button onClick={() => setShowForm(s => !s)} className={`${BUTTON_PRIMARY_SM_CLASSES} flex items-center gap-1`}>
                    <PlusIcon className="w-4 h-4" /> {showForm ? 'Cerrar' : 'Nueva reunión'}
                </button>
            </div>

            {/* Conexión con Google Calendar (Meet + invitaciones automáticas). */}
            {gstatus?.configured && (
                <div className={`flex items-center gap-3 flex-wrap rounded-lg border p-3 mb-4 text-sm ${gstatus.connected ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20' : 'border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50'}`}>
                    {gstatus.connected ? (
                        <>
                            <span className="text-green-700 dark:text-green-300 font-medium">✓ Google Calendar conectado{gstatus.email ? ` — ${gstatus.email}` : ''}</span>
                            <span className="text-neutral-500">Las reuniones nuevas crearán el evento con Meet e invitarán a los participantes automáticamente.</span>
                            <button onClick={disconnectGoogle} className="ml-auto text-red-600 hover:underline">Desconectar</button>
                        </>
                    ) : (
                        <>
                            <span className="text-neutral-600 dark:text-neutral-300">Conecta Google Calendar para generar el <strong>Meet</strong> y enviar invitaciones automáticamente.</span>
                            <button onClick={connectGoogle} className={`${BUTTON_SECONDARY_SM_CLASSES} ml-auto`}>Conectar Google Calendar</button>
                        </>
                    )}
                </div>
            )}

            {showForm && (
                <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 mb-4 space-y-3">
                    <div>
                        <label className="block text-xs text-neutral-500 mb-1">Título</label>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej. Reunión de seguimiento" className={`${INPUT_SM_CLASSES} w-full`} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div><label className="block text-xs text-neutral-500 mb-1">Fecha</label><input type="date" value={date} onChange={e => setDate(e.target.value)} className={`${INPUT_SM_CLASSES} w-full`} /></div>
                        <div><label className="block text-xs text-neutral-500 mb-1">Hora</label><input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className={`${INPUT_SM_CLASSES} w-full`} /></div>
                        <div><label className="block text-xs text-neutral-500 mb-1">Duración (horas)</label><input type="number" step="0.5" min="0.5" value={durationHours} onChange={e => setDurationHours(e.target.value)} className={`${INPUT_SM_CLASSES} w-full`} /></div>
                    </div>
                    <div>
                        <label className="block text-xs text-neutral-500 mb-1">Empleados en la reunión</label>
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
                        <label className="block text-xs text-neutral-500 mb-1">Link de Google Meet (opcional)</label>
                        <input type="text" value={meetLink} onChange={e => setMeetLink(e.target.value)} placeholder="https://meet.google.com/xxx-xxxx-xxx" className={`${INPUT_SM_CLASSES} w-full`} />
                        <p className="text-xs text-neutral-400 mt-1">Déjalo vacío y, al guardar el evento en Google Calendar, activa "Añadir Google Meet".</p>
                    </div>
                    <div>
                        <label className="block text-xs text-neutral-500 mb-1">Notas</label>
                        <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Agenda / temas a tratar" className={`${INPUT_SM_CLASSES} w-full`} />
                    </div>
                    <div className="flex justify-end gap-2">
                        <button onClick={() => { resetForm(); setShowForm(false); }} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button>
                        <button onClick={create} disabled={saving} className={`${BUTTON_PRIMARY_SM_CLASSES} disabled:opacity-50`}>{saving ? 'Creando...' : 'Crear y añadir a Google Calendar'}</button>
                    </div>
                </div>
            )}

            {loading ? <LoadingSkeleton variant="list" rows={3} /> : items.length === 0 ? (
                <EmptyState title="Sin reuniones" description="Crea la primera reunión de seguimiento para este proyecto." />
            ) : (
                <div className="space-y-2">
                    {items.map(m => (
                        <div key={m.id} className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-3">
                            <div className="flex items-center gap-3 flex-wrap">
                                <span className="font-semibold text-neutral-800 dark:text-neutral-100">{m.title}</span>
                                <span className="text-sm text-neutral-500">· {new Date(m.date).toLocaleDateString()} {m.startTime} · {m.durationHours}h</span>
                                {m.inviteClient && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">Cliente invitado</span>}
                                <div className="ml-auto flex items-center gap-3">
                                    <a href={gcalFor(m)} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1"><CalendarDaysIcon className="w-4 h-4" /> Google Calendar</a>
                                    {m.meetLink && <a href={m.meetLink} target="_blank" rel="noopener noreferrer" className="text-xs text-green-600 hover:underline">Meet</a>}
                                    <button onClick={() => openReview(m)} className="text-xs text-primary hover:underline inline-flex items-center gap-1" title="Revisar transcripción y sacar tareas">
                                        <ClipboardDocumentListIcon className="w-4 h-4" /> Revisar documento{m.transcript ? ' ✓' : ''}
                                    </button>
                                    <button onClick={() => remove(m)} className="text-red-500 hover:text-red-700 p-1" title="Eliminar"><DeleteIcon className="w-4 h-4" /></button>
                                </div>
                            </div>
                            {m.employeeIds.length > 0 && <p className="text-xs text-neutral-500 mt-1">Participantes: {m.employeeIds.map(empName).join(', ')}</p>}
                            {m.notes && <p className="text-xs text-neutral-500 mt-0.5 italic">{m.notes}</p>}
                        </div>
                    ))}
                </div>
            )}

            {/* Revisar documento: transcripción → tareas sugeridas (el empleado decide) */}
            <Modal isOpen={!!reviewFor} onClose={closeReview} title={reviewFor ? `Revisar documento — ${reviewFor.title}` : ''} size="lg">
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs text-neutral-500 mb-1">Transcripción de la llamada</label>
                        <textarea
                            value={transcript}
                            onChange={e => setTranscript(e.target.value)}
                            rows={7}
                            placeholder="Pega aquí la transcripción de la reunión (de Google Meet, Zoom, etc.) o sube un archivo. La IA sugerirá posibles tareas; tú decides cuáles crear."
                            className={`${INPUT_SM_CLASSES} w-full font-mono text-xs`}
                        />
                        <div className="flex justify-between items-center mt-2 gap-2 flex-wrap">
                            <div className="flex items-center gap-3">
                                <label className={`${BUTTON_SECONDARY_SM_CLASSES} cursor-pointer`}>
                                    Subir archivo
                                    <input type="file" accept=".txt,.vtt,.srt,.md,.docx,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={onTranscriptFile} className="hidden" />
                                </label>
                                <span className="text-xs text-neutral-400">{transcript.trim().length} caracteres</span>
                            </div>
                            <button onClick={analyze} disabled={analyzing || transcript.trim().length < 20} className={`${BUTTON_PRIMARY_SM_CLASSES} disabled:opacity-50`}>
                                {analyzing ? 'Analizando…' : (analyzed ? 'Volver a analizar' : 'Analizar y sugerir tareas')}
                            </button>
                        </div>
                    </div>

                    {analyzed && (
                        rows.length === 0 ? (
                            <p className="text-sm text-neutral-500 text-center py-4">No se detectaron tareas claras. Puedes editar la transcripción y volver a analizar.</p>
                        ) : (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Posibles tareas ({rows.filter(r => r.accepted).length}/{rows.length} seleccionadas)</p>
                                    <div className="flex gap-2 text-xs">
                                        <button onClick={() => setRows(rs => rs.map(r => ({ ...r, accepted: true })))} className="text-primary hover:underline">Todas</button>
                                        <button onClick={() => setRows(rs => rs.map(r => ({ ...r, accepted: false })))} className="text-neutral-400 hover:underline">Ninguna</button>
                                    </div>
                                </div>
                                <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
                                    {rows.map((r, i) => (
                                        <div key={i} className={`border rounded-lg p-3 ${r.accepted ? 'border-primary/40 bg-primary/5' : 'border-neutral-200 dark:border-neutral-700 opacity-60'}`}>
                                            <div className="flex items-start gap-2">
                                                <input type="checkbox" checked={r.accepted} onChange={e => patchRow(i, { accepted: e.target.checked })} className="mt-2 h-4 w-4 flex-shrink-0" />
                                                <div className="flex-1 space-y-2">
                                                    <input type="text" value={r.title} onChange={e => patchRow(i, { title: e.target.value })} className={`${INPUT_SM_CLASSES} w-full font-medium`} placeholder="Título de la tarea" />
                                                    {r.description && <p className="text-xs text-neutral-500 dark:text-neutral-400">{r.description}</p>}
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                        <div>
                                                            <label className="block text-[11px] text-neutral-400 mb-0.5">Responsable</label>
                                                            <select value={r.assigneeId} onChange={e => patchRow(i, { assigneeId: e.target.value })} className={`${INPUT_SM_CLASSES} w-full`}>
                                                                <option value="">Sin asignar</option>
                                                                {activeEmployees.map(e => <option key={e.id} value={e.id}>{e.name} {e.lastName}</option>)}
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="block text-[11px] text-neutral-400 mb-0.5">Fecha límite {r.dueHint ? `(mencionado: ${r.dueHint})` : ''}</label>
                                                            <input type="date" value={r.dueDate} onChange={e => patchRow(i, { dueDate: e.target.value })} className={`${INPUT_SM_CLASSES} w-full`} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-700">
                                    <button onClick={closeReview} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button>
                                    <button onClick={createSelected} disabled={creating || rows.filter(r => r.accepted && r.title.trim()).length === 0} className={`${BUTTON_PRIMARY_SM_CLASSES} disabled:opacity-50`}>
                                        {creating ? 'Creando…' : `Crear ${rows.filter(r => r.accepted && r.title.trim()).length} tarea(s)`}
                                    </button>
                                </div>
                            </div>
                        )
                    )}
                </div>
            </Modal>
        </div>
    );
};
