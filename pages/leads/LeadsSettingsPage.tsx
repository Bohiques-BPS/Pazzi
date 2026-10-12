import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pipeline, PipelineStage, LeadSource, LeadTag, LeadCustomField, LeadSettings, LeadCustomFieldType } from '../../types';
import { useLeadAssignees } from '../../components/leads/useLeadAssignees';
import { usePermissions } from '../../hooks/usePermissions';
import { leadsService } from '../../services/leads';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';
import { ConfirmationModal } from '../../components/Modal';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { TagChip } from '../../components/leads/TagChip';
import { inputFormStyle, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../contexts/GlobalSettingsContext';
import { RulesTab, TemplatesTab, TeamsTab, IntegrationsTab, GoalsTab } from './LeadsAutomationTabs';

type Tab = 'pipelines' | 'sources' | 'tags' | 'fields' | 'lost' | 'form' | 'automation' | 'rules' | 'templates' | 'teams' | 'integrations' | 'goals';
// Las etiquetas se traducen al renderizar (labelKey → t()).
const TABS: { key: Tab; labelKey: string }[] = [
  { key: 'pipelines', labelKey: 'leads.settings.tab.pipelines' },
  { key: 'sources', labelKey: 'leads.settings.tab.sources' },
  { key: 'tags', labelKey: 'leads.settings.tab.tags' },
  { key: 'fields', labelKey: 'leads.settings.tab.fields' },
  { key: 'lost', labelKey: 'leads.settings.tab.lost' },
  { key: 'rules', labelKey: 'leads.settings.tab.rules' },
  { key: 'templates', labelKey: 'leads.settings.tab.templates' },
  { key: 'teams', labelKey: 'leads.settings.tab.teams' },
  { key: 'goals', labelKey: 'leads.settings.tab.goals' },
  { key: 'form', labelKey: 'leads.settings.tab.form' },
  { key: 'automation', labelKey: 'leads.settings.tab.automation' },
  { key: 'integrations', labelKey: 'leads.settings.tab.integrations' },
];
const PALETTE = ['#64748b', '#0ea5e9', '#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#f59e0b', '#16a34a', '#14b8a6', '#dc2626'];
const FIELD_TYPES: LeadCustomFieldType[] = ['text', 'number', 'date', 'select', 'checkbox', 'url'];
const fieldTypeKey = (v: LeadCustomFieldType) => `leads.settings.field_type.${v}`;

const err = (e: unknown, fallback: string) => toast.error(e instanceof ApiError ? e.message : fallback);

const ColorPicker: React.FC<{ value?: string | null; onChange: (c: string) => void }> = ({ value, onChange }) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap gap-1">
      {PALETTE.map(c => (
        <button key={c} type="button" onClick={() => onChange(c)} className={`w-5 h-5 rounded-full border-2 ${value === c ? 'border-neutral-800 dark:border-white scale-110' : 'border-transparent'}`} style={{ background: c }} aria-label={t('leads.settings.color_aria', { color: c })} />
      ))}
    </div>
  );
};

