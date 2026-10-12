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
import { useTranslation } from '../../contexts/GlobalSettingsContext';

type Assignee = { uid: string; name: string };
type TFn = (key: string, params?: Record<string, string | number>) => string;
const err = (e: unknown, fallback: string) => toast.error(e instanceof ApiError ? e.message : fallback);
const copy = async (t: TFn, text: string) => { try { await navigator.clipboard.writeText(text); toast.success(t('leads.automation.copied')); } catch { toast.error(t('leads.automation.copy_failed')); } };

/** Etiquetas en español (legado, para importadores existentes). Para UI traducida usar `triggerLabel(t, trigger)`. */
export const TRIGGER_LABEL: Record<LeadTrigger, string> = {
  lead_created: 'Cuando se crea un lead',
  stage_changed: 'Cuando un lead cambia de etapa',
  lead_won: 'Cuando un lead se gana',
  lead_lost: 'Cuando un lead se pierde',
  lead_assigned: 'Cuando se asigna un responsable',
  no_activity: 'Cuando un lead pasa N días sin actividad',
};
const TRIGGERS = Object.keys(TRIGGER_LABEL) as LeadTrigger[];
export const triggerLabel = (t: TFn, trigger: LeadTrigger) => t(`leads.automation.trigger.${trigger}`);

