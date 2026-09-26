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
        const chosen = actions.filter((_, i) => selected[i]);
        if (!chosen.length) { toast.error('Selecciona al menos una acción.'); return; }
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
                    <div className="flex items-end gap-2">
                        <textarea
                            value={text}
                            onChange={e => setText(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); interpret(); } }}
                            placeholder='Ej: "crea la tarea Llamar al cliente para el viernes", "mueve Diseño de menú a Hecho", "elimina la tarea de prueba"'
                            rows={2}
                            className={`${inputFormStyle} flex-1 resize-none`}
                            autoFocus
                        />
                        <MicButton value={text} onChange={setText} className="!rounded-lg" title="Dictar la orden" />
                    </div>
                    {phase === 'input' && (
                        <div className="flex justify-end">
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
                                    <label key={i} className="flex items-start gap-2 p-2 rounded-md bg-neutral-50 dark:bg-neutral-900/40 cursor-pointer">
                                        <input type="checkbox" checked={selected[i]} onChange={e => setSelected(s => s.map((v, idx) => idx === i ? e.target.checked : v))} className="mt-0.5 h-4 w-4" />
                                        <span className={`text-sm ${typeStyle[a.type] || ''}`}>
                                            <span className="mr-1">{typeIcon[a.type] || '•'}</span>{a.label}
                                        </span>
                                    </label>
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
