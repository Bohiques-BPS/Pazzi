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
import { inputFormStyle, INPUT_SM_CLASSES, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import {
  DeleteIcon, PaperAirplaneIcon, PhoneIcon, EnvelopeIcon, ChatBubbleLeftRightIcon, CalendarDaysIcon, DocumentTextIcon,
  ClipboardDocumentListIcon, PhotoIcon, XMarkIcon, UserPlusIcon, ArrowPathIcon, ClockIcon,
} from '../icons';
import { TagChip } from './TagChip';
import { LeadItemsTab } from './LeadItemsTab';
import { LeadMergePanel } from './LeadMergePanel';
import { useTranslation } from '../../contexts/GlobalSettingsContext';

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

/** `label` es el texto en español (fallback); en render se traduce con `leads.common.activity.<tipo>`. */
export const ACTIVITY_META: Record<string, { label: string; icon: string }> = {
  call: { label: 'Llamada', icon: '📞' },
  email: { label: 'Correo', icon: '✉️' },
  whatsapp: { label: 'WhatsApp', icon: '💬' },
  meeting: { label: 'Reunión', icon: '📅' },
  note: { label: 'Nota', icon: '📝' },
  task: { label: 'Tarea', icon: '✅' },
};

/** Icono SVG por tipo de actividad (la UI usa iconos, no emojis). */
export const ACTIVITY_ICON: Record<string, React.FC<{ className?: string }>> = {
  call: PhoneIcon,
  email: EnvelopeIcon,
  whatsapp: ChatBubbleLeftRightIcon,
  meeting: CalendarDaysIcon,
  note: DocumentTextIcon,
  task: ClipboardDocumentListIcon,
};

const BADGE = 'inline-flex items-center text-[11px] font-medium px-2.5 py-1 rounded-full';
const LABEL = 'block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1';
const SECTION = 'pt-4 border-t border-neutral-200 dark:border-neutral-700';
const CHECKBOX = 'h-4 w-4 text-primary rounded border-neutral-300 dark:border-neutral-600 dark:bg-neutral-900 focus:ring-primary';

const toLocalInput = (iso?: string | null, withTime = true) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  const date = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  return withTime ? `${date}T${p(d.getHours())}:${p(d.getMinutes())}` : date;
};

const formFromLead = (l: Lead) => ({
  name: l.name || '', lastName: l.lastName || '', companyName: l.companyName || '',
  email: l.email || '', phone: l.phone || '', whatsapp: l.whatsapp || '',
  value: l.value != null ? String(l.value) : '', probability: l.probability != null ? String(l.probability) : '',
  sourceId: l.sourceId || '', notes: l.notes || '',
  nextActionAt: toLocalInput(l.nextActionAt), expectedCloseAt: toLocalInput(l.expectedCloseAt, false),
});

