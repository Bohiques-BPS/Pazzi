import React, { useEffect, useMemo, useState } from 'react';
import {
  Pipeline, LeadSource, LeadTag, LeadRule, LeadRuleAction, LeadRuleConditions, LeadTrigger, LeadRuleRun,
  LeadTemplate, SalesTeam, LeadWebhook, LeadApiKey, SalesGoal, GoalMetric, LeadSettings,
} from '../../types';
import { leadsService } from '../../services/leads';
import { API_URL, ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';
import { Modal, ConfirmationModal } from '../../components/Modal';
import { DataTable, TableColumn } from '../../components/DataTable';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  PlusIcon, EditIcon, DeleteIcon, ClockIcon, ArrowUpIcon, EnvelopeIcon, ChatBubbleLeftRightIcon,
  ExclamationTriangleIcon, KeyIcon, PaperAirplaneIcon, SparklesIcon, DocumentTextIcon, UserGroupIcon, ChartBarIcon,
} from '../../components/icons';
import { inputFormStyle, INPUT_SM_CLASSES, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import { useTranslation } from '../../contexts/GlobalSettingsContext';

type Assignee = { uid: string; name: string };
type TFn = (key: string, params?: Record<string, string | number>) => string;
const err = (e: unknown, fallback: string) => toast.error(e instanceof ApiError ? e.message : fallback);
const copy = async (t: TFn, text: string) => { try { await navigator.clipboard.writeText(text); toast.success(t('leads.automation.copied')); } catch { toast.error(t('leads.automation.copy_failed')); } };

// ═════════════════════════════════════════════
// UI COMPARTIDA (mismo diseño que el resto de la app: tarjetas, tablas, botones, badges)
// ═════════════════════════════════════════════

/** Texto de ayuda corto (una línea) bajo un campo o control. */
export const HINT_CLASSES = 'text-xs text-neutral-500 dark:text-neutral-400';
export const Hint: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = 'mt-1' }) => (
  <p className={`${HINT_CLASSES} ${className}`}>{children}</p>
);

/** Explicación plegable "¿Cómo funciona?": detalles más largos sin saturar la tarjeta. */
export const HowItWorks: React.FC<{ items: React.ReactNode[]; className?: string }> = ({ items, className = 'mt-1' }) => {
  const { t } = useTranslation();
  return (
    <details className={`${className} ${HINT_CLASSES}`}>
      <summary className="cursor-pointer select-none w-fit text-primary dark:text-teal-300 hover:underline">{t('leads.settings.how_it_works')}</summary>
      <ul className="mt-2 list-disc pl-5 space-y-1 max-w-3xl">
        {items.map((it, i) => <li key={i}>{it}</li>)}
      </ul>
    </details>
  );
};

/** Tarjeta estándar (igual que ProjectsDashboardPage): título + subtítulo + "¿Cómo funciona?" opcional + acciones a la derecha. */
export const SettingsCard: React.FC<{ title: string; subtitle?: React.ReactNode; help?: React.ReactNode[]; icon?: React.ReactNode; actions?: React.ReactNode; children?: React.ReactNode; className?: string }> =
  ({ title, subtitle, help, icon, actions, children, className = '' }) => (
  <div className={`bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-5 shadow-sm ${className}`}>
    <div className={`flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 ${children ? 'mb-4' : ''}`}>
      <div className="flex items-start gap-2 min-w-0">
        {icon && <span className="text-neutral-400 mt-0.5 flex-shrink-0">{icon}</span>}
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-neutral-800 dark:text-neutral-100">{title}</h2>
          {subtitle && <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 max-w-3xl">{subtitle}</p>}
          {help && help.length > 0 && <HowItWorks items={help} />}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
    {children}
  </div>
);

/** Clases de DataTable para tablas con edición en línea (donde DataTable no encaja). */
export const TH_CLASSES = 'px-4 py-2 text-left text-sm font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider whitespace-nowrap';
export const TD_CLASSES = 'px-4 py-2 text-base text-neutral-700 dark:text-neutral-200';
export const TR_CLASSES = 'hover:bg-neutral-50 dark:hover:bg-neutral-700/60';
/** Contenedor de DataTable dentro de una tarjeta: borde en vez de sombra. */
export const TABLE_IN_CARD = '!shadow-none border border-neutral-200 dark:border-neutral-700';

export const PlainTable: React.FC<{ head: React.ReactNode; children: React.ReactNode }> = ({ head, children }) => (
  <div className="min-w-0 overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
    <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
      <thead className="bg-neutral-50 dark:bg-neutral-900"><tr>{head}</tr></thead>
      <tbody className="bg-white dark:bg-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-700">{children}</tbody>
    </table>
  </div>
);

/** Interruptor estándar de la app (igual que en Administración > WhatsApp). */
export const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label?: string; disabled?: boolean }> = ({ checked, onChange, label, disabled }) => (
  <label className={`relative inline-flex items-center flex-shrink-0 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`} title={label}>
    <input type="checkbox" checked={checked} disabled={disabled} onChange={e => onChange(e.target.checked)} className="sr-only peer" aria-label={label} />
    <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
  </label>
);

export const BADGE = 'inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap';
export const BADGE_NEUTRAL = 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300';
export const BADGE_PRIMARY = 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300';
export const BADGE_GREEN = 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300';
export const BADGE_RED = 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
export const BADGE_AMBER = 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
export const BADGE_SKY = 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300';

export const LABEL_CLASSES = 'block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1';
export const BTN_ICON = 'inline-flex items-center gap-1.5';
export const ROW_EDIT_BTN = 'text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 p-1';
export const ROW_DELETE_BTN = 'text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 p-1';
export const MODAL_FOOTER = 'flex justify-end gap-2 pt-4 border-t border-neutral-200 dark:border-neutral-700';
/** Sección dentro de un modal o tarjeta (igual que el recordatorio de TaskDetailModal). */
export const BOX = 'rounded-md border border-neutral-200 dark:border-neutral-700 p-4';
/** Bloque para "añadir nuevo" bajo una tabla. */
export const ADD_ROW = 'flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700';