export const LeadsSettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const { can } = usePermissions();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('pipelines');
  const [loading, setLoading] = useState(true);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [sources, setSources] = useState<LeadSource[]>([]);
  const [tags, setTags] = useState<LeadTag[]>([]);
  const [fields, setFields] = useState<LeadCustomField[]>([]);
  const [settings, setSettings] = useState<LeadSettings | null>(null);
  const [pipelineId, setPipelineId] = useState('');
  const [confirm, setConfirm] = useState<null | { title: string; message: string; run: () => void }>(null);

  const { currentUser } = useAuth();
  // Responsables posibles: colaboradores con cuenta (User.id) + el usuario actual (p.ej. el gerente).
  const assignees = useLeadAssignees();

  const reload = async () => {
    const [cfg, s] = await Promise.all([leadsService.getConfig(), leadsService.getSettings()]);
    setPipelines(cfg.pipelines); setSources(cfg.sources); setTags(cfg.tags); setFields(cfg.customFields); setSettings(s);
    setPipelineId(prev => prev && cfg.pipelines.some(p => p.id === prev) ? prev : (cfg.pipelines.find(p => p.isDefault) || cfg.pipelines[0])?.id || '');
  };

  useEffect(() => {
    if (!can('leads.managePipeline')) { setLoading(false); return; }
    reload().catch(e => err(e, t('leads.settings.load_error'))).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!can('leads.managePipeline')) {
    return <p className="text-neutral-500 dark:text-neutral-400">{t('leads.settings.no_permission')}</p>;
  }
  if (loading) return <LoadingSkeleton variant="form" rows={6} />;

  const pipeline = pipelines.find(p => p.id === pipelineId);

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <button type="button" onClick={() => navigate('/leads')} className="text-sm text-primary hover:underline">{t('leads.settings.back')}</button>
          <h1 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100 mt-1">{t('leads.settings.title')}</h1>
        </div>
      </div>
      <div className="flex gap-1 flex-wrap border-b border-neutral-200 dark:border-neutral-700 mb-5">
        {TABS.map(tb => (
          <button key={tb.key} onClick={() => setTab(tb.key)} className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${tab === tb.key ? 'border-primary text-primary dark:text-teal-300' : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'}`}>{t(tb.labelKey)}</button>
        ))}
      </div>

      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-5 shadow-sm">
        {tab === 'pipelines' && (
          <PipelinesTab
            pipelines={pipelines} pipeline={pipeline} pipelineId={pipelineId} setPipelineId={setPipelineId}
            reload={reload} askConfirm={setConfirm}
          />
        )}
        {tab === 'sources' && <SourcesTab sources={sources} reload={reload} askConfirm={setConfirm} />}
        {tab === 'tags' && <TagsTab tags={tags} reload={reload} askConfirm={setConfirm} />}
        {tab === 'fields' && <FieldsTab fields={fields} reload={reload} askConfirm={setConfirm} />}
        {tab === 'lost' && settings && <LostReasonsTab settings={settings} setSettings={setSettings} />}
        {tab === 'form' && settings && <FormTab settings={settings} setSettings={setSettings} pipelines={pipelines} assignees={assignees} />}
        {tab === 'automation' && settings && <AutomationTab settings={settings} setSettings={setSettings} />}
        {tab === 'rules' && <RulesTab pipelines={pipelines} sources={sources} tags={tags} assignees={assignees} />}
        {tab === 'templates' && <TemplatesTab />}
        {tab === 'teams' && settings && <TeamsTab assignees={assignees} settings={settings} setSettings={setSettings} />}
        {tab === 'goals' && <GoalsTab assignees={assignees} />}
        {tab === 'integrations' && <IntegrationsTab isManager={currentUser?.role === 'MANAGER'} />}
      </div>

      <ConfirmationModal
        isOpen={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => { const c = confirm; setConfirm(null); c?.run(); }}
        title={confirm?.title || ''}
        message={confirm?.message || ''}
        confirmButtonText={t('leads.common.delete')}
      />
    </div>
  );
};

type AskConfirm = (c: { title: string; message: string; run: () => void }) => void;