export const LeadDetailModal: React.FC<Props> = ({ lead: initialLead, pipelines, sources, tags, customFields, lostReasons, onClose, onChanged, onDeleted, onTagCreated }) => {
  const { setClients } = useData();
  const { can } = usePermissions();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const activityLabel = (type: string) => ACTIVITY_META[type] ? t(`leads.common.activity.${type}`) : type;

  const [lead, setLead] = useState<Lead>(initialLead);
  const [activities, setActivities] = useState<LeadActivity[]>(initialLead.activities || []);
  const [leadNotes, setLeadNotes] = useState<LeadNote[]>(initialLead.leadNotes || []);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [tab, setTab] = useState<'activity' | 'notes' | 'history' | 'products'>('activity');
  const [itemCount, setItemCount] = useState(0);
  const [itemsReloadKey, setItemsReloadKey] = useState(0);

  const [form, setForm] = useState(() => formFromLead(initialLead));
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
  const canEstimate = canEdit && can('estimates.manage');
  const canMerge = canEdit && can('leads.delete');

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
    catch (err) { setTagIds(prevIds); toast.error(err instanceof ApiError ? err.message : t('leads.detail.toast.tag_save_failed')); }
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error(t('leads.detail.toast.name_required')); return; }
    const missing = customFields.filter(f => f.required && (cf[f.id] === undefined || cf[f.id] === '' || cf[f.id] === null));
    if (missing.length) { toast.error(t('leads.detail.toast.complete_required', { fields: missing.map(m => m.label).join(', ') })); return; }
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
      toast.success(t('leads.detail.toast.updated'));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('leads.detail.toast.update_failed'));
    } finally { setSaving(false); }
  };

  const doMoveStage = async (stageId: string, reason?: string) => {
    try {
      const updated = await leadsService.moveStage(lead.id, stageId, reason ? { lostReason: reason } : undefined);
      patchLead(updated);
      toast.success(t('leads.detail.toast.stage_updated'));
      leadsService.get(lead.id).then(full => setLead(l => ({ ...l, history: full.history }))).catch(() => {});
    } catch (err) { toast.error(err instanceof ApiError ? err.message : t('leads.detail.toast.move_failed')); }
  };

  const onStageSelect = (stageId: string) => {
    const st = stages.find(s => s.id === stageId);
    if (st?.type === 'lost') { setAskLostFor(stageId); setLostChoice(lostReasons[0] || '__other'); setLostOther(''); return; }
    doMoveStage(stageId);
  };

  const handleAssign = async (uid: string) => {
    try { patchLead(await leadsService.assign(lead.id, uid || null)); }
    catch (err) { toast.error(err instanceof ApiError ? err.message : t('leads.detail.toast.assign_failed')); }
  };

  const handleConvert = async () => {
    try {
      const res = await leadsService.convert(lead.id);
      const won = stages.find(s => s.type === 'won');
      patchLead({ status: 'won', convertedClientId: res.clientId, ...(won ? { stageId: won.id } : {}) });
      toast.success(res.alreadyConverted ? t('leads.detail.toast.already_client') : t('leads.detail.toast.converted'));
      // Recarga la lista de clientes para que "Ver cliente →" encuentre el nuevo.
      api.get<any[]>('/clients').then(list => { if (Array.isArray(list)) setClients(list as any); }).catch(() => {});
    } catch (err) { toast.error(err instanceof ApiError ? err.message : t('leads.detail.toast.convert_failed')); }
  };

  const handleDelete = async () => {
    setShowDelete(false);
    try { await leadsService.remove(lead.id); onDeleted(lead.id); onClose(); }
    catch (err) { toast.error(err instanceof ApiError ? err.message : t('leads.detail.toast.delete_failed')); }
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
    } catch (err) { toast.error(err instanceof ApiError ? err.message : t('leads.detail.toast.tag_create_failed')); }
  };

  const handleAddActivity = async () => {
    if (!actBody.trim() && !actDue) { toast.error(t('leads.detail.toast.activity_empty')); return; }
    setAddingAct(true);
    try {
      const act = await leadsService.addActivity(lead.id, {
        type: actType, body: actBody.trim() || null,
        dueAt: actDue ? new Date(actDue).toISOString() : null, done: !actDue,
      });
      setActivities(prev => [act, ...prev]);
      setActBody(''); setActDue('');
      leadsService.get(lead.id).then(full => patchLead({ nextActionAt: full.nextActionAt, lastActivityAt: full.lastActivityAt })).catch(() => {});
    } catch (err) { toast.error(err instanceof ApiError ? err.message : t('leads.detail.toast.activity_failed')); }
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
    catch { setActivities(prev => [act, ...prev]); toast.error(t('leads.detail.toast.delete_failed')); }
  };

  const handleNoteImage = async (files: File[]) => {
    const img = files.filter(f => f.type.startsWith('image/'))[0];
    if (!img) return;
    if (img.size > 5 * 1024 * 1024) { toast.error(t('leads.detail.toast.image_too_large')); return; }
    setUploadingNote(true);
    try { setNoteImage(await uploadImage(img)); } catch { toast.error(t('leads.detail.toast.image_upload_failed')); }
    finally { setUploadingNote(false); }
  };

  const handleAddNote = async () => {
    const text = noteText.trim();
    if (!text && !noteImage) return;
    try {
      const note = await leadsService.addNote(lead.id, text, noteImage);
      setLeadNotes(prev => [note, ...prev]);
      setNoteText(''); setNoteImage(null);
    } catch (err) { toast.error(err instanceof ApiError ? err.message : t('leads.detail.toast.note_failed')); }
  };

  const openTemplates = async () => {
    setTplOpen(true); setTplId(''); setTplPreview(null);
    try { setTemplates(await leadsService.listTemplates()); } catch { setTemplates([]); }
  };
  const pickTemplate = async (id: string) => {
    setTplId(id); setTplPreview(null);
    if (!id) return;
    try { setTplPreview(await leadsService.previewTemplate(id, lead.id)); } catch (err) { toast.error(err instanceof ApiError ? err.message : t('leads.detail.toast.preview_failed')); }
  };
  const refreshActivities = () => leadsService.get(lead.id).then(full => { setActivities(full.activities || []); patchLead({ lastActivityAt: full.lastActivityAt }); }).catch(() => {});
  const sendTpl = async () => {
    if (!tplId) return;
    setTplSending(true);
    try {
      const r = await leadsService.sendTemplate(lead.id, tplId);
      toast.success(r.detail || t('leads.detail.toast.sent'));
      setTplOpen(false);
      refreshActivities();
    } catch (err) { toast.error(err instanceof ApiError ? err.message : t('leads.detail.toast.send_failed')); }
    finally { setTplSending(false); }
  };
  /** Alternativa sin API de WhatsApp: abre wa.me con el texto y lo registra como actividad. */
  const openWhatsappWithText = async () => {
    if (!tplPreview) return;
    const phone = (lead.whatsapp || lead.phone || '').replace(/\D/g, '');
    if (!phone) { toast.error(t('leads.detail.toast.no_phone')); return; }
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(tplPreview.body)}`, '_blank', 'noopener');
    try { await leadsService.addActivity(lead.id, { type: 'whatsapp', title: templates.find(t => t.id === tplId)?.name || 'WhatsApp', body: tplPreview.body, done: true }); refreshActivities(); } catch { /* noop */ }
    setTplOpen(false);
  };

  // ── Productos / cotización ──
  const handleValueSynced = (value: number | null) => {
    patchLead({ value });
    setForm(f => ({ ...f, value: value != null ? String(value) : '' }));
  };
  const handleEstimateCreated = (res: { estimateId: string; clientId: string; clientCreated: boolean }) => {
    patchLead({ lastEstimateId: res.estimateId, ...(res.clientId ? { clientId: res.clientId } : {}) });
    refreshActivities(); // el backend registra la cotización como actividad
    // Cliente nuevo: recarga la lista para que "Ver cliente →" lo encuentre.
    if (res.clientCreated) api.get<any[]>('/clients').then(list => { if (Array.isArray(list)) setClients(list as any); }).catch(() => {});
  };
  const openEstimate = (estimateId: string) => {
    onClose();
    navigate(`/pos/estimates?estimate=${encodeURIComponent(estimateId)}`);
  };

  // ── Duplicados: fusión ──
  const handleMerged = (merged: Lead, sourceId: string) => {
    setLead(prev => ({ ...prev, ...merged }));
    onChanged(merged);
    onDeleted(sourceId);
    setForm(formFromLead(merged));
    setTagIds(merged.tagIds || []);
    setCf(merged.customFields || {});
    setItemsReloadKey(k => k + 1);
    leadsService.get(lead.id).then(full => {
      setLead(full);
      setActivities(full.activities || []);
      setLeadNotes(full.leadNotes || []);
      setTagIds(full.tagIds || []);
      setCf(full.customFields || {});
      setForm(formFromLead(full));
    }).catch(() => {});
  };

  const statusBadge = lead.status === 'won'
    ? <span className={`${BADGE} bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300`}>{t('leads.common.status.won')}</span>
    : lead.status === 'lost'
      ? <span className={`${BADGE} bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300`} title={lead.lostReason || ''}>{t('leads.common.status.lost')}{lead.lostReason ? ` · ${lead.lostReason}` : ''}</span>
      : <span className={`${BADGE} bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300`}>{t('leads.common.status.open')}</span>;

  // Cliente vinculado: lead creado desde la ficha de un cliente (clientId) o convertido (convertedClientId).
  const linkedClientId = lead.clientId || lead.convertedClientId;
  const linkedOnly = !!lead.clientId && !lead.convertedClientId;

  const label = (text: string) => <label className={LABEL}>{text}</label>;
  const inp = (key: keyof typeof form, type = 'text', extra: any = {}) => (
    <input type={type} value={form[key]} disabled={!canEdit} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} className={inputFormStyle} {...extra} />
  );

  const renderCustomField = (f: LeadCustomField) => {
    const v = cf[f.id];
    const set = (val: any) => setCf(prev => ({ ...prev, [f.id]: val }));
    if (f.type === 'checkbox') return (
      <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-200 mt-2 cursor-pointer"><input type="checkbox" disabled={!canEdit} checked={!!v} onChange={e => set(e.target.checked)} className={CHECKBOX} /> {t('leads.common.yes')}</label>
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

  const TABS = [
    ['activity', t('leads.detail.tab.activities', { count: activities.length })],
    ['notes', t('leads.detail.tab.notes', { count: leadNotes.length })],
    ['history', t('leads.detail.tab.history')],
    ['products', t('leads.detail.tab.products', { count: itemCount })],
  ] as const;

  return (
    <>
      <Modal isOpen={true} onClose={onClose} title={t('leads.detail.title')} size="3xl">
        <div className="space-y-4">
          {/* Posibles duplicados */}
          <LeadMergePanel lead={lead} canMerge={canMerge} stageName={stageName} onMerged={handleMerged} />

          {/* Cabecera */}
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <h3 className="text-xl font-semibold text-neutral-800 dark:text-neutral-100 truncate"><span translate="no">{lead.name} {lead.lastName}</span></h3>
              {lead.companyName && <p className="text-sm text-neutral-500 dark:text-neutral-400"><span translate="no">{lead.companyName}</span></p>}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {statusBadge}
              {linkedClientId && (
                <button type="button" onClick={() => navigate(`/tienda/clients?edit=${linkedClientId}`)} className={`${BADGE} bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300 hover:underline`}>{linkedOnly ? t('leads.detail.linked_client') : t('leads.detail.view_client')}</button>
              )}
            </div>
          </div>

          {/* Etiquetas */}
          {(tagIds.length > 0 || canEdit) && (
            <div className="flex flex-wrap items-center gap-1.5">
              {tagIds.map(id => {
                const t = tags.find(x => x.id === id);
                return t ? <TagChip key={id} tag={t} onRemove={canEdit ? () => saveTags(tagIds.filter(x => x !== id)) : undefined} /> : null;
              })}
              {canEdit && (
                <>
                  <select value="" onChange={e => addTagById(e.target.value)} className={`${INPUT_SM_CLASSES} !h-8 !py-1 text-xs`}>
                    <option value="">{t('leads.detail.add_tag')}</option>
                    {tags.filter(t => !tagIds.includes(t.id)).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  <input value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); createAndAddTag(); } }} placeholder={t('leads.detail.new_tag_ph')} className={`${INPUT_SM_CLASSES} !h-8 !py-1 text-xs w-36`} />
                </>
              )}
            </div>
          )}

          {/* Etapa / responsable / valor / probabilidad */}
          <div className={`grid grid-cols-1 sm:grid-cols-4 gap-4 ${SECTION}`}>
            <div>{label(t('leads.common.stage'))}
              <select value={lead.stageId} disabled={!canStage} onChange={e => onStageSelect(e.target.value)} className={inputFormStyle}>
                {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>{label(t('leads.common.assignee'))}
              <select value={lead.assignedUserId || ''} disabled={!canAssign} onChange={e => handleAssign(e.target.value)} className={inputFormStyle}>
                <option value="">{t('leads.common.unassigned')}</option>
                {assigneeOptions.map(o => <option key={o.uid} value={o.uid}>{o.name}</option>)}
              </select>
            </div>
            <div>{label(t('leads.detail.estimated_value'))}{inp('value', 'number', { step: '0.01', placeholder: '0.00' })}</div>
            <div>{label(t('leads.detail.probability_pct'))}{inp('probability', 'number', { min: 0, max: 100, placeholder: t('leads.detail.auto') })}</div>
          </div>

          {/* Contacto */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>{label(t('leads.common.first_name'))}{inp('name')}</div>
            <div>{label(t('leads.common.last_name'))}{inp('lastName')}</div>
            <div>{label(t('leads.common.company'))}{inp('companyName')}</div>
            <div>{label(t('leads.common.email'))}{inp('email', 'email')}</div>
            <div>{label(t('leads.common.phone'))}{inp('phone', 'tel')}</div>
            <div>{label(t('leads.common.channel.whatsapp'))}{inp('whatsapp', 'tel')}</div>
            <div>{label(t('leads.common.source'))}
              <select value={form.sourceId} disabled={!canEdit} onChange={e => setForm(f => ({ ...f, sourceId: e.target.value }))} className={inputFormStyle}>
                <option value="">—</option>
                {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>{label(t('leads.common.expected_close'))}{inp('expectedCloseAt', 'date')}</div>
            <div className="sm:col-span-2">{label(t('leads.common.next_action'))}{inp('nextActionAt', 'datetime-local')}</div>
          </div>

          {/* Campos personalizados */}
          {customFields.length > 0 && (
            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${SECTION}`}>
              {customFields.map(f => (
                <div key={f.id}>{label(`${f.label}${f.required ? ' *' : ''}`)}{renderCustomField(f)}</div>
              ))}
            </div>
          )}

          <div>{label(t('leads.detail.quick_notes'))}<textarea rows={2} value={form.notes} disabled={!canEdit} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className={inputFormStyle + ' !h-auto'} /></div>

          {canEdit && (
            <div className="flex justify-end">
              <button onClick={handleSave} disabled={saving} className={`${BUTTON_PRIMARY_SM_CLASSES} disabled:opacity-50`}>{saving ? t('leads.common.saving') : t('leads.detail.save_data')}</button>
            </div>
          )}

          {/* Pestañas: actividad / notas / historial / productos */}
          <div className="pt-2">
            <div className="flex border-b border-neutral-200 dark:border-neutral-700 mb-4 overflow-x-auto">
              {TABS.map(([k, l]) => (
                <button key={k} type="button" onClick={() => setTab(k)} className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${tab === k ? 'border-b-2 border-primary text-primary' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'}`}>{l}</button>
              ))}
            </div>

            {tab === 'activity' && (
              <>
                {canEdit && (
                  <div className="flex flex-wrap items-stretch gap-2 mb-3">
                    <select value={actType} onChange={e => setActType(e.target.value as any)} className={inputFormStyle + ' !w-auto'}>
                      {Object.keys(ACTIVITY_META).map(k => <option key={k} value={k}>{activityLabel(k)}</option>)}
                    </select>
                    <input value={actBody} onChange={e => setActBody(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddActivity(); } }} placeholder={t('leads.detail.activity_ph')} className={inputFormStyle + ' flex-1 min-w-[160px]'} />
                    <input type="datetime-local" value={actDue} onChange={e => setActDue(e.target.value)} title={t('leads.detail.schedule_hint')} className={inputFormStyle + ' !w-auto'} />
                    <button onClick={handleAddActivity} disabled={addingAct} className={`${BUTTON_SECONDARY_SM_CLASSES} disabled:opacity-50`}>{actDue ? t('leads.detail.schedule') : t('leads.detail.log')}</button>
                  </div>
                )}
                {loadingDetail ? <p className="text-sm text-neutral-400 text-center py-4">{t('leads.common.loading')}</p> : (
                  <ul className="space-y-1 max-h-64 overflow-y-auto pr-1">
                    {activities.length === 0 && <li className="text-sm text-center text-neutral-500 dark:text-neutral-400 py-4">{t('leads.detail.no_activities')}</li>}
                    {activities.map(a => {
                      const overdue = !a.done && a.dueAt && new Date(a.dueAt).getTime() < Date.now();
                      const Icon = ACTIVITY_ICON[a.type] || DocumentTextIcon;
                      return (
                        <li key={a.id} className="flex items-start gap-2 group p-1.5 rounded hover:bg-neutral-50 dark:hover:bg-neutral-700/50">
                          <input type="checkbox" checked={a.done} disabled={!canEdit} onChange={() => toggleActivityDone(a)} className={`${CHECKBOX} mt-1.5 flex-shrink-0`} title={t('leads.detail.mark_done')} />
                          <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary dark:text-teal-300 flex items-center justify-center flex-shrink-0"><Icon className="w-4 h-4" /></span>
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm ${a.done ? 'text-neutral-500 dark:text-neutral-400' : 'text-neutral-700 dark:text-neutral-200'}`}><span className="font-semibold">{a.title || activityLabel(a.type)}</span>{a.body ? `: ${a.body}` : ''}</p>
                            <p className="text-xs text-neutral-400">
                              {a.createdByName || ''} · {new Date(a.createdAt).toLocaleString()}
                              {a.dueAt && <span className={overdue ? 'text-red-500 dark:text-red-400 font-semibold' : ''}> · {overdue ? t('leads.detail.overdue') : t('leads.detail.scheduled')} {new Date(a.dueAt).toLocaleString()}</span>}
                            </p>
                          </div>
                          {canEdit && <button type="button" onClick={() => deleteActivity(a)} className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-500 transition-opacity p-0.5 flex-shrink-0" aria-label={t('leads.detail.delete_activity')} title={t('leads.detail.delete_activity')}><XMarkIcon className="w-4 h-4" /></button>}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </>
            )}

            {tab === 'notes' && (
              <>
                <div className="space-y-3 max-h-48 overflow-y-auto pr-2 bg-neutral-50 dark:bg-neutral-700/50 p-2 rounded-md">
                  {leadNotes.length === 0 && <p className="text-sm text-center text-neutral-500 dark:text-neutral-400 py-2">{t('leads.detail.no_notes')}</p>}
                  {leadNotes.map(n => (
                    <div key={n.id} className="text-base">
                      <div className="flex justify-between items-baseline">
                        <span className="font-semibold text-primary/80 dark:text-accent/80">{n.authorName || t('leads.detail.user_fallback')}</span>
                        <span className="text-xs text-neutral-400">{new Date(n.createdAt).toLocaleString()}</span>
                      </div>
                      {n.text && <p className="text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-600/50 p-1.5 rounded whitespace-pre-wrap">{n.text}</p>}
                      {n.imageUrl && <button type="button" onClick={() => setZoomImage(n.imageUrl!)} className="inline-block mt-1"><img src={n.imageUrl} alt="" className="max-h-40 rounded border border-neutral-200 dark:border-neutral-600 cursor-zoom-in" /></button>}
                    </div>
                  ))}
                </div>
                {canEdit && (
                  <>
                    {noteImage && (
                      <div className="mt-3 relative inline-block">
                        <img src={noteImage} alt="" className="h-20 rounded border border-neutral-300 dark:border-neutral-600" />
                        <button onClick={() => setNoteImage(null)} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow" aria-label={t('leads.common.delete')}><XMarkIcon className="w-3 h-3" /></button>
                      </div>
                    )}
                    <div className="flex items-stretch gap-2 mt-3">
                      <input value={noteText} onChange={e => setNoteText(e.target.value)} onPaste={e => { const f = Array.from(e.clipboardData?.files || []).filter(x => x.type.startsWith('image/')); if (f.length) { e.preventDefault(); handleNoteImage(f); } }} placeholder={t('leads.detail.note_ph')} className={inputFormStyle + ' flex-grow'} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddNote(); } }} />
                      <input ref={noteFileRef} type="file" accept="image/*" className="hidden" onChange={e => { handleNoteImage(Array.from(e.target.files || [])); e.currentTarget.value = ''; }} />
                      <button type="button" onClick={() => noteFileRef.current?.click()} disabled={uploadingNote} className="flex-shrink-0 px-3 rounded-md border border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center justify-center disabled:opacity-50">{uploadingNote ? '…' : <PhotoIcon className="w-5 h-5" />}</button>
                      <button type="button" onClick={handleAddNote} disabled={!noteText.trim() && !noteImage} className="flex-shrink-0 px-4 rounded-md bg-primary text-white hover:bg-primary/90 flex items-center justify-center disabled:opacity-50" aria-label={t('leads.detail.save_note')}><PaperAirplaneIcon className="w-4 h-4" /></button>
                    </div>
                  </>
                )}
              </>
            )}

            {tab === 'history' && (
              <ul className="space-y-1 max-h-64 overflow-y-auto pr-1">
                {(lead.history || []).length === 0 && <li className="text-sm text-center text-neutral-500 dark:text-neutral-400 py-4">{t('leads.detail.no_history')}</li>}
                {(lead.history || []).map(h => (
                  <li key={h.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-neutral-50 dark:hover:bg-neutral-700/50">
                    <span className="w-7 h-7 rounded-lg bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-300 flex items-center justify-center flex-shrink-0"><ArrowPathIcon className="w-4 h-4" /></span>
                    <span className="flex-1 min-w-0 text-sm text-neutral-700 dark:text-neutral-200">{h.fromStageId ? `${stageName(h.fromStageId)} → ` : `${t('leads.detail.created_in')} `}<span className="font-semibold">{stageName(h.toStageId)}</span></span>
                    <span className="text-xs text-neutral-400 flex-shrink-0 flex items-center gap-1"><ClockIcon className="w-3.5 h-3.5" />{new Date(h.at).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            )}

            {/* Productos: siempre montado (oculto) para cargar el conteo y no perder cambios sin guardar al cambiar de pestaña. */}
            <div className={tab === 'products' ? '' : 'hidden'}>
              <LeadItemsTab
                leadId={lead.id}
                canEdit={canEdit}
                canEstimate={canEstimate}
                lastEstimateId={lead.lastEstimateId}
                reloadKey={itemsReloadKey}
                onCountChange={setItemCount}
                onValueSynced={handleValueSynced}
                onEstimateCreated={handleEstimateCreated}
                onOpenEstimate={openEstimate}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center pt-4 border-t border-neutral-200 dark:border-neutral-700 flex-wrap gap-2">
            <div className="flex gap-2 flex-wrap">
              {can('leads.delete') && <button onClick={() => setShowDelete(true)} className={`${BUTTON_SECONDARY_SM_CLASSES} text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/50 flex items-center`}><DeleteIcon className="w-4 h-4 mr-1" />{t('leads.common.delete')}</button>}
              {canConvert && !lead.convertedClientId && <button onClick={handleConvert} className={`${BUTTON_SECONDARY_SM_CLASSES} text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-900/30 flex items-center`}><UserPlusIcon className="w-4 h-4 mr-1" />{t('leads.detail.convert')}</button>}
              {(lead.whatsapp || lead.phone) && (
                <a href={`https://wa.me/${(lead.whatsapp || lead.phone || '').replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className={`${BUTTON_SECONDARY_SM_CLASSES} text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/30 flex items-center`}><ChatBubbleLeftRightIcon className="w-4 h-4 mr-1" />{t('leads.common.channel.whatsapp')}</a>
              )}
              {lead.email && <a href={`mailto:${lead.email}`} className={`${BUTTON_SECONDARY_SM_CLASSES} flex items-center`}><EnvelopeIcon className="w-4 h-4 mr-1" />{t('leads.common.email')}</a>}
              {canEdit && (lead.email || lead.phone || lead.whatsapp) && <button type="button" onClick={openTemplates} className={`${BUTTON_SECONDARY_SM_CLASSES} text-primary hover:bg-primary/10 flex items-center`}><PaperAirplaneIcon className="w-4 h-4 mr-1" />{t('leads.detail.send_template_btn')}</button>}
            </div>
            <button onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>{t('leads.common.close')}</button>
          </div>
        </div>
      </Modal>

      {/* Motivo de pérdida (catálogo configurable) */}
      <Modal isOpen={!!askLostFor} onClose={() => setAskLostFor(null)} title={t('leads.detail.lost_title')} size="sm">
        <div className="space-y-4">
          <div>
            <label className={LABEL}>{t('leads.detail.lost_reason_label')}</label>
            <select value={lostChoice} onChange={e => setLostChoice(e.target.value)} className={inputFormStyle}>
              {lostReasons.map(r => <option key={r} value={r}>{r}</option>)}
              <option value="__other">{t('leads.detail.lost_other')}</option>
            </select>
          </div>
          {lostChoice === '__other' && <input value={lostOther} onChange={e => setLostOther(e.target.value)} className={inputFormStyle} placeholder={t('leads.detail.lost_other_ph')} autoFocus />}
          <div className="flex justify-end gap-2 pt-4 border-t border-neutral-200 dark:border-neutral-700">
            <button onClick={() => setAskLostFor(null)} className={BUTTON_SECONDARY_SM_CLASSES}>{t('leads.common.cancel')}</button>
            <button disabled={!(lostChoice === '__other' ? lostOther.trim() : lostChoice)} onClick={() => { const s = askLostFor!; setAskLostFor(null); doMoveStage(s, (lostChoice === '__other' ? lostOther.trim() : lostChoice) || undefined); }} className={`${BUTTON_PRIMARY_SM_CLASSES} disabled:opacity-50`}>{t('leads.common.confirm')}</button>
          </div>
        </div>
      </Modal>

      {/* Enviar plantilla */}
      <Modal isOpen={tplOpen} onClose={() => setTplOpen(false)} title={t('leads.detail.send_template_title')} size="lg">
        <div className="space-y-4">
          {templates.length === 0 ? (
            <div className="p-4 rounded-md bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 flex items-start gap-3">
              <DocumentTextIcon className="w-5 h-5 text-neutral-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-neutral-600 dark:text-neutral-300">{t('leads.detail.no_templates')}</p>
            </div>
          ) : (
            <select value={tplId} onChange={e => pickTemplate(e.target.value)} className={inputFormStyle}>
              <option value="">{t('leads.detail.pick_template')}</option>
              {templates.filter(t => t.channel !== 'email' || lead.email).filter(t => t.channel !== 'whatsapp' || lead.whatsapp || lead.phone).map(tp => (
                <option key={tp.id} value={tp.id}>{t(tp.channel === 'email' ? 'leads.common.channel.email' : 'leads.common.channel.whatsapp')} · {tp.name}</option>
              ))}
            </select>
          )}
          {tplPreview && (
            <div className="rounded-md border border-neutral-200 dark:border-neutral-700 p-3 bg-neutral-50 dark:bg-neutral-900 text-sm">
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">{t('leads.detail.to')} <span translate="no">{tplPreview.to || '—'}</span></p>
              {tplPreview.channel === 'email' && <p className="font-semibold text-neutral-800 dark:text-neutral-100 mb-1">{tplPreview.subject}</p>}
              <p className="whitespace-pre-wrap text-neutral-700 dark:text-neutral-200">{tplPreview.body}</p>
            </div>
          )}
          {tplPreview?.channel === 'whatsapp' && <p className="text-xs text-neutral-500 dark:text-neutral-400">{t('leads.detail.whatsapp_hint')}</p>}
          <div className="flex justify-end gap-2 flex-wrap pt-4 border-t border-neutral-200 dark:border-neutral-700">
            <button onClick={() => setTplOpen(false)} className={BUTTON_SECONDARY_SM_CLASSES}>{t('leads.common.cancel')}</button>
            {tplPreview?.channel === 'whatsapp' && <button onClick={openWhatsappWithText} className={`${BUTTON_SECONDARY_SM_CLASSES} text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/30 flex items-center`}><ChatBubbleLeftRightIcon className="w-4 h-4 mr-1" />{t('leads.detail.open_whatsapp')}</button>}
            <button onClick={sendTpl} disabled={!tplPreview || tplSending} className={`${BUTTON_PRIMARY_SM_CLASSES} flex items-center disabled:opacity-50`}><PaperAirplaneIcon className="w-4 h-4 mr-1" />{tplSending ? t('leads.detail.sending') : tplPreview?.channel === 'whatsapp' ? t('leads.detail.send_api') : t('leads.detail.send_email')}</button>
          </div>
        </div>
      </Modal>

      <ConfirmationModal isOpen={showDelete} onClose={() => setShowDelete(false)} onConfirm={handleDelete} title={t('leads.detail.delete_title')} message={t('leads.detail.delete_message', { name: lead.name })} confirmButtonText={t('leads.common.delete')} />

      {zoomImage && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setZoomImage(null)} role="dialog">
          <img src={zoomImage} alt="" className="max-w-full max-h-full object-contain rounded shadow-2xl" onClick={e => e.stopPropagation()} />
          <button type="button" onClick={() => setZoomImage(null)} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 text-neutral-800 flex items-center justify-center shadow hover:bg-white" aria-label={t('leads.common.close')}><XMarkIcon className="w-6 h-6" /></button>
        </div>
      )}
    </>
  );
};