const ACTION_TYPES: LeadRuleAction['type'][] = ['assign', 'round_robin', 'add_tag', 'remove_tag', 'move_stage', 'create_activity', 'notify', 'send_email', 'send_whatsapp', 'webhook'];
const actionLabel = (t: TFn, type: LeadRuleAction['type']) => t(`leads.automation.action.${type}`);
const VARIABLES = ['nombre', 'apellido', 'nombre_completo', 'empresa', 'correo', 'telefono', 'valor', 'etapa', 'pipeline', 'fuente', 'responsable', 'negocio'];
const ACTIVITY_ICONS: Record<string, string> = { call: '📞', email: '✉️', whatsapp: '💬', meeting: '📅', note: '📝', task: '✅' };
const activityLabel = (t: TFn, type: string) => ACTIVITY_ICONS[type] ? `${ACTIVITY_ICONS[type]} ${t(`leads.common.activity.${type}`)}` : '';

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
  const { t } = useTranslation();
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
  useEffect(() => { load().catch(e => err(e, t('leads.automation.rules.load_error'))); }, []);

  const toggle = async (r: LeadRule) => {
    try { await leadsService.updateRule(r.id, { active: !r.active }); setRules(prev => prev.map(x => x.id === r.id ? { ...x, active: !r.active } : x)); }
    catch (e) { err(e, t('leads.automation.err.update')); }
  };
  const openRuns = async (ruleId: string) => {
    setRunsFor(ruleId);
    try { setRuns(await leadsService.listRuns(ruleId || undefined)); } catch (e) { err(e, t('leads.automation.rules.runs_load_error')); }
  };

  const name = (list: { id: string; name?: string; label?: string }[], id?: string | null) => { const x = list.find(i => i.id === id); return x ? (x as any).label || x.name : '—'; };
  const condSummary = (c?: LeadRuleConditions | null) => {
    if (!c) return t('leads.automation.rules.all_leads');
    const parts: string[] = [];
    if (c.pipelineId) parts.push(t('leads.automation.rules.cond.pipeline', { name: name(pipelines, c.pipelineId) }));
    if (c.stageId) parts.push(t('leads.automation.rules.cond.stage', { name: name(allStages, c.stageId) }));
    if (c.sourceId) parts.push(t('leads.automation.rules.cond.source', { name: name(sources, c.sourceId) }));
    if (c.tagId) parts.push(t('leads.automation.rules.cond.tag', { name: name(tags, c.tagId) }));
    if (c.minValue != null) parts.push(t('leads.automation.rules.cond.min_value', { value: c.minValue }));
    if (c.maxValue != null) parts.push(t('leads.automation.rules.cond.max_value', { value: c.maxValue }));
    return parts.length ? parts.join(', ') : t('leads.automation.rules.all_leads');
  };
  const actionSummary = (a: LeadRuleAction) => {
    switch (a.type) {
      case 'assign': return t('leads.automation.rules.summary.assign', { name: assignees.find(x => x.uid === a.userId)?.name || '—' });
      case 'round_robin': return t('leads.automation.rules.summary.round_robin', { name: teams.find(tm => tm.id === a.teamId)?.name || '—' });
      case 'add_tag': return t('leads.automation.rules.summary.add_tag', { name: name(tags, a.tagId) });
      case 'remove_tag': return t('leads.automation.rules.summary.remove_tag', { name: name(tags, a.tagId) });
      case 'move_stage': return t('leads.automation.rules.summary.move_stage', { name: name(allStages, a.stageId) });
      case 'create_activity': {
        const activity = activityLabel(t, a.activityType) || t('leads.automation.rules.summary.activity');
        return a.dueInHours ? t('leads.automation.rules.summary.activity_due', { activity, hours: a.dueInHours }) : activity;
      }
      case 'notify': return t('leads.automation.rules.summary.notify', { who: a.target === 'assignee' ? t('leads.automation.rules.summary.notify_assignee') : a.target === 'managers' ? t('leads.automation.rules.summary.notify_managers') : assignees.find(x => x.uid === a.userId)?.name || t('leads.automation.rules.summary.notify_user') });
      case 'send_email': return t('leads.automation.rules.summary.send_email', { name: templates.find(tp => tp.id === a.templateId)?.name || '—' });
      case 'send_whatsapp': return t('leads.automation.rules.summary.send_whatsapp', { name: templates.find(tp => tp.id === a.templateId)?.name || '—' });
      case 'webhook': return t('leads.automation.rules.summary.webhook', { url: a.url });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-2xl">{t('leads.automation.rules.intro')}</p>
        <div className="flex gap-2">
          <button onClick={() => openRuns('')} className={BUTTON_SECONDARY_SM_CLASSES}>{t('leads.automation.rules.history')}</button>
          <button onClick={() => setEditing({ name: '', trigger: 'lead_created', conditions: {}, actions: [], active: true })} className={BUTTON_PRIMARY_SM_CLASSES}>{t('leads.automation.rules.new')}</button>
        </div>
      </div>

      {rules.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed border-neutral-200 dark:border-neutral-700 rounded-xl">
          <p className="text-neutral-500 dark:text-neutral-400">{t('leads.automation.rules.empty_title')}</p>
          <p className="text-xs text-neutral-400 mt-1">{t('leads.automation.rules.empty_hint')}</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {rules.map(r => (
            <li key={r.id} className={`p-3 rounded-lg border ${r.active ? 'border-neutral-200 dark:border-neutral-700' : 'border-dashed border-neutral-300 dark:border-neutral-600 opacity-60'}`}>
              <div className="flex flex-wrap items-start gap-3">
                <label className="relative inline-flex items-center cursor-pointer mt-0.5" title={r.active ? t('leads.automation.rules.active') : t('leads.automation.rules.paused')}>
                  <input type="checkbox" checked={r.active} onChange={() => toggle(r)} className="sr-only peer" />
                  <span className="w-9 h-5 bg-neutral-300 dark:bg-neutral-600 rounded-full peer-checked:bg-primary transition" />
                  <span className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition peer-checked:translate-x-4" />
                </label>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-neutral-800 dark:text-neutral-100">{r.name}</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    <strong>{triggerLabel(t, r.trigger)}{r.trigger === 'no_activity' ? t('leads.automation.rules.no_activity_days', { days: r.conditions?.days || 7 }) : ''}</strong> · {condSummary(r.conditions)}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {r.actions.map((a, i) => <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary dark:text-teal-300">→ {actionSummary(a)}</span>)}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-neutral-500">
                  <button onClick={() => openRuns(r.id)} className="hover:underline" title={t('leads.automation.rules.view_runs')}>{t('leads.automation.rules.run_count', { count: r.runCount })}</button>
                  <button onClick={() => setEditing(r)} className={BUTTON_SECONDARY_SM_CLASSES}>{t('leads.common.edit')}</button>
                  <button onClick={() => setToDelete(r)} className="text-red-500 hover:text-red-700 px-1" aria-label={t('leads.automation.delete_aria', { name: r.name })}>🗑</button>
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
      <ConfirmationModal isOpen={!!toDelete} onClose={() => setToDelete(null)} onConfirm={async () => { const r = toDelete!; setToDelete(null); try { await leadsService.deleteRule(r.id); await load(); } catch (e) { err(e, t('leads.automation.err.delete')); } }} title={t('leads.automation.rules.delete_title')} message={t('leads.automation.delete_confirm', { name: toDelete?.name || '' })} confirmButtonText={t('leads.common.delete')} />

      <Modal isOpen={runs !== null} onClose={() => setRuns(null)} title={runsFor ? t('leads.automation.rules.runs_title', { name: rules.find(r => r.id === runsFor)?.name || '' }) : t('leads.automation.rules.history_title')} size="3xl">
        <div className="max-h-[60vh] overflow-y-auto">
          {(runs || []).length === 0 ? <p className="text-center text-neutral-400 py-8">{t('leads.automation.rules.no_runs')}</p> : (
            <table className="min-w-full text-sm">
              <thead><tr className="text-left text-[11px] uppercase text-neutral-500"><th className="py-1.5 pr-3">{t('leads.automation.rules.col.date')}</th>{!runsFor && <th className="py-1.5 pr-3">{t('leads.automation.rules.col.rule')}</th>}<th className="py-1.5 pr-3">{t('leads.common.lead')}</th><th className="py-1.5">{t('leads.automation.rules.col.result')}</th></tr></thead>
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

const emptyAction = (t: TFn, type: LeadRuleAction['type']): LeadRuleAction => {
  switch (type) {
    case 'assign': return { type, userId: '' };
    case 'round_robin': return { type, teamId: '' };
    case 'add_tag': case 'remove_tag': return { type, tagId: '' };
    case 'move_stage': return { type, stageId: '' };
    case 'create_activity': return { type, activityType: 'call', body: t('leads.automation.default.activity_body'), dueInHours: 2 };
    case 'notify': return { type, target: 'assignee', message: t('leads.automation.default.notify_message') };
    case 'send_email': case 'send_whatsapp': return { type, templateId: '' };
    case 'webhook': return { type, url: '' };
  }
};

const RuleEditor: React.FC<{
  rule: Partial<LeadRule>; pipelines: Pipeline[]; allStages: Array<{ id: string; label: string; pipelineId: string }>; sources: LeadSource[]; tags: LeadTag[];
  assignees: Assignee[]; templates: LeadTemplate[]; teams: SalesTeam[]; onClose: () => void; onSaved: () => void;
}> = ({ rule, pipelines, allStages, sources, tags, assignees, templates, teams, onClose, onSaved }) => {
  const { t } = useTranslation();
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
    if (!name.trim()) { toast.error(t('leads.automation.name_required')); return; }
    if (!actions.length) { toast.error(t('leads.automation.editor.actions_required')); return; }
    const missing = actions.find(a =>
      (a.type === 'assign' && !a.userId) || (a.type === 'round_robin' && !a.teamId) || ((a.type === 'add_tag' || a.type === 'remove_tag') && !a.tagId) ||
      (a.type === 'move_stage' && !a.stageId) || ((a.type === 'send_email' || a.type === 'send_whatsapp') && !a.templateId) ||
      (a.type === 'webhook' && !a.url) || (a.type === 'notify' && a.target === 'user' && !a.userId));
    if (missing) { toast.error(t('leads.automation.editor.complete_action', { action: actionLabel(t, missing.type) })); return; }
    const conditions: LeadRuleConditions = { ...cond };
    if (trigger === 'no_activity') conditions.days = Math.max(1, Number(cond.days) || 7); else delete conditions.days;
    setSaving(true);
    try {
      if (rule.id) await leadsService.updateRule(rule.id, { name: name.trim(), trigger, conditions, actions });
      else await leadsService.createRule({ name: name.trim(), trigger, conditions, actions, active: true });
      toast.success(t('leads.automation.editor.saved'));
      onSaved();
    } catch (e) { err(e, t('leads.automation.err.save')); } finally { setSaving(false); }
  };

  const tplFor = (ch: 'email' | 'whatsapp') => templates.filter(tp => tp.channel === ch);

  return (
    <Modal isOpen={true} onClose={onClose} title={rule.id ? t('leads.automation.editor.title_edit') : t('leads.automation.editor.title_new')} size="3xl">
      <div className="space-y-5">
        <div><label className="block text-xs font-medium text-neutral-500 mb-1">{t('leads.automation.editor.name')}</label><input value={name} onChange={e => setName(e.target.value)} placeholder={t('leads.automation.editor.name_placeholder')} className={inputFormStyle} autoFocus /></div>

        {/* 1. Cuándo */}
        <div className="p-4 rounded-lg bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800">
          <p className="text-xs font-bold uppercase tracking-wide text-sky-700 dark:text-sky-300 mb-2">{t('leads.automation.editor.when')}</p>
          <div className="flex flex-wrap items-center gap-2">
            <select value={trigger} onChange={e => setTrigger(e.target.value as LeadTrigger)} className={sel + ' !w-auto'}>
              {TRIGGERS.map(tr => <option key={tr} value={tr}>{triggerLabel(t, tr)}</option>)}
            </select>
            {trigger === 'no_activity' && (<><input type="number" min={1} max={365} value={cond.days ?? 7} onChange={e => setC('days', Number(e.target.value))} className={sel + ' !w-20'} /><span className="text-sm">{t('leads.automation.editor.days')}</span></>)}
          </div>
          {trigger === 'stage_changed' && <p className="text-xs text-sky-700 dark:text-sky-300 mt-1">{t('leads.automation.editor.stage_hint')}</p>}
        </div>

        {/* 2. Condiciones */}
        <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300 mb-2">{t('leads.automation.editor.only_if')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {pipelines.length > 1 && (
              <select value={cond.pipelineId || ''} onChange={e => { setC('pipelineId', e.target.value); setC('stageId', ''); }} className={sel}>
                <option value="">{t('leads.automation.editor.any_pipeline')}</option>{pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
            <select value={cond.stageId || ''} onChange={e => setC('stageId', e.target.value)} className={sel}>
              <option value="">{t('leads.automation.editor.any_stage')}</option>{stagesForCond.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            <select value={cond.sourceId || ''} onChange={e => setC('sourceId', e.target.value)} className={sel}>
              <option value="">{t('leads.automation.editor.any_source')}</option>{sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select value={cond.tagId || ''} onChange={e => setC('tagId', e.target.value)} className={sel}>
              <option value="">{t('leads.automation.editor.any_tag')}</option>{tags.map(tg => <option key={tg.id} value={tg.id}>{tg.name}</option>)}
            </select>
            <input type="number" value={cond.minValue ?? ''} onChange={e => setC('minValue', e.target.value === '' ? null : Number(e.target.value))} placeholder={t('leads.automation.editor.min_value')} className={sel} />
            <input type="number" value={cond.maxValue ?? ''} onChange={e => setC('maxValue', e.target.value === '' ? null : Number(e.target.value))} placeholder={t('leads.automation.editor.max_value')} className={sel} />
          </div>
        </div>

        {/* 3. Acciones */}
        <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300 mb-2">{t('leads.automation.editor.then')}</p>
          <ul className="space-y-2">
            {actions.map((a, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2 p-2 rounded-md bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 w-5">{i + 1}.</span>
                <select value={a.type} onChange={e => setActions(prev => prev.map((x, j) => j === i ? emptyAction(t, e.target.value as any) : x))} className={sel + ' !w-auto'}>
                  {ACTION_TYPES.map(at => <option key={at} value={at}>{actionLabel(t, at)}</option>)}
                </select>
                {a.type === 'assign' && <select value={a.userId} onChange={e => setA(i, { userId: e.target.value })} className={sel + ' !w-auto'}><option value="">{t('leads.automation.editor.pick_person')}</option>{assignees.map(x => <option key={x.uid} value={x.uid}>{x.name}</option>)}</select>}
                {a.type === 'round_robin' && (teams.length ? <select value={a.teamId} onChange={e => setA(i, { teamId: e.target.value })} className={sel + ' !w-auto'}><option value="">{t('leads.automation.editor.pick_team')}</option>{teams.map(tm => <option key={tm.id} value={tm.id}>{tm.name}</option>)}</select> : <span className="text-xs text-amber-600">{t('leads.automation.editor.create_team_first')}</span>)}
                {(a.type === 'add_tag' || a.type === 'remove_tag') && <select value={a.tagId} onChange={e => setA(i, { tagId: e.target.value })} className={sel + ' !w-auto'}><option value="">{t('leads.automation.editor.pick_tag')}</option>{tags.map(tg => <option key={tg.id} value={tg.id}>{tg.name}</option>)}</select>}
                {a.type === 'move_stage' && <select value={a.stageId} onChange={e => setA(i, { stageId: e.target.value })} className={sel + ' !w-auto'}><option value="">{t('leads.automation.editor.pick_stage')}</option>{allStages.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select>}
                {a.type === 'create_activity' && (<>
                  <select value={a.activityType} onChange={e => setA(i, { activityType: e.target.value })} className={sel + ' !w-auto'}>{Object.keys(ACTIVITY_ICONS).map(k => <option key={k} value={k}>{activityLabel(t, k)}</option>)}</select>
                  <input value={a.body || ''} onChange={e => setA(i, { body: e.target.value })} placeholder={t('leads.automation.editor.detail_placeholder')} className={sel + ' flex-1 min-w-[160px]'} />
                  <span className="text-xs">{t('leads.automation.editor.in')}</span><input type="number" min={0} value={a.dueInHours ?? 0} onChange={e => setA(i, { dueInHours: Number(e.target.value) })} className={sel + ' !w-20'} /><span className="text-xs">{t('leads.automation.editor.hours')}</span>
                </>)}
                {a.type === 'notify' && (<>
                  <select value={a.target} onChange={e => setA(i, { target: e.target.value })} className={sel + ' !w-auto'}><option value="assignee">{t('leads.automation.editor.notify_assignee')}</option><option value="managers">{t('leads.automation.editor.notify_managers')}</option><option value="user">{t('leads.automation.editor.notify_user')}</option></select>
                  {a.target === 'user' && <select value={a.userId || ''} onChange={e => setA(i, { userId: e.target.value })} className={sel + ' !w-auto'}><option value="">{t('leads.automation.editor.pick_person')}</option>{assignees.map(x => <option key={x.uid} value={x.uid}>{x.name}</option>)}</select>}
                  <input value={a.message} onChange={e => setA(i, { message: e.target.value })} placeholder={t('leads.automation.editor.message_placeholder')} className={sel + ' flex-1 min-w-[160px]'} />
                </>)}
                {(a.type === 'send_email' || a.type === 'send_whatsapp') && (tplFor(a.type === 'send_email' ? 'email' : 'whatsapp').length
                  ? <select value={a.templateId} onChange={e => setA(i, { templateId: e.target.value })} className={sel + ' !w-auto'}><option value="">{t('leads.automation.editor.pick_template')}</option>{tplFor(a.type === 'send_email' ? 'email' : 'whatsapp').map(tp => <option key={tp.id} value={tp.id}>{tp.name}</option>)}</select>
                  : <span className="text-xs text-amber-600">{t('leads.automation.editor.create_template_first', { channel: t(a.type === 'send_email' ? 'leads.automation.channel_lower.email' : 'leads.automation.channel_lower.whatsapp') })}</span>)}
                {a.type === 'webhook' && <input value={a.url} onChange={e => setA(i, { url: e.target.value })} placeholder="https://…" className={sel + ' flex-1 min-w-[200px]'} />}
                <div className="ml-auto flex items-center gap-1">
                  <button type="button" onClick={() => setActions(prev => { if (i === 0) return prev; const n = [...prev]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; return n; })} disabled={i === 0} className="text-xs px-1 disabled:opacity-30" aria-label={t('leads.automation.editor.move_up')}>▲</button>
                  <button type="button" onClick={() => setActions(prev => prev.filter((_, j) => j !== i))} className="text-red-500 hover:text-red-700 px-1" aria-label={t('leads.automation.editor.remove_action')}>✕</button>
                </div>
              </li>
            ))}
          </ul>
          {actions.length < 10 && (
            <select value="" onChange={e => { if (e.target.value) setActions(prev => [...prev, emptyAction(t, e.target.value as any)]); }} className={sel + ' !w-auto mt-2'}>
              <option value="">{t('leads.automation.editor.add_action')}</option>
              {ACTION_TYPES.map(at => <option key={at} value={at}>{actionLabel(t, at)}</option>)}
            </select>
          )}
          <p className="text-[11px] text-neutral-500 mt-2">{t('leads.automation.editor.variables')} {VARIABLES.map(v => `{{${v}}}`).join(' ')}</p>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t dark:border-neutral-700">
          <button onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>{t('leads.common.cancel')}</button>
          <button onClick={save} disabled={saving} className={BUTTON_PRIMARY_SM_CLASSES}>{saving ? t('leads.common.saving') : t('leads.automation.editor.save')}</button>
        </div>
      </div>
    </Modal>
  );
};

// ═════════════════════════════════════════════
// PLANTILLAS
// ═════════════════════════════════════════════

export const TemplatesTab: React.FC = () => {
  const { t } = useTranslation();
  const [list, setList] = useState<LeadTemplate[]>([]);
  const [editing, setEditing] = useState<Partial<LeadTemplate> | null>(null);
  const [toDelete, setToDelete] = useState<LeadTemplate | null>(null);
  const load = () => leadsService.listTemplates().then(setList).catch(e => err(e, t('leads.automation.templates.load_error')));
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-2xl">{t('leads.automation.templates.intro')}</p>
        <div className="flex gap-2">
          <button onClick={() => setEditing({ channel: 'email', name: '', subject: '', body: t('leads.automation.templates.default_email_body') })} className={BUTTON_SECONDARY_SM_CLASSES}>{t('leads.automation.templates.new_email')}</button>
          <button onClick={() => setEditing({ channel: 'whatsapp', name: '', body: t('leads.automation.templates.default_whatsapp_body') })} className={BUTTON_PRIMARY_SM_CLASSES}>{t('leads.automation.templates.new_whatsapp')}</button>
        </div>
      </div>
      {list.length === 0 ? <p className="text-center text-neutral-400 py-8">{t('leads.automation.templates.empty')}</p> : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {list.map(tp => (
            <li key={tp.id} className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-neutral-800 dark:text-neutral-100 truncate">{tp.channel === 'email' ? '✉️' : '💬'} {tp.name}</p>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => setEditing(tp)} className={BUTTON_SECONDARY_SM_CLASSES}>{t('leads.common.edit')}</button>
                  <button onClick={() => setToDelete(tp)} className="text-red-500 hover:text-red-700 px-1" aria-label={t('leads.automation.delete_aria', { name: tp.name })}>🗑</button>
                </div>
              </div>
              {tp.subject && <p className="text-xs text-neutral-500 mt-1 truncate">{t('leads.automation.templates.subject')}: {tp.subject}</p>}
              <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-1 whitespace-pre-wrap line-clamp-3">{tp.body}</p>
            </li>
          ))}
        </ul>
      )}
      {editing && <TemplateEditor tpl={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      <ConfirmationModal isOpen={!!toDelete} onClose={() => setToDelete(null)} onConfirm={async () => { const tp = toDelete!; setToDelete(null); try { await leadsService.deleteTemplate(tp.id); load(); } catch (e) { err(e, t('leads.automation.err.delete')); } }} title={t('leads.automation.templates.delete_title')} message={t('leads.automation.templates.delete_message', { name: toDelete?.name || '' })} confirmButtonText={t('leads.common.delete')} />
    </div>
  );
};

const TemplateEditor: React.FC<{ tpl: Partial<LeadTemplate>; onClose: () => void; onSaved: () => void }> = ({ tpl, onClose, onSaved }) => {
  const { t } = useTranslation();
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
    if (!f.name.trim() || !f.body.trim()) { toast.error(t('leads.automation.templates.required')); return; }
    setSaving(true);
    try {
      const data = { channel: tpl.channel, name: f.name.trim(), subject: tpl.channel === 'email' ? (f.subject || null) : null, body: f.body } as Partial<LeadTemplate>;
      if (tpl.id) await leadsService.updateTemplate(tpl.id, data); else await leadsService.createTemplate(data);
      toast.success(t('leads.automation.templates.saved')); onSaved();
    } catch (e) { err(e, t('leads.automation.err.save')); } finally { setSaving(false); }
  };
  const channelName = t(tpl.channel === 'email' ? 'leads.automation.channel_lower.email' : 'leads.automation.channel_lower.whatsapp');
  return (
    <Modal isOpen={true} onClose={onClose} title={t(tpl.id ? 'leads.automation.templates.title_edit' : 'leads.automation.templates.title_new', { channel: channelName })} size="lg">
      <div className="space-y-3">
        <div><label className="block text-xs font-medium text-neutral-500 mb-1">{t('leads.automation.templates.internal_name')}</label><input value={f.name} onChange={e => setF(p => ({ ...p, name: e.target.value }))} placeholder={t('leads.automation.templates.name_placeholder')} className={inputFormStyle} autoFocus /></div>
        {tpl.channel === 'email' && <div><label className="block text-xs font-medium text-neutral-500 mb-1">{t('leads.automation.templates.subject')}</label><input value={f.subject} onChange={e => setF(p => ({ ...p, subject: e.target.value }))} placeholder={t('leads.automation.templates.subject_placeholder')} className={inputFormStyle} /></div>}
        <div>
          <label className="block text-xs font-medium text-neutral-500 mb-1">{t('leads.automation.templates.message')}</label>
          <textarea ref={bodyRef} rows={8} value={f.body} onChange={e => setF(p => ({ ...p, body: e.target.value }))} className={inputFormStyle} />
          <div className="flex flex-wrap gap-1 mt-1.5">
            {VARIABLES.map(v => <button key={v} type="button" onClick={() => insert(v)} className="text-[11px] px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-primary/10 hover:text-primary">{`{{${v}}}`}</button>)}
          </div>
          {tpl.channel === 'whatsapp' && <p className="text-[11px] text-neutral-500 mt-2">{t('leads.automation.templates.whatsapp_note')}</p>}
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t dark:border-neutral-700">
          <button onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>{t('leads.common.cancel')}</button>
          <button onClick={save} disabled={saving} className={BUTTON_PRIMARY_SM_CLASSES}>{saving ? t('leads.common.saving') : t('leads.common.save')}</button>
        </div>
      </div>
    </Modal>
  );
};

// ═════════════════════════════════════════════
// EQUIPOS (round-robin)
// ═════════════════════════════════════════════

export const TeamsTab: React.FC<{ assignees: Assignee[]; settings: LeadSettings; setSettings: (s: LeadSettings) => void }> = ({ assignees, settings, setSettings }) => {
  const { t } = useTranslation();
  const [teams, setTeams] = useState<SalesTeam[]>([]);
  const [editing, setEditing] = useState<Partial<SalesTeam> | null>(null);
  const [toDelete, setToDelete] = useState<SalesTeam | null>(null);
  const load = () => leadsService.listTeams().then(setTeams).catch(e => err(e, t('leads.automation.teams.load_error')));
  useEffect(() => { load(); }, []);
  const nameOf = (uid: string) => assignees.find(a => a.uid === uid)?.name || t('leads.automation.teams.user_fallback');

  const setDefault = async (teamId: string) => {
    try { await leadsService.setDefaultTeam(teamId || null); setSettings({ ...settings, defaultTeamId: teamId || null }); toast.success(t('leads.automation.saved')); }
    catch (e) { err(e, t('leads.automation.err.save')); }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-2xl">{t('leads.automation.teams.intro')} <strong>{t('leads.automation.teams.mode.round_robin')}</strong>: {t('leads.automation.teams.intro_round_robin')} <strong>{t('leads.automation.teams.mode.balanced')}</strong>: {t('leads.automation.teams.intro_balanced')}</p>
      <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-900/40 flex flex-wrap items-center gap-2">
        <span className="text-sm">{t('leads.automation.teams.auto_assign_prefix')} <strong>{t('leads.automation.teams.auto_assign_strong')}</strong> {t('leads.automation.teams.auto_assign_suffix')}</span>
        <select value={settings.defaultTeamId || ''} onChange={e => setDefault(e.target.value)} className={inputFormStyle + ' !w-auto !py-1.5'}>
          <option value="">{t('leads.automation.teams.no_distribute')}</option>
          {teams.filter(tm => tm.active).map(tm => <option key={tm.id} value={tm.id}>{tm.name}</option>)}
        </select>
      </div>
      <div className="flex justify-end"><button onClick={() => setEditing({ name: '', memberUserIds: [], mode: 'round_robin', active: true })} className={BUTTON_PRIMARY_SM_CLASSES}>{t('leads.automation.teams.new')}</button></div>
      {teams.length === 0 ? <p className="text-center text-neutral-400 py-6">{t('leads.automation.teams.empty')}</p> : (
        <ul className="space-y-2">
          {teams.map(tm => (
            <li key={tm.id} className={`p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 ${tm.active ? '' : 'opacity-60'}`}>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-neutral-800 dark:text-neutral-100">{tm.name}</p>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-700">{tm.mode === 'balanced' ? t('leads.automation.teams.mode.balanced') : t('leads.automation.teams.mode.round_robin')}</span>
                {settings.defaultTeamId === tm.id && <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">{t('leads.automation.teams.default')}</span>}
                {!tm.active && <span className="text-[11px] text-neutral-500">{t('leads.automation.teams.paused')}</span>}
                <div className="ml-auto flex gap-1">
                  <button onClick={() => setEditing(tm)} className={BUTTON_SECONDARY_SM_CLASSES}>{t('leads.common.edit')}</button>
                  <button onClick={() => setToDelete(tm)} className="text-red-500 hover:text-red-700 px-1" aria-label={t('leads.automation.delete_aria', { name: tm.name })}>🗑</button>
                </div>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{tm.memberUserIds.length ? tm.memberUserIds.map(nameOf).join(', ') : t('leads.automation.teams.no_members')}</p>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <Modal isOpen={true} onClose={() => setEditing(null)} title={editing.id ? t('leads.automation.teams.title_edit') : t('leads.automation.teams.title_new')} size="md">
          <TeamForm team={editing} assignees={assignees} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
        </Modal>
      )}
      <ConfirmationModal isOpen={!!toDelete} onClose={() => setToDelete(null)} onConfirm={async () => { const tm = toDelete!; setToDelete(null); try { await leadsService.deleteTeam(tm.id); load(); if (settings.defaultTeamId === tm.id) setSettings({ ...settings, defaultTeamId: null }); } catch (e) { err(e, t('leads.automation.err.delete')); } }} title={t('leads.automation.teams.delete_title')} message={t('leads.automation.delete_confirm', { name: toDelete?.name || '' })} confirmButtonText={t('leads.common.delete')} />
    </div>
  );
};

const TeamForm: React.FC<{ team: Partial<SalesTeam>; assignees: Assignee[]; onCancel: () => void; onSaved: () => void }> = ({ team, assignees, onCancel, onSaved }) => {
  const { t } = useTranslation();
  const [name, setName] = useState(team.name || '');
  const [members, setMembers] = useState<string[]>(team.memberUserIds || []);
  const [mode, setMode] = useState<'round_robin' | 'balanced'>(team.mode || 'round_robin');
  const [active, setActive] = useState(team.active !== false);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!name.trim()) { toast.error(t('leads.automation.name_required')); return; }
    if (!members.length) { toast.error(t('leads.automation.teams.members_required')); return; }
    setSaving(true);
    try {
      const data = { name: name.trim(), memberUserIds: members, mode, active };
      if (team.id) await leadsService.updateTeam(team.id, data); else await leadsService.createTeam(data);
      onSaved();
    } catch (e) { err(e, t('leads.automation.err.save')); } finally { setSaving(false); }
  };
  return (
    <div className="space-y-3">
      <input value={name} onChange={e => setName(e.target.value)} placeholder={t('leads.automation.teams.name_placeholder')} className={inputFormStyle} autoFocus />
      <div className="flex gap-3 text-sm">
        <label className="flex items-center gap-1.5"><input type="radio" checked={mode === 'round_robin'} onChange={() => setMode('round_robin')} /> {t('leads.automation.teams.mode.round_robin')}</label>
        <label className="flex items-center gap-1.5"><input type="radio" checked={mode === 'balanced'} onChange={() => setMode('balanced')} /> {t('leads.automation.teams.mode.balanced')}</label>
        <label className="flex items-center gap-1.5 ml-auto"><input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} className="h-4 w-4" /> {t('leads.common.active')}</label>
      </div>
      <div className="max-h-56 overflow-y-auto border border-neutral-200 dark:border-neutral-700 rounded-md divide-y divide-neutral-100 dark:divide-neutral-700/60">
        {assignees.map(a => (
          <label key={a.uid} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-700/40">
            <input type="checkbox" checked={members.includes(a.uid)} onChange={e => setMembers(prev => e.target.checked ? [...prev, a.uid] : prev.filter(x => x !== a.uid))} className="h-4 w-4" />
            {a.name}
          </label>
        ))}
        {assignees.length === 0 && <p className="p-3 text-sm text-neutral-400">{t('leads.automation.no_collaborators')}</p>}
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className={BUTTON_SECONDARY_SM_CLASSES}>{t('leads.common.cancel')}</button>
        <button onClick={save} disabled={saving} className={BUTTON_PRIMARY_SM_CLASSES}>{saving ? t('leads.common.saving') : t('leads.common.save')}</button>
      </div>
    </div>
  );
};

// ═════════════════════════════════════════════
// INTEGRACIONES (webhooks + API)
// ═════════════════════════════════════════════

const KNOWN_EVENTS = ['lead.created', 'lead.updated', 'lead.stage_changed', 'lead.won', 'lead.lost', 'lead.assigned', 'lead.deleted'];
const eventLabel = (t: TFn, ev: string) => ev === '*' ? t('leads.automation.integrations.all_events') : KNOWN_EVENTS.includes(ev) ? t(`leads.automation.event.${ev}`) : ev;

export const IntegrationsTab: React.FC<{ isManager: boolean }> = ({ isManager }) => {
  const { t } = useTranslation();
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
  useEffect(() => { load().catch(e => err(e, t('leads.automation.integrations.load_error'))); }, []);

  const addHook = async () => {
    if (!newUrl.trim()) return;
    try { await leadsService.createWebhook({ url: newUrl.trim(), events: newEvents }); setNewUrl(''); await load(); toast.success(t('leads.automation.integrations.webhook_created')); }
    catch (e) { err(e, t('leads.automation.err.create')); }
  };
  const test = async (h: LeadWebhook) => {
    try { const r = await leadsService.testWebhook(h.id); r.error ? toast.error(t('leads.automation.integrations.test_failed', { error: r.error })) : toast.success(t('leads.automation.integrations.test_response', { status: r.status ?? '' })); await load(); }
    catch (e) { err(e, t('leads.automation.integrations.test_error')); }
  };
  const createKey = async () => {
    try { const k = await leadsService.createApiKey(keyName.trim() || t('leads.automation.integrations.key_default_name')); setCreatedKey(k.key || null); setKeyName(''); await load(); }
    catch (e) { err(e, t('leads.automation.integrations.key_create_error')); }
  };
  const endpoint = `${API_URL}/public/v1/leads`;
  const curl = `curl -X POST ${endpoint} \\\n  -H "Authorization: Bearer pzk_TU_LLAVE" \\\n  -H "Content-Type: application/json" \\\n  -d '{"name":"Ana","lastName":"Rivera","email":"ana@ejemplo.com","phone":"7875550000","companyName":"ACME","value":1500,"source":"Landing","notes":"Quiere cotización"}'`;

  return (
    <div className="space-y-8">
      {/* Webhooks */}
      <section className="space-y-3">
        <h3 className="text-base font-semibold text-neutral-800 dark:text-neutral-100">{t('leads.automation.integrations.webhooks_title')}</h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('leads.automation.integrations.webhooks_intro_1')} <code className="text-xs">X-Pazzi-Signature: sha256=…</code> {t('leads.automation.integrations.webhooks_intro_2')}</p>
        <ul className="space-y-2">
          {hooks.map(h => (
            <li key={h.id} className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <code className="text-xs break-all flex-1 min-w-[200px]">{h.url}</code>
                <span className={`text-[11px] px-2 py-0.5 rounded-full ${h.lastStatus && h.lastStatus < 300 ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : h.lastAt ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' : 'bg-neutral-100 dark:bg-neutral-700'}`} title={h.lastError || ''}>
                  {h.lastAt ? `${h.lastStatus || 'error'} · ${new Date(h.lastAt).toLocaleString()}` : t('leads.automation.integrations.no_sends')}
                </span>
                <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={h.active} onChange={async e => { try { await leadsService.updateWebhook(h.id, { active: e.target.checked }); await load(); } catch (er) { err(er, t('leads.automation.err.update')); } }} className="h-4 w-4" /> {t('leads.common.active')}</label>
                <button onClick={() => test(h)} className={BUTTON_SECONDARY_SM_CLASSES}>{t('leads.automation.integrations.test')}</button>
                <button onClick={() => setToDelete({ kind: 'hook', id: h.id, label: h.url })} className="text-red-500 hover:text-red-700 px-1" aria-label={t('leads.automation.integrations.delete_webhook')}>🗑</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {['*', ...events].map(ev => (
                  <label key={ev} className="flex items-center gap-1 text-xs">
                    <input type="checkbox" checked={h.events.includes(ev)} onChange={async e => {
                      const next = e.target.checked ? [...h.events, ev] : h.events.filter(x => x !== ev);
                      if (!next.length) { toast.error(t('leads.automation.integrations.keep_one_event')); return; }
                      try { await leadsService.updateWebhook(h.id, { events: next }); await load(); } catch (er) { err(er, t('leads.automation.err.update')); }
                    }} className="h-3.5 w-3.5" />
                    {eventLabel(t, ev)}
                  </label>
                ))}
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-neutral-500">{t('leads.automation.integrations.secret')}</span>
                <code className="break-all">{revealed[h.id] ? h.secret : '••••••••••••••••'}</code>
                <button onClick={() => setRevealed(r => ({ ...r, [h.id]: !r[h.id] }))} className="text-primary hover:underline">{revealed[h.id] ? t('leads.automation.integrations.hide') : t('leads.automation.integrations.show')}</button>
                <button onClick={() => copy(t, h.secret)} className="text-primary hover:underline">{t('leads.automation.integrations.copy')}</button>
              </div>
            </li>
          ))}
        </ul>
        <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-900/40 space-y-2">
          <input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="https://hooks.zapier.com/…" className={inputFormStyle} />
          <div className="flex flex-wrap gap-2">
            {['*', ...events].map(ev => (
              <label key={ev} className="flex items-center gap-1 text-xs"><input type="checkbox" checked={newEvents.includes(ev)} onChange={e => setNewEvents(p => e.target.checked ? [...p, ev] : p.filter(x => x !== ev))} className="h-3.5 w-3.5" /> {eventLabel(t, ev)}</label>
            ))}
          </div>
          <button onClick={addHook} disabled={!newUrl.trim() || !newEvents.length} className={BUTTON_PRIMARY_SM_CLASSES}>{t('leads.automation.integrations.add_webhook')}</button>
        </div>
      </section>

      {/* API */}
      <section className="space-y-3">
        <h3 className="text-base font-semibold text-neutral-800 dark:text-neutral-100">{t('leads.automation.integrations.api_title')}</h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('leads.automation.integrations.api_intro')}</p>
        <ul className="divide-y divide-neutral-100 dark:divide-neutral-700/60">
          {keys.length === 0 && <li className="py-2 text-sm text-neutral-400">{t('leads.automation.integrations.no_keys')}</li>}
          {keys.map(k => (
            <li key={k.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
              <span className="font-medium">{k.name}</span>
              <code className="text-xs">pzk_{k.prefix}_…</code>
              <span className="text-xs text-neutral-500">{k.lastUsedAt ? t('leads.automation.integrations.key_used', { date: new Date(k.lastUsedAt).toLocaleString() }) : t('leads.automation.integrations.key_unused')}</span>
              {k.revokedAt ? <span className="text-xs text-red-600">{t('leads.automation.integrations.revoked')}</span> : (
                <button onClick={() => setToDelete({ kind: 'key', id: k.id, label: k.name })} className="text-xs text-red-600 hover:underline ml-auto">{t('leads.automation.integrations.revoke')}</button>
              )}
            </li>
          ))}
        </ul>
        {isManager ? (
          <div className="flex gap-2"><input value={keyName} onChange={e => setKeyName(e.target.value)} placeholder={t('leads.automation.integrations.key_name_placeholder')} className={inputFormStyle + ' !w-64'} /><button onClick={createKey} className={BUTTON_PRIMARY_SM_CLASSES}>{t('leads.automation.integrations.create_key')}</button></div>
        ) : <p className="text-xs text-amber-600">{t('leads.automation.integrations.manager_only')}</p>}
        <div>
          <p className="text-xs font-medium text-neutral-500 mb-1">{t('leads.automation.integrations.example')}</p>
          <pre className="text-[11px] bg-neutral-900 text-neutral-100 rounded-lg p-3 overflow-x-auto whitespace-pre">{curl}</pre>
          <p className="text-[11px] text-neutral-500 mt-1">{t('leads.automation.integrations.fields')} <code>name</code> {t('leads.automation.integrations.required')}, <code>lastName</code>, <code>companyName</code>, <code>email</code>, <code>phone</code>, <code>whatsapp</code>, <code>value</code>, <code>source</code>, <code>notes</code>, <code>pipelineId</code>, <code>stageId</code>. {t('leads.automation.integrations.rate_limit')} <code>GET {API_URL}/public/v1/ping</code>.</p>
        </div>
      </section>

      <Modal isOpen={!!createdKey} onClose={() => setCreatedKey(null)} title={t('leads.automation.integrations.new_key_title')} size="md">
        <div className="space-y-3">
          <p className="text-sm text-amber-700 dark:text-amber-300">{t('leads.automation.integrations.copy_now_1')} <strong>{t('leads.automation.integrations.copy_now_2')}</strong>.</p>
          <code className="block text-xs break-all p-3 rounded bg-neutral-100 dark:bg-neutral-900">{createdKey}</code>
          <div className="flex justify-end gap-2"><button onClick={() => createdKey && copy(t, createdKey)} className={BUTTON_PRIMARY_SM_CLASSES}>{t('leads.automation.integrations.copy')}</button><button onClick={() => setCreatedKey(null)} className={BUTTON_SECONDARY_SM_CLASSES}>{t('leads.automation.integrations.done')}</button></div>
        </div>
      </Modal>
      <ConfirmationModal
        isOpen={!!toDelete} onClose={() => setToDelete(null)}
        onConfirm={async () => { const d = toDelete!; setToDelete(null); try { if (d.kind === 'hook') await leadsService.deleteWebhook(d.id); else await leadsService.revokeApiKey(d.id); await load(); } catch (e) { err(e, t('leads.automation.integrations.complete_error')); } }}
        title={toDelete?.kind === 'hook' ? t('leads.automation.integrations.delete_webhook') : t('leads.automation.integrations.revoke_key_title')}
        message={toDelete?.kind === 'hook' ? t('leads.automation.integrations.delete_webhook_message', { url: toDelete?.label || '' }) : t('leads.automation.integrations.revoke_key_message', { name: toDelete?.label || '' })}
        confirmButtonText={toDelete?.kind === 'hook' ? t('leads.common.delete') : t('leads.automation.integrations.revoke')}
      />
    </div>
  );
};

// ═════════════════════════════════════════════
// METAS
// ═════════════════════════════════════════════

/** Etiquetas en español (legado, para importadores existentes). Para UI traducida usar `goalLabel(t, metric)`. */
export const GOAL_LABEL: Record<GoalMetric, string> = { won_count: 'Leads ganados', won_value: 'Valor ganado ($)', activities: 'Actividades', new_leads: 'Leads nuevos' };
export const goalLabel = (t: TFn, metric: GoalMetric) => metric === 'won_value' ? `${t('leads.common.metric.won_value')} ($)` : t(`leads.common.metric.${metric}`);
const METRICS: GoalMetric[] = ['won_count', 'won_value', 'activities', 'new_leads'];
const thisMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };

export const GoalsTab: React.FC<{ assignees: Assignee[] }> = ({ assignees }) => {
  const { t } = useTranslation();
  const [period, setPeriod] = useState(thisMonth());
  const [goals, setGoals] = useState<SalesGoal[]>([]);
  const load = () => leadsService.listGoals(period).then(setGoals).catch(e => err(e, t('leads.automation.goals.load_error')));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [period]);
  const value = (uid: string, m: GoalMetric) => goals.find(g => g.userId === uid && g.metric === m)?.target;
  const save = async (uid: string, m: GoalMetric, raw: string) => {
    const target = raw === '' ? 0 : Math.max(0, Number(raw));
    if ((value(uid, m) ?? 0) === target) return;
    try { await leadsService.upsertGoal({ userId: uid, period, metric: m, target }); await load(); } catch (e) { err(e, t('leads.automation.err.save')); }
  };
  const copyPrev = async () => {
    const [y, mm] = period.split('-').map(Number);
    const prev = mm === 1 ? `${y - 1}-12` : `${y}-${String(mm - 1).padStart(2, '0')}`;
    try {
      const prevGoals = await leadsService.listGoals(prev);
      if (!prevGoals.length) { toast.warning(t('leads.automation.goals.prev_empty')); return; }
      for (const g of prevGoals) await leadsService.upsertGoal({ userId: g.userId, period, metric: g.metric, target: g.target });
      await load(); toast.success(t('leads.automation.goals.copied'));
    } catch (e) { err(e, t('leads.automation.copy_failed')); }
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-neutral-500 dark:text-neutral-400 flex-1 min-w-[240px]">{t('leads.automation.goals.intro')}</p>
        <input type="month" value={period} onChange={e => e.target.value && setPeriod(e.target.value)} className={inputFormStyle + ' !w-auto !py-1.5'} />
        <button onClick={copyPrev} className={BUTTON_SECONDARY_SM_CLASSES}>{t('leads.automation.goals.copy_prev')}</button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead><tr className="text-left text-[11px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-700"><th className="py-2 pr-3">{t('leads.common.assignee')}</th>{METRICS.map(m => <th key={m} className="py-2 pr-3">{goalLabel(t, m)}</th>)}</tr></thead>
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
            {assignees.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-neutral-400">{t('leads.automation.no_collaborators')}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};
