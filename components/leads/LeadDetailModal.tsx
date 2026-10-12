import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, ConfirmationModal } from '../Modal';
import { Lead, Pipeline, LeadSource, LeadActivity, LeadNote, LeadTag, LeadCustomField, LeadTemplate } from '../../types';
import { useData } from '../../contexts/DataContext';
import { usePermissions } from '../../hooks/usePermissions';
import { leadsService } from '../../services/leads';
import { uploadImage } from '../../services/upload';
import { api, ApiError } from '../../services/api';
import { useLeadAssignees } from './useLeadAssignees';
import { toast } from '../../hooks/useToast';
import { inputFormStyle, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import { DeleteIcon, PaperAirplaneIcon } from '../icons';
import { TagChip } from './TagChip';

interface Props {
  lead: Lead;
  pipelines: Pipeline[];
  sources: LeadSource[];
  tags: LeadTag[];
  customFields: LeadCustomField[];
  lostReasons: string[];
  onClose: () => void;
  onChanged: (lead: Lead) => void;
  onDeleted: (id: string) => void;
  onTagCreated?: (tag: LeadTag) => void;
}

export const ACTIVITY_META: Record<string, { label: string; icon: string }> = {
  call: { label: 'Llamada', icon: '📞' },
  email: { label: 'Correo', icon: '✉️' },
  whatsapp: { label: 'WhatsApp', icon: '💬' },
  meeting: { label: 'Reunión', icon: '📅' },
  note: { label: 'Nota', icon: '📝' },
  task: { label: 'Tarea', icon: '✅' },
};

const toLocalInput = (iso?: string | null, withTime = true) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  const date = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  return withTime ? `${date}T${p(d.getHours())}:${p(d.getMinutes())}` : date;
};

