import React, { useEffect, useState } from 'react';
import { Modal } from '../Modal';
import { useData } from '../../contexts/DataContext';
import { projectsService } from '../../services/projects';
import { projectMeetingsService } from '../../services/projectMeetings';
import { tasksService } from '../../services/tasks';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';
import { extractDocxText, isDocx } from '../../utils/docx';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES, INPUT_SM_CLASSES } from '../../constants';

interface SuggestionRow {
    accepted: boolean;
    title: string;
    description: string;
    assigneeId: string;
    dueDate: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    dueHint?: string;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    /** Si se pasa, analiza contra la reunión (y guarda la transcripción en ella). */
    meetingId?: string;
    initialTranscript?: string;
    /** Sección a asignar a las tareas creadas (opcional). */
    section?: string;
    onCreated?: (count: number) => void;
    title?: string;
}

/** Analiza un documento/transcripción con IA y deja que el empleado elija qué tareas crear. */
export const ExtractTasksModal: React.FC<Props> = ({ isOpen, onClose, projectId, meetingId, initialTranscript, section, onCreated, title }) => {
    const { employees } = useData();
    const [transcript, setTranscript] = useState('');
    const [analyzing, setAnalyzing] = useState(false);
    const [analyzed, setAnalyzed] = useState(false);
    const [rows, setRows] = useState<SuggestionRow[]>([]);
    const [creating, setCreating] = useState(false);
    // Controla si se muestra el bloque de entrada (textarea + subir archivo). Se colapsa al obtener
    // tareas para dar espacio a la lista; el botón "Editar texto" lo vuelve a mostrar.
    const [showInput, setShowInput] = useState(true);

    useEffect(() => {
        if (isOpen) { setTranscript(initialTranscript || ''); setRows([]); setAnalyzed(false); setShowInput(true); }
    }, [isOpen, initialTranscript]);

    const matchEmp = (hint?: string): string => {
        if (!hint) return '';
        const h = hint.toLowerCase().trim();
        const e = employees.find(x => {
            const full = `${x.name} ${x.lastName || ''}`.toLowerCase().trim();
            return full.includes(h) || h.includes((x.name || '').toLowerCase()) || (!!x.name && h.includes(x.name.toLowerCase()));
        });
        return e?.id || '';
    };

    const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { toast.error('El archivo es muy grande (máx. 5 MB).'); return; }
        try {
            let text: string;
            if (isDocx(file)) {
                text = await extractDocxText(file);
                if (!text.trim()) { toast.error('El documento no contiene texto legible.'); return; }
            } else {
                text = await file.text();
            }
            setTranscript(text); setRows([]); setAnalyzed(false);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'No se pudo leer el archivo.');
        }
    };

    const analyze = async () => {
        if (transcript.trim().length < 20) { toast.error('Pega el documento o transcripción.'); return; }
        setAnalyzing(true);
        try {
            const { suggestions } = meetingId
                ? await projectMeetingsService.extractTasks(meetingId, transcript.trim())
                : await projectsService.extractTasks(projectId, transcript.trim());
            setRows((suggestions || []).map(s => ({
                accepted: true,
                title: s.title,
                description: s.description || '',
                assigneeId: matchEmp(s.assigneeHint),
                dueDate: '',
                priority: s.priority,
                dueHint: s.dueDateHint,
            })));
            setAnalyzed(true);
            // Si hubo tareas, colapsamos el textarea para dar espacio a la lista.
            if (suggestions && suggestions.length > 0) { setShowInput(false); }
            else { setShowInput(true); toast.info('No se detectaron tareas claras en el texto.'); }
        } catch (err) { toast.error(err instanceof ApiError ? err.message : 'No se pudo analizar el documento.'); }
        finally { setAnalyzing(false); }
    };

    const patchRow = (i: number, patch: Partial<SuggestionRow>) => setRows(rs => rs.map((r, idx) => idx === i ? { ...r, ...patch } : r));

    const createSelected = async () => {
        const chosen = rows.filter(r => r.accepted && r.title.trim());
        if (chosen.length === 0) { toast.error('Selecciona al menos una tarea.'); return; }
        setCreating(true);
        try {
            for (const r of chosen) {
                await tasksService.create({
                    projectId,
                    title: r.title.trim(),
                    description: r.description.trim() || undefined,
                    status: 'Tareas por Realizar',
                    section: section || null,
                    assignedEmployeeIds: r.assigneeId ? [r.assigneeId] : [],
                    dueDate: r.dueDate || null,
                    priority: r.priority || null,
                });
            }
            toast.success(`${chosen.length} tarea(s) creada(s).`);
            onCreated?.(chosen.length);
            onClose();
        } catch (err) { toast.error(err instanceof ApiError ? err.message : 'No se pudieron crear las tareas.'); }
        finally { setCreating(false); }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title || 'Analizar documento → tareas'} size="lg">
            <div className="space-y-4">
                {showInput ? (
                    <div>
                        <label className="block text-xs text-neutral-500 mb-1">Documento / transcripción</label>
                        <textarea
                            value={transcript}
                            onChange={e => setTranscript(e.target.value)}
                            rows={14}
                            placeholder="Pega aquí el documento o la transcripción (de una llamada, notas, requerimientos…). La IA sugerirá posibles tareas; tú decides cuáles crear."
                            className={`${INPUT_SM_CLASSES} w-full font-mono text-xs min-h-[340px] resize-y`}
                        />
                        <div className="flex justify-between items-center mt-2 gap-2 flex-wrap">
                            <div className="flex items-center gap-3">
                                <label className={`${BUTTON_SECONDARY_SM_CLASSES} cursor-pointer`}>
                                    Subir archivo
                                    <input type="file" accept=".txt,.vtt,.srt,.md,.docx,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={onFile} className="hidden" />
                                </label>
                                <span className="text-xs text-neutral-400">{transcript.trim().length} caracteres</span>
                                {analyzed && rows.length > 0 && (
                                    <button onClick={() => setShowInput(false)} className="text-xs text-neutral-500 hover:underline">Ocultar</button>
                                )}
                            </div>
                            <button onClick={analyze} disabled={analyzing || transcript.trim().length < 20} className={`${BUTTON_PRIMARY_SM_CLASSES} disabled:opacity-50`}>
                                {analyzing ? 'Analizando…' : (analyzed ? 'Volver a analizar' : 'Analizar y sugerir tareas')}
                            </button>
                        </div>
                    </div>
                ) : (
                    // Barra compacta cuando el textarea está colapsado (tras obtener tareas).
                    <div className="flex items-center justify-between gap-2 rounded-md bg-neutral-50 dark:bg-neutral-700/40 border border-neutral-200 dark:border-neutral-700 px-3 py-2">
                        <span className="text-xs text-neutral-500 dark:text-neutral-400">Documento analizado · {transcript.trim().length} caracteres</span>
                        <button onClick={() => setShowInput(true)} className="text-xs font-medium text-primary hover:underline flex items-center gap-1">← Editar texto / volver a analizar</button>
                    </div>
                )}

                {analyzed && (
                    rows.length === 0 ? (
                        <p className="text-sm text-neutral-500 text-center py-4">No se detectaron tareas claras. Edita el texto y vuelve a analizar.</p>
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
                                                <div>
                                                    <label className="block text-[11px] text-neutral-400 mb-0.5">Descripción</label>
                                                    <textarea value={r.description} onChange={e => patchRow(i, { description: e.target.value })} rows={3} placeholder="Descripción de la tarea" className={`${INPUT_SM_CLASSES} w-full text-xs resize-y min-h-[64px]`} />
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    <div>
                                                        <label className="block text-[11px] text-neutral-400 mb-0.5">Responsable</label>
                                                        <select value={r.assigneeId} onChange={e => patchRow(i, { assigneeId: e.target.value })} className={`${INPUT_SM_CLASSES} w-full`}>
                                                            <option value="">Sin asignar</option>
                                                            {employees.filter(Boolean).map(e => <option key={e.id} value={e.id}>{e.name} {e.lastName}</option>)}
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
                                <button onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button>
                                <button onClick={createSelected} disabled={creating || rows.filter(r => r.accepted && r.title.trim()).length === 0} className={`${BUTTON_PRIMARY_SM_CLASSES} disabled:opacity-50`}>
                                    {creating ? 'Creando…' : `Crear ${rows.filter(r => r.accepted && r.title.trim()).length} tarea(s)`}
                                </button>
                            </div>
                        </div>
                    )
                )}
            </div>
        </Modal>
    );
};
