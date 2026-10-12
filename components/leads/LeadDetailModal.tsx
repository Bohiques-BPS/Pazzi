import React, { useMemo, useState } from 'react';
import { Modal, ConfirmationModal } from '../Modal';
import { Lead, Pipeline, LeadSource, LeadActivity, LeadNote } from '../../types';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { leadsService } from '../../services/leads';
import { uploadImage } from '../../services/upload';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';
import { inputFormStyle, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import { DeleteIcon, PaperAirplaneIcon } from '../icons';

interface Props {
  lead: Lead;                       // lead "resumen" (de la lista); se recarga el detalle completo
  pipelines: Pipeline[];
  sources: LeadSource[];
  onClose: () => void;
  onChanged: (lead: Lead) => void;  // para refrescar la tarjeta en la lista/board
  onDeleted: (id: string) => void;
  onConverted?: (clientId: string) => void;
}

const ACTIVITY_META: Record<string, { label: string; icon: string }> = {
  call: { label: 'Llamada', icon: '📞' },
  email: { label: 'Correo', icon: '✉️' },
  whatsapp: { label: 'WhatsApp', icon: '💬' },
  meeting: { label: 'Reunión', icon: '📅' },
  note: { label: 'Nota', icon: '📝' },
  task: { label: 'Tarea', icon: '✅' },
};

const money = (n?: number | null, c?: string | null) => n != null ? `${c || 'USD'} ${Number(n).toFixed(2)}` : '—';

export const LeadDetailModal: React.FC<Props> = ({ lead: initialLead, pipelines, sources, onClose, onChanged, onDeleted, onConverted }) => {
  const { getAllEmployees } = useData();
  const { currentUser } = useAuth();
  const { can } = usePermissions();

  const [lead, setLead] = useState<Lead>(initialLead);
  const [activities, setActivities] = useState<LeadActivity[]>(initialLead.activities || []);
  const [leadNotes, setLeadNotes] = useState<LeadNote[]>(initialLead.leadNotes || []);
  const [loadingDetail, setLoadingDetail] = useState(true);

  // Form de datos
  const [form, setForm] = useState({
    name: initialLead.name || '', lastName: initialLead.lastName || '', companyName: initialLead.companyName || '',
    email: initialLead.email || '', phone: initialLead.phone || '', whatsapp: initialLead.whatsapp || '',
    value: initialLead.value != null ? String(initialLead.value) : '', sourceId: initialLead.sourceId || '',
    notes: initialLead.notes || '', nextActionAt: initialLead.nextActionAt ? initialLead.nextActionAt.slice(0, 16) : '',
  });
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [lostReason, setLostReason] = useState('');
  const [askLostFor, setAskLostFor] = useState<string | null>(null); // stageId lost pendiente de motivo
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  // Comentario/nota + imagen
  const [noteText, setNoteText] = useState('');
  const [noteImage, setNoteImage] = useState<string | null>(null);
  const [uploadingNote, setUploadingNote] = useState(false);
  const noteFileRef = React.useRef<HTMLInputElement>(null);

  // Nueva actividad
  const [actType, setActType] = useState<LeadActivity['type']>('call');
  const [actBody, setActBody] = useState('');
  const [actDue, setActDue] = useState('');
  const [addingAct, setAddingAct] = useState(false);

  const canEdit = can('leads.edit');
  const canAssign = can('leads.assign');
  const canStage = can('leads.changeStage') || can('leads.edit');
  const canConvert = can('leads.convert');

  const pipeline = useMemo(() => pipelines.find(p => p.id === lead.pipelineId) || pipelines[0], [pipelines, lead.pipelineId]);
  const stages = pipeline?.stages || [];
  const currentStage = stages.find(s => s.id === lead.stageId);

  const assigneeOptions = useMemo(() => {
    const emps = getAllEmployees() as any[];
    return emps.map(e => ({ uid: (e.userId || e.id) as string, name: `${e.name || ''} ${e.lastName || ''}`.trim() || e.email }));
  }, [getAllEmployees]);
  const assigneeName = (uid?: string | null) => uid ? (assigneeOptions.find(o => o.uid === uid)?.name || 'Responsable') : 'Sin asignar';

  // Carga el detalle completo (actividades/notas/historial).
  React.useEffect(() => {
    let cancelled = false;
    leadsService.get(initialLead.id).then(full => {
      if (cancelled) return;
      setLead(full);
      setActivities(full.activities || []);
      setLeadNotes(full.leadNotes || []);
    }).catch(() => {}).finally(() => { if (!cancelled) setLoadingDetail(false); });
    return () => { cancelled = true; };
  }, [initialLead.id]);

  const patchLead = (next: Lead) => { setLead(next); onChanged(next); };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('El nombre es obligatorio.'); return; }
    setSaving(true);
    try {
      const updated = await leadsService.update(lead.id, {
        name: form.name.trim(), lastName: form.lastName || null, companyName: form.companyName || null,
        email: form.email || null, phone: form.phone || null, whatsapp: form.whatsapp || null,
        value: form.value ? Number(form.value) : null, sourceId: form.sourceId || null,
        notes: form.notes || null, nextActionAt: form.nextActionAt ? new Date(form.nextActionAt).toISOString() : null,
      });
      patchLead({ ...lead, ...updated });
      toast.success('Lead actualizado.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo actualizar.');
    } finally { setSaving(false); }
  };

  const doMoveStage = async (stageId: string, reason?: string) => {
    try {
      const updated = await leadsService.moveStage(lead.id, stageId, reason ? { lostReason: reason } : undefined);
      patchLead({ ...lead, ...updated });
      toast.success('Etapa actualizada.');
    } catch (err) { toast.error(err instanceof ApiError ? err.message : 'No se pudo mover.'); }
  };

  const onStageSelect = (stageId: string) => {
    const st = stages.find(s => s.id === stageId);
    if (st?.type === 'lost') { setAskLostFor(stageId); setLostReason(''); return; }
    doMoveStage(stageId);
  };

  const handleAssign = async (uid: string) => {
    try {
      const updated = await leadsService.assign(lead.id, uid || null);
      patchLead({ ...lead, ...updated });
    } catch (err) { toast.error(err instanceof ApiError ? err.message : 'No se pudo asignar.'); }
  };

  const handleConvert = async () => {
    try {
      const res = await leadsService.convert(lead.id);
      patchLead({ ...lead, status: 'won', convertedClientId: res.clientId });
      toast.success(res.alreadyConverted ? 'Este lead ya era cliente.' : 'Lead convertido en cliente.');
      onConverted?.(res.clientId);
    } catch (err) { toast.error(err instanceof ApiError ? err.message : 'No se pudo convertir.'); }
  };

  const handleDelete = async () => {
    setShowDelete(false);
    try { await leadsService.remove(lead.id); onDeleted(lead.id); onClose(); }
    catch (err) { toast.error(err instanceof ApiError ? err.message : 'No se pudo eliminar.'); }
  };

  const handleAddActivity = async () => {
    if (!actBody.trim() && actType !== 'call' && actType !== 'meeting') { toast.error('Escribe un detalle.'); return; }
    setAddingAct(true);
    try {
      const act = await leadsService.addActivity(lead.id, {
        type: actType, body: actBody.trim() || null,
        dueAt: actDue ? new Date(actDue).toISOString() : null, done: !actDue, // si no agenda, queda hecha
      });
      setActivities(prev => [act, ...prev]);
      setActBody(''); setActDue('');
      // Refresca nextActionAt en la tarjeta
      leadsService.get(lead.id).then(full => patchLead(full)).catch(() => {});
    } catch (err) { toast.error(err instanceof ApiError ? err.message : 'No se pudo registrar.'); }
    finally { setAddingAct(false); }
  };

  const toggleActivityDone = async (act: LeadActivity) => {
    const next = !act.done;
    setActivities(prev => prev.map(a => a.id === act.id ? { ...a, done: next } : a));
    try { await leadsService.updateActivity(act.id, { done: next }); }
    catch { setActivities(prev => prev.map(a => a.id === act.id ? { ...a, done: act.done } : a)); }
  };

  const handleNoteImage = async (files: File[]) => {
    const img = files.filter(f => f.type.startsWith('image/'))[0];
    if (!img) return;
    if (img.size > 5 * 1024 * 1024) { toast.error('La imagen supera 5 MB.'); return; }
    setUploadingNote(true);
    try { setNoteImage(await uploadImage(img)); } catch { toast.error('No se pudo subir la imagen.'); }
    finally { setUploadingNote(false); }
  };

  const handleAddNote = async () => {
    const text = noteText.trim();
    if (!text && !noteImage) return;
    try {
      const note = await leadsService.addNote(lead.id, text, noteImage);
      setLeadNotes(prev => [note, ...prev]);
      setNoteText(''); setNoteImage(null);
    } catch (err) { toast.error(err instanceof ApiError ? err.message : 'No se pudo añadir la nota.'); }
  };

  const statusBadge = lead.status === 'won'
    ? <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">Ganado</span>
    : lead.status === 'lost'
      ? <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">Perdido</span>
      : <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">Abierto</span>;

  return (
    <>
      <Modal isOpen={true} onClose={onClose} title="Detalle del lead" size="3xl">
        <div className="space-y-5">
          {/* Cabecera */}
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-100 truncate">{lead.name} {lead.lastName}</h3>
              {lead.companyName && <p className="text-sm text-neutral-500 dark:text-neutral-400">{lead.companyName}</p>}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {statusBadge}
              {lead.convertedClientId && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">Cliente</span>}
            </div>
          </div>

          {/* Etapa / responsable / valor */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">Etapa</label>
              <select value={lead.stageId} disabled={!canStage} onChange={e => onStageSelect(e.target.value)} className={inputFormStyle}>
                {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">Responsable</label>
              <select value={lead.assignedUserId || ''} disabled={!canAssign} onChange={e => handleAssign(e.target.value)} className={inputFormStyle}>
                <option value="">Sin asignar</option>
                {assigneeOptions.map(o => <option key={o.uid} value={o.uid}>{o.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">Valor estimado</label>
              <input type="number" step="0.01" value={form.value} disabled={!canEdit} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} className={inputFormStyle} placeholder="0.00" />
            </div>
          </div>

          {/* Datos de contacto */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-neutral-500 mb-1">Nombre</label><input value={form.name} disabled={!canEdit} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputFormStyle} /></div>
            <div><label className="block text-xs font-medium text-neutral-500 mb-1">Apellido</label><input value={form.lastName} disabled={!canEdit} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} className={inputFormStyle} /></div>
            <div><label className="block text-xs font-medium text-neutral-500 mb-1">Empresa</label><input value={form.companyName} disabled={!canEdit} onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))} className={inputFormStyle} /></div>
            <div><label className="block text-xs font-medium text-neutral-500 mb-1">Correo</label><input value={form.email} disabled={!canEdit} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inputFormStyle} /></div>
            <div><label className="block text-xs font-medium text-neutral-500 mb-1">Teléfono</label><input value={form.phone} disabled={!canEdit} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={inputFormStyle} /></div>
            <div><label className="block text-xs font-medium text-neutral-500 mb-1">WhatsApp</label><input value={form.whatsapp} disabled={!canEdit} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} className={inputFormStyle} /></div>
            <div><label className="block text-xs font-medium text-neutral-500 mb-1">Fuente</label>
              <select value={form.sourceId} disabled={!canEdit} onChange={e => setForm(f => ({ ...f, sourceId: e.target.value }))} className={inputFormStyle}>
                <option value="">—</option>
                {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div><label className="block text-xs font-medium text-neutral-500 mb-1">Próxima acción</label><input type="datetime-local" value={form.nextActionAt} disabled={!canEdit} onChange={e => setForm(f => ({ ...f, nextActionAt: e.target.value }))} className={inputFormStyle} /></div>
          </div>
          <div><label className="block text-xs font-medium text-neutral-500 mb-1">Notas rápidas</label><textarea rows={2} value={form.notes} disabled={!canEdit} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className={inputFormStyle} /></div>

          {canEdit && (
            <div className="flex justify-end">
              <button onClick={handleSave} disabled={saving} className={BUTTON_PRIMARY_SM_CLASSES}>{saving ? 'Guardando…' : 'Guardar datos'}</button>
            </div>
          )}

          {/* Actividades */}
          <div className="border-t dark:border-neutral-700 pt-4">
            <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200 mb-2">Actividades y seguimiento</h4>
            {canEdit && (
              <div className="flex flex-wrap items-end gap-2 mb-3">
                <select value={actType} onChange={e => setActType(e.target.value as any)} className={inputFormStyle + ' !w-auto'}>
                  {Object.entries(ACTIVITY_META).map(([k, m]) => <option key={k} value={k}>{m.icon} {m.label}</option>)}
                </select>
                <input value={actBody} onChange={e => setActBody(e.target.value)} placeholder="Detalle / resultado…" className={inputFormStyle + ' flex-1 min-w-[160px]'} />
                <input type="datetime-local" value={actDue} onChange={e => setActDue(e.target.value)} title="Agendar (opcional)" className={inputFormStyle + ' !w-auto'} />
                <button onClick={handleAddActivity} disabled={addingAct} className={BUTTON_SECONDARY_SM_CLASSES}>Registrar</button>
              </div>
            )}
            {loadingDetail ? <p className="text-xs text-neutral-400">Cargando…</p> : (
              <ul className="space-y-1.5 max-h-48 overflow-y-auto">
                {activities.length === 0 && <li className="text-xs text-neutral-400">Sin actividades aún.</li>}
                {activities.map(a => (
                  <li key={a.id} className="flex items-start gap-2 text-sm p-1.5 rounded hover:bg-neutral-50 dark:hover:bg-neutral-700/40">
                    <input type="checkbox" checked={a.done} onChange={() => toggleActivityDone(a)} className="mt-1 h-4 w-4 flex-shrink-0" title="Marcar hecha" />
                    <div className="min-w-0 flex-1">
                      <span className="text-neutral-700 dark:text-neutral-200">{ACTIVITY_META[a.type]?.icon} <strong>{ACTIVITY_META[a.type]?.label}</strong>{a.body ? `: ${a.body}` : ''}</span>
                      <div className="text-[11px] text-neutral-400">
                        {a.createdByName || ''} · {new Date(a.createdAt).toLocaleString()}{a.dueAt ? ` · agenda ${new Date(a.dueAt).toLocaleString()}` : ''}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Notas */}
          <div className="border-t dark:border-neutral-700 pt-4">
            <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200 mb-2">Notas</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto bg-neutral-50 dark:bg-neutral-700/40 rounded-md p-2 mb-2">
              {leadNotes.length === 0 && <p className="text-xs text-neutral-400 text-center py-2">Sin notas.</p>}
              {leadNotes.map(n => (
                <div key={n.id} className="text-sm">
                  <div className="flex justify-between text-[11px] text-neutral-400"><span className="font-semibold text-primary/80">{n.authorName || 'Usuario'}</span><span>{new Date(n.createdAt).toLocaleString()}</span></div>
                  {n.text && <p className="text-neutral-700 dark:text-neutral-200 whitespace-pre-wrap">{n.text}</p>}
                  {n.imageUrl && <button type="button" onClick={() => setZoomImage(n.imageUrl!)}><img src={n.imageUrl} alt="" className="max-h-32 rounded border border-neutral-200 dark:border-neutral-600 mt-1 cursor-zoom-in" /></button>}
                </div>
              ))}
            </div>
            {noteImage && (
              <div className="relative inline-block mb-2">
                <img src={noteImage} alt="" className="h-16 rounded border border-neutral-300 dark:border-neutral-600" />
                <button onClick={() => setNoteImage(null)} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-xs">✕</button>
              </div>
            )}
            <div className="flex items-stretch gap-2">
              <input value={noteText} onChange={e => setNoteText(e.target.value)} onPaste={e => { const f = Array.from(e.clipboardData?.files || []).filter(x => x.type.startsWith('image/')); if (f.length) { e.preventDefault(); handleNoteImage(f); } }} placeholder="Añadir una nota…" className={inputFormStyle + ' flex-grow'} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddNote(); } }} />
              <input ref={noteFileRef} type="file" accept="image/*" className="hidden" onChange={e => { handleNoteImage(Array.from(e.target.files || [])); e.currentTarget.value=''; }} />
              <button type="button" onClick={() => noteFileRef.current?.click()} disabled={uploadingNote} className="flex-shrink-0 px-3 rounded-md border border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center">{uploadingNote ? '…' : '🖼️'}</button>
              <button type="button" onClick={handleAddNote} disabled={!noteText.trim() && !noteImage} className="flex-shrink-0 px-4 rounded-md bg-primary text-white flex items-center disabled:opacity-50"><PaperAirplaneIcon className="w-4 h-4" /></button>
            </div>
          </div>

          {/* Footer acciones */}
          <div className="flex justify-between items-center pt-4 border-t dark:border-neutral-700 flex-wrap gap-2">
            <div className="flex gap-2">
              {can('leads.delete') && <button onClick={() => setShowDelete(true)} className={`${BUTTON_SECONDARY_SM_CLASSES} text-red-600 dark:text-red-400 flex items-center`}><DeleteIcon className="w-4 h-4 mr-1" />Eliminar</button>}
              {canConvert && !lead.convertedClientId && <button onClick={handleConvert} className={`${BUTTON_SECONDARY_SM_CLASSES} text-teal-700 dark:text-teal-300`}>⇄ Convertir en cliente</button>}
            </div>
            <button onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>Cerrar</button>
          </div>
        </div>
      </Modal>

      {/* Motivo de pérdida */}
      <Modal isOpen={!!askLostFor} onClose={() => setAskLostFor(null)} title="Marcar como perdido" size="sm">
        <div className="space-y-3">
          <label className="block text-sm">Motivo de la pérdida</label>
          <textarea rows={3} value={lostReason} onChange={e => setLostReason(e.target.value)} className={inputFormStyle} placeholder="Ej. Precio, eligió competencia, sin presupuesto…" />
          <div className="flex justify-end gap-2">
            <button onClick={() => setAskLostFor(null)} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button>
            <button onClick={() => { const s = askLostFor!; setAskLostFor(null); doMoveStage(s, lostReason.trim() || undefined); }} className={BUTTON_PRIMARY_SM_CLASSES}>Confirmar</button>
          </div>
        </div>
      </Modal>

      <ConfirmationModal isOpen={showDelete} onClose={() => setShowDelete(false)} onConfirm={handleDelete} title="Eliminar lead" message={`¿Eliminar el lead "${lead.name}"? Esta acción no se puede deshacer.`} confirmButtonText="Eliminar" />

      {zoomImage && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setZoomImage(null)}>
          <img src={zoomImage} alt="" className="max-w-full max-h-full object-contain rounded shadow-2xl" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </>
  );
};