export const LeadDetailModal: React.FC<Props> = ({ lead: initialLead, pipelines, sources, tags, customFields, lostReasons, onClose, onChanged, onDeleted, onTagCreated }) => {
  const { setClients } = useData();
  const { can } = usePermissions();
  const navigate = useNavigate();

  const [lead, setLead] = useState<Lead>(initialLead);
  const [activities, setActivities] = useState<LeadActivity[]>(initialLead.activities || []);
  const [leadNotes, setLeadNotes] = useState<LeadNote[]>(initialLead.leadNotes || []);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [tab, setTab] = useState<'activity' | 'notes' | 'history'>('activity');

  const [form, setForm] = useState({
    name: initialLead.name || '', lastName: initialLead.lastName || '', companyName: initialLead.companyName || '',
    email: initialLead.email || '', phone: initialLead.phone || '', whatsapp: initialLead.whatsapp || '',
    value: initialLead.value != null ? String(initialLead.value) : '', probability: initialLead.probability != null ? String(initialLead.probability) : '',
    sourceId: initialLead.sourceId || '', notes: initialLead.notes || '',
    nextActionAt: toLocalInput(initialLead.nextActionAt), expectedCloseAt: toLocalInput(initialLead.expectedCloseAt, false),
  });
  const [cf, setCf] = useState<Record<string, any>>(initialLead.customFields || {});
  const [tagIds, setTagIds] = useState<string[]>(initialLead.tagIds || []);
  const [newTag, setNewTag] = useState('');
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [askLostFor, setAskLostFor] = useState<string | null>(null);
  const [lostChoice, setLostChoice] = useState('');
  const [lostOther, setLostOther] = useState('');
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  const [noteText, setNoteText] = useState('');
  const [noteImage, setNoteImage] = useState<string | null>(null);
  const [uploadingNote, setUploadingNote] = useState(false);
  const noteFileRef = React.useRef<HTMLInputElement>(null);

  const [actType, setActType] = useState<LeadActivity['type']>('call');
  const [actBody, setActBody] = useState('');
  const [actDue, setActDue] = useState('');
  const [addingAct, setAddingAct] = useState(false);

  // Enviar plantilla (correo / WhatsApp)
  const [tplOpen, setTplOpen] = useState(false);
  const [templates, setTemplates] = useState<LeadTemplate[]>([]);
  const [tplId, setTplId] = useState('');
  const [tplPreview, setTplPreview] = useState<{ channel: string; subject: string; body: string; to?: string | null } | null>(null);
  const [tplSending, setTplSending] = useState(false);

  const canEdit = can('leads.edit');
  const canAssign = can('leads.assign');
  const canStage = can('leads.changeStage') || can('leads.edit');
  const canConvert = can('leads.convert');

  const pipeline = useMemo(() => pipelines.find(p => p.id === lead.pipelineId) || pipelines[0], [pipelines, lead.pipelineId]);
  const stages = pipeline?.stages || [];
  const allStages = useMemo(() => pipelines.flatMap(p => p.stages), [pipelines]);
  const stageName = (id?: string | null) => allStages.find(s => s.id === id)?.name || '—';

  const assigneeOptions = useLeadAssignees();

  React.useEffect(() => {
    let cancelled = false;
    leadsService.get(initialLead.id).then(full => {
      if (cancelled) return;
      setLead(full);
      setActivities(full.activities || []);
      setLeadNotes(full.leadNotes || []);
      setTagIds(full.tagIds || []);
      setCf(full.customFields || {});
    }).catch(() => {}).finally(() => { if (!cancelled) setLoadingDetail(false); });
    return () => { cancelled = true; };
  }, [initialLead.id]);

  // Funcional: una respuesta lenta no debe pisar cambios hechos mientras tanto (etapa/responsable).
  const patchLead = (next: Partial<Lead>) => {
    setLead(prev => ({ ...prev, ...next } as Lead));
    onChanged({ id: lead.id, ...next } as Lead);
    if (Object.prototype.hasOwnProperty.call(next, 'nextActionAt')) setForm(f => ({ ...f, nextActionAt: toLocalInput(next.nextActionAt) }));
  };

  /** Etiquetas: se guardan al instante (como etapa y responsable). */
  const saveTags = async (nextIds: string[]) => {
    const prevIds = tagIds;
    setTagIds(nextIds);
    try { const updated = await leadsService.update(lead.id, { tagIds: nextIds } as any); patchLead({ tagIds: updated.tagIds }); }
    catch (err) { setTagIds(prevIds); toast.error(err instanceof ApiError ? err.message : 'No se pudo guardar la etiqueta.'); }
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('El nombre es obligatorio.'); return; }
    const missing = customFields.filter(f => f.required && (cf[f.id] === undefined || cf[f.id] === '' || cf[f.id] === null));
    if (missing.length) { toast.error(`Completa: ${missing.map(m => m.label).join(', ')}`); return; }
    setSaving(true);
    try {
      const updated = await leadsService.update(lead.id, {
        name: form.name.trim(), lastName: form.lastName || null, companyName: form.companyName || null,
        email: form.email || null, phone: form.phone || null, whatsapp: form.whatsapp || null,
        value: form.value ? Number(form.value) : null,
        probability: form.probability !== '' ? Math.max(0, Math.min(100, Math.round(Number(form.probability)))) : null,
        sourceId: form.sourceId || null, notes: form.notes || null,
        nextActionAt: form.nextActionAt ? new Date(form.nextActionAt).toISOString() : null,
        expectedCloseAt: form.expectedCloseAt ? new Date(form.expectedCloseAt + 'T12:00:00').toISOString() : null,
        customFields: cf, tagIds,
      } as any);
      patchLead(updated);
      toast.success('Lead actualizado.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo actualizar.');
    } finally { setSaving(false); }
  };

  const doMoveStage = async (stageId: string, reason?: string) => {
    try {
      const updated = await leadsService.moveStage(lead.id, stageId, reason ? { lostReason: reason } : undefined);
      patchLead(updated);
      toast.success('Etapa actualizada.');
      leadsService.get(lead.id).then(full => setLead(l => ({ ...l, history: full.history }))).catch(() => {});
    } catch (err) { toast.error(err instanceof ApiError ? err.message : 'No se pudo mover.'); }
  };

  const onStageSelect = (stageId: string) => {
    const st = stages.find(s => s.id === stageId);
    if (st?.type === 'lost') { setAskLostFor(stageId); setLostChoice(lostReasons[0] || '__other'); setLostOther(''); return; }
    doMoveStage(stageId);
  };

  const handleAssign = async (uid: string) => {
    try { patchLead(await leadsService.assign(lead.id, uid || null)); }
    catch (err) { toast.error(err instanceof ApiError ? err.message : 'No se pudo asignar.'); }
  };

  const handleConvert = async () => {
    try {
      const res = await leadsService.convert(lead.id);
      const won = stages.find(s => s.type === 'won');
      patchLead({ status: 'won', convertedClientId: res.clientId, ...(won ? { stageId: won.id } : {}) });
      toast.success(res.alreadyConverted ? 'Este lead ya era cliente.' : 'Lead convertido en cliente.');
      // Recarga la lista de clientes para que "Ver cliente →" encuentre el nuevo.
      api.get<any[]>('/clients').then(list => { if (Array.isArray(list)) setClients(list as any); }).catch(() => {});
    } catch (err) { toast.error(err instanceof ApiError ? err.message : 'No se pudo convertir.'); }
  };

  const handleDelete = async () => {
    setShowDelete(false);
    try { await leadsService.remove(lead.id); onDeleted(lead.id); onClose(); }
    catch (err) { toast.error(err instanceof ApiError ? err.message : 'No se pudo eliminar.'); }
  };

  const addTagById = (id: string) => { if (id && !tagIds.includes(id)) saveTags([...tagIds, id]); };
  const createAndAddTag = async () => {
    const name = newTag.trim();
    if (!name) return;
    const existing = tags.find(t => t.name.toLowerCase() === name.toLowerCase());
    if (existing) { addTagById(existing.id); setNewTag(''); return; }
    try {
      const tag = await leadsService.createTag(name);
      onTagCreated?.(tag);
      addTagById(tag.id);
      setNewTag('');
    } catch (err) { toast.error(err instanceof ApiError ? err.message : 'No se pudo crear la etiqueta.'); }
  };

  const handleAddActivity = async () => {
    if (!actBody.trim() && !actDue) { toast.error('Escribe un detalle o agenda una fecha.'); return; }
    setAddingAct(true);
    try {
      const act = await leadsService.addActivity(lead.id, {
        type: actType, body: actBody.trim() || null,
        dueAt: actDue ? new Date(actDue).toISOString() : null, done: !actDue,
      });
      setActivities(prev => [act, ...prev]);
      setActBody(''); setActDue('');
      leadsService.get(lead.id).then(full => patchLead({ nextActionAt: full.nextActionAt, lastActivityAt: full.lastActivityAt })).catch(() => {});
    } catch (err) { toast.error(err instanceof ApiError ? err.message : 'No se pudo registrar.'); }
    finally { setAddingAct(false); }
  };

  const toggleActivityDone = async (act: LeadActivity) => {
    const next = !act.done;
    setActivities(prev => prev.map(a => a.id === act.id ? { ...a, done: next } : a));
    try {
      await leadsService.updateActivity(act.id, { done: next });
      leadsService.get(lead.id).then(full => patchLead({ nextActionAt: full.nextActionAt })).catch(() => {});
    } catch { setActivities(prev => prev.map(a => a.id === act.id ? { ...a, done: act.done } : a)); }
  };

  const deleteActivity = async (act: LeadActivity) => {
    setActivities(prev => prev.filter(a => a.id !== act.id));
    try { await leadsService.deleteActivity(act.id); }
    catch { setActivities(prev => [act, ...prev]); toast.error('No se pudo eliminar.'); }
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

  const openTemplates = async () => {
    setTplOpen(true); setTplId(''); setTplPreview(null);
    try { setTemplates(await leadsService.listTemplates()); } catch { setTemplates([]); }
  };
  const pickTemplate = async (id: string) => {
    setTplId(id); setTplPreview(null);
    if (!id) return;
    try { setTplPreview(await leadsService.previewTemplate(id, lead.id)); } catch (err) { toast.error(err instanceof ApiError ? err.message : 'No se pudo generar la vista previa.'); }
  };
  const refreshActivities = () => leadsService.get(lead.id).then(full => { setActivities(full.activities || []); patchLead({ lastActivityAt: full.lastActivityAt }); }).catch(() => {});
  const sendTpl = async () => {
    if (!tplId) return;
    setTplSending(true);
    try {
      const r = await leadsService.sendTemplate(lead.id, tplId);
      toast.success(r.detail || 'Enviado.');
      setTplOpen(false);
      refreshActivities();
    } catch (err) { toast.error(err instanceof ApiError ? err.message : 'No se pudo enviar.'); }
    finally { setTplSending(false); }
  };
  /** Alternativa sin API de WhatsApp: abre wa.me con el texto y lo registra como actividad. */
  const openWhatsappWithText = async () => {
    if (!tplPreview) return;
    const phone = (lead.whatsapp || lead.phone || '').replace(/\D/g, '');
    if (!phone) { toast.error('El lead no tiene teléfono.'); return; }
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(tplPreview.body)}`, '_blank', 'noopener');
    try { await leadsService.addActivity(lead.id, { type: 'whatsapp', title: templates.find(t => t.id === tplId)?.name || 'WhatsApp', body: tplPreview.body, done: true }); refreshActivities(); } catch { /* noop */ }
    setTplOpen(false);
  };

  const statusBadge = lead.status === 'won'
    ? <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">Ganado</span>
    : lead.status === 'lost'
      ? <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" title={lead.lostReason || ''}>Perdido{lead.lostReason ? ` · ${lead.lostReason}` : ''}</span>
      : <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">Abierto</span>;

  const label = (t: string) => <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">{t}</label>;
  const inp = (key: keyof typeof form, type = 'text', extra: any = {}) => (
    <input type={type} value={form[key]} disabled={!canEdit} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} className={inputFormStyle} {...extra} />
  );

  const renderCustomField = (f: LeadCustomField) => {
    const v = cf[f.id];
    const set = (val: any) => setCf(prev => ({ ...prev, [f.id]: val }));
    if (f.type === 'checkbox') return (
      <label className="flex items-center gap-2 text-sm mt-2"><input type="checkbox" disabled={!canEdit} checked={!!v} onChange={e => set(e.target.checked)} className="h-4 w-4" /> Sí</label>
    );
    if (f.type === 'select') return (
      <select value={v ?? ''} disabled={!canEdit} onChange={e => set(e.target.value)} className={inputFormStyle}>
        <option value="">—</option>
        {(f.options || []).map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    );
    const type = f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : f.type === 'url' ? 'url' : 'text';
    return <input type={type} value={v ?? ''} disabled={!canEdit} onChange={e => set(e.target.value)} className={inputFormStyle} />;
  };

  return (
    <>
      <Modal isOpen={true} onClose={onClose} title="Detalle del lead" size="3xl">
        <div className="space-y-5">
          {/* Cabecera */}
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-100 truncate"><span translate="no">{lead.name} {lead.lastName}</span></h3>
              {lead.companyName && <p className="text-sm text-neutral-500 dark:text-neutral-400"><span translate="no">{lead.companyName}</span></p>}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {statusBadge}
              {lead.convertedClientId && (
                <button type="button" onClick={() => navigate(`/tienda/clients?edit=${lead.convertedClientId}`)} className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300 hover:underline">Ver cliente →</button>
              )}
            </div>
          </div>

          {/* Etiquetas */}
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              {tagIds.map(id => {
                const t = tags.find(x => x.id === id);
                return t ? <TagChip key={id} tag={t} onRemove={canEdit ? () => saveTags(tagIds.filter(x => x !== id)) : undefined} /> : null;
              })}
              {canEdit && (
                <>
                  <select value="" onChange={e => addTagById(e.target.value)} className="text-xs rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 px-2 py-1 text-neutral-600 dark:text-neutral-300">
                    <option value="">+ Etiqueta</option>
                    {tags.filter(t => !tagIds.includes(t.id)).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  <input value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); createAndAddTag(); } }} placeholder="Nueva etiqueta…" className="text-xs rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 px-2 py-1 w-32" />
                </>
              )}
            </div>
          </div>

          {/* Etapa / responsable / valor / probabilidad */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>{label('Etapa')}
              <select value={lead.stageId} disabled={!canStage} onChange={e => onStageSelect(e.target.value)} className={inputFormStyle}>
                {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>{label('Responsable')}
              <select value={lead.assignedUserId || ''} disabled={!canAssign} onChange={e => handleAssign(e.target.value)} className={inputFormStyle}>
                <option value="">Sin asignar</option>
                {assigneeOptions.map(o => <option key={o.uid} value={o.uid}>{o.name}</option>)}
              </select>
            </div>
            <div>{label('Valor estimado')}{inp('value', 'number', { step: '0.01', placeholder: '0.00' })}</div>
            <div>{label('Probabilidad %')}{inp('probability', 'number', { min: 0, max: 100, placeholder: 'Auto' })}</div>
          </div>

          {/* Contacto */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>{label('Nombre')}{inp('name')}</div>
            <div>{label('Apellido')}{inp('lastName')}</div>
            <div>{label('Empresa')}{inp('companyName')}</div>
            <div>{label('Correo')}{inp('email', 'email')}</div>
            <div>{label('Teléfono')}{inp('phone', 'tel')}</div>
            <div>{label('WhatsApp')}{inp('whatsapp', 'tel')}</div>
            <div>{label('Fuente')}
              <select value={form.sourceId} disabled={!canEdit} onChange={e => setForm(f => ({ ...f, sourceId: e.target.value }))} className={inputFormStyle}>
                <option value="">—</option>
                {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>{label('Cierre estimado')}{inp('expectedCloseAt', 'date')}</div>
            <div className="sm:col-span-2">{label('Próxima acción')}{inp('nextActionAt', 'datetime-local')}</div>
          </div>

          {/* Campos personalizados */}
          {customFields.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t dark:border-neutral-700 pt-4">
              {customFields.map(f => (
                <div key={f.id}>{label(`${f.label}${f.required ? ' *' : ''}`)}{renderCustomField(f)}</div>
              ))}
            </div>
          )}

          <div>{label('Notas rápidas')}<textarea rows={2} value={form.notes} disabled={!canEdit} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className={inputFormStyle} /></div>

          {canEdit && (
            <div className="flex justify-end">
              <button onClick={handleSave} disabled={saving} className={BUTTON_PRIMARY_SM_CLASSES}>{saving ? 'Guardando…' : 'Guardar datos'}</button>
            </div>
          )}

          {/* Pestañas: actividad / notas / historial */}
          <div className="border-t dark:border-neutral-700 pt-3">
            <div className="flex gap-1 mb-3">
              {([['activity', `Actividades (${activities.length})`], ['notes', `Notas (${leadNotes.length})`], ['history', 'Historial']] as const).map(([k, l]) => (
                <button key={k} type="button" onClick={() => setTab(k)} className={`px-3 py-1.5 rounded-md text-sm font-medium ${tab === k ? 'bg-primary text-white' : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}>{l}</button>
              ))}
            </div>

            {tab === 'activity' && (
              <>
                {canEdit && (
                  <div className="flex flex-wrap items-stretch gap-2 mb-3">
                    <select value={actType} onChange={e => setActType(e.target.value as any)} className={inputFormStyle + ' !w-auto'}>
                      {Object.entries(ACTIVITY_META).map(([k, m]) => <option key={k} value={k}>{m.icon} {m.label}</option>)}
                    </select>
                    <input value={actBody} onChange={e => setActBody(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddActivity(); } }} placeholder="Detalle / resultado…" className={inputFormStyle + ' flex-1 min-w-[160px]'} />
                    <input type="datetime-local" value={actDue} onChange={e => setActDue(e.target.value)} title="Agendar (opcional): si eliges fecha queda pendiente con recordatorio" className={inputFormStyle + ' !w-auto'} />
                    <button onClick={handleAddActivity} disabled={addingAct} className={BUTTON_SECONDARY_SM_CLASSES}>{actDue ? 'Agendar' : 'Registrar'}</button>
                  </div>
                )}
                {loadingDetail ? <p className="text-xs text-neutral-400">Cargando…</p> : (
                  <ul className="space-y-1.5 max-h-56 overflow-y-auto">
                    {activities.length === 0 && <li className="text-xs text-neutral-400">Sin actividades aún.</li>}
                    {activities.map(a => {
                      const overdue = !a.done && a.dueAt && new Date(a.dueAt).getTime() < Date.now();
                      return (
                        <li key={a.id} className="flex items-start gap-2 text-sm p-1.5 rounded hover:bg-neutral-50 dark:hover:bg-neutral-700/40 group">
                          <input type="checkbox" checked={a.done} disabled={!canEdit} onChange={() => toggleActivityDone(a)} className="mt-1 h-4 w-4 flex-shrink-0" title="Marcar hecha" />
                          <div className="min-w-0 flex-1">
                            <span className={`${a.done ? 'text-neutral-500 dark:text-neutral-400' : 'text-neutral-700 dark:text-neutral-200'}`}>{ACTIVITY_META[a.type]?.icon} <strong>{a.title || ACTIVITY_META[a.type]?.label}</strong>{a.body ? `: ${a.body}` : ''}</span>
                            <div className="text-[11px] text-neutral-400">
                              {a.createdByName || ''} · {new Date(a.createdAt).toLocaleString()}
                              {a.dueAt && <span className={overdue ? 'text-red-500 font-semibold' : ''}> · {overdue ? 'vencida' : 'agenda'} {new Date(a.dueAt).toLocaleString()}</span>}
                            </div>
                          </div>
                          {canEdit && <button type="button" onClick={() => deleteActivity(a)} className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-500 p-0.5" aria-label="Eliminar actividad">✕</button>}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </>
            )}

            {tab === 'notes' && (
              <>
                <div className="space-y-2 max-h-48 overflow-y-auto bg-neutral-50 dark:bg-neutral-700/40 rounded-md p-2 mb-2">
                  {leadNotes.length === 0 && <p className="text-xs text-neutral-400 text-center py-2">Sin notas.</p>}
                  {leadNotes.map(n => (
                    <div key={n.id} className="text-sm">
                      <div className="flex justify-between text-[11px] text-neutral-400"><span className="font-semibold text-primary/80">{n.authorName || 'Usuario'}</span><span>{new Date(n.createdAt).toLocaleString()}</span></div>
                      {n.text && <p className="text-neutral-700 dark:text-neutral-200 whitespace-pre-wrap">{n.text}</p>}
                      {n.imageUrl && <button type="button" onClick={() => setZoomImage(n.imageUrl!)}><img src={n.imageUrl} alt="" className="max-h-32 rounded border border-neutral-200 dark:border-neutral-600 mt-1 cursor-zoom-in" /></button>}
                    </div>
                  ))}
                </div>
                {canEdit && (
                  <>
                    {noteImage && (
                      <div className="relative inline-block mb-2">
                        <img src={noteImage} alt="" className="h-16 rounded border border-neutral-300 dark:border-neutral-600" />
                        <button onClick={() => setNoteImage(null)} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-xs">✕</button>
                      </div>
                    )}
                    <div className="flex items-stretch gap-2">
                      <input value={noteText} onChange={e => setNoteText(e.target.value)} onPaste={e => { const f = Array.from(e.clipboardData?.files || []).filter(x => x.type.startsWith('image/')); if (f.length) { e.preventDefault(); handleNoteImage(f); } }} placeholder="Añadir una nota (puedes pegar una imagen)…" className={inputFormStyle + ' flex-grow'} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddNote(); } }} />
                      <input ref={noteFileRef} type="file" accept="image/*" className="hidden" onChange={e => { handleNoteImage(Array.from(e.target.files || [])); e.currentTarget.value = ''; }} />
                      <button type="button" onClick={() => noteFileRef.current?.click()} disabled={uploadingNote} className="flex-shrink-0 px-3 rounded-md border border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center">{uploadingNote ? '…' : '🖼️'}</button>
                      <button type="button" onClick={handleAddNote} disabled={!noteText.trim() && !noteImage} className="flex-shrink-0 px-4 rounded-md bg-primary text-white flex items-center disabled:opacity-50" aria-label="Guardar nota"><PaperAirplaneIcon className="w-4 h-4" /></button>
                    </div>
                  </>
                )}
              </>
            )}

            {tab === 'history' && (
              <ul className="space-y-1 max-h-56 overflow-y-auto text-sm">
                {(lead.history || []).length === 0 && <li className="text-xs text-neutral-400">Sin cambios de etapa.</li>}
                {(lead.history || []).map(h => (
                  <li key={h.id} className="flex items-center justify-between gap-2 py-1 border-b border-neutral-100 dark:border-neutral-700/60">
                    <span className="text-neutral-700 dark:text-neutral-200">{h.fromStageId ? `${stageName(h.fromStageId)} → ` : 'Creado en '}<strong>{stageName(h.toStageId)}</strong></span>
                    <span className="text-[11px] text-neutral-400 flex-shrink-0">{new Date(h.at).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center pt-4 border-t dark:border-neutral-700 flex-wrap gap-2">
            <div className="flex gap-2 flex-wrap">
              {can('leads.delete') && <button onClick={() => setShowDelete(true)} className={`${BUTTON_SECONDARY_SM_CLASSES} text-red-600 dark:text-red-400 flex items-center`}><DeleteIcon className="w-4 h-4 mr-1" />Eliminar</button>}
              {canConvert && !lead.convertedClientId && <button onClick={handleConvert} className={`${BUTTON_SECONDARY_SM_CLASSES} text-teal-700 dark:text-teal-300`}>⇄ Convertir en cliente</button>}
              {(lead.whatsapp || lead.phone) && (
                <a href={`https://wa.me/${(lead.whatsapp || lead.phone || '').replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className={`${BUTTON_SECONDARY_SM_CLASSES} text-green-700 dark:text-green-300`}>💬 WhatsApp</a>
              )}
              {lead.email && <a href={`mailto:${lead.email}`} className={BUTTON_SECONDARY_SM_CLASSES}>✉️ Correo</a>}
              {canEdit && (lead.email || lead.phone || lead.whatsapp) && <button type="button" onClick={openTemplates} className={`${BUTTON_SECONDARY_SM_CLASSES} text-primary dark:text-teal-300`}>📨 Enviar plantilla</button>}
            </div>
            <button onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>Cerrar</button>
          </div>
        </div>
      </Modal>

      {/* Motivo de pérdida (catálogo configurable) */}
      <Modal isOpen={!!askLostFor} onClose={() => setAskLostFor(null)} title="Marcar como perdido" size="sm">
        <div className="space-y-3">
          <label className="block text-sm">Motivo de la pérdida</label>
          <select value={lostChoice} onChange={e => setLostChoice(e.target.value)} className={inputFormStyle}>
            {lostReasons.map(r => <option key={r} value={r}>{r}</option>)}
            <option value="__other">Otro (escribir)…</option>
          </select>
          {lostChoice === '__other' && <input value={lostOther} onChange={e => setLostOther(e.target.value)} className={inputFormStyle} placeholder="Describe el motivo" autoFocus />}
          <div className="flex justify-end gap-2">
            <button onClick={() => setAskLostFor(null)} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button>
            <button disabled={!(lostChoice === '__other' ? lostOther.trim() : lostChoice)} onClick={() => { const s = askLostFor!; setAskLostFor(null); doMoveStage(s, (lostChoice === '__other' ? lostOther.trim() : lostChoice) || undefined); }} className={BUTTON_PRIMARY_SM_CLASSES}>Confirmar</button>
          </div>
        </div>
      </Modal>

      {/* Enviar plantilla */}
      <Modal isOpen={tplOpen} onClose={() => setTplOpen(false)} title="Enviar plantilla" size="lg">
        <div className="space-y-3">
          {templates.length === 0 ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">No hay plantillas. Créalas en Leads → Configuración del CRM → Plantillas.</p>
          ) : (
            <select value={tplId} onChange={e => pickTemplate(e.target.value)} className={inputFormStyle}>
              <option value="">— Elige una plantilla —</option>
              {templates.filter(t => t.channel !== 'email' || lead.email).filter(t => t.channel !== 'whatsapp' || lead.whatsapp || lead.phone).map(t => (
                <option key={t.id} value={t.id}>{t.channel === 'email' ? '✉️' : '💬'} {t.name}</option>
              ))}
            </select>
          )}
          {tplPreview && (
            <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-3 bg-neutral-50 dark:bg-neutral-900/40 text-sm">
              <p className="text-xs text-neutral-500 mb-1">Para: <span translate="no">{tplPreview.to || '—'}</span></p>
              {tplPreview.channel === 'email' && <p className="font-semibold text-neutral-800 dark:text-neutral-100 mb-1">{tplPreview.subject}</p>}
              <p className="whitespace-pre-wrap text-neutral-700 dark:text-neutral-200">{tplPreview.body}</p>
            </div>
          )}
          <div className="flex justify-end gap-2 flex-wrap">
            <button onClick={() => setTplOpen(false)} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button>
            {tplPreview?.channel === 'whatsapp' && <button onClick={openWhatsappWithText} className={`${BUTTON_SECONDARY_SM_CLASSES} text-green-700 dark:text-green-300`}>Abrir en WhatsApp</button>}
            <button onClick={sendTpl} disabled={!tplPreview || tplSending} className={BUTTON_PRIMARY_SM_CLASSES}>{tplSending ? 'Enviando…' : tplPreview?.channel === 'whatsapp' ? 'Enviar por API' : 'Enviar correo'}</button>
          </div>
          {tplPreview?.channel === 'whatsapp' && <p className="text-[11px] text-neutral-500">"Enviar por API" usa tu WhatsApp Business configurado (solo dentro de las 24 h del último mensaje del cliente). "Abrir en WhatsApp" abre el chat con el texto listo y lo registra en el historial.</p>}
        </div>
      </Modal>

      <ConfirmationModal isOpen={showDelete} onClose={() => setShowDelete(false)} onConfirm={handleDelete} title="Eliminar lead" message={`¿Eliminar el lead "${lead.name}"? Esta acción no se puede deshacer.`} confirmButtonText="Eliminar" />

      {zoomImage && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setZoomImage(null)}>
          <img src={zoomImage} alt="" className="max-w-full max-h-full object-contain rounded shadow-2xl" onClick={e => e.stopPropagation()} />
          <button type="button" onClick={() => setZoomImage(null)} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 text-neutral-800 text-xl" aria-label="Cerrar">✕</button>
        </div>
      )}
    </>
  );
};