// ── Pipelines y etapas ──
const PipelinesTab: React.FC<{ pipelines: Pipeline[]; pipeline?: Pipeline; pipelineId: string; setPipelineId: (id: string) => void; reload: () => Promise<void>; askConfirm: AskConfirm }> =
  ({ pipelines, pipeline, pipelineId, setPipelineId, reload, askConfirm }) => {
  const { t } = useTranslation();
  const [newPipeline, setNewPipeline] = useState('');
  const [pipeName, setPipeName] = useState(pipeline?.name || '');
  const [newStage, setNewStage] = useState({ name: '', type: 'open' as 'open' | 'won' | 'lost' });
  useEffect(() => { setPipeName(pipeline?.name || ''); }, [pipeline?.id, pipeline?.name]);
  const stages = pipeline?.stages || [];

  const addPipeline = async () => {
    if (!newPipeline.trim()) return;
    try { const p = await leadsService.createPipeline(newPipeline.trim()); setNewPipeline(''); await reload(); setPipelineId(p.id); toast.success(t('leads.settings.pipelines.created')); }
    catch (e) { err(e, t('leads.settings.err.create')); }
  };
  const savePipeline = async (data: { name?: string; isDefault?: boolean }) => {
    if (!pipeline) return;
    try { await leadsService.updatePipeline(pipeline.id, data); await reload(); toast.success(t('leads.settings.saved')); } catch (e) { err(e, t('leads.settings.err.save')); }
  };
  const updateStage = async (s: PipelineStage, data: Partial<PipelineStage>) => {
    try { await leadsService.updateStage(s.id, data); await reload(); } catch (e) { err(e, t('leads.settings.err.update_stage')); }
  };
  const move = async (idx: number, dir: -1 | 1) => {
    const ids = stages.map(s => s.id);
    const j = idx + dir;
    if (j < 0 || j >= ids.length || !pipeline) return;
    [ids[idx], ids[j]] = [ids[j], ids[idx]];
    try { await leadsService.reorderStages(pipeline.id, ids); await reload(); } catch (e) { err(e, t('leads.settings.err.reorder')); }
  };
  const addStage = async () => {
    if (!newStage.name.trim() || !pipeline) return;
    try { await leadsService.createStage(pipeline.id, { name: newStage.name.trim(), type: newStage.type, color: PALETTE[stages.length % PALETTE.length] }); setNewStage({ name: '', type: 'open' }); await reload(); }
    catch (e) { err(e, t('leads.settings.err.create_stage')); }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-neutral-500 mb-1">{t('leads.common.pipeline')}</label>
          <select value={pipelineId} onChange={e => setPipelineId(e.target.value)} className={inputFormStyle + ' !w-56'}>
            {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}{p.isDefault ? t('leads.settings.pipelines.default_suffix') : ''}</option>)}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <input value={newPipeline} onChange={e => setNewPipeline(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addPipeline(); }} placeholder={t('leads.settings.pipelines.new_placeholder')} className={inputFormStyle + ' !w-56'} />
          <button onClick={addPipeline} className={BUTTON_SECONDARY_SM_CLASSES}>{t('leads.settings.pipelines.create_btn')}</button>
        </div>
      </div>

      {pipeline && (
        <>
          <div className="flex flex-wrap items-end gap-2 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-900/40">
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">{t('leads.settings.pipelines.name_label')}</label>
              <input value={pipeName} onChange={e => setPipeName(e.target.value)} className={inputFormStyle + ' !w-56'} />
            </div>
            <button onClick={() => savePipeline({ name: pipeName.trim() })} disabled={!pipeName.trim() || pipeName === pipeline.name} className={BUTTON_SECONDARY_SM_CLASSES}>{t('leads.settings.pipelines.rename')}</button>
            {!pipeline.isDefault && <button onClick={() => savePipeline({ isDefault: true })} className={BUTTON_SECONDARY_SM_CLASSES}>{t('leads.settings.pipelines.make_default')}</button>}
            {pipelines.length > 1 && (
              <button onClick={() => askConfirm({ title: t('leads.settings.pipelines.delete_title'), message: t('leads.settings.pipelines.delete_msg', { name: pipeline.name }), run: async () => { try { await leadsService.deletePipeline(pipeline.id); await reload(); toast.success(t('leads.settings.pipelines.deleted')); } catch (e) { err(e, t('leads.settings.err.delete')); } } })}
                className={`${BUTTON_SECONDARY_SM_CLASSES} text-red-600 dark:text-red-400 ml-auto`}>{t('leads.settings.pipelines.delete_title')}</button>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200 mb-2">{t('leads.settings.stages.title')}</h3>
            <ul className="space-y-2">
              {stages.map((s, i) => (
                <StageRow key={s.id} stage={s} index={i} total={stages.length} others={stages.filter(x => x.id !== s.id)}
                  onMove={move} onUpdate={updateStage}
                  onDelete={(moveTo) => askConfirm({ title: t('leads.settings.stages.delete_title'), message: t('leads.settings.stages.delete_msg', { name: s.name, target: stages.find(x => x.id === moveTo)?.name || t('leads.settings.stages.other_stage') }), run: async () => { try { await leadsService.deleteStage(s.id, moveTo); await reload(); } catch (e) { err(e, t('leads.settings.err.delete')); } } })}
                />
              ))}
            </ul>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <input value={newStage.name} onChange={e => setNewStage(p => ({ ...p, name: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter') addStage(); }} placeholder={t('leads.settings.stages.new_placeholder')} className={inputFormStyle + ' !w-56'} />
              <select value={newStage.type} onChange={e => setNewStage(p => ({ ...p, type: e.target.value as any }))} className={inputFormStyle + ' !w-auto'}>
                <option value="open">{t('leads.common.stage_type.open')}</option>
                <option value="won">{t('leads.settings.stages.type_won_close')}</option>
                <option value="lost">{t('leads.settings.stages.type_lost_close')}</option>
              </select>
              <button onClick={addStage} className={BUTTON_PRIMARY_SM_CLASSES}>{t('leads.settings.stages.add_btn')}</button>
            </div>
            <p className="text-xs text-neutral-400 mt-2">{t('leads.settings.stages.help')}</p>
          </div>
        </>
      )}
    </div>
  );
};

const StageRow: React.FC<{ stage: PipelineStage; index: number; total: number; others: PipelineStage[]; onMove: (i: number, d: -1 | 1) => void; onUpdate: (s: PipelineStage, d: Partial<PipelineStage>) => void; onDelete: (moveTo: string) => void }> =
  ({ stage, index, total, others, onMove, onUpdate, onDelete }) => {
  const { t } = useTranslation();
  const [name, setName] = useState(stage.name);
  const [prob, setProb] = useState(stage.probability != null ? String(stage.probability) : '');
  const [moveTo, setMoveTo] = useState(others[0]?.id || '');
  const [showColors, setShowColors] = useState(false);
  useEffect(() => { setName(stage.name); setProb(stage.probability != null ? String(stage.probability) : ''); }, [stage.name, stage.probability]);
  return (
    <li className="flex flex-wrap items-center gap-2 p-2 rounded-lg border border-neutral-200 dark:border-neutral-700">
      <div className="flex flex-col">
        <button type="button" onClick={() => onMove(index, -1)} disabled={index === 0} className="text-xs leading-none px-1 disabled:opacity-30" aria-label={t('leads.settings.stages.move_up')}>▲</button>
        <button type="button" onClick={() => onMove(index, 1)} disabled={index === total - 1} className="text-xs leading-none px-1 disabled:opacity-30" aria-label={t('leads.settings.stages.move_down')}>▼</button>
      </div>
      <div className="relative">
        <button type="button" onClick={() => setShowColors(v => !v)} className="w-6 h-6 rounded-full border border-neutral-300" style={{ background: stage.color || '#94a3b8' }} aria-label={t('leads.settings.stages.color_aria')} />
        {showColors && <div className="absolute z-20 top-8 left-0 p-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg w-40"><ColorPicker value={stage.color} onChange={c => { setShowColors(false); onUpdate(stage, { color: c }); }} /></div>}
      </div>
      <input value={name} onChange={e => setName(e.target.value)} onBlur={() => { if (name.trim() && name !== stage.name) onUpdate(stage, { name: name.trim() }); }} className={inputFormStyle + ' !w-48 !py-1.5'} />
      <select value={stage.type} onChange={e => onUpdate(stage, { type: e.target.value as any })} className={inputFormStyle + ' !w-auto !py-1.5 text-sm'}>
        <option value="open">{t('leads.common.stage_type.open')}</option>
        <option value="won">{t('leads.common.status.won')}</option>
        <option value="lost">{t('leads.common.status.lost')}</option>
      </select>
      <div className="flex items-center gap-1">
        <input type="number" min={0} max={100} value={prob} onChange={e => setProb(e.target.value)} onBlur={() => { const v = prob === '' ? null : Math.max(0, Math.min(100, Number(prob))); if (v !== (stage.probability ?? null)) onUpdate(stage, { probability: v }); }} className={inputFormStyle + ' !w-20 !py-1.5'} placeholder="%" />
        <span className="text-xs text-neutral-400">%</span>
      </div>
      {total > 1 && (
        <div className="flex items-center gap-1 ml-auto">
          <select value={moveTo} onChange={e => setMoveTo(e.target.value)} className="text-xs rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 py-1 px-1" title={t('leads.settings.stages.move_to_title')}>
            {others.map(o => <option key={o.id} value={o.id}>→ {o.name}</option>)}
          </select>
          <button type="button" onClick={() => onDelete(moveTo)} className="text-red-500 hover:text-red-700 text-sm px-1" aria-label={t('leads.settings.stages.delete_aria', { name: stage.name })}>🗑</button>
        </div>
      )}
    </li>
  );
};

// ── Fuentes ──
const SourcesTab: React.FC<{ sources: LeadSource[]; reload: () => Promise<void>; askConfirm: AskConfirm }> = ({ sources, reload, askConfirm }) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const add = async () => { if (!name.trim()) return; try { await leadsService.createSource(name.trim()); setName(''); await reload(); } catch (e) { err(e, t('leads.settings.err.create')); } };
  return (
    <div className="space-y-3">
      <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('leads.settings.sources.help')}</p>
      <ul className="divide-y divide-neutral-100 dark:divide-neutral-700/60">
        {sources.map(s => (
          <li key={s.id} className="flex items-center gap-2 py-2">
            <InlineName value={s.name} onSave={async (v) => { try { await leadsService.updateSource(s.id, { name: v }); await reload(); } catch (e) { err(e, t('leads.settings.err.save')); } }} />
            <label className="flex items-center gap-1 text-xs text-neutral-500 ml-auto"><input type="checkbox" checked={s.active !== false} onChange={async e => { try { await leadsService.updateSource(s.id, { active: e.target.checked }); await reload(); } catch (er) { err(er, t('leads.settings.err.save')); } }} className="h-4 w-4" /> {t('leads.settings.sources.active')}</label>
            <button type="button" onClick={() => askConfirm({ title: t('leads.settings.sources.delete_title'), message: t('leads.settings.sources.delete_msg', { name: s.name }), run: async () => { try { await leadsService.deleteSource(s.id); await reload(); } catch (e) { err(e, t('leads.settings.err.delete')); } } })} className="text-red-500 hover:text-red-700 text-sm px-1" aria-label={t('leads.settings.delete_item_aria', { name: s.name })}>🗑</button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2"><input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') add(); }} placeholder={t('leads.settings.sources.new_placeholder')} className={inputFormStyle + ' !w-64'} /><button onClick={add} className={BUTTON_PRIMARY_SM_CLASSES}>{t('leads.settings.add_btn')}</button></div>
    </div>
  );
};

const InlineName: React.FC<{ value: string; onSave: (v: string) => void }> = ({ value, onSave }) => {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return <input value={v} onChange={e => setV(e.target.value)} onBlur={() => { if (v.trim() && v !== value) onSave(v.trim()); }} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} className={inputFormStyle + ' !w-64 !py-1.5'} />;
};

// ── Etiquetas ──
const TagsTab: React.FC<{ tags: LeadTag[]; reload: () => Promise<void>; askConfirm: AskConfirm }> = ({ tags, reload, askConfirm }) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [color, setColor] = useState(PALETTE[1]);
  const add = async () => { if (!name.trim()) return; try { await leadsService.createTag(name.trim(), color); setName(''); await reload(); } catch (e) { err(e, t('leads.settings.err.create')); } };
  return (
    <div className="space-y-3">
      <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('leads.settings.tags.help')}</p>
      <ul className="divide-y divide-neutral-100 dark:divide-neutral-700/60">
        {tags.length === 0 && <li className="py-3 text-sm text-neutral-400">{t('leads.settings.tags.empty')}</li>}
        {tags.map(tag => (
          <li key={tag.id} className="flex flex-wrap items-center gap-3 py-2">
            <TagChip tag={tag} />
            <InlineName value={tag.name} onSave={async (v) => { try { await leadsService.updateTag(tag.id, { name: v }); await reload(); } catch (e) { err(e, t('leads.settings.err.save')); } }} />
            <ColorPicker value={tag.color} onChange={async c => { try { await leadsService.updateTag(tag.id, { color: c }); await reload(); } catch (e) { err(e, t('leads.settings.err.save')); } }} />
            <button type="button" onClick={() => askConfirm({ title: t('leads.settings.tags.delete_title'), message: t('leads.settings.tags.delete_msg', { name: tag.name }), run: async () => { try { await leadsService.deleteTag(tag.id); await reload(); } catch (e) { err(e, t('leads.settings.err.delete')); } } })} className="text-red-500 hover:text-red-700 text-sm px-1 ml-auto" aria-label={t('leads.settings.delete_item_aria', { name: tag.name })}>🗑</button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-2">
        <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') add(); }} placeholder={t('leads.settings.tags.new_placeholder')} className={inputFormStyle + ' !w-56'} />
        <ColorPicker value={color} onChange={setColor} />
        <button onClick={add} className={BUTTON_PRIMARY_SM_CLASSES}>{t('leads.settings.add_btn')}</button>
      </div>
    </div>
  );
};

// ── Campos personalizados ──
const FieldsTab: React.FC<{ fields: LeadCustomField[]; reload: () => Promise<void>; askConfirm: AskConfirm }> = ({ fields, reload, askConfirm }) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<{ label: string; type: LeadCustomFieldType; options: string; required: boolean }>({ label: '', type: 'text', options: '', required: false });
  const add = async () => {
    if (!draft.label.trim()) return;
    const options = draft.type === 'select' ? draft.options.split(',').map(o => o.trim()).filter(Boolean) : null;
    if (draft.type === 'select' && !options?.length) { toast.error(t('leads.settings.fields.options_required')); return; }
    try { await leadsService.createCustomField({ label: draft.label.trim(), type: draft.type, options, required: draft.required }); setDraft({ label: '', type: 'text', options: '', required: false }); await reload(); }
    catch (e) { err(e, t('leads.settings.err.create')); }
  };
  return (
    <div className="space-y-3">
      <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('leads.settings.fields.help')}</p>
      <ul className="divide-y divide-neutral-100 dark:divide-neutral-700/60">
        {fields.length === 0 && <li className="py-3 text-sm text-neutral-400">{t('leads.settings.fields.empty')}</li>}
        {fields.map(f => (
          <li key={f.id} className="flex flex-wrap items-center gap-3 py-2">
            <InlineName value={f.label} onSave={async (v) => { try { await leadsService.updateCustomField(f.id, { label: v }); await reload(); } catch (e) { err(e, t('leads.settings.err.save')); } }} />
            <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300">{FIELD_TYPES.includes(f.type) ? t(fieldTypeKey(f.type)) : ''}</span>
            {f.type === 'select' && <span className="text-xs text-neutral-500 truncate max-w-[220px]">{(f.options || []).join(', ')}</span>}
            <label className="flex items-center gap-1 text-xs text-neutral-500"><input type="checkbox" checked={!!f.required} onChange={async e => { try { await leadsService.updateCustomField(f.id, { required: e.target.checked }); await reload(); } catch (er) { err(er, t('leads.settings.err.save')); } }} className="h-4 w-4" /> {t('leads.settings.required')}</label>
            <button type="button" onClick={() => askConfirm({ title: t('leads.settings.fields.delete_title'), message: t('leads.settings.fields.delete_msg', { name: f.label }), run: async () => { try { await leadsService.deleteCustomField(f.id); await reload(); } catch (e) { err(e, t('leads.settings.err.delete')); } } })} className="text-red-500 hover:text-red-700 text-sm px-1 ml-auto" aria-label={t('leads.settings.delete_item_aria', { name: f.label })}>🗑</button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-900/40">
        <input value={draft.label} onChange={e => setDraft(d => ({ ...d, label: e.target.value }))} placeholder={t('leads.settings.fields.name_placeholder')} className={inputFormStyle + ' !w-52'} />
        <select value={draft.type} onChange={e => setDraft(d => ({ ...d, type: e.target.value as LeadCustomFieldType }))} className={inputFormStyle + ' !w-auto'}>
          {FIELD_TYPES.map(ft => <option key={ft} value={ft}>{t(fieldTypeKey(ft))}</option>)}
        </select>
        {draft.type === 'select' && <input value={draft.options} onChange={e => setDraft(d => ({ ...d, options: e.target.value }))} placeholder={t('leads.settings.fields.options_placeholder')} className={inputFormStyle + ' !w-56'} />}
        <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={draft.required} onChange={e => setDraft(d => ({ ...d, required: e.target.checked }))} className="h-4 w-4" /> {t('leads.settings.required')}</label>
        <button onClick={add} className={BUTTON_PRIMARY_SM_CLASSES}>{t('leads.settings.fields.add_btn')}</button>
      </div>
    </div>
  );
};

// ── Motivos de pérdida ──
const LostReasonsTab: React.FC<{ settings: LeadSettings; setSettings: (s: LeadSettings) => void }> = ({ settings, setSettings }) => {
  const { t } = useTranslation();
  const [list, setList] = useState<string[]>(settings.lostReasons || []);
  const [item, setItem] = useState('');
  const [saving, setSaving] = useState(false);
  const save = async (next: string[]) => {
    setSaving(true);
    try { const s = await leadsService.updateSettings({ lostReasons: next }); setSettings(s); setList(s.lostReasons); toast.success(t('leads.settings.lost.saved')); }
    catch (e) { err(e, t('leads.settings.err.save')); } finally { setSaving(false); }
  };
  return (
    <div className="space-y-3 max-w-xl">
      <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('leads.settings.lost.help')}</p>
      <ul className="space-y-1">
        {list.map((r, i) => (
          <li key={`${r}-${i}`} className="flex items-center gap-2 py-1 px-2 rounded border border-neutral-200 dark:border-neutral-700">
            <span className="flex-1 text-sm text-neutral-700 dark:text-neutral-200">{r}</span>
            <button type="button" onClick={() => save(list.filter((_, j) => j !== i))} disabled={saving} className="text-red-500 hover:text-red-700 text-sm" aria-label={t('leads.settings.lost.remove_aria', { name: r })}>✕</button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2"><input value={item} onChange={e => setItem(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && item.trim()) { save([...list, item.trim()]); setItem(''); } }} placeholder={t('leads.settings.lost.new_placeholder')} className={inputFormStyle + ' !w-64'} /><button onClick={() => { if (item.trim()) { save([...list, item.trim()]); setItem(''); } }} disabled={saving} className={BUTTON_PRIMARY_SM_CLASSES}>{t('leads.settings.add_btn')}</button></div>
    </div>
  );
};

// ── Formulario web ──
const FormTab: React.FC<{ settings: LeadSettings; setSettings: (s: LeadSettings) => void; pipelines: Pipeline[]; assignees: { uid: string; name: string }[] }> = ({ settings, setSettings, pipelines, assignees }) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState({
    formEnabled: settings.formEnabled, formTitle: settings.formTitle || '', formSuccessMessage: settings.formSuccessMessage || '',
    formPipelineId: settings.formPipelineId || '', formStageId: settings.formStageId || '', formAssigneeId: settings.formAssigneeId || '',
  });
  const [saving, setSaving] = useState(false);
  const link = settings.formToken ? `${window.location.origin}/f/${settings.formToken}` : '';
  const embed = link ? `<iframe src="${link}?embed=1" style="width:100%;max-width:520px;height:640px;border:0;" title="${t('leads.settings.form.embed_title')}"></iframe>` : '';
  const pipe = pipelines.find(p => p.id === draft.formPipelineId) || pipelines.find(p => p.isDefault) || pipelines[0];

  const save = async () => {
    setSaving(true);
    try {
      const s = await leadsService.updateSettings({
        formEnabled: draft.formEnabled, formTitle: draft.formTitle || null, formSuccessMessage: draft.formSuccessMessage || null,
        formPipelineId: draft.formPipelineId || null, formStageId: draft.formStageId || null, formAssigneeId: draft.formAssigneeId || null,
      });
      setSettings(s); toast.success(t('leads.settings.form.saved'));
    } catch (e) { err(e, t('leads.settings.err.save')); } finally { setSaving(false); }
  };
  const copy = async (text: string) => { try { await navigator.clipboard.writeText(text); toast.success(t('leads.settings.form.copied')); } catch { toast.error(t('leads.settings.err.copy')); } };
  const regenerate = async () => { try { const r = await leadsService.regenerateFormToken(); setSettings({ ...settings, formToken: r.formToken }); toast.success(t('leads.settings.form.regenerated')); } catch (e) { err(e, t('leads.settings.err.regenerate')); } };

  return (
    <div className="space-y-4 max-w-2xl">
      <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('leads.settings.form.help')}</p>
      <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={draft.formEnabled} onChange={e => setDraft(d => ({ ...d, formEnabled: e.target.checked }))} className="h-4 w-4" /> {t('leads.settings.form.enabled')}</label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><label className="block text-xs font-medium text-neutral-500 mb-1">{t('leads.settings.form.title_label')}</label><input value={draft.formTitle} onChange={e => setDraft(d => ({ ...d, formTitle: e.target.value }))} placeholder={t('leads.settings.form.title_placeholder')} className={inputFormStyle} /></div>
        <div><label className="block text-xs font-medium text-neutral-500 mb-1">{t('leads.settings.form.success_label')}</label><input value={draft.formSuccessMessage} onChange={e => setDraft(d => ({ ...d, formSuccessMessage: e.target.value }))} placeholder={t('leads.settings.form.success_placeholder')} className={inputFormStyle} /></div>
        <div><label className="block text-xs font-medium text-neutral-500 mb-1">{t('leads.common.pipeline')}</label>
          <select value={draft.formPipelineId} onChange={e => setDraft(d => ({ ...d, formPipelineId: e.target.value, formStageId: '' }))} className={inputFormStyle}>
            <option value="">{t('leads.settings.form.default_pipeline')}</option>
            {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div><label className="block text-xs font-medium text-neutral-500 mb-1">{t('leads.settings.form.initial_stage')}</label>
          <select value={draft.formStageId} onChange={e => setDraft(d => ({ ...d, formStageId: e.target.value }))} className={inputFormStyle}>
            <option value="">{t('leads.settings.form.first_stage')}</option>
            {(pipe?.stages || []).filter(s => s.type === 'open').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2"><label className="block text-xs font-medium text-neutral-500 mb-1">{t('leads.settings.form.assign_to')}</label>
          <select value={draft.formAssigneeId} onChange={e => setDraft(d => ({ ...d, formAssigneeId: e.target.value }))} className={inputFormStyle}>
            <option value="">{t('leads.settings.form.nobody')}</option>
            {assignees.map(a => <option key={a.uid} value={a.uid}>{a.name}</option>)}
          </select>
        </div>
      </div>
      <button onClick={save} disabled={saving} className={BUTTON_PRIMARY_SM_CLASSES}>{saving ? t('leads.common.saving') : t('leads.common.save')}</button>

      {link && (
        <div className="space-y-3 border-t dark:border-neutral-700 pt-4">
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">{t('leads.settings.form.public_link')}</label>
            <div className="flex gap-2">
              <input readOnly value={link} className={inputFormStyle + ' flex-1 font-mono text-xs'} onFocus={e => e.currentTarget.select()} />
              <button onClick={() => copy(link)} className={BUTTON_SECONDARY_SM_CLASSES}>{t('leads.settings.form.copy')}</button>
              <a href={link} target="_blank" rel="noreferrer" className={BUTTON_SECONDARY_SM_CLASSES}>{t('leads.settings.form.open')}</a>
            </div>
            {!draft.formEnabled && <p className="text-xs text-amber-600 mt-1">{t('leads.settings.form.disabled_warning')}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">{t('leads.settings.form.embed_label')}</label>
            <div className="flex gap-2">
              <textarea readOnly rows={3} value={embed} className={inputFormStyle + ' flex-1 font-mono text-xs'} onFocus={e => e.currentTarget.select()} />
              <button onClick={() => copy(embed)} className={BUTTON_SECONDARY_SM_CLASSES + ' self-start'}>{t('leads.settings.form.copy')}</button>
            </div>
          </div>
          <button onClick={regenerate} className="text-xs text-red-600 dark:text-red-400 hover:underline">{t('leads.settings.form.regenerate')}</button>
        </div>
      )}
    </div>
  );
};

// ── Automatización ──
const AutomationTab: React.FC<{ settings: LeadSettings; setSettings: (s: LeadSettings) => void }> = ({ settings, setSettings }) => {
  const { t } = useTranslation();
  const [coldDays, setColdDays] = useState(String(settings.coldDays));
  const update = async (data: Partial<LeadSettings>) => {
    try { const s = await leadsService.updateSettings(data); setSettings(s); toast.success(t('leads.settings.saved')); } catch (e) { err(e, t('leads.settings.err.save')); }
  };
  return (
    <div className="space-y-5 max-w-2xl">
      <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-700">
        <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{t('leads.settings.automation.cold_title')}</h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">{t('leads.settings.automation.cold_help')}</p>
        <div className="flex items-center gap-2 mt-2">
          <input type="number" min={1} max={365} value={coldDays} onChange={e => setColdDays(e.target.value)} className={inputFormStyle + ' !w-24'} />
          <span className="text-sm text-neutral-500">{t('leads.settings.automation.days')}</span>
          <button onClick={() => { const n = Math.max(1, Math.min(365, Number(coldDays) || 7)); update({ coldDays: n }); }} className={BUTTON_SECONDARY_SM_CLASSES}>{t('leads.common.save')}</button>
        </div>
      </div>
      <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-700 space-y-3">
        <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{t('leads.settings.automation.capture_title')}</h3>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={settings.ecommerceToLead} onChange={e => update({ ecommerceToLead: e.target.checked })} className="h-4 w-4 mt-0.5" />
          <span><strong>{t('leads.settings.automation.ecommerce_title')}</strong> <span className="text-neutral-500 dark:text-neutral-400">{t('leads.settings.automation.ecommerce_help')}</span></span>
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={settings.whatsappToLead} onChange={e => update({ whatsappToLead: e.target.checked })} className="h-4 w-4 mt-0.5" />
          <span><strong>{t('leads.settings.automation.whatsapp_title')}</strong> <span className="text-neutral-500 dark:text-neutral-400">{t('leads.settings.automation.whatsapp_help')}</span></span>
        </label>
      </div>
      <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-700">
        <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{t('leads.settings.automation.reminders_title')}</h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">{t('leads.settings.automation.reminders_help')}</p>
      </div>
    </div>
  );
};
