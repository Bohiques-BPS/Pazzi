import React, { useState } from 'react';
import { Modal } from '../Modal';
import { MicButton } from '../ui/MicButton';
import { assistantService, type PmProposedAction } from '../../services/assistant';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';
import { inputFormStyle, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';

interface Props {
    /** Si se pasa, el asistente actúa acotado a ese proyecto; si no, es global (todos). */
    projectId?: string;
    /** Se llama tras aplicar acciones, para refrescar la vista. */
    onApplied?: () => void;
}

const typeStyle: Record<string, string> = {
    create_task: 'text-green-700 dark:text-green-400',
    move_task: 'text-blue-700 dark:text-blue-400',
    delete_task: 'text-red-700 dark:text-red-400',
};
const typeIcon: Record<string, string> = { create_task: '➕', move_task: '↔️', delete_task: '🗑️' };

export const AiTaskAssistant: React.FC<Props> = ({ projectId, onApplied }) => {
    const [open, setOpen] = useState(false);
    const [text, setText] = useState('');
    const [busy, setBusy] = useState(false);
    const [reply, setReply] = useState('');
    const [actions, setActions] = useState<PmProposedAction[]>([]);
    const [selected, setSelected] = useState<boolean[]>([]);
    const [phase, setPhase] = useState<'input' | 'proposed'>('input');

    const reset = () => { setText(''); setReply(''); setActions([]); setSelected([]); setPhase('input'); setBusy(false); };
    const close = () => { if (!busy) { setOpen(false); reset(); } };

    const interpret = async () => {
        if (busy || !text.trim()) return;
        setBusy(true);
        try {
            const r = await assistantService.interpret(text.trim(), projectId);
            setReply(r.reply || '');
            setActions(r.actions || []);
            setSelected((r.actions || []).map(() => true));
            setPhase((r.actions || []).length ? 'proposed' : 'input');
            if (!(r.actions || []).length) toast.info(r.reply || 'No entendí una acción concreta. Reformula la orden.');
        } catch (err) {
            toast.error(err instanceof ApiError ? err.message : 'No se pudo interpretar la orden.');
        } finally {
            setBusy(false);
        }
    };

    const runExecute = async () => {
        const chosen = actions
            .filter((_, i) => selected[i])
            .filter(a => a.type !== 'create_task' || (a.title || '').trim())
            .map(a => a.type === 'create_task' ? { ...a, title: (a.title || '').trim() } : a);
        if (!chosen.length) { toast.error('Selecciona al menos una acción (y ponle título a las tareas nuevas).'); return; }
        setBusy(true);
        try {
            const r = await assistantService.execute(chosen);
            const okMsg = r.done ? `${r.done} acción(es) aplicada(s)` : '';
            const failMsg = r.failed ? `${r.failed} fallaron` : '';
            if (r.done) toast.success([okMsg, failMsg].filter(Boolean).join(' · '));
            else toast.error(failMsg || 'No se aplicó ninguna acción.');
            onApplied?.();
            setOpen(false); reset();
        } catch (err) {
            toast.error(err instanceof ApiError ? err.message : 'No se pudieron aplicar las acciones.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-primary text-white px-4 py-3 shadow-lg hover:bg-primary/90 active:scale-95 transition"
                title="Asistente IA de tareas"
            >
                <span className="text-lg">✨</span>
                <span className="hidden sm:inline text-sm font-semibold">Asistente IA</span>
            </button>

            <Modal isOpen={open} onClose={close} title="✨ Asistente IA de tareas" size="lg">
                <div className="space-y-4">
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        Escribe o dicta una orden y la reviso antes de aplicarla.{' '}
                        {projectId ? 'Actúa sobre este proyecto.' : 'Puedes nombrar el proyecto (ej. "crea una tarea X en Car Tech").'}
                    </p>

                    {/* Entrada */}
                    <textarea
                        value={text}
                        onChange={e => setText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); interpret(); } }}
                        placeholder='Ej: crea la tarea Llamar al cliente'
                        rows={3}
                        className={`${inputFormStyle} w-full resize-none min-h-[84px] overflow-auto`}
                        autoFocus
                    />
                    {phase === 'input' && (
                        <div className="flex items-center justify-between gap-2">
                            <MicButton value={text} onChange={setText} title="Dictar la orden" />
                            <button type="button" onClick={interpret} disabled={busy || !text.trim()} className={`${BUTTON_PRIMARY_SM_CLASSES} disabled:opacity-50`}>
                                {busy ? 'Interpretando…' : 'Interpretar'}
                            </button>
                        </div>
                    )}

                    {/* Propuesta a confirmar */}
                    {phase === 'proposed' && (
                        <div className="border-t border-neutral-200 dark:border-neutral-700 pt-3 space-y-3">
                            {reply && <p className="text-sm text-neutral-700 dark:text-neutral-200 italic">🤖 {reply}</p>}
                            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Voy a hacer esto — revisa y confirma:</p>
                            <div className="space-y-1.5 max-h-64 overflow-y-auto">
                                {actions.map((a, i) => (
                                    <div key={i} className="flex items-start gap-2 p-2 rounded-md bg-neutral-50 dark:bg-neutral-900/40">
                                        <input type="checkbox" checked={selected[i]} onChange={e => setSelected(s => s.map((v, idx) => idx === i ? e.target.checked : v))} className="mt-1 h-4 w-4 flex-shrink-0" />
                                        {a.type === 'create_task' ? (
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1 text-xs text-green-700 dark:text-green-400 mb-1">
                                                    <span>➕ Crear tarea en {a.projectName} · {a.status}</span>
                                                </div>
                                                <input
                                                    type="text"
                                                    value={a.title || ''}
                                                    onChange={e => setActions(prev => prev.map((x, idx) => idx === i ? { ...x, title: e.target.value } : x))}
                                                    className={`${inputFormStyle} !py-1.5 text-sm w-full`}
                                                    placeholder="Título de la tarea"
                                                />
                                            </div>
                                        ) : (
                                            <span className={`text-sm ${typeStyle[a.type] || ''}`}>
                                                <span className="mr-1">{typeIcon[a.type] || '•'}</span>{a.label}
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-end gap-2 pt-1">
                                <button type="button" onClick={() => { setPhase('input'); setActions([]); }} disabled={busy} className={BUTTON_SECONDARY_SM_CLASSES}>Volver</button>
                                <button type="button" onClick={runExecute} disabled={busy || !selected.some(Boolean)} className={`${BUTTON_PRIMARY_SM_CLASSES} disabled:opacity-50`}>
                                    {busy ? 'Aplicando…' : 'Confirmar y aplicar'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </Modal>
        </>
    );
};
