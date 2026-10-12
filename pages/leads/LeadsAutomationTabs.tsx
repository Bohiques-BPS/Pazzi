import React, { useEffect, useMemo, useState } from 'react';
import {
  Pipeline, LeadSource, LeadTag, LeadRule, LeadRuleAction, LeadRuleConditions, LeadTrigger, LeadRuleRun,
  LeadTemplate, SalesTeam, LeadWebhook, LeadApiKey, SalesGoal, GoalMetric, LeadSettings,
} from '../../types';
import { leadsService } from '../../services/leads';
import { API_URL, ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';
import { Modal, ConfirmationModal } from '../../components/Modal';
import { inputFormStyle, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';

type Assignee = { uid: string; name: string };
const err = (e: unknown, fallback: string) => toast.error(e instanceof ApiError ? e.message : fallback);
const copy = async (text: string) => { try { await navigator.clipboard.writeText(text); toast.success('Copiado.'); } catch { toast.error('No se pudo copiar.'); } };

export const TRIGGER_LABEL: Record<LeadTrigger, string> = {
  lead_created: 'Cuando se crea un lead',
  stage_changed: 'Cuando un lead cambia de etapa',
  lead_won: 'Cuando un lead se gana',
  lead_lost: 'Cuando un lead se pierde',
  lead_assigned: 'Cuando se asigna un responsable',
  no_activity: 'Cuando un lead pasa N días sin actividad',
};
const ACTION_LABEL: Record<LeadRuleAction['type'], string> = {
  assign: 'Asignar a una persona',
  round_robin: 'Repartir en un equipo',
  add_tag: 'Añadir etiqueta',
  remove_tag: 'Quitar etiqueta',
  move_stage: 'Mover a etapa',
  create_activity: 'Crear actividad / tarea',
  notify: 'Enviar notificación interna',
  send_email: 'Enviar correo (plantilla)',
  send_whatsapp: 'Enviar WhatsApp (plantilla)',
  webhook: 'Llamar a un webhook',
};
const VARIABLES = ['nombre', 'apellido', 'nombre_completo', 'empresa', 'correo', 'telefono', 'valor', 'etapa', 'pipeline', 'fuente', 'responsable', 'negocio'];
const ACTIVITY_TYPES: Record<string, string> = { call: '📞 Llamada', email: '✉️ Correo', whatsapp: '💬 WhatsApp', meeting: '📅 Reunión', note: '📝 Nota', task: '✅ Tarea' };

interface Ctx {
  pipelines: Pipeline[];
  sources: LeadSource[];
  tags: LeadTag[];
  assignees: Assignee[];
}

// ═════════════════════════════════════════════
// AUTOMATIZACIONES
// ═════════════════════════════════════════════

export const RulesTab: React.FC<Ctx> = ({ pipelines, sources, tags, assignees }) => {
  const [rules, setRules] = useState<LeadRule[]>([]);
  const [templates, setTemplates] = useState<LeadTemplate[]>([]);
  const [teams, setTeams] = useState<SalesTeam[]>([]);
  const [editing, setEditing] = useState<Partial<LeadRule> | null>(null);
  const [toDelete, setToDelete] = useState<LeadRule | null>(null);
  const [runs, setRuns] = useState<LeadRuleRun[] | null>(null);
  const [runsFor, setRunsFor] = useState<string>('');

  const allStages = useMemo(() => pipelines.flatMap(p => p.stages.map(s => ({ ...s, label: pipelines.length > 1 ? `${p.name} · ${s.name}` : s.name }))), [pipelines]);
  const load = async () => {
    const [r, t, tm] = await Promise.all([leadsService.listRules(), leadsService.listTemplates(), leadsService.listTeams()]);
    setRules(r); setTemplates(t); setTeams(tm);
  };
  useEffect(() => { load().catch(e => err(e, 'No se pudieron cargar las automatizaciones.')); }, []);

  const toggle = async (r: LeadRule) => {
    try { await leadsService.updateRule(r.id, { active: !r.active }); setRules(prev => prev.map(x => x.id === r.id ? { ...x, active: !r.active } : x)); }
    catch (e) { err(e, 'No se pudo actualizar.'); }
  };
  const openRuns = async (ruleId: string) => {
    setRunsFor(ruleId);
    try { setRuns(await leadsService.listRuns(ruleId || undefined)); } catch (e) { err(e, 'No se pudo cargar el historial.'); }
  };

  const name = (list: { id: string; name?: string; label?: string }[], id?: string | null) => { const x = list.find(i => i.id === id); return x ? (x as any).label || x.name : '—'; };
  const condSummary = (c?: LeadRuleConditions | null) => {
    if (!c) return 'Todos los leads';
    const parts: string[] = [];
    if (c.pipelineId) parts.push(`pipeline ${name(pipelines, c.pipelineId)}`);
    if (c.stageId) parts.push(`etapa ${name(allStages, c.stageId)}`);
    if (c.sourceId) parts.push(`fuente ${name(sources, c.sourceId)}`);
    if (c.tagId) parts.push(`etiqueta ${name(tags, c.tagId)}`);
    if (c.minValue != null) parts.push(`valor ≥ $${c.minValue}`);
    if (c.maxValue != null) parts.push(`valor ≤ $${c.maxValue}`);
    return parts.length ? parts.join(', ') : 'Todos los leads';
  };
  const actionSummary = (a: LeadRuleAction) => {
    switch (a.type) {
      case 'assign': return `Asignar a ${assignees.find(x => x.uid === a.userId)?.name || '—'}`;
      case 'round_robin': return `Repartir en equipo ${teams.find(t => t.id === a.teamId)?.name || '—'}`;
      case 'add_tag': return `Etiquetar "${name(tags, a.tagId)}"`;
      case 'remove_tag': return `Quitar "${name(tags, a.tagId)}"`;
      case 'move_stage': return `Mover a ${name(allStages, a.stageId)}`;
      case 'create_activity': return `${ACTIVITY_TYPES[a.activityType] || 'Actividad'}${a.dueInHours ? ` en ${a.dueInHours}h` : ''}`;
      case 'notify': return `Notificar a ${a.target === 'assignee' ? 'responsable' : a.target === 'managers' ? 'gerentes' : assignees.find(x => x.uid === a.userId)?.name || 'usuario'}`;
      case 'send_email': return `Correo: ${templates.find(t => t.id === a.templateId)?.name || '—'}`;
      case 'send_whatsapp': return `WhatsApp: ${templates.find(t => t.id === a.templateId)?.name || '—'}`;
      case 'webhook': return `Webhook ${a.url}`;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-2xl">Reglas "cuando pase X → haz Y" que se ejecutan solas. Ej.: al crear un lead del formulario web, repartirlo en el equipo de ventas y crear una llamada para dentro de 2 horas.</p>
        <div className="flex gap-2">
          <button onClick={() => openRuns('')} className={BUTTON_SECONDARY_SM_CLASSES}>📜 Historial</button>
          <button onClick={() => setEditing({ name: '', trigger: 'lead_created', conditions: {}, actions: [], active: true })} className={BUTTON_PRIMARY_SM_CLASSES}>+ Nueva automatización</button>
        </div>
      </div>

      {rules.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed border-neutral-200 dark:border-neutral-700 rounded-xl">
          <p className="text-neutral-500 dark:text-neutral-400">Aún no tienes automatizaciones.</p>
          <p className="text-xs text-neutral-400 mt-1">Crea la primera para ahorrar trabajo repetitivo.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {rules.map(r => (
            <li key={r.id} className={`p-3 rounded-lg border ${r.active ? 'border-neutral-200 dark:border-neutral-700' : 'border-dashed border-neutral-300 dark:border-neutral-600 opacity-60'}`}>
              <div className="flex flex-wrap items-start gap-3">
                <label className="relative inline-flex items-center cursor-pointer mt-0.5" title={r.active ? 'Activa' : 'Pausada'}>
                  <input type="checkbox" checked={r.active} onChange={() => toggle(r)} className="sr-only peer" />
                  <span className="w-9 h-5 bg-neutral-300 dark:bg-neutral-600 rounded-full peer-checked:bg-primary transition" />
                  <span className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition peer-checked:translate-x-4" />
                </label>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-neutral-800 dark:text-neutral-100">{r.name}</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    <strong>{TRIGGER_LABEL[r.trigger]}{r.trigger === 'no_activity' ? ` (${r.conditions?.days || 7} días)` : ''}</strong> · {condSummary(r.conditions)}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {r.actions.map((a, i) => <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary dark:text-teal-300">→ {actionSummary(a)}</span>)}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-neutral-500">
                  <button onClick={() => openRuns(r.id)} className="hover:underline" title="Ver ejecuciones">{r.runCount} ejecución(es)</button>
                  <button onClick={() => setEditing(r)} className={BUTTON_SECONDARY_SM_CLASSES}>Editar</button>
                  <button onClick={() => setToDelete(r)} className="text-red-500 hover:text-red-700 px-1" aria-label={`Eliminar ${r.name}`}>🗑</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <RuleEditor
          rule={editing} pipelines={pipelines} allStages={allStages} sources={sources} tags={tags} assignees={assignees} templates={templates} teams={teams}
          onClose={() => setEditing(null)}
          onSaved={async () => { setEditing(null); await load(); }}
        />
      )}
      <ConfirmationModal isOpen={!!toDelete} onClose={() => setToDelete(null)} onConfirm={async () => { const r = toDelete!; setToDelete(null); try { await leadsService.deleteRule(r.id); await load(); } catch (e) { err(e, 'No se pudo eliminar.'); } }} title="Eliminar automatización" message={`¿Eliminar "${toDelete?.name}"?`} confirmButtonText="Eliminar" />

      <Modal isOpen={runs !== null} onClose={() => setRuns(null)} title={runsFor ? `Ejecuciones: ${rules.find(r => r.id === runsFor)?.name || ''}` : 'Historial de automatizaciones'} size="3xl">
        <div className="max-h-[60vh] overflow-y-auto">
          {(runs || []).length === 0 ? <p className="text-center text-neutral-400 py-8">Sin ejecuciones todavía.</p> : (
            <table className="min-w-full text-sm">
              <thead><tr className="text-left text-[11px] uppercase text-neutral-500"><th className="py-1.5 pr-3">Fecha</th>{!runsFor && <th className="py-1.5 pr-3">Regla</th>}<th className="py-1.5 pr-3">Lead</th><th className="py-1.5">Resultado</th></tr></thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700/60">
                {(runs || []).map(r => (
                  <tr key={r.id}>
                    <td className="py-1.5 pr-3 whitespace-nowrap text-xs text-neutral-500">{new Date(r.at).toLocaleString()}</td>
                    {!runsFor && <td className="py-1.5 pr-3">{rules.find(x => x.id === r.ruleId)?.name || '—'}</td>}
                    <td className="py-1.5 pr-3"><a href={`/leads?lead=${r.leadId}`} className="text-primary hover:underline">{r.leadName}</a></td>
                    <td className={`py-1.5 text-xs ${r.ok ? 'text-neutral-600 dark:text-neutral-300' : 'text-red-600 dark:text-red-400'}`}>{r.ok ? '✓ ' : '✕ '}{r.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Modal>
    </div>
  );
};

const emptyAction = (type: LeadRuleAction['type']): LeadRuleAction => {
  switch (type) {
    case 'assign': return { type, userId: '' };
    case 'round_robin': return { type, teamId: '' };
    case 'add_tag': case 'remove_tag': return { type, tagId: '' };
    case 'move_stage': return { type, stageId: '' };
    case 'create_activity': return { type, activityType: 'call', body: 'Llamar a {{nombre}}', dueInHours: 2 };
    case 'notify': return { type, target: 'assignee', message: 'Revisa el lead {{nombre_completo}}' };
    case 'send_email': case 'send_whatsapp': return { type, templateId: '' };
    case 'webhook': return { type, url: '' };
  }
};

const RuleEditor: React.FC<{
  rule: Partial<LeadRule>; pipelines: Pipeline[]; allStages: Array<{ id: string; label: string; pipelineId: string }>; sources: LeadSource[]; tags: LeadTag[];
  assignees: Assignee[]; templates: LeadTemplate[]; teams: SalesTeam[]; onClose: () => void; onSaved: () => void;
}> = ({ rule, pipelines, allStages, sources, tags, assignees, templates, teams, onClose, onSaved }) => {
  const [name, setName] = useState(rule.name || '');
  const [trigger, setTrigger] = useState<LeadTrigger>(rule.trigger || 'lead_created');
  const [cond, setCond] = useState<LeadRuleConditions>(rule.conditions || {});
  const [actions, setActions] = useState<LeadRuleAction[]>(rule.actions || []);
  const [saving, setSaving] = useState(false);
  const setC = (k: keyof LeadRuleConditions, v: any) => setCond(c => ({ ...c, [k]: v === '' ? null : v }));
  const setA = (i: number, patch: any) => setActions(prev => prev.map((a, j) => j === i ? ({ ...a, ...patch } as LeadRuleAction) : a));
  const stagesForCond = cond.pipelineId ? allStages.filter(s => s.pipelineId === cond.pipelineId) : allStages;
  const sel = inputFormStyle + ' !py-1.5 text-sm';

  const save = async () => {
    if (!name.trim()) { toast.error('Ponle un nombre.'); return; }
    if (!actions.length) { toast.error('Agrega al menos una acción.'); return; }
    const missing = actions.find(a =>
      (a.type === 'assign' && !a.userId) || (a.type === 'round_robin' && !a.teamId) || ((a.type === 'add_tag' || a.type === 'remove_tag') && !a.tagId) ||
      (a.type === 'move_stage' && !a.stageId) || ((a.type === 'send_email' || a.type === 'send_whatsapp') && !a.templateId) ||
      (a.type === 'webhook' && !a.url) || (a.type === 'notify' && a.target === 'user' && !a.userId));
    if (missing) { toast.error(`Completa la acción "${ACTION_LABEL[missing.type]}".`); return; }
    const conditions: LeadRuleConditions = { ...cond };
    if (trigger === 'no_activity') conditions.days = Math.max(1, Number(cond.days) || 7); else delete conditions.days;
    setSaving(true);
    try {
      if (rule.id) await leadsService.updateRule(rule.id, { name: name.trim(), trigger, conditions, actions });
      else await leadsService.createRule({ name: name.trim(), trigger, conditions, actions, active: true });
      toast.success('Automatización guardada.');
      onSaved();
    } catch (e) { err(e, 'No se pudo guardar.'); } finally { setSaving(false); }
  };

  const tplFor = (ch: 'email' | 'whatsapp') => templates.filter(t => t.channel === ch);

  return (
    <Modal isOpen={true} onClose={onClose} title={rule.id ? 'Editar automatización' : 'Nueva automatización'} size="3xl">
      <div className="space-y-5">
        <div><label className="block text-xs font-medium text-neutral-500 mb-1">Nombre</label><input value={name} onChange={e => setName(e.target.value)} placeholder="Ej. Repartir leads del formulario" className={inputFormStyle} autoFocus /></div>

        {/* 1. Cuándo */}
        <div className="p-4 rounded-lg bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800">
          <p className="text-xs font-bold uppercase tracking-wide text-sky-700 dark:text-sky-300 mb-2">1 · Cuándo</p>
          <div className="flex flex-wrap items-center gap-2">
            <select value={trigger} onChange={e => setTrigger(e.target.value as LeadTrigger)} className={sel + ' !w-auto'}>
              {(Object.keys(TRIGGER_LABEL) as LeadTrigger[]).map(t => <option key={t} value={t}>{TRIGGER_LABEL[t]}</option>)}
            </select>
            {trigger === 'no_activity' && (<><input type="number" min={1} max={365} value={cond.days ?? 7} onChange={e => setC('days', Number(e.target.value))} className={sel + ' !w-20'} /><span className="text-sm">días</span></>)}
          </div>
          {trigger === 'stage_changed' && <p className="text-xs text-sky-700 dark:text-sky-300 mt-1">Si eliges una etapa abajo, la regla corre solo cuando el lead ENTRA a esa etapa.</p>}
        </div>

        {/* 2. Condiciones */}
        <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300 mb-2">2 · Solo si (opcional)</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {pipelines.length > 1 && (
              <select value={cond.pipelineId || ''} onChange={e => { setC('pipelineId', e.target.value); setC('stageId', ''); }} className={sel}>
                <option value="">Cualquier pipeline</option>{pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
            <select value={cond.stageId || ''} onChange={e => setC('stageId', e.target.value)} className={sel}>
              <option value="">Cualquier etapa</option>{stagesForCond.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            <select value={cond.sourceId || ''} onChange={e => setC('sourceId', e.target.value)} className={sel}>
              <option value="">Cualquier fuente</option>{sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select value={cond.tagId || ''} onChange={e => setC('tagId', e.target.value)} className={sel}>
              <option value="">Cualquier etiqueta</option>{tags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <input type="number" value={cond.minValue ?? ''} onChange={e => setC('minValue', e.target.value === '' ? null : Number(e.target.value))} placeholder="Valor mínimo $" className={sel} />
            <input type="number" value={cond.maxValue ?? ''} onChange={e => setC('maxValue', e.target.value === '' ? null : Number(e.target.value))} placeholder="Valor máximo $" className={sel} />
          </div>
        </div>

        {/* 3. Acciones */}
        <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300 mb-2">3 · Entonces (en orden)</p>
          <ul className="space-y-2">
            {actions.map((a, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2 p-2 rounded-md bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 w-5">{i + 1}.</span>
                <select value={a.type} onChange={e => setActions(prev => prev.map((x, j) => j === i ? emptyAction(e.target.value as any) : x))} className={sel + ' !w-auto'}>
                  {(Object.keys(ACTION_LABEL) as LeadRuleAction['type'][]).map(t => <option key={t} value={t}>{ACTION_LABEL[t]}</option>)}
                </select>
                {a.type === 'assign' && <select value={a.userId} onChange={e => setA(i, { userId: e.target.value })} className={sel + ' !w-auto'}><option value="">— persona —</option>{assignees.map(x => <option key={x.uid} value={x.uid}>{x.name}</option>)}</select>}
                {a.type === 'round_robin' && (teams.length ? <select value={a.teamId} onChange={e => setA(i, { teamId: e.target.value })} className={sel + ' !w-auto'}><option value="">— equipo —</option>{teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select> : <span className="text-xs text-amber-600">Primero crea un equipo en la pestaña "Equipos".</span>)}
                {(a.type === 'add_tag' || a.type === 'remove_tag') && <select value={a.tagId} onChange={e => setA(i, { tagId: e.target.value })} className={sel + ' !w-auto'}><option value="">— etiqueta —</option>{tags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>}
                {a.type === 'move_stage' && <select value={a.stageId} onChange={e => setA(i, { stageId: e.target.value })} className={sel + ' !w-auto'}><option value="">— etapa —</option>{allStages.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select>}
                {a.type === 'create_activity' && (<>
                  <select value={a.activityType} onChange={e => setA(i, { activityType: e.target.value })} className={sel + ' !w-auto'}>{Object.entries(ACTIVITY_TYPES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
                  <input value={a.body || ''} onChange={e => setA(i, { body: e.target.value })} placeholder="Detalle (admite {{variables}})" className={sel + ' flex-1 min-w-[160px]'} />
                  <span className="text-xs">en</span><input type="number" min={0} value={a.dueInHours ?? 0} onChange={e => setA(i, { dueInHours: Number(e.target.value) })} className={sel + ' !w-20'} /><span className="text-xs">horas</span>
                </>)}
                {a.type === 'notify' && (<>
                  <select value={a.target} onChange={e => setA(i, { target: e.target.value })} className={sel + ' !w-auto'}><option value="assignee">al responsable</option><option value="managers">a los gerentes</option><option value="user">a una persona</option></select>
                  {a.target === 'user' && <select value={a.userId || ''} onChange={e => setA(i, { userId: e.target.value })} className={sel + ' !w-auto'}><option value="">— persona —</option>{assignees.map(x => <option key={x.uid} value={x.uid}>{x.name}</option>)}</select>}
                  <input value={a.message} onChange={e => setA(i, { message: e.target.value })} placeholder="Mensaje (admite {{variables}})" className={sel + ' flex-1 min-w-[160px]'} />
                </>)}
                {(a.type === 'send_email' || a.type === 'send_whatsapp') && (tplFor(a.type === 'send_email' ? 'email' : 'whatsapp').length
                  ? <select value={a.templateId} onChange={e => setA(i, { templateId: e.target.value })} className={sel + ' !w-auto'}><option value="">— plantilla —</option>{tplFor(a.type === 'send_email' ? 'email' : 'whatsapp').map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
                  : <span className="text-xs text-amber-600">Primero crea una plantilla de {a.type === 'send_email' ? 'correo' : 'WhatsApp'}.</span>)}
                {a.type === 'webhook' && <input value={a.url} onChange={e => setA(i, { url: e.target.value })} placeholder="https://…" className={sel + ' flex-1 min-w-[200px]'} />}
                <div className="ml-auto flex items-center gap-1">
                  <button type="button" onClick={() => setActions(prev => { if (i === 0) return prev; const n = [...prev]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; return n; })} disabled={i === 0} className="text-xs px-1 disabled:opacity-30" aria-label="Subir">▲</button>
                  <button type="button" onClick={() => setActions(prev => prev.filter((_, j) => j !== i))} className="text-red-500 hover:text-red-700 px-1" aria-label="Quitar acción">✕</button>
                </div>
              </li>
            ))}
          </ul>
          {actions.length < 10 && (
            <select value="" onChange={e => { if (e.target.value) setActions(prev => [...prev, emptyAction(e.target.value as any)]); }} className={sel + ' !w-auto mt-2'}>
              <option value="">+ Añadir acción…</option>
              {(Object.keys(ACTION_LABEL) as LeadRuleAction['type'][]).map(t => <option key={t} value={t}>{ACTION_LABEL[t]}</option>)}
            </select>
          )}
          <p className="text-[11px] text-neutral-500 mt-2">Variables: {VARIABLES.map(v => `{{${v}}}`).join(' ')}</p>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t dark:border-neutral-700">
          <button onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button>
          <button onClick={save} disabled={saving} className={BUTTON_PRIMARY_SM_CLASSES}>{saving ? 'Guardando…' : 'Guardar automatización'}</button>
        </div>
      </div>
    </Modal>
  );
};

// ═════════════════════════════════════════════
// PLANTILLAS
// ═════════════════════════════════════════════

export const TemplatesTab: React.FC = () => {
  const [list, setList] = useState<LeadTemplate[]>([]);
  const [editing, setEditing] = useState<Partial<LeadTemplate> | null>(null);
  const [toDelete, setToDelete] = useState<LeadTemplate | null>(null);
  const load = () => leadsService.listTemplates().then(setList).catch(e => err(e, 'No se pudieron cargar las plantillas.'));
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-2xl">Mensajes reutilizables con variables. Se envían desde la ficha del lead ("Enviar plantilla") o desde automatizaciones.</p>
        <div className="flex gap-2">
          <button onClick={() => setEditing({ channel: 'email', name: '', subject: '', body: 'Hola {{nombre}},\n\n' })} className={BUTTON_SECONDARY_SM_CLASSES}>+ Correo</button>
          <button onClick={() => setEditing({ channel: 'whatsapp', name: '', body: 'Hola {{nombre}}, ' })} className={BUTTON_PRIMARY_SM_CLASSES}>+ WhatsApp</button>
        </div>
      </div>
      {list.length === 0 ? <p className="text-center text-neutral-400 py-8">Sin plantillas todavía.</p> : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {list.map(t => (
            <li key={t.id} className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-neutral-800 dark:text-neutral-100 truncate">{t.channel === 'email' ? '✉️' : '💬'} {t.name}</p>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => setEditing(t)} className={BUTTON_SECONDARY_SM_CLASSES}>Editar</button>
                  <button onClick={() => setToDelete(t)} className="text-red-500 hover:text-red-700 px-1" aria-label={`Eliminar ${t.name}`}>🗑</button>
                </div>
              </div>
              {t.subject && <p className="text-xs text-neutral-500 mt-1 truncate">Asunto: {t.subject}</p>}
              <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-1 whitespace-pre-wrap line-clamp-3">{t.body}</p>
            </li>
          ))}
        </ul>
      )}
      {editing && <TemplateEditor tpl={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      <ConfirmationModal isOpen={!!toDelete} onClose={() => setToDelete(null)} onConfirm={async () => { const t = toDelete!; setToDelete(null); try { await leadsService.deleteTemplate(t.id); load(); } catch (e) { err(e, 'No se pudo eliminar.'); } }} title="Eliminar plantilla" message={`¿Eliminar "${toDelete?.name}"? Las automatizaciones que la usen dejarán de enviarla.`} confirmButtonText="Eliminar" />
    </div>
  );
};

const TemplateEditor: React.FC<{ tpl: Partial<LeadTemplate>; onClose: () => void; onSaved: () => void }> = ({ tpl, onClose, onSaved }) => {
  const [f, setF] = useState({ name: tpl.name || '', subject: tpl.subject || '', body: tpl.body || '' });
  const [saving, setSaving] = useState(false);
  const bodyRef = React.useRef<HTMLTextAreaElement>(null);
  const insert = (v: string) => {
    const el = bodyRef.current;
    const token = `{{${v}}}`;
    if (!el) { setF(p => ({ ...p, body: p.body + token })); return; }
    const start = el.selectionStart ?? f.body.length, end = el.selectionEnd ?? f.body.length;
    const next = f.body.slice(0, start) + token + f.body.slice(end);
    setF(p => ({ ...p, body: next }));
    setTimeout(() => { el.focus(); el.setSelectionRange(start + token.length, start + token.length); }, 0);
  };
  const save = async () => {
    if (!f.name.trim() || !f.body.trim()) { toast.error('Nombre y mensaje son obligatorios.'); return; }
    setSaving(true);
    try {
      const data = { channel: tpl.channel, name: f.name.trim(), subject: tpl.channel === 'email' ? (f.subject || null) : null, body: f.body } as Partial<LeadTemplate>;
      if (tpl.id) await leadsService.updateTemplate(tpl.id, data); else await leadsService.createTemplate(data);
      toast.success('Plantilla guardada.'); onSaved();
    } catch (e) { err(e, 'No se pudo guardar.'); } finally { setSaving(false); }
  };
  return (
    <Modal isOpen={true} onClose={onClose} title={`${tpl.id ? 'Editar' : 'Nueva'} plantilla de ${tpl.channel === 'email' ? 'correo' : 'WhatsApp'}`} size="lg">
      <div className="space-y-3">
        <div><label className="block text-xs font-medium text-neutral-500 mb-1">Nombre interno</label><input value={f.name} onChange={e => setF(p => ({ ...p, name: e.target.value }))} placeholder="Ej. Bienvenida" className={inputFormStyle} autoFocus /></div>
        {tpl.channel === 'email' && <div><label className="block text-xs font-medium text-neutral-500 mb-1">Asunto</label><input value={f.subject} onChange={e => setF(p => ({ ...p, subject: e.target.value }))} placeholder="Ej. {{nombre}}, gracias por contactarnos" className={inputFormStyle} /></div>}
        <div>
          <label className="block text-xs font-medium text-neutral-500 mb-1">Mensaje</label>
          <textarea ref={bodyRef} rows={8} value={f.body} onChange={e => setF(p => ({ ...p, body: e.target.value }))} className={inputFormStyle} />
          <div className="flex flex-wrap gap-1 mt-1.5">
            {VARIABLES.map(v => <button key={v} type="button" onClick={() => insert(v)} className="text-[11px] px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-primary/10 hover:text-primary">{`{{${v}}}`}</button>)}
          </div>
          {tpl.channel === 'whatsapp' && <p className="text-[11px] text-neutral-500 mt-2">Nota: WhatsApp Business solo permite mensajes libres dentro de las 24 h posteriores al último mensaje del cliente. Fuera de esa ventana, desde la ficha puedes abrirlo en WhatsApp con el texto ya escrito.</p>}
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t dark:border-neutral-700">
          <button onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button>
          <button onClick={save} disabled={saving} className={BUTTON_PRIMARY_SM_CLASSES}>{saving ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </div>
    </Modal>
  );
};

// ═════════════════════════════════════════════
// EQUIPOS (round-robin)
// ═════════════════════════════════════════════

export const TeamsTab: React.FC<{ assignees: Assignee[]; settings: LeadSettings; setSettings: (s: LeadSettings) => void }> = ({ assignees, settings, setSettings }) => {
  const [teams, setTeams] = useState<SalesTeam[]>([]);
  const [editing, setEditing] = useState<Partial<SalesTeam> | null>(null);
  const [toDelete, setToDelete] = useState<SalesTeam | null>(null);
  const load = () => leadsService.listTeams().then(setTeams).catch(e => err(e, 'No se pudieron cargar los equipos.'));
  useEffect(() => { load(); }, []);
  const nameOf = (uid: string) => assignees.find(a => a.uid === uid)?.name || 'Usuario';

  const setDefault = async (teamId: string) => {
    try { await leadsService.setDefaultTeam(teamId || null); setSettings({ ...settings, defaultTeamId: teamId || null }); toast.success('Guardado.'); }
    catch (e) { err(e, 'No se pudo guardar.'); }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-2xl">Agrupa a tus vendedores para repartir leads automáticamente. <strong>Round-robin</strong>: uno a cada uno por turnos. <strong>Balanceado</strong>: al que tenga menos leads abiertos.</p>
      <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-900/40 flex flex-wrap items-center gap-2">
        <span className="text-sm">Repartir automáticamente los leads que llegan <strong>sin responsable</strong> (formulario, e-commerce, WhatsApp, API) con:</span>
        <select value={settings.defaultTeamId || ''} onChange={e => setDefault(e.target.value)} className={inputFormStyle + ' !w-auto !py-1.5'}>
          <option value="">No repartir (avisar a los gerentes)</option>
          {teams.filter(t => t.active).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>
      <div className="flex justify-end"><button onClick={() => setEditing({ name: '', memberUserIds: [], mode: 'round_robin', active: true })} className={BUTTON_PRIMARY_SM_CLASSES}>+ Nuevo equipo</button></div>
      {teams.length === 0 ? <p className="text-center text-neutral-400 py-6">Sin equipos todavía.</p> : (
        <ul className="space-y-2">
          {teams.map(t => (
            <li key={t.id} className={`p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 ${t.active ? '' : 'opacity-60'}`}>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-neutral-800 dark:text-neutral-100">{t.name}</p>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-700">{t.mode === 'balanced' ? 'Balanceado' : 'Round-robin'}</span>
                {settings.defaultTeamId === t.id && <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">Predeterminado</span>}
                {!t.active && <span className="text-[11px] text-neutral-500">Pausado</span>}
                <div className="ml-auto flex gap-1">
                  <button onClick={() => setEditing(t)} className={BUTTON_SECONDARY_SM_CLASSES}>Editar</button>
                  <button onClick={() => setToDelete(t)} className="text-red-500 hover:text-red-700 px-1" aria-label={`Eliminar ${t.name}`}>🗑</button>
                </div>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{t.memberUserIds.length ? t.memberUserIds.map(nameOf).join(', ') : 'Sin miembros'}</p>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <Modal isOpen={true} onClose={() => setEditing(null)} title={editing.id ? 'Editar equipo' : 'Nuevo equipo'} size="md">
          <TeamForm team={editing} assignees={assignees} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
        </Modal>
      )}
      <ConfirmationModal isOpen={!!toDelete} onClose={() => setToDelete(null)} onConfirm={async () => { const t = toDelete!; setToDelete(null); try { await leadsService.deleteTeam(t.id); load(); if (settings.defaultTeamId === t.id) setSettings({ ...settings, defaultTeamId: null }); } catch (e) { err(e, 'No se pudo eliminar.'); } }} title="Eliminar equipo" message={`¿Eliminar "${toDelete?.name}"?`} confirmButtonText="Eliminar" />
    </div>
  );
};

const TeamForm: React.FC<{ team: Partial<SalesTeam>; assignees: Assignee[]; onCancel: () => void; onSaved: () => void }> = ({ team, assignees, onCancel, onSaved }) => {
  const [name, setName] = useState(team.name || '');
  const [members, setMembers] = useState<string[]>(team.memberUserIds || []);
  const [mode, setMode] = useState<'round_robin' | 'balanced'>(team.mode || 'round_robin');
  const [active, setActive] = useState(team.active !== false);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!name.trim()) { toast.error('Ponle un nombre.'); return; }
    if (!members.length) { toast.error('Elige al menos un miembro.'); return; }
    setSaving(true);
    try {
      const data = { name: name.trim(), memberUserIds: members, mode, active };
      if (team.id) await leadsService.updateTeam(team.id, data); else await leadsService.createTeam(data);
      onSaved();
    } catch (e) { err(e, 'No se pudo guardar.'); } finally { setSaving(false); }
  };
  return (
    <div className="space-y-3">
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Nombre del equipo" className={inputFormStyle} autoFocus />
      <div className="flex gap-3 text-sm">
        <label className="flex items-center gap-1.5"><input type="radio" checked={mode === 'round_robin'} onChange={() => setMode('round_robin')} /> Round-robin</label>
        <label className="flex items-center gap-1.5"><input type="radio" checked={mode === 'balanced'} onChange={() => setMode('balanced')} /> Balanceado</label>
        <label className="flex items-center gap-1.5 ml-auto"><input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} className="h-4 w-4" /> Activo</label>
      </div>
      <div className="max-h-56 overflow-y-auto border border-neutral-200 dark:border-neutral-700 rounded-md divide-y divide-neutral-100 dark:divide-neutral-700/60">
        {assignees.map(a => (
          <label key={a.uid} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-700/40">
            <input type="checkbox" checked={members.includes(a.uid)} onChange={e => setMembers(prev => e.target.checked ? [...prev, a.uid] : prev.filter(x => x !== a.uid))} className="h-4 w-4" />
            {a.name}
          </label>
        ))}
        {assignees.length === 0 && <p className="p-3 text-sm text-neutral-400">No hay colaboradores con cuenta.</p>}
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button>
        <button onClick={save} disabled={saving} className={BUTTON_PRIMARY_SM_CLASSES}>{saving ? 'Guardando…' : 'Guardar'}</button>
      </div>
    </div>
  );
};

// ═════════════════════════════════════════════
// INTEGRACIONES (webhooks + API)
// ═════════════════════════════════════════════

const EVENT_LABEL: Record<string, string> = {
  'lead.created': 'Lead creado', 'lead.updated': 'Lead actualizado', 'lead.stage_changed': 'Cambio de etapa', 'lead.won': 'Lead ganado',
  'lead.lost': 'Lead perdido', 'lead.assigned': 'Lead asignado', 'lead.deleted': 'Lead eliminado',
};

export const IntegrationsTab: React.FC<{ isManager: boolean }> = ({ isManager }) => {
  const [events, setEvents] = useState<string[]>([]);
  const [hooks, setHooks] = useState<LeadWebhook[]>([]);
  const [keys, setKeys] = useState<LeadApiKey[]>([]);
  const [newUrl, setNewUrl] = useState('');
  const [newEvents, setNewEvents] = useState<string[]>(['lead.created']);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [keyName, setKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<null | { kind: 'hook' | 'key'; id: string; label: string }>(null);

  const load = async () => {
    const [w, k] = await Promise.all([leadsService.listWebhooks(), leadsService.listApiKeys()]);
    setEvents(w.events); setHooks(w.webhooks); setKeys(k);
  };
  useEffect(() => { load().catch(e => err(e, 'No se pudieron cargar las integraciones.')); }, []);

  const addHook = async () => {
    if (!newUrl.trim()) return;
    try { await leadsService.createWebhook({ url: newUrl.trim(), events: newEvents }); setNewUrl(''); await load(); toast.success('Webhook creado.'); }
    catch (e) { err(e, 'No se pudo crear.'); }
  };
  const test = async (h: LeadWebhook) => {
    try { const r = await leadsService.testWebhook(h.id); r.error ? toast.error(`Falló: ${r.error}`) : toast.success(`Respuesta ${r.status}`); await load(); }
    catch (e) { err(e, 'No se pudo probar.'); }
  };
  const createKey = async () => {
    try { const k = await leadsService.createApiKey(keyName.trim() || 'Integración'); setCreatedKey(k.key || null); setKeyName(''); await load(); }
    catch (e) { err(e, 'No se pudo crear la llave.'); }
  };
  const endpoint = `${API_URL}/public/v1/leads`;
  const curl = `curl -X POST ${endpoint} \\\n  -H "Authorization: Bearer pzk_TU_LLAVE" \\\n  -H "Content-Type: application/json" \\\n  -d '{"name":"Ana","lastName":"Rivera","email":"ana@ejemplo.com","phone":"7875550000","companyName":"ACME","value":1500,"source":"Landing","notes":"Quiere cotización"}'`;

  return (
    <div className="space-y-8">
      {/* Webhooks */}
      <section className="space-y-3">
        <h3 className="text-base font-semibold text-neutral-800 dark:text-neutral-100">🔗 Webhooks (Pazzi → tus sistemas)</h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Pazzi enviará un POST JSON a tu URL cuando ocurra el evento. Cada envío lleva la cabecera <code className="text-xs">X-Pazzi-Signature: sha256=…</code> (HMAC del cuerpo con el secreto) para que verifiques que viene de Pazzi. Funciona con Zapier, Make, n8n, etc.</p>
        <ul className="space-y-2">
          {hooks.map(h => (
            <li key={h.id} className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <code className="text-xs break-all flex-1 min-w-[200px]">{h.url}</code>
                <span className={`text-[11px] px-2 py-0.5 rounded-full ${h.lastStatus && h.lastStatus < 300 ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : h.lastAt ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' : 'bg-neutral-100 dark:bg-neutral-700'}`} title={h.lastError || ''}>
                  {h.lastAt ? `${h.lastStatus || 'error'} · ${new Date(h.lastAt).toLocaleString()}` : 'Sin envíos'}
                </span>
                <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={h.active} onChange={async e => { try { await leadsService.updateWebhook(h.id, { active: e.target.checked }); await load(); } catch (er) { err(er, 'No se pudo actualizar.'); } }} className="h-4 w-4" /> Activo</label>
                <button onClick={() => test(h)} className={BUTTON_SECONDARY_SM_CLASSES}>Probar</button>
                <button onClick={() => setToDelete({ kind: 'hook', id: h.id, label: h.url })} className="text-red-500 hover:text-red-700 px-1" aria-label="Eliminar webhook">🗑</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {['*', ...events].map(ev => (
                  <label key={ev} className="flex items-center gap-1 text-xs">
                    <input type="checkbox" checked={h.events.includes(ev)} onChange={async e => {
                      const next = e.target.checked ? [...h.events, ev] : h.events.filter(x => x !== ev);
                      if (!next.length) { toast.error('Deja al menos un evento.'); return; }
                      try { await leadsService.updateWebhook(h.id, { events: next }); await load(); } catch (er) { err(er, 'No se pudo actualizar.'); }
                    }} className="h-3.5 w-3.5" />
                    {ev === '*' ? 'Todos' : EVENT_LABEL[ev] || ev}
                  </label>
                ))}
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-neutral-500">Secreto:</span>
                <code className="break-all">{revealed[h.id] ? h.secret : '••••••••••••••••'}</code>
                <button onClick={() => setRevealed(r => ({ ...r, [h.id]: !r[h.id] }))} className="text-primary hover:underline">{revealed[h.id] ? 'Ocultar' : 'Ver'}</button>
                <button onClick={() => copy(h.secret)} className="text-primary hover:underline">Copiar</button>
              </div>
            </li>
          ))}
        </ul>
        <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-900/40 space-y-2">
          <input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="https://hooks.zapier.com/…" className={inputFormStyle} />
          <div className="flex flex-wrap gap-2">
            {['*', ...events].map(ev => (
              <label key={ev} className="flex items-center gap-1 text-xs"><input type="checkbox" checked={newEvents.includes(ev)} onChange={e => setNewEvents(p => e.target.checked ? [...p, ev] : p.filter(x => x !== ev))} className="h-3.5 w-3.5" /> {ev === '*' ? 'Todos' : EVENT_LABEL[ev] || ev}</label>
            ))}
          </div>
          <button onClick={addHook} disabled={!newUrl.trim() || !newEvents.length} className={BUTTON_PRIMARY_SM_CLASSES}>+ Añadir webhook</button>
        </div>
      </section>

      {/* API */}
      <section className="space-y-3">
        <h3 className="text-base font-semibold text-neutral-800 dark:text-neutral-100">🔑 API (tus sistemas → Pazzi)</h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Crea leads desde tu web, landing pages u otras herramientas. Si el correo o teléfono ya existe en un lead abierto, no se duplica: se anota en ese lead.</p>
        <ul className="divide-y divide-neutral-100 dark:divide-neutral-700/60">
          {keys.length === 0 && <li className="py-2 text-sm text-neutral-400">Sin llaves.</li>}
          {keys.map(k => (
            <li key={k.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
              <span className="font-medium">{k.name}</span>
              <code className="text-xs">pzk_{k.prefix}_…</code>
              <span className="text-xs text-neutral-500">{k.lastUsedAt ? `usada ${new Date(k.lastUsedAt).toLocaleString()}` : 'sin uso'}</span>
              {k.revokedAt ? <span className="text-xs text-red-600">Revocada</span> : (
                <button onClick={() => setToDelete({ kind: 'key', id: k.id, label: k.name })} className="text-xs text-red-600 hover:underline ml-auto">Revocar</button>
              )}
            </li>
          ))}
        </ul>
        {isManager ? (
          <div className="flex gap-2"><input value={keyName} onChange={e => setKeyName(e.target.value)} placeholder="Nombre (ej. Landing de verano)" className={inputFormStyle + ' !w-64'} /><button onClick={createKey} className={BUTTON_PRIMARY_SM_CLASSES}>+ Crear llave</button></div>
        ) : <p className="text-xs text-amber-600">Solo un gerente puede crear llaves de API.</p>}
        <div>
          <p className="text-xs font-medium text-neutral-500 mb-1">Ejemplo</p>
          <pre className="text-[11px] bg-neutral-900 text-neutral-100 rounded-lg p-3 overflow-x-auto whitespace-pre">{curl}</pre>
          <p className="text-[11px] text-neutral-500 mt-1">Campos: <code>name</code> (obligatorio), <code>lastName</code>, <code>companyName</code>, <code>email</code>, <code>phone</code>, <code>whatsapp</code>, <code>value</code>, <code>source</code>, <code>notes</code>, <code>pipelineId</code>, <code>stageId</code>. Límite: 60 solicitudes/minuto. Prueba la llave con <code>GET {API_URL}/public/v1/ping</code>.</p>
        </div>
      </section>

      <Modal isOpen={!!createdKey} onClose={() => setCreatedKey(null)} title="Tu nueva llave de API" size="md">
        <div className="space-y-3">
          <p className="text-sm text-amber-700 dark:text-amber-300">Cópiala ahora: por seguridad <strong>no se volverá a mostrar</strong>.</p>
          <code className="block text-xs break-all p-3 rounded bg-neutral-100 dark:bg-neutral-900">{createdKey}</code>
          <div className="flex justify-end gap-2"><button onClick={() => createdKey && copy(createdKey)} className={BUTTON_PRIMARY_SM_CLASSES}>Copiar</button><button onClick={() => setCreatedKey(null)} className={BUTTON_SECONDARY_SM_CLASSES}>Listo</button></div>
        </div>
      </Modal>
      <ConfirmationModal
        isOpen={!!toDelete} onClose={() => setToDelete(null)}
        onConfirm={async () => { const d = toDelete!; setToDelete(null); try { if (d.kind === 'hook') await leadsService.deleteWebhook(d.id); else await leadsService.revokeApiKey(d.id); await load(); } catch (e) { err(e, 'No se pudo completar.'); } }}
        title={toDelete?.kind === 'hook' ? 'Eliminar webhook' : 'Revocar llave'}
        message={toDelete?.kind === 'hook' ? `¿Eliminar el webhook ${toDelete?.label}?` : `¿Revocar "${toDelete?.label}"? Las integraciones que la usen dejarán de funcionar.`}
        confirmButtonText={toDelete?.kind === 'hook' ? 'Eliminar' : 'Revocar'}
      />
    </div>
  );
};

// ═════════════════════════════════════════════
// METAS
// ═════════════════════════════════════════════

export const GOAL_LABEL: Record<GoalMetric, string> = { won_count: 'Leads ganados', won_value: 'Valor ganado ($)', activities: 'Actividades', new_leads: 'Leads nuevos' };
const METRICS: GoalMetric[] = ['won_count', 'won_value', 'activities', 'new_leads'];
const thisMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };

export const GoalsTab: React.FC<{ assignees: Assignee[] }> = ({ assignees }) => {
  const [period, setPeriod] = useState(thisMonth());
  const [goals, setGoals] = useState<SalesGoal[]>([]);
  const load = () => leadsService.listGoals(period).then(setGoals).catch(e => err(e, 'No se pudieron cargar las metas.'));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [period]);
  const value = (uid: string, m: GoalMetric) => goals.find(g => g.userId === uid && g.metric === m)?.target;
  const save = async (uid: string, m: GoalMetric, raw: string) => {
    const target = raw === '' ? 0 : Math.max(0, Number(raw));
    if ((value(uid, m) ?? 0) === target) return;
    try { await leadsService.upsertGoal({ userId: uid, period, metric: m, target }); await load(); } catch (e) { err(e, 'No se pudo guardar.'); }
  };
  const copyPrev = async () => {
    const [y, mm] = period.split('-').map(Number);
    const prev = mm === 1 ? `${y - 1}-12` : `${y}-${String(mm - 1).padStart(2, '0')}`;
    try {
      const prevGoals = await leadsService.listGoals(prev);
      if (!prevGoals.length) { toast.warning('El mes anterior no tiene metas.'); return; }
      for (const g of prevGoals) await leadsService.upsertGoal({ userId: g.userId, period, metric: g.metric, target: g.target });
      await load(); toast.success('Metas copiadas del mes anterior.');
    } catch (e) { err(e, 'No se pudo copiar.'); }
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-neutral-500 dark:text-neutral-400 flex-1 min-w-[240px]">Metas mensuales por responsable. El progreso se ve en Reportes de Leads (y cada empleado ve el suyo). Deja vacío o en 0 para no fijar meta.</p>
        <input type="month" value={period} onChange={e => e.target.value && setPeriod(e.target.value)} className={inputFormStyle + ' !w-auto !py-1.5'} />
        <button onClick={copyPrev} className={BUTTON_SECONDARY_SM_CLASSES}>Copiar del mes anterior</button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead><tr className="text-left text-[11px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-700"><th className="py-2 pr-3">Responsable</th>{METRICS.map(m => <th key={m} className="py-2 pr-3">{GOAL_LABEL[m]}</th>)}</tr></thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700/60">
            {assignees.map(a => (
              <tr key={a.uid}>
                <td className="py-2 pr-3 text-neutral-800 dark:text-neutral-100">{a.name}</td>
                {METRICS.map(m => (
                  <td key={m} className="py-2 pr-3">
                    <input key={`${period}-${a.uid}-${m}-${value(a.uid, m) ?? ''}`} type="number" min={0} defaultValue={value(a.uid, m) ?? ''} onBlur={e => save(a.uid, m, e.target.value)} placeholder="—" className={inputFormStyle + ' !w-28 !py-1.5'} />
                  </td>
                ))}
              </tr>
            ))}
            {assignees.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-neutral-400">No hay colaboradores con cuenta.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};