// ═════════════════════════════════════════════

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
const ACTIVITY_TYPES = ['call', 'email', 'whatsapp', 'meeting', 'note', 'task'];
const activityLabel = (t: TFn, type: string) => ACTIVITY_TYPES.includes(type) ? t(`leads.common.activity.${type}`) : '';

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

  const newRule = () => setEditing({ name: '', trigger: 'lead_created', conditions: {}, actions: [], active: true });

  const columns: TableColumn<LeadRule>[] = [
    {
      header: t('leads.common.status_label'),
      accessor: r => <Toggle checked={r.active} onChange={() => toggle(r)} label={r.active ? t('leads.automation.rules.toggle_active') : t('leads.automation.rules.toggle_paused')} />,
      sortable: true, sortKey: 'active', sortValue: r => (r.active ? 1 : 0), filterType: 'none',
    },
    {
      header: t('leads.automation.col.name'),
      accessor: r => (
        <div className={`min-w-[220px] max-w-md whitespace-normal ${r.active ? '' : 'opacity-60'}`}>
          <p className="font-semibold text-neutral-800 dark:text-neutral-100">{r.name}</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            <span className="font-medium">{triggerLabel(t, r.trigger)}{r.trigger === 'no_activity' ? t('leads.automation.rules.no_activity_days', { days: r.conditions?.days || 7 }) : ''}</span> · {condSummary(r.conditions)}
          </p>
        </div>
      ),
      sortable: true, sortKey: 'name', sortValue: r => r.name, noWrap: false,
    },
    {
      header: t('leads.automation.col.steps'),
      accessor: r => (
        <div className="flex flex-wrap gap-1 min-w-[200px] max-w-md">
          {r.actions.map((a, i) => <span key={i} className={`${BADGE} ${BADGE_PRIMARY}`}>{actionSummary(a)}</span>)}
        </div>
      ),
      noWrap: false, filterType: 'none',
    },
    {
      header: t('leads.automation.col.runs'),
      accessor: r => <button type="button" onClick={() => openRuns(r.id)} className="text-sm text-primary dark:text-teal-300 hover:underline" title={t('leads.automation.rules.view_runs')}>{t('leads.automation.rules.run_count', { count: r.runCount })}</button>,
      sortable: true, sortKey: 'runCount', sortValue: r => r.runCount, filterType: 'none',
    },
  ];

  const runColumns: TableColumn<LeadRuleRun>[] = [
    { header: t('leads.automation.rules.col.date'), accessor: r => <span className="text-sm text-neutral-500 dark:text-neutral-400">{new Date(r.at).toLocaleString()}</span>, sortable: true, sortKey: 'at', sortValue: r => r.at, filterType: 'none' },
    ...(!runsFor ? [{ header: t('leads.automation.rules.col.rule'), accessor: (r: LeadRuleRun) => rules.find(x => x.id === r.ruleId)?.name || '—', sortValue: (r: LeadRuleRun) => rules.find(x => x.id === r.ruleId)?.name || '' } as TableColumn<LeadRuleRun>] : []),
    { header: t('leads.common.lead'), accessor: r => <a href={`/leads?lead=${r.leadId}`} className="text-primary dark:text-teal-300 hover:underline"><span translate="no">{r.leadName}</span></a>, sortValue: r => r.leadName },
    {
      header: t('leads.automation.rules.col.result'),
      accessor: r => (
        <div className="flex items-center gap-2 whitespace-normal">
          <span className={`${BADGE} ${r.ok ? BADGE_GREEN : BADGE_RED}`} title={r.ok ? t('leads.automation.rules.result_ok') : t('leads.automation.rules.result_failed')}>{r.ok ? '✓' : '✕'}</span>
          <span className={`text-sm ${r.ok ? 'text-neutral-600 dark:text-neutral-300' : 'text-red-600 dark:text-red-400'}`}>{r.detail}</span>
        </div>
      ),
      noWrap: false, sortValue: r => r.detail,
    },
  ];

  return (
    <>
      <SettingsCard
        title={t('leads.settings.tab.rules')}
        subtitle={t('leads.automation.rules.intro')}
        help={[
          t('leads.automation.rules.help.when'),
          t('leads.automation.rules.help.only_if'),
          t('leads.automation.rules.help.then'),
          t('leads.automation.rules.help.variables'),
          t('leads.automation.rules.help.timing'),
        ]}
        icon={<SparklesIcon className="w-5 h-5" />}
        actions={<>
          <button onClick={() => openRuns('')} className={`${BUTTON_SECONDARY_SM_CLASSES} ${BTN_ICON}`} title={t('leads.automation.rules.history_tooltip')}><ClockIcon className="w-4 h-4" />{t('leads.automation.rules.history')}</button>
          <button onClick={newRule} className={`${BUTTON_PRIMARY_SM_CLASSES} ${BTN_ICON}`}><PlusIcon className="w-4 h-4" />{t('leads.automation.rules.new')}</button>
        </>}
      >
        {rules.length === 0 ? (
          <div className="border-2 border-dashed border-neutral-200 dark:border-neutral-700 rounded-xl">
            <EmptyState
              icon={<SparklesIcon className="w-12 h-12" />}
              title={t('leads.automation.rules.empty_title')}
              description={t('leads.automation.rules.empty_hint')}
              cta={<button onClick={newRule} className={`${BUTTON_PRIMARY_SM_CLASSES} ${BTN_ICON}`}><PlusIcon className="w-4 h-4" />{t('leads.automation.rules.new')}</button>}
            />
          </div>
        ) : (
          <DataTable<LeadRule>
            tableId="leads_rules"
            data={rules}
            columns={columns}
            containerClassName={TABLE_IN_CARD}
            searchable={false} filterable={false} paginated={false}
            actions={r => (
              <>
                <button onClick={() => setEditing(r)} className={ROW_EDIT_BTN} aria-label={t('leads.common.edit')} title={t('leads.common.edit')}><EditIcon className="w-5 h-5" /></button>
                <button onClick={() => setToDelete(r)} className={ROW_DELETE_BTN} aria-label={t('leads.automation.delete_aria', { name: r.name })} title={t('leads.common.delete')}><DeleteIcon className="w-5 h-5" /></button>
              </>
            )}
          />
        )}
      </SettingsCard>

      {editing && (
        <RuleEditor
          rule={editing} pipelines={pipelines} allStages={allStages} sources={sources} tags={tags} assignees={assignees} templates={templates} teams={teams}
          onClose={() => setEditing(null)}
          onSaved={async () => { setEditing(null); await load(); }}
        />
      )}
      <ConfirmationModal isOpen={!!toDelete} onClose={() => setToDelete(null)} onConfirm={async () => { const r = toDelete!; setToDelete(null); try { await leadsService.deleteRule(r.id); await load(); } catch (e) { err(e, t('leads.automation.err.delete')); } }} title={t('leads.automation.rules.delete_title')} message={t('leads.automation.delete_confirm', { name: toDelete?.name || '' })} confirmButtonText={t('leads.common.delete')} />

      <Modal isOpen={runs !== null} onClose={() => setRuns(null)} title={runsFor ? t('leads.automation.rules.runs_title', { name: rules.find(r => r.id === runsFor)?.name || '' }) : t('leads.automation.rules.history_title')} size="3xl">
        <Hint className="mb-3">{t('leads.automation.rules.runs_help')}</Hint>
        {(runs || []).length === 0 ? (
          <EmptyState icon={<ClockIcon className="w-12 h-12" />} title={t('leads.automation.rules.no_runs')} description={t('leads.automation.rules.no_runs_hint')} />
        ) : (
          <DataTable<LeadRuleRun>
            tableId={runsFor ? 'leads_rule_runs_one' : 'leads_rule_runs_all'}
            data={runs || []}
            columns={runColumns}
            containerClassName={TABLE_IN_CARD}
            filterable={false}
          />
        )}
      </Modal>
    </>
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
  const sel = INPUT_SM_CLASSES;
  const sectionTitle = 'text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2';

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
      <div className="space-y-4">
        <div>
          <label className={LABEL_CLASSES}>{t('leads.automation.editor.name')}</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder={t('leads.automation.editor.name_placeholder')} className={inputFormStyle} autoFocus />
          <Hint>{t('leads.automation.editor.name_hint')}</Hint>
        </div>

        {/* 1. Cuándo */}
        <div className={BOX}>
          <h4 className={sectionTitle}>{t('leads.automation.editor.when')}</h4>
          <div className="flex flex-wrap items-center gap-2">
            <select value={trigger} onChange={e => setTrigger(e.target.value as LeadTrigger)} className={sel} aria-label={t('leads.automation.editor.when')}>
              {TRIGGERS.map(tr => <option key={tr} value={tr}>{triggerLabel(t, tr)}</option>)}
            </select>
            {trigger === 'no_activity' && (<><input type="number" min={1} max={365} value={cond.days ?? 7} onChange={e => setC('days', Number(e.target.value))} className={sel + ' w-20'} aria-label={t('leads.automation.editor.days_aria')} title={t('leads.automation.editor.days_aria')} /><span className="text-sm text-neutral-600 dark:text-neutral-300">{t('leads.automation.editor.days')}</span></>)}
          </div>
          {/* key: se remonta al cambiar de disparador (evita el choque del traductor de Chrome con texto que cambia). */}
          <Hint key={trigger} className="mt-2">{t(`leads.automation.trigger_hint.${trigger}`)}</Hint>
        </div>

        {/* 2. Condiciones */}
        <div className={BOX}>
          <h4 className={sectionTitle}>{t('leads.automation.editor.only_if')}</h4>
          <Hint className="-mt-1 mb-2">{t('leads.automation.editor.only_if_hint')}</Hint>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {pipelines.length > 1 && (
              <select value={cond.pipelineId || ''} onChange={e => { setC('pipelineId', e.target.value); setC('stageId', ''); }} className={sel + ' w-full'} aria-label={t('leads.common.pipeline')} title={t('leads.automation.editor.cond_pipeline_title')}>
                <option value="">{t('leads.automation.editor.any_pipeline')}</option>{pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
            <select value={cond.stageId || ''} onChange={e => setC('stageId', e.target.value)} className={sel + ' w-full'} aria-label={t('leads.common.stage')} title={t('leads.automation.editor.cond_stage_title')}>
              <option value="">{t('leads.automation.editor.any_stage')}</option>{stagesForCond.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            <select value={cond.sourceId || ''} onChange={e => setC('sourceId', e.target.value)} className={sel + ' w-full'} aria-label={t('leads.common.source')} title={t('leads.automation.editor.cond_source_title')}>
              <option value="">{t('leads.automation.editor.any_source')}</option>{sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select value={cond.tagId || ''} onChange={e => setC('tagId', e.target.value)} className={sel + ' w-full'} aria-label={t('leads.common.tags')} title={t('leads.automation.editor.cond_tag_title')}>
              <option value="">{t('leads.automation.editor.any_tag')}</option>{tags.map(tg => <option key={tg.id} value={tg.id}>{tg.name}</option>)}
            </select>
            <input type="number" value={cond.minValue ?? ''} onChange={e => setC('minValue', e.target.value === '' ? null : Number(e.target.value))} placeholder={t('leads.automation.editor.min_value')} className={sel + ' w-full'} aria-label={t('leads.automation.editor.min_value')} title={t('leads.automation.editor.min_value_title')} />
            <input type="number" value={cond.maxValue ?? ''} onChange={e => setC('maxValue', e.target.value === '' ? null : Number(e.target.value))} placeholder={t('leads.automation.editor.max_value')} className={sel + ' w-full'} aria-label={t('leads.automation.editor.max_value')} title={t('leads.automation.editor.max_value_title')} />
          </div>
        </div>

        {/* 3. Acciones */}
        <div className={BOX}>
          <h4 className={sectionTitle}>{t('leads.automation.editor.then')}</h4>
          <Hint className="-mt-1 mb-2">{t('leads.automation.editor.then_hint')}</Hint>
          <ul className="space-y-2">
            {actions.map((a, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2 p-2 rounded-md border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700/40">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary dark:text-teal-300 text-xs font-semibold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                <select value={a.type} onChange={e => setActions(prev => prev.map((x, j) => j === i ? emptyAction(t, e.target.value as any) : x))} className={sel} aria-label={t('leads.automation.editor.action_type_aria')}>
                  {ACTION_TYPES.map(at => <option key={at} value={at}>{actionLabel(t, at)}</option>)}
                </select>
                {a.type === 'assign' && <select value={a.userId} onChange={e => setA(i, { userId: e.target.value })} className={sel}><option value="">{t('leads.automation.editor.pick_person')}</option>{assignees.map(x => <option key={x.uid} value={x.uid}>{x.name}</option>)}</select>}
                {a.type === 'round_robin' && (teams.length ? <select value={a.teamId} onChange={e => setA(i, { teamId: e.target.value })} className={sel}><option value="">{t('leads.automation.editor.pick_team')}</option>{teams.map(tm => <option key={tm.id} value={tm.id}>{tm.name}</option>)}</select> : <span className="text-xs text-amber-600 dark:text-amber-400">{t('leads.automation.editor.create_team_first')}</span>)}
                {(a.type === 'add_tag' || a.type === 'remove_tag') && <select value={a.tagId} onChange={e => setA(i, { tagId: e.target.value })} className={sel}><option value="">{t('leads.automation.editor.pick_tag')}</option>{tags.map(tg => <option key={tg.id} value={tg.id}>{tg.name}</option>)}</select>}
                {a.type === 'move_stage' && <select value={a.stageId} onChange={e => setA(i, { stageId: e.target.value })} className={sel}><option value="">{t('leads.automation.editor.pick_stage')}</option>{allStages.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select>}
                {a.type === 'create_activity' && (<>
                  <select value={a.activityType} onChange={e => setA(i, { activityType: e.target.value })} className={sel}>{ACTIVITY_TYPES.map(k => <option key={k} value={k}>{activityLabel(t, k)}</option>)}</select>
                  <input value={a.body || ''} onChange={e => setA(i, { body: e.target.value })} placeholder={t('leads.automation.editor.detail_placeholder')} className={sel + ' flex-1 min-w-[160px]'} />
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">{t('leads.automation.editor.in')}</span><input type="number" min={0} value={a.dueInHours ?? 0} onChange={e => setA(i, { dueInHours: Number(e.target.value) })} className={sel + ' w-20'} aria-label={t('leads.automation.editor.due_hours_title')} title={t('leads.automation.editor.due_hours_title')} /><span className="text-xs text-neutral-500 dark:text-neutral-400">{t('leads.automation.editor.hours')}</span>
                </>)}
                {a.type === 'notify' && (<>
                  <select value={a.target} onChange={e => setA(i, { target: e.target.value })} className={sel}><option value="assignee">{t('leads.automation.editor.notify_assignee')}</option><option value="managers">{t('leads.automation.editor.notify_managers')}</option><option value="user">{t('leads.automation.editor.notify_user')}</option></select>
                  {a.target === 'user' && <select value={a.userId || ''} onChange={e => setA(i, { userId: e.target.value })} className={sel}><option value="">{t('leads.automation.editor.pick_person')}</option>{assignees.map(x => <option key={x.uid} value={x.uid}>{x.name}</option>)}</select>}
                  <input value={a.message} onChange={e => setA(i, { message: e.target.value })} placeholder={t('leads.automation.editor.message_placeholder')} className={sel + ' flex-1 min-w-[160px]'} />
                </>)}
                {(a.type === 'send_email' || a.type === 'send_whatsapp') && (tplFor(a.type === 'send_email' ? 'email' : 'whatsapp').length
                  ? <select value={a.templateId} onChange={e => setA(i, { templateId: e.target.value })} className={sel}><option value="">{t('leads.automation.editor.pick_template')}</option>{tplFor(a.type === 'send_email' ? 'email' : 'whatsapp').map(tp => <option key={tp.id} value={tp.id}>{tp.name}</option>)}</select>
                  : <span className="text-xs text-amber-600 dark:text-amber-400">{t('leads.automation.editor.create_template_first', { channel: t(a.type === 'send_email' ? 'leads.automation.channel_lower.email' : 'leads.automation.channel_lower.whatsapp') })}</span>)}
                {a.type === 'webhook' && <input value={a.url} onChange={e => setA(i, { url: e.target.value })} placeholder="https://hooks.zapier.com/…" className={sel + ' flex-1 min-w-[200px]'} aria-label={t('leads.automation.col.url')} />}
                <div className="ml-auto flex items-center gap-1">
                  <button type="button" onClick={() => setActions(prev => { if (i === 0) return prev; const n = [...prev]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; return n; })} disabled={i === 0} className="p-1 text-neutral-500 hover:text-primary disabled:opacity-30" aria-label={t('leads.automation.editor.move_up')} title={t('leads.automation.editor.move_up')}><ArrowUpIcon className="w-4 h-4" /></button>
                  <button type="button" onClick={() => setActions(prev => prev.filter((_, j) => j !== i))} className={ROW_DELETE_BTN} aria-label={t('leads.automation.editor.remove_action')} title={t('leads.automation.editor.remove_action')}><DeleteIcon className="w-5 h-5" /></button>
                </div>
                <Hint key={a.type} className="w-full pl-8">{t(`leads.automation.action_hint.${a.type}`)}</Hint>
              </li>
            ))}
          </ul>
          {actions.length < 10 && (
            <select value="" onChange={e => { if (e.target.value) setActions(prev => [...prev, emptyAction(t, e.target.value as any)]); }} className={sel + (actions.length ? ' mt-2' : '')} aria-label={t('leads.automation.editor.add_action')}>
              <option value="">{t('leads.automation.editor.add_action')}</option>
              {ACTION_TYPES.map(at => <option key={at} value={at}>{actionLabel(t, at)}</option>)}
            </select>
          )}
          <div className="flex flex-wrap items-center gap-1 mt-3">
            <span className="text-xs text-neutral-500 dark:text-neutral-400 mr-1">{t('leads.automation.editor.variables')}</span>
            {VARIABLES.map(v => <span key={v} className={`${BADGE} ${BADGE_NEUTRAL} font-mono cursor-help`} title={t(`leads.automation.var.${v}`)}>{`{{${v}}}`}</span>)}
          </div>
        </div>

        <div className={MODAL_FOOTER}>
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

const ChannelBadge: React.FC<{ channel: string }> = ({ channel }) => {
  const { t } = useTranslation();
  return channel === 'email'
    ? <span className={`${BADGE} ${BADGE_SKY}`}><EnvelopeIcon className="w-3.5 h-3.5" />{t('leads.common.channel.email')}</span>
    : <span className={`${BADGE} ${BADGE_GREEN}`}><ChatBubbleLeftRightIcon className="w-3.5 h-3.5" />{t('leads.common.channel.whatsapp')}</span>;
};

export const TemplatesTab: React.FC = () => {
  const { t } = useTranslation();
  const [list, setList] = useState<LeadTemplate[]>([]);
  const [editing, setEditing] = useState<Partial<LeadTemplate> | null>(null);
  const [toDelete, setToDelete] = useState<LeadTemplate | null>(null);
  const load = () => leadsService.listTemplates().then(setList).catch(e => err(e, t('leads.automation.templates.load_error')));
  useEffect(() => { load(); }, []);

  const newEmail = () => setEditing({ channel: 'email', name: '', subject: '', body: t('leads.automation.templates.default_email_body') });
  const newWhatsapp = () => setEditing({ channel: 'whatsapp', name: '', body: t('leads.automation.templates.default_whatsapp_body') });

  const columns: TableColumn<LeadTemplate>[] = [
    { header: t('leads.automation.col.channel'), accessor: tp => <ChannelBadge channel={tp.channel} />, sortable: true, sortKey: 'channel', sortValue: tp => tp.channel },
    { header: t('leads.automation.col.name'), accessor: tp => <span className="font-medium text-neutral-800 dark:text-neutral-100">{tp.name}</span>, sortable: true, sortKey: 'name', sortValue: tp => tp.name },
    { header: t('leads.automation.templates.subject'), accessor: tp => <span className="block max-w-xs truncate text-sm text-neutral-500 dark:text-neutral-400">{tp.subject || '—'}</span>, sortValue: tp => tp.subject || '' },
    { header: t('leads.automation.templates.message'), accessor: tp => <span className="block max-w-sm truncate text-sm text-neutral-600 dark:text-neutral-300" title={tp.body}>{tp.body}</span>, filterType: 'none' },
  ];

  return (
    <>
      <SettingsCard
        title={t('leads.settings.tab.templates')}
        subtitle={t('leads.automation.templates.intro')}
        help={[
          t('leads.automation.templates.help.email'),
          t('leads.automation.templates.help.whatsapp'),
          t('leads.automation.templates.help.variables'),
        ]}
        icon={<DocumentTextIcon className="w-5 h-5" />}
        actions={<>
          <button onClick={newEmail} className={`${BUTTON_SECONDARY_SM_CLASSES} ${BTN_ICON}`} title={t('leads.automation.templates.new_email_title')}><EnvelopeIcon className="w-4 h-4" />{t('leads.automation.templates.new_email')}</button>
          <button onClick={newWhatsapp} className={`${BUTTON_PRIMARY_SM_CLASSES} ${BTN_ICON}`} title={t('leads.automation.templates.new_whatsapp_title')}><ChatBubbleLeftRightIcon className="w-4 h-4" />{t('leads.automation.templates.new_whatsapp')}</button>
        </>}
      >
        {list.length === 0 ? (
          <EmptyState icon={<DocumentTextIcon className="w-12 h-12" />} title={t('leads.automation.templates.empty')} description={t('leads.automation.templates.empty_hint')} />
        ) : (
          <DataTable<LeadTemplate>
            tableId="leads_templates"
            data={list}
            columns={columns}
            containerClassName={TABLE_IN_CARD}
            searchable={false} filterable={false} paginated={false}
            actions={tp => (
              <>
                <button onClick={() => setEditing(tp)} className={ROW_EDIT_BTN} aria-label={t('leads.common.edit')} title={t('leads.common.edit')}><EditIcon className="w-5 h-5" /></button>
                <button onClick={() => setToDelete(tp)} className={ROW_DELETE_BTN} aria-label={t('leads.automation.delete_aria', { name: tp.name })} title={t('leads.common.delete')}><DeleteIcon className="w-5 h-5" /></button>
              </>
            )}
          />
        )}
      </SettingsCard>
      {editing && <TemplateEditor tpl={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      <ConfirmationModal isOpen={!!toDelete} onClose={() => setToDelete(null)} onConfirm={async () => { const tp = toDelete!; setToDelete(null); try { await leadsService.deleteTemplate(tp.id); load(); } catch (e) { err(e, t('leads.automation.err.delete')); } }} title={t('leads.automation.templates.delete_title')} message={t('leads.automation.templates.delete_message', { name: toDelete?.name || '' })} confirmButtonText={t('leads.common.delete')} />
    </>
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
      <div className="space-y-4">
        <div>
          <label className={LABEL_CLASSES}>{t('leads.automation.templates.internal_name')}</label>
          <input value={f.name} onChange={e => setF(p => ({ ...p, name: e.target.value }))} placeholder={t('leads.automation.templates.name_placeholder')} className={inputFormStyle} autoFocus />
          <Hint>{t('leads.automation.templates.internal_name_hint')}</Hint>
        </div>
        {tpl.channel === 'email' && (
          <div>
            <label className={LABEL_CLASSES}>{t('leads.automation.templates.subject')}</label>
            <input value={f.subject} onChange={e => setF(p => ({ ...p, subject: e.target.value }))} placeholder={t('leads.automation.templates.subject_placeholder')} className={inputFormStyle} />
            <Hint>{t('leads.automation.templates.subject_hint')}</Hint>
          </div>
        )}
        <div>
          <label className={LABEL_CLASSES}>{t('leads.automation.templates.message')}</label>
          <textarea ref={bodyRef} rows={8} value={f.body} onChange={e => setF(p => ({ ...p, body: e.target.value }))} placeholder={t(tpl.channel === 'email' ? 'leads.automation.templates.body_placeholder_email' : 'leads.automation.templates.body_placeholder_whatsapp')} className={inputFormStyle + ' !h-auto'} />
          <Hint className="mt-2">{t('leads.automation.templates.variables_hint')}</Hint>
          <div className="flex flex-wrap gap-1 mt-1">
            {VARIABLES.map(v => <button key={v} type="button" onClick={() => insert(v)} className={`${BADGE} ${BADGE_NEUTRAL} font-mono hover:bg-primary/10 hover:text-primary`} title={t('leads.automation.templates.insert_var', { label: t(`leads.automation.var.${v}`) })}>{`{{${v}}}`}</button>)}
          </div>
          {tpl.channel === 'whatsapp' && <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">{t('leads.automation.templates.whatsapp_note')}</p>}
        </div>
        <div className={MODAL_FOOTER}>
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
  const newTeam = () => setEditing({ name: '', memberUserIds: [], mode: 'round_robin', active: true });

  const columns: TableColumn<SalesTeam>[] = [
    { header: t('leads.automation.col.name'), accessor: tm => <span className="font-medium text-neutral-800 dark:text-neutral-100">{tm.name}</span>, sortable: true, sortKey: 'name', sortValue: tm => tm.name },
    { header: t('leads.automation.col.mode'), accessor: tm => <span className={`${BADGE} ${BADGE_NEUTRAL}`}>{tm.mode === 'balanced' ? t('leads.automation.teams.mode.balanced') : t('leads.automation.teams.mode.round_robin')}</span>, sortable: true, sortKey: 'mode', sortValue: tm => tm.mode },
    { header: t('leads.automation.col.members'), accessor: tm => <span className="block min-w-[180px] max-w-md whitespace-normal text-sm text-neutral-600 dark:text-neutral-300">{tm.memberUserIds.length ? tm.memberUserIds.map(nameOf).join(', ') : t('leads.automation.teams.no_members')}</span>, noWrap: false, filterType: 'none' },
    {
      header: t('leads.common.status_label'),
      accessor: tm => (
        <div className="flex flex-wrap gap-1">
          {settings.defaultTeamId === tm.id && <span className={`${BADGE} ${BADGE_PRIMARY}`} title={t('leads.automation.teams.default_title')}>{t('leads.automation.teams.default')}</span>}
          <span className={`${BADGE} ${tm.active ? BADGE_GREEN : BADGE_NEUTRAL}`} title={tm.active ? t('leads.automation.teams.active_title') : t('leads.automation.teams.paused_title')}>{tm.active ? t('leads.common.active') : t('leads.automation.teams.paused')}</span>
        </div>
      ),
      sortable: true, sortKey: 'active', sortValue: tm => (tm.active ? 1 : 0), filterType: 'none',
    },
  ];

  return (
    <>
      <SettingsCard
        title={t('leads.settings.tab.teams')}
        subtitle={<>{t('leads.automation.teams.intro')} <strong>{t('leads.automation.teams.mode.round_robin')}</strong>: {t('leads.automation.teams.intro_round_robin')} <strong>{t('leads.automation.teams.mode.balanced')}</strong>: {t('leads.automation.teams.intro_balanced')}</>}
        help={[
          t('leads.automation.teams.help.where'),
          t('leads.automation.teams.help.members'),
          t('leads.automation.teams.help.paused'),
          t('leads.automation.teams.help.delete'),
        ]}
        icon={<UserGroupIcon className="w-5 h-5" />}
        actions={<button onClick={newTeam} className={`${BUTTON_PRIMARY_SM_CLASSES} ${BTN_ICON}`}><PlusIcon className="w-4 h-4" />{t('leads.automation.teams.new')}</button>}
      >
        <div className={`${BOX} bg-neutral-50 dark:bg-neutral-900/40 mb-4`}>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-neutral-700 dark:text-neutral-200 flex-1 min-w-[240px]">{t('leads.automation.teams.auto_assign_prefix')} <strong>{t('leads.automation.teams.auto_assign_strong')}</strong> {t('leads.automation.teams.auto_assign_suffix')}</span>
            <select value={settings.defaultTeamId || ''} onChange={e => setDefault(e.target.value)} className={INPUT_SM_CLASSES + ' min-w-[220px]'} aria-label={t('leads.automation.teams.default_select_aria')}>
              <option value="">{t('leads.automation.teams.no_distribute')}</option>
              {teams.filter(tm => tm.active).map(tm => <option key={tm.id} value={tm.id}>{tm.name}</option>)}
            </select>
          </div>
          <Hint className="mt-2">{t('leads.automation.teams.auto_assign_hint')}</Hint>
        </div>
        {teams.length === 0 ? (
          <EmptyState icon={<UserGroupIcon className="w-12 h-12" />} title={t('leads.automation.teams.empty')} description={t('leads.automation.teams.empty_hint')} />
        ) : (
          <DataTable<SalesTeam>
            tableId="leads_teams"
            data={teams}
            columns={columns}
            containerClassName={TABLE_IN_CARD}
            searchable={false} filterable={false} paginated={false}
            actions={tm => (
              <>
                <button onClick={() => setEditing(tm)} className={ROW_EDIT_BTN} aria-label={t('leads.common.edit')} title={t('leads.common.edit')}><EditIcon className="w-5 h-5" /></button>
                <button onClick={() => setToDelete(tm)} className={ROW_DELETE_BTN} aria-label={t('leads.automation.delete_aria', { name: tm.name })} title={t('leads.common.delete')}><DeleteIcon className="w-5 h-5" /></button>
              </>
            )}
          />
        )}
      </SettingsCard>

      {editing && (
        <Modal isOpen={true} onClose={() => setEditing(null)} title={editing.id ? t('leads.automation.teams.title_edit') : t('leads.automation.teams.title_new')} size="md">
          <TeamForm team={editing} assignees={assignees} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
        </Modal>
      )}
      <ConfirmationModal isOpen={!!toDelete} onClose={() => setToDelete(null)} onConfirm={async () => { const tm = toDelete!; setToDelete(null); try { await leadsService.deleteTeam(tm.id); load(); if (settings.defaultTeamId === tm.id) setSettings({ ...settings, defaultTeamId: null }); } catch (e) { err(e, t('leads.automation.err.delete')); } }} title={t('leads.automation.teams.delete_title')} message={t('leads.automation.delete_confirm', { name: toDelete?.name || '' })} confirmButtonText={t('leads.common.delete')} />
    </>
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
    <div className="space-y-4">
      <div>
        <label className={LABEL_CLASSES}>{t('leads.automation.teams.name_label')}</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder={t('leads.automation.teams.name_placeholder')} className={inputFormStyle} autoFocus />
      </div>
      <div>
        <label className={LABEL_CLASSES}>{t('leads.automation.teams.mode_label')}</label>
        <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-700 dark:text-neutral-200">
          <label className="flex items-center gap-1.5 cursor-pointer" title={t('leads.automation.teams.mode_hint.round_robin')}><input type="radio" checked={mode === 'round_robin'} onChange={() => setMode('round_robin')} className="h-4 w-4 text-primary focus:ring-primary" /> {t('leads.automation.teams.mode.round_robin')}</label>
          <label className="flex items-center gap-1.5 cursor-pointer" title={t('leads.automation.teams.mode_hint.balanced')}><input type="radio" checked={mode === 'balanced'} onChange={() => setMode('balanced')} className="h-4 w-4 text-primary focus:ring-primary" /> {t('leads.automation.teams.mode.balanced')}</label>
          <span className="ml-auto flex items-center gap-2" title={t('leads.automation.teams.active_hint')}>{t('leads.common.active')} <Toggle checked={active} onChange={setActive} label={t('leads.automation.teams.active_hint')} /></span>
        </div>
        <Hint key={mode}>{t(`leads.automation.teams.mode_hint.${mode}`)}</Hint>
      </div>
      <fieldset className="border dark:border-neutral-600 p-3 rounded">
        <legend className="text-base font-medium px-1 text-neutral-700 dark:text-neutral-300">{t('leads.automation.col.members')}</legend>
        <Hint className="mb-1">{t('leads.automation.teams.members_hint')}</Hint>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto mt-1">
          {assignees.map(a => (
            <label key={a.uid} className="flex items-center gap-2 p-1.5 bg-neutral-100 dark:bg-neutral-700 rounded cursor-pointer hover:bg-neutral-200 dark:hover:bg-neutral-600">
              <input type="checkbox" checked={members.includes(a.uid)} onChange={e => setMembers(prev => e.target.checked ? [...prev, a.uid] : prev.filter(x => x !== a.uid))} className="form-checkbox h-4 w-4 text-primary focus:ring-primary" />
              <span className="text-sm text-neutral-700 dark:text-neutral-200">{a.name}</span>
            </label>
          ))}
        </div>
        {assignees.length === 0 && <p className="p-2 text-sm text-neutral-400">{t('leads.automation.no_collaborators')}</p>}
      </fieldset>
      <div className={MODAL_FOOTER}>
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
/** Qué significa cada evento (tooltip). */
const eventHint = (t: TFn, ev: string) => ev === '*' ? t('leads.automation.event_hint.all') : KNOWN_EVENTS.includes(ev) ? t(`leads.automation.event_hint.${ev}`) : ev;
const CHECKBOX_SM = 'h-4 w-4 text-primary rounded border-neutral-300 dark:border-neutral-600 dark:bg-neutral-900 focus:ring-primary';

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
  const toggleHookEvent = async (h: LeadWebhook, ev: string, checked: boolean) => {
    const next = checked ? [...h.events, ev] : h.events.filter(x => x !== ev);
    if (!next.length) { toast.error(t('leads.automation.integrations.keep_one_event')); return; }
    try { await leadsService.updateWebhook(h.id, { events: next }); await load(); } catch (er) { err(er, t('leads.automation.err.update')); }
  };
  const endpoint = `${API_URL}/public/v1/leads`;
  const curl = `curl -X POST ${endpoint} \\\n  -H "Authorization: Bearer pzk_TU_LLAVE" \\\n  -H "Content-Type: application/json" \\\n  -d '{"name":"Ana","lastName":"Rivera","email":"ana@ejemplo.com","phone":"7875550000","companyName":"ACME","value":1500,"source":"Landing","notes":"Quiere cotización"}'`;

  const hookColumns: TableColumn<LeadWebhook>[] = [
    { header: t('leads.automation.col.url'), accessor: h => <code className="block min-w-[180px] max-w-xs text-xs break-all whitespace-normal">{h.url}</code>, sortValue: h => h.url, noWrap: false },
    {
      header: t('leads.automation.col.events'),
      accessor: h => (
        <div className="flex flex-wrap gap-x-3 gap-y-1 min-w-[220px] max-w-md">
          {['*', ...events].map(ev => (
            <label key={ev} className="flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-300 cursor-pointer" title={eventHint(t, ev)}>
              <input type="checkbox" checked={h.events.includes(ev)} onChange={e => toggleHookEvent(h, ev, e.target.checked)} className={CHECKBOX_SM} />
              {eventLabel(t, ev)}
            </label>
          ))}
        </div>
      ),
      noWrap: false, filterType: 'none',
    },
    {
      header: t('leads.automation.col.last_send'),
      accessor: h => (
        <span className={`${BADGE} ${h.lastStatus && h.lastStatus < 300 ? BADGE_GREEN : h.lastAt ? BADGE_RED : BADGE_NEUTRAL}`} title={h.lastError || t('leads.automation.integrations.last_send_title')}>
          {h.lastAt ? `${h.lastStatus || 'error'} · ${new Date(h.lastAt).toLocaleString()}` : t('leads.automation.integrations.no_sends')}
        </span>
      ),
      sortable: true, sortKey: 'lastAt', sortValue: h => h.lastAt || '', filterType: 'none',
    },
    {
      header: t('leads.common.active'),
      accessor: h => <Toggle checked={h.active} label={t('leads.automation.integrations.hook_active_title')} onChange={async v => { try { await leadsService.updateWebhook(h.id, { active: v }); await load(); } catch (er) { err(er, t('leads.automation.err.update')); } }} />,
      sortable: true, sortKey: 'active', sortValue: h => (h.active ? 1 : 0), filterType: 'none',
    },
    {
      header: t('leads.automation.col.secret'),
      accessor: h => (
        <div className="flex items-center gap-2 text-xs">
          <code className="break-all">{revealed[h.id] ? h.secret : '••••••••••••'}</code>
          <button type="button" onClick={() => setRevealed(r => ({ ...r, [h.id]: !r[h.id] }))} className="text-primary dark:text-teal-300 hover:underline" title={t('leads.automation.integrations.secret_title')}>{revealed[h.id] ? t('leads.automation.integrations.hide') : t('leads.automation.integrations.show')}</button>
          <button type="button" onClick={() => copy(t, h.secret)} className="text-primary dark:text-teal-300 hover:underline" title={t('leads.automation.integrations.copy_secret_title')}>{t('leads.automation.integrations.copy')}</button>
        </div>
      ),
      filterType: 'none',
    },
  ];

  const keyColumns: TableColumn<LeadApiKey>[] = [
    { header: t('leads.automation.col.name'), accessor: k => <span className="font-medium text-neutral-800 dark:text-neutral-100">{k.name}</span>, sortable: true, sortKey: 'name', sortValue: k => k.name },
    { header: t('leads.automation.col.key'), accessor: k => <code className="text-xs cursor-help" title={t('leads.automation.integrations.key_prefix_title')}>pzk_{k.prefix}_…</code>, sortValue: k => k.prefix },
    { header: t('leads.automation.col.last_used'), accessor: k => <span className="text-sm text-neutral-500 dark:text-neutral-400">{k.lastUsedAt ? t('leads.automation.integrations.key_used', { date: new Date(k.lastUsedAt).toLocaleString() }) : t('leads.automation.integrations.key_unused')}</span>, sortable: true, sortKey: 'lastUsedAt', sortValue: k => k.lastUsedAt || '' },
    { header: t('leads.common.status_label'), accessor: k => <span className={`${BADGE} ${k.revokedAt ? BADGE_RED : BADGE_GREEN}`}>{k.revokedAt ? t('leads.automation.integrations.revoked') : t('leads.automation.rules.active')}</span>, sortable: true, sortKey: 'revokedAt', sortValue: k => (k.revokedAt ? 1 : 0) },
  ];

  return (
    <div className="space-y-6">
      {/* Webhooks */}
      <SettingsCard
        title={t('leads.automation.integrations.webhooks_title')}
        subtitle={t('leads.automation.integrations.webhooks_help')}
        help={[
          t('leads.automation.integrations.webhooks_help_events'),
          <>{t('leads.automation.integrations.webhooks_intro_1')} <code className="text-[11px]">X-Pazzi-Signature: sha256=…</code> {t('leads.automation.integrations.webhooks_intro_2')}</>,
          t('leads.automation.integrations.webhooks_help_test'),
          t('leads.automation.integrations.webhooks_help_limits'),
        ]}
        icon={<PaperAirplaneIcon className="w-5 h-5" />}
      >
        {hooks.length === 0 && (
          <EmptyState icon={<PaperAirplaneIcon className="w-10 h-10" />} title={t('leads.automation.integrations.no_webhooks')} description={t('leads.automation.integrations.no_webhooks_hint')} className="!py-6" />
        )}
        {hooks.length > 0 && (
          <DataTable<LeadWebhook>
            tableId="leads_webhooks"
            data={hooks}
            columns={hookColumns}
            containerClassName={TABLE_IN_CARD}
            searchable={false} filterable={false} paginated={false}
            actions={h => (
              <span className="inline-flex items-center gap-2">
                <button onClick={() => test(h)} className={BUTTON_SECONDARY_SM_CLASSES} title={t('leads.automation.integrations.test_title')}>{t('leads.automation.integrations.test')}</button>
                <button onClick={() => setToDelete({ kind: 'hook', id: h.id, label: h.url })} className={ROW_DELETE_BTN} aria-label={t('leads.automation.integrations.delete_webhook')} title={t('leads.automation.integrations.delete_webhook')}><DeleteIcon className="w-5 h-5" /></button>
              </span>
            )}
          />
        )}
        <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700 space-y-3">
          <div>
            <label className={LABEL_CLASSES}>{t('leads.automation.integrations.url_label')}</label>
            <input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="https://hooks.zapier.com/…" className={inputFormStyle} />
            <Hint>{t('leads.automation.integrations.url_hint')}</Hint>
          </div>
          <div>
            <label className={LABEL_CLASSES}>{t('leads.automation.integrations.events_label')}</label>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {['*', ...events].map(ev => (
                <label key={ev} className="flex items-center gap-1.5 text-sm text-neutral-700 dark:text-neutral-200 cursor-pointer" title={eventHint(t, ev)}><input type="checkbox" checked={newEvents.includes(ev)} onChange={e => setNewEvents(p => e.target.checked ? [...p, ev] : p.filter(x => x !== ev))} className={CHECKBOX_SM} /> {eventLabel(t, ev)}</label>
              ))}
            </div>
            <Hint>{t('leads.automation.integrations.events_hint')}</Hint>
          </div>
          <button onClick={addHook} disabled={!newUrl.trim() || !newEvents.length} className={`${BUTTON_PRIMARY_SM_CLASSES} ${BTN_ICON} disabled:opacity-50`}><PlusIcon className="w-4 h-4" />{t('leads.automation.integrations.add_webhook')}</button>
        </div>
      </SettingsCard>

      {/* API */}
      <SettingsCard
        title={t('leads.automation.integrations.api_title')}
        subtitle={t('leads.automation.integrations.api_intro')}
        help={[
          t('leads.automation.integrations.api_help.password'),
          t('leads.automation.integrations.api_help.once'),
          t('leads.automation.integrations.api_help.one_per_use'),
          t('leads.automation.integrations.api_help.no_browser'),
          t('leads.automation.integrations.api_help.source'),
        ]}
        icon={<KeyIcon className="w-5 h-5" />}
      >
        {keys.length === 0 ? (
          <EmptyState icon={<KeyIcon className="w-10 h-10" />} title={t('leads.automation.integrations.no_keys')} description={isManager ? t('leads.automation.integrations.no_keys_hint') : t('leads.automation.integrations.no_keys_hint_employee')} className="!py-6" />
        ) : (
          <DataTable<LeadApiKey>
            tableId="leads_api_keys"
            data={keys}
            columns={keyColumns}
            containerClassName={TABLE_IN_CARD}
            searchable={false} filterable={false} paginated={false}
            actions={k => k.revokedAt ? null : (
              <button onClick={() => setToDelete({ kind: 'key', id: k.id, label: k.name })} className={`${BUTTON_SECONDARY_SM_CLASSES} text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/50`} title={t('leads.automation.integrations.revoke_title')}>{t('leads.automation.integrations.revoke')}</button>
            )}
          />
        )}
        <div className={ADD_ROW}>
          {isManager ? (
            <>
              <input value={keyName} onChange={e => setKeyName(e.target.value)} placeholder={t('leads.automation.integrations.key_name_placeholder')} className={inputFormStyle + ' !w-72 max-w-full'} aria-label={t('leads.automation.integrations.key_name_label')} />
              <button onClick={createKey} className={`${BUTTON_PRIMARY_SM_CLASSES} ${BTN_ICON}`}><PlusIcon className="w-4 h-4" />{t('leads.automation.integrations.create_key')}</button>
              <Hint className="w-full">{t('leads.automation.integrations.key_name_hint')}</Hint>
            </>
          ) : (
            <div className="w-full p-3 rounded-md bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-700 flex items-start gap-2">
              <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <p className="text-sm text-amber-800 dark:text-amber-300">{t('leads.automation.integrations.manager_only')}</p>
            </div>
          )}
        </div>
        <div className="mt-4">
          <label className={LABEL_CLASSES}>{t('leads.automation.integrations.example')}</label>
          <Hint className="mb-2 -mt-0.5">{t('leads.automation.integrations.example_hint')}</Hint>
          <pre className="text-[11px] bg-neutral-900 text-neutral-100 rounded-lg p-3 overflow-x-auto whitespace-pre border border-neutral-200 dark:border-neutral-700">{curl}</pre>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">{t('leads.automation.integrations.fields')} <code>name</code> {t('leads.automation.integrations.required')}, <code>lastName</code>, <code>companyName</code>, <code>email</code>, <code>phone</code>, <code>whatsapp</code>, <code>value</code>, <code>source</code>, <code>notes</code>, <code>pipelineId</code>, <code>stageId</code>. {t('leads.automation.integrations.rate_limit')} <code>GET {API_URL}/public/v1/ping</code>.</p>
        </div>
      </SettingsCard>

      <Modal isOpen={!!createdKey} onClose={() => setCreatedKey(null)} title={t('leads.automation.integrations.new_key_title')} size="md">
        <div className="space-y-4">
          <div className="p-3 rounded-md bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-700 flex items-start gap-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-300">{t('leads.automation.integrations.copy_now_1')} <strong>{t('leads.automation.integrations.copy_now_2')}</strong>.</p>
          </div>
          <code className="block text-xs break-all p-3 rounded-md border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900">{createdKey}</code>
          <Hint className="-mt-2">{t('leads.automation.integrations.new_key_hint')}</Hint>
          <div className={MODAL_FOOTER}>
            <button onClick={() => setCreatedKey(null)} className={BUTTON_SECONDARY_SM_CLASSES}>{t('leads.automation.integrations.done')}</button>
            <button onClick={() => createdKey && copy(t, createdKey)} className={BUTTON_PRIMARY_SM_CLASSES}>{t('leads.automation.integrations.copy')}</button>
          </div>
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
    <SettingsCard
      title={t('leads.settings.tab.goals')}
      subtitle={t('leads.automation.goals.intro')}
      help={[
        ...METRICS.map(m => <><strong>{goalLabel(t, m)}</strong>: {t(`leads.automation.goals.metric_hint.${m}`)}</>),
        t('leads.automation.goals.help.timezone'),
      ]}
      icon={<ChartBarIcon className="w-5 h-5" />}
      actions={<>
        <input type="month" value={period} onChange={e => e.target.value && setPeriod(e.target.value)} className={INPUT_SM_CLASSES + ' !h-10'} aria-label={t('leads.automation.goals.month_title')} title={t('leads.automation.goals.month_title')} />
        <button onClick={copyPrev} className={BUTTON_SECONDARY_SM_CLASSES} title={t('leads.automation.goals.copy_prev_title')}>{t('leads.automation.goals.copy_prev')}</button>
      </>}
    >
      <PlainTable head={<><th className={TH_CLASSES}>{t('leads.common.assignee')}</th>{METRICS.map(m => <th key={m} className={`${TH_CLASSES} cursor-help`} title={t(`leads.automation.goals.metric_hint.${m}`)}>{goalLabel(t, m)}</th>)}</>}>
        {assignees.map(a => (
          <tr key={a.uid} className={TR_CLASSES}>
            <td className={`${TD_CLASSES} whitespace-nowrap font-medium`}>{a.name}</td>
            {METRICS.map(m => (
              <td key={m} className={TD_CLASSES}>
                <input key={`${period}-${a.uid}-${m}-${value(a.uid, m) ?? ''}`} type="number" min={0} defaultValue={value(a.uid, m) ?? ''} onBlur={e => save(a.uid, m, e.target.value)} placeholder="—" className={INPUT_SM_CLASSES + ' w-28 text-right'} aria-label={t('leads.automation.goals.input_aria', { metric: goalLabel(t, m), name: a.name })} />
              </td>
            ))}
          </tr>
        ))}
        {assignees.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-neutral-500 dark:text-neutral-400">{t('leads.automation.no_collaborators')}</td></tr>}
      </PlainTable>
    </SettingsCard>
  );
};
