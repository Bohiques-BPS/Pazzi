import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pipeline, PipelineStage, LeadSource, LeadTag, LeadCustomField, LeadSettings, LeadCustomFieldType } from '../../types';
import { useLeadAssignees } from '../../components/leads/useLeadAssignees';
import { usePermissions } from '../../hooks/usePermissions';
import { leadsService } from '../../services/leads';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';
import { Modal, ConfirmationModal } from '../../components/Modal';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { DataTable, TableColumn } from '../../components/DataTable';
import { TagChip } from '../../components/leads/TagChip';
import {
  ArrowUturnLeftIcon, ArrowUpIcon, ArrowDownIcon, DeleteIcon, EditIcon, PlusIcon, ClockIcon, BellIcon, TagIcon,
  ListBulletIcon, ExclamationTriangleIcon, Squares2X2Icon, FireIcon, SparklesIcon, DocumentTextIcon, InformationCircleIcon,
} from '../../components/icons';
import { inputFormStyle, INPUT_SM_CLASSES, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation, useGlobalSettings } from '../../contexts/GlobalSettingsContext';
import { timezoneOptions } from '../../utils/timezones';
import {
  RulesTab, TemplatesTab, TeamsTab, IntegrationsTab, GoalsTab,
  SettingsCard, PlainTable, Toggle, TH_CLASSES, TD_CLASSES, TR_CLASSES, TABLE_IN_CARD,
  BADGE, BADGE_NEUTRAL, LABEL_CLASSES, BTN_ICON, ROW_EDIT_BTN, ROW_DELETE_BTN, ADD_ROW, BOX, MODAL_FOOTER, Hint,
} from './LeadsAutomationTabs';

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
const CHECKBOX = 'h-4 w-4 text-primary rounded border-neutral-300 dark:border-neutral-600 dark:bg-neutral-900 focus:ring-primary';

const err = (e: unknown, fallback: string) => toast.error(e instanceof ApiError ? e.message : fallback);

const ColorPicker: React.FC<{ value?: string | null; onChange: (c: string) => void }> = ({ value, onChange }) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap gap-1">
      {PALETTE.map(c => (
        <button key={c} type="button" onClick={() => onChange(c)} className={`w-5 h-5 rounded-full border-2 transition-transform ${value === c ? 'border-neutral-800 dark:border-white scale-110' : 'border-transparent hover:scale-110'}`} style={{ background: c }} aria-label={t('leads.settings.color_aria', { color: c })} />
      ))}
    </div>
  );
};

export const LeadsSettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const { can } = usePermissions();
  const navigate = useNavigate();
  // ?tab=<clave> abre una pestaña concreta (p.ej. desde Reportes → zona horaria).
  const [tab, setTab] = useState<Tab>(() => {
    const q = new URLSearchParams(window.location.search).get('tab') as Tab | null;
    return q && TABS.some(x => x.key === q) ? q : 'pipelines';
  });
  const [loading, setLoading] = useState(true);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [sources, setSources] = useState<LeadSource[]>([]);
  const [tags, setTags] = useState<LeadTag[]>([]);
  const [fields, setFields] = useState<LeadCustomField[]>([]);
  const [settings, setSettings] = useState<LeadSettings | null>(null);
  const [pipelineId, setPipelineId] = useState('');
  const [confirm, setConfirm] = useState<null | { title: string; message: string; run: () => void; confirmText?: string }>(null);

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
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3">
        <div>
          <button type="button" onClick={() => navigate('/leads')} className="flex items-center text-sm text-primary hover:text-secondary p-1 -ml-1 mb-1">
            <ArrowUturnLeftIcon className="w-4 h-4" />
            <span className="ml-1">{t('leads.settings.back')}</span>
          </button>
          <h1 className="text-3xl font-bold text-neutral-800 dark:text-neutral-100">{t('leads.settings.title')}</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('leads.settings.subtitle')}</p>
        </div>
      </div>

      {/* Pestañas */}
      <div className="flex border-b border-neutral-200 dark:border-neutral-700 overflow-x-auto">
        {TABS.map(tb => (
          <button key={tb.key} type="button" onClick={() => setTab(tb.key)} title={t(`leads.settings.tab_hint.${tb.key}`)} className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${tab === tb.key ? 'border-b-2 border-primary text-primary' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'}`}>{t(tb.labelKey)}</button>
        ))}
      </div>

      <div className="space-y-6">
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
        confirmButtonText={confirm?.confirmText || t('leads.common.delete')}
      />
    </div>
  );
};

type AskConfirm = (c: { title: string; message: string; run: () => void; confirmText?: string }) => void;

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
  // Cambiar el TIPO mueve el estado de todos los leads de la etapa (ganado/perdido/abierto): confirmar antes.
  const typeLabel = (ty: string) => ty === 'won' ? t('leads.common.status.won') : ty === 'lost' ? t('leads.common.status.lost') : t('leads.common.stage_type.open');
  const requestStageUpdate = (s: PipelineStage, data: Partial<PipelineStage>) => {
    if (data.type && data.type !== s.type) {
      const effect = data.type === 'won' ? t('leads.settings.stages.type_effect_won') : data.type === 'lost' ? t('leads.settings.stages.type_effect_lost') : t('leads.settings.stages.type_effect_open');
      askConfirm({
        title: t('leads.settings.stages.type_confirm_title'),
        message: `${t('leads.settings.stages.type_confirm_msg', { name: s.name, to: typeLabel(data.type) })} ${effect}`,
        confirmText: t('leads.settings.stages.type_confirm_btn'),
        run: () => updateStage(s, data),
      });
      return;
    }
    updateStage(s, data);
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
    <>
      <SettingsCard title={t('leads.settings.tab.pipelines')} subtitle={t('leads.settings.pipelines.help')} icon={<Squares2X2Icon className="w-5 h-5" />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLASSES}>{t('leads.settings.pipelines.select_label')}</label>
            <select value={pipelineId} onChange={e => setPipelineId(e.target.value)} className={inputFormStyle}>
              {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}{p.isDefault ? t('leads.settings.pipelines.default_suffix') : ''}</option>)}
            </select>
            <Hint>{t('leads.settings.pipelines.select_hint')}</Hint>
          </div>
          <div>
            <label className={LABEL_CLASSES}>{t('leads.settings.pipelines.new_label')}</label>
            <div className="flex items-center gap-2">
              <input value={newPipeline} onChange={e => setNewPipeline(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addPipeline(); }} placeholder={t('leads.settings.pipelines.new_placeholder')} className={inputFormStyle + ' flex-1'} />
              <button onClick={addPipeline} className={`${BUTTON_SECONDARY_SM_CLASSES} ${BTN_ICON} flex-shrink-0`}><PlusIcon className="w-4 h-4" />{t('leads.settings.pipelines.create_btn')}</button>
            </div>
            <Hint>{t('leads.settings.pipelines.new_hint')}</Hint>
          </div>
        </div>

        {pipeline && (
          <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
            <label className={LABEL_CLASSES}>{t('leads.settings.pipelines.name_label')}</label>
            <div className="flex flex-wrap items-center gap-2">
              <input value={pipeName} onChange={e => setPipeName(e.target.value)} className={inputFormStyle + ' !w-72 max-w-full'} />
              <button onClick={() => savePipeline({ name: pipeName.trim() })} disabled={!pipeName.trim() || pipeName === pipeline.name} className={`${BUTTON_SECONDARY_SM_CLASSES} disabled:opacity-50`} title={t('leads.settings.pipelines.rename_title')}>{t('leads.settings.pipelines.rename')}</button>
              {!pipeline.isDefault && <button onClick={() => savePipeline({ isDefault: true })} className={BUTTON_SECONDARY_SM_CLASSES} title={t('leads.settings.pipelines.make_default_title')}>{t('leads.settings.pipelines.make_default')}</button>}
              {pipelines.length > 1 && (
                <button onClick={() => askConfirm({ title: t('leads.settings.pipelines.delete_title'), message: t('leads.settings.pipelines.delete_msg', { name: pipeline.name }), run: async () => { try { await leadsService.deletePipeline(pipeline.id); await reload(); toast.success(t('leads.settings.pipelines.deleted')); } catch (e) { err(e, t('leads.settings.err.delete')); } } })}
                  title={t('leads.settings.pipelines.delete_btn_title')}
                  className={`${BUTTON_SECONDARY_SM_CLASSES} ${BTN_ICON} text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/50 sm:ml-auto`}><DeleteIcon className="w-4 h-4" />{t('leads.settings.pipelines.delete_title')}</button>
              )}
            </div>
            {/* key: se remonta al cambiar (evita el choque del traductor de Chrome con texto que cambia). */}
            <Hint key={pipeline.isDefault ? 'default' : 'other'}>{pipeline.isDefault ? t('leads.settings.pipelines.is_default_hint') : t('leads.settings.pipelines.not_default_hint')}</Hint>
          </div>
        )}
      </SettingsCard>

      {pipeline && (
        <SettingsCard
          title={t('leads.settings.stages.title')}
          subtitle={t('leads.settings.stages.help')}
          help={[
            t('leads.settings.stages.help_open'),
            t('leads.settings.stages.help_won'),
            t('leads.settings.stages.help_lost'),
            t('leads.settings.stages.help_probability'),
            t('leads.settings.stages.help_type_change'),
            t('leads.settings.stages.help_delete'),
          ]}
          icon={<ListBulletIcon className="w-5 h-5" />}
        >
          <PlainTable head={<>
            <th className={`${TH_CLASSES} cursor-help`} title={t('leads.settings.stages.col_order_title')}>{t('leads.settings.col.order')}</th>
            <th className={`${TH_CLASSES} cursor-help`} title={t('leads.settings.stages.col_color_title')}>{t('leads.settings.col.color')}</th>
            <th className={`${TH_CLASSES} cursor-help`} title={t('leads.settings.stages.col_name_title')}>{t('leads.settings.col.name')}</th>
            <th className={`${TH_CLASSES} cursor-help`} title={t('leads.settings.stages.type_title')}>{t('leads.settings.col.type')}</th>
            <th className={`${TH_CLASSES} cursor-help`} title={t('leads.settings.stages.probability_title')}>{t('leads.common.probability')}</th>
            <th className={`${TH_CLASSES} cursor-help`} title={t('leads.settings.stages.move_to_title')}>{t('leads.settings.stages.col_delete')}</th>
          </>}>
            {stages.map((s, i) => (
              <StageRow key={s.id} stage={s} index={i} total={stages.length} others={stages.filter(x => x.id !== s.id)}
                onMove={move} onUpdate={requestStageUpdate}
                onDelete={(moveTo) => {
                  // Destino real y vigente (nunca la etapa que se borra ni una que ya no existe).
                  const target = stages.find(x => x.id === moveTo && x.id !== s.id);
                  if (!target) { toast.error(t('leads.settings.stages.pick_target')); return; }
                  askConfirm({ title: t('leads.settings.stages.delete_title'), message: t('leads.settings.stages.delete_msg', { name: s.name, target: target.name }), run: async () => { try { await leadsService.deleteStage(s.id, target.id); await reload(); } catch (e) { err(e, t('leads.settings.err.delete')); } } });
                }}
              />
            ))}
          </PlainTable>
          <div className={ADD_ROW}>
            <input value={newStage.name} onChange={e => setNewStage(p => ({ ...p, name: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter') addStage(); }} placeholder={t('leads.settings.stages.new_placeholder')} className={inputFormStyle + ' !w-64 max-w-full'} aria-label={t('leads.settings.stages.new_aria')} />
            <select value={newStage.type} onChange={e => setNewStage(p => ({ ...p, type: e.target.value as any }))} className={inputFormStyle + ' !w-auto'} aria-label={t('leads.settings.col.type')} title={t('leads.settings.stages.type_title')}>
              <option value="open">{t('leads.common.stage_type.open')}</option>
              <option value="won">{t('leads.settings.stages.type_won_close')}</option>
              <option value="lost">{t('leads.settings.stages.type_lost_close')}</option>
            </select>
            <button onClick={addStage} className={`${BUTTON_PRIMARY_SM_CLASSES} ${BTN_ICON}`}><PlusIcon className="w-4 h-4" />{t('leads.settings.stages.add_btn')}</button>
            <Hint className="w-full">{t('leads.settings.stages.add_hint')}</Hint>
          </div>
        </SettingsCard>
      )}
    </>
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
  // Si cambia la lista de etapas (se borra/crea/reordena una), el destino elegido puede haber dejado de existir:
  // se valida y, si ya no es válido, vuelve a la primera de las otras etapas.
  const othersKey = others.map(o => o.id).join(',');
  useEffect(() => {
    setMoveTo(prev => (others.some(o => o.id === prev) ? prev : others[0]?.id || ''));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [othersKey]);
  const validMoveTo = others.some(o => o.id === moveTo) ? moveTo : others[0]?.id || '';
  const orderBtn = 'p-1 rounded text-neutral-500 dark:text-neutral-400 hover:text-primary hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-30 disabled:hover:bg-transparent';
  return (
    <tr className={TR_CLASSES}>
      <td className={`${TD_CLASSES} whitespace-nowrap`}>
        <div className="flex items-center gap-0.5">
          <button type="button" onClick={() => onMove(index, -1)} disabled={index === 0} className={orderBtn} aria-label={t('leads.settings.stages.move_up')} title={t('leads.settings.stages.move_up')}><ArrowUpIcon className="w-4 h-4" /></button>
          <button type="button" onClick={() => onMove(index, 1)} disabled={index === total - 1} className={orderBtn} aria-label={t('leads.settings.stages.move_down')} title={t('leads.settings.stages.move_down')}><ArrowDownIcon className="w-4 h-4" /></button>
        </div>
      </td>
      <td className={TD_CLASSES}>
        <div className="relative">
          <button type="button" onClick={() => setShowColors(v => !v)} className="w-6 h-6 rounded-full border border-neutral-300 dark:border-neutral-600 shadow-sm" style={{ background: stage.color || '#94a3b8' }} aria-label={t('leads.settings.stages.color_aria')} title={t('leads.settings.stages.col_color_title')} />
          {showColors && <div className="absolute z-20 top-8 left-0 p-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg w-40"><ColorPicker value={stage.color} onChange={c => { setShowColors(false); onUpdate(stage, { color: c }); }} /></div>}
        </div>
      </td>
      <td className={TD_CLASSES}>
        <input value={name} onChange={e => setName(e.target.value)} onBlur={() => { if (name.trim() && name !== stage.name) onUpdate(stage, { name: name.trim() }); }} className={INPUT_SM_CLASSES + ' w-48'} aria-label={t('leads.settings.stages.name_aria')} title={t('leads.settings.stages.col_name_title')} />
      </td>
      <td className={TD_CLASSES}>
        <select value={stage.type} onChange={e => onUpdate(stage, { type: e.target.value as any })} className={INPUT_SM_CLASSES} aria-label={t('leads.settings.col.type')} title={t('leads.settings.stages.type_title')}>
          <option value="open">{t('leads.common.stage_type.open')}</option>
          <option value="won">{t('leads.common.status.won')}</option>
          <option value="lost">{t('leads.common.status.lost')}</option>
        </select>
      </td>
      <td className={TD_CLASSES}>
        <div className="flex items-center gap-1">
          <input type="number" min={0} max={100} value={prob} onChange={e => setProb(e.target.value)} onBlur={() => { const v = prob === '' ? null : Math.max(0, Math.min(100, Number(prob))); if (v !== (stage.probability ?? null)) onUpdate(stage, { probability: v }); }} className={INPUT_SM_CLASSES + ' w-20 text-right'} placeholder="%" aria-label={t('leads.common.probability')} title={t('leads.settings.stages.probability_title')} />
          <span className="text-sm text-neutral-400">%</span>
        </div>
      </td>
      <td className={`${TD_CLASSES} whitespace-nowrap`}>
        {total > 1 && (
          <div className="flex items-center gap-1">
            <select value={validMoveTo} onChange={e => setMoveTo(e.target.value)} className={INPUT_SM_CLASSES + ' max-w-[180px]'} title={t('leads.settings.stages.move_to_title')} aria-label={t('leads.settings.stages.move_to_aria', { name: stage.name })}>
              {others.map(o => <option key={o.id} value={o.id}>→ {o.name}</option>)}
            </select>
            <button type="button" onClick={() => onDelete(validMoveTo)} className={ROW_DELETE_BTN} aria-label={t('leads.settings.stages.delete_aria', { name: stage.name })} title={t('leads.settings.stages.delete_btn_title')}><DeleteIcon className="w-5 h-5" /></button>
          </div>
        )}
      </td>
    </tr>
  );
};

const InlineName: React.FC<{ value: string; onSave: (v: string) => void }> = ({ value, onSave }) => {
  const { t } = useTranslation();
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return <input value={v} onChange={e => setV(e.target.value)} onBlur={() => { if (v.trim() && v !== value) onSave(v.trim()); }} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} className={INPUT_SM_CLASSES + ' w-64 max-w-full'} aria-label={t('leads.settings.col.name')} title={t('leads.settings.inline_edit_title')} />;
};

// ── Fuentes ──
const SourcesTab: React.FC<{ sources: LeadSource[]; reload: () => Promise<void>; askConfirm: AskConfirm }> = ({ sources, reload, askConfirm }) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const add = async () => { if (!name.trim()) return; try { await leadsService.createSource(name.trim()); setName(''); await reload(); } catch (e) { err(e, t('leads.settings.err.create')); } };
  const columns: TableColumn<LeadSource>[] = [
    { header: t('leads.settings.col.name'), accessor: s => <InlineName value={s.name} onSave={async (v) => { try { await leadsService.updateSource(s.id, { name: v }); await reload(); } catch (e) { err(e, t('leads.settings.err.save')); } }} />, sortable: true, sortKey: 'name', sortValue: s => s.name },
    { header: t('leads.settings.sources.active'), accessor: s => <Toggle checked={s.active !== false} label={t('leads.settings.sources.active_title')} onChange={async v => { try { await leadsService.updateSource(s.id, { active: v }); await reload(); } catch (er) { err(er, t('leads.settings.err.save')); } }} />, sortable: true, sortKey: 'active', sortValue: s => (s.active !== false ? 1 : 0) },
  ];
  return (
    <SettingsCard
      title={t('leads.settings.tab.sources')}
      subtitle={t('leads.settings.sources.help')}
      help={[t('leads.settings.sources.help_active'), t('leads.settings.sources.help_auto'), t('leads.settings.sources.help_api'), t('leads.settings.sources.help_edit')]}
      icon={<FireIcon className="w-5 h-5" />}
    >
      <DataTable<LeadSource>
        tableId="leads_settings_sources"
        data={sources}
        columns={columns}
        containerClassName={TABLE_IN_CARD}
        searchable={false} filterable={false} paginated={false}
        actions={s => (
          <button type="button" onClick={() => askConfirm({ title: t('leads.settings.sources.delete_title'), message: t('leads.settings.sources.delete_msg', { name: s.name }), run: async () => { try { await leadsService.deleteSource(s.id); await reload(); } catch (e) { err(e, t('leads.settings.err.delete')); } } })} className={ROW_DELETE_BTN} aria-label={t('leads.settings.delete_item_aria', { name: s.name })} title={t('leads.common.delete')}><DeleteIcon className="w-5 h-5" /></button>
        )}
      />
      <div className={ADD_ROW}>
        <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') add(); }} placeholder={t('leads.settings.sources.new_placeholder')} className={inputFormStyle + ' !w-72 max-w-full'} />
        <button onClick={add} className={`${BUTTON_PRIMARY_SM_CLASSES} ${BTN_ICON}`}><PlusIcon className="w-4 h-4" />{t('leads.settings.add_btn')}</button>
      </div>
    </SettingsCard>
  );
};

// ── Etiquetas ──
const TagsTab: React.FC<{ tags: LeadTag[]; reload: () => Promise<void>; askConfirm: AskConfirm }> = ({ tags, reload, askConfirm }) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [color, setColor] = useState(PALETTE[1]);
  const add = async () => { if (!name.trim()) return; try { await leadsService.createTag(name.trim(), color); setName(''); await reload(); } catch (e) { err(e, t('leads.settings.err.create')); } };
  const columns: TableColumn<LeadTag>[] = [
    { header: t('leads.settings.col.preview'), accessor: tag => <TagChip tag={tag} />, sortable: true, sortKey: 'name', sortValue: tag => tag.name },
    { header: t('leads.settings.col.name'), accessor: tag => <InlineName value={tag.name} onSave={async (v) => { try { await leadsService.updateTag(tag.id, { name: v }); await reload(); } catch (e) { err(e, t('leads.settings.err.save')); } }} /> },
    { header: t('leads.settings.col.color'), accessor: tag => <ColorPicker value={tag.color} onChange={async c => { try { await leadsService.updateTag(tag.id, { color: c }); await reload(); } catch (e) { err(e, t('leads.settings.err.save')); } }} /> },
  ];
  return (
    <SettingsCard title={t('leads.settings.tab.tags')} subtitle={t('leads.settings.tags.help')} icon={<TagIcon className="w-5 h-5" />}>
      {tags.length === 0 ? (
        <EmptyState icon={<TagIcon className="w-12 h-12" />} title={t('leads.settings.tags.empty')} description={t('leads.settings.tags.empty_hint')} className="!py-8" />
      ) : (
        <DataTable<LeadTag>
          tableId="leads_settings_tags"
          data={tags}
          columns={columns}
          containerClassName={TABLE_IN_CARD}
          searchable={false} filterable={false} paginated={false}
          actions={tag => (
            <button type="button" onClick={() => askConfirm({ title: t('leads.settings.tags.delete_title'), message: t('leads.settings.tags.delete_msg', { name: tag.name }), run: async () => { try { await leadsService.deleteTag(tag.id); await reload(); } catch (e) { err(e, t('leads.settings.err.delete')); } } })} className={ROW_DELETE_BTN} aria-label={t('leads.settings.delete_item_aria', { name: tag.name })} title={t('leads.common.delete')}><DeleteIcon className="w-5 h-5" /></button>
          )}
        />
      )}
      <div className={ADD_ROW}>
        <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') add(); }} placeholder={t('leads.settings.tags.new_placeholder')} className={inputFormStyle + ' !w-64 max-w-full'} aria-label={t('leads.settings.tags.new_aria')} />
        <div title={t('leads.settings.tags.color_title')}><ColorPicker value={color} onChange={setColor} /></div>
        <button onClick={add} className={`${BUTTON_PRIMARY_SM_CLASSES} ${BTN_ICON}`}><PlusIcon className="w-4 h-4" />{t('leads.settings.add_btn')}</button>
      </div>
    </SettingsCard>
  );
};

// ── Campos personalizados ──
const FieldsTab: React.FC<{ fields: LeadCustomField[]; reload: () => Promise<void>; askConfirm: AskConfirm }> = ({ fields, reload, askConfirm }) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<{ label: string; type: LeadCustomFieldType; options: string[]; required: boolean }>({ label: '', type: 'text', options: [], required: false });
  // Opción que se está escribiendo (lista de opciones): Enter/coma/"Añadir opción" la agrega como etiqueta.
  const [optInput, setOptInput] = useState('');
  const [editing, setEditing] = useState<LeadCustomField | null>(null);
  /** Agrega una o varias opciones (si se pegó "Casa, Apartamento" se separan), sin duplicados. */
  const addOptions = (raw: string) => {
    const parts = raw.split(',').map(o => o.trim()).filter(Boolean);
    if (!parts.length) return;
    setDraft(d => {
      const next = [...d.options];
      for (const p of parts) if (!next.some(x => x.toLowerCase() === p.toLowerCase())) next.push(p.slice(0, 200));
      return { ...d, options: next };
    });
    setOptInput('');
  };
  const removeOption = (i: number) => setDraft(d => ({ ...d, options: d.options.filter((_, j) => j !== i) }));
  const add = async () => {
    if (!draft.label.trim()) return;
    // Incluye lo que quedó escrito sin pulsar Enter.
    const pending = optInput.split(',').map(o => o.trim()).filter(Boolean).filter(p => !draft.options.some(x => x.toLowerCase() === p.toLowerCase()));
    const options = draft.type === 'select' ? [...draft.options, ...pending] : null;
    if (draft.type === 'select' && !options?.length) { toast.error(t('leads.settings.fields.options_required')); return; }
    try { await leadsService.createCustomField({ label: draft.label.trim(), type: draft.type, options, required: draft.required }); setDraft({ label: '', type: 'text', options: [], required: false }); setOptInput(''); await reload(); }
    catch (e) { err(e, t('leads.settings.err.create')); }
  };
  const columns: TableColumn<LeadCustomField>[] = [
    { header: t('leads.settings.col.name'), accessor: f => <InlineName value={f.label} onSave={async (v) => { try { await leadsService.updateCustomField(f.id, { label: v }); await reload(); } catch (e) { err(e, t('leads.settings.err.save')); } }} />, sortable: true, sortKey: 'label', sortValue: f => f.label },
    { header: t('leads.settings.col.type'), accessor: f => <span className={`${BADGE} ${BADGE_NEUTRAL}`}>{FIELD_TYPES.includes(f.type) ? t(fieldTypeKey(f.type)) : ''}</span>, sortable: true, sortKey: 'type', sortValue: f => f.type },
    { header: t('leads.settings.col.options'), accessor: f => <span className="block text-sm text-neutral-500 dark:text-neutral-400 truncate max-w-[240px]">{f.type === 'select' ? (f.options || []).join(', ') : '—'}</span> },
    { header: t('leads.settings.required'), accessor: f => <input type="checkbox" checked={!!f.required} onChange={async e => { try { await leadsService.updateCustomField(f.id, { required: e.target.checked }); await reload(); } catch (er) { err(er, t('leads.settings.err.save')); } }} className={CHECKBOX} aria-label={t('leads.settings.required')} title={t('leads.settings.fields.required_title')} />, sortable: true, sortKey: 'required', sortValue: f => (f.required ? 1 : 0) },
  ];
  return (
    <SettingsCard
      title={t('leads.settings.tab.fields')}
      subtitle={t('leads.settings.fields.help')}
      help={[
        t('leads.settings.fields.help_required'),
        t('leads.settings.fields.help_edit'),
        t('leads.settings.fields.help_delete'),
      ]}
      icon={<DocumentTextIcon className="w-5 h-5" />}
    >
      {fields.length === 0 ? (
        <EmptyState icon={<DocumentTextIcon className="w-12 h-12" />} title={t('leads.settings.fields.empty')} description={t('leads.settings.fields.empty_hint')} className="!py-8" />
      ) : (
        <DataTable<LeadCustomField>
          tableId="leads_settings_fields"
          data={fields}
          columns={columns}
          containerClassName={TABLE_IN_CARD}
          searchable={false} filterable={false} paginated={false}
          actions={f => (
            <>
              <button type="button" onClick={() => setEditing(f)} className={ROW_EDIT_BTN} aria-label={t('leads.settings.fields.edit_aria', { name: f.label })} title={t('leads.settings.fields.edit_title')}><EditIcon className="w-5 h-5" /></button>
              <button type="button" onClick={() => askConfirm({ title: t('leads.settings.fields.delete_title'), message: t('leads.settings.fields.delete_msg', { name: f.label }), run: async () => { try { await leadsService.deleteCustomField(f.id); await reload(); } catch (e) { err(e, t('leads.settings.err.delete')); } } })} className={ROW_DELETE_BTN} aria-label={t('leads.settings.delete_item_aria', { name: f.label })} title={t('leads.common.delete')}><DeleteIcon className="w-5 h-5" /></button>
            </>
          )}
        />
      )}
      <div className={ADD_ROW}>
        <input value={draft.label} onChange={e => setDraft(d => ({ ...d, label: e.target.value }))} placeholder={t('leads.settings.fields.name_placeholder')} className={inputFormStyle + ' !w-60 max-w-full'} aria-label={t('leads.settings.fields.name_aria')} />
        <select value={draft.type} onChange={e => setDraft(d => ({ ...d, type: e.target.value as LeadCustomFieldType }))} className={inputFormStyle + ' !w-auto'} aria-label={t('leads.settings.fields.type_title')} title={t('leads.settings.fields.type_title')}>
          {FIELD_TYPES.map(ft => <option key={ft} value={ft}>{t(fieldTypeKey(ft))}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300 cursor-pointer" title={t('leads.settings.fields.required_title')}><input type="checkbox" checked={draft.required} onChange={e => setDraft(d => ({ ...d, required: e.target.checked }))} className={CHECKBOX} /> {t('leads.settings.required')}</label>
        <button onClick={add} className={`${BUTTON_PRIMARY_SM_CLASSES} ${BTN_ICON}`}><PlusIcon className="w-4 h-4" />{t('leads.settings.fields.add_btn')}</button>
        {/* key: se remonta al cambiar de tipo (evita el choque del traductor de Chrome con texto que cambia). */}
        <Hint key={draft.type} className="w-full">{t(`leads.settings.fields.type_hint.${draft.type}`)}</Hint>
        {/* Opciones de la lista: una por una, como etiquetas (antes: todo en un campo separado por comas). */}
        {draft.type === 'select' && (
          <div className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 p-3">
            <label className={LABEL_CLASSES}>{t('leads.settings.fields.options_label')}</label>
            {draft.options.length > 0 ? (
              <div className="flex flex-wrap gap-2 mb-2">
                {draft.options.map((o, i) => (
                  <span key={`${o}-${i}`} className="inline-flex items-center gap-1 pl-3 pr-1 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                    <span translate="no">{o}</span>
                    <button type="button" onClick={() => removeOption(i)} className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-primary/20" aria-label={t('leads.settings.fields.remove_option_aria', { name: o })} title={t('leads.settings.fields.remove_option')}>✕</button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">Aún no hay opciones. Escribe la primera y pulsa Enter.</p>
            )}
            <div className="flex items-center gap-2">
              <input
                value={optInput}
                onChange={e => { const v = e.target.value; if (v.includes(',')) addOptions(v); else setOptInput(v); }}
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.preventDefault(); addOptions(optInput); }
                  else if (e.key === 'Backspace' && !optInput && draft.options.length) removeOption(draft.options.length - 1);
                }}
                onPaste={e => { const text = e.clipboardData.getData('text'); if (text.includes(',') || text.includes('\n')) { e.preventDefault(); addOptions(text.replace(/\n/g, ',')); } }}
                maxLength={200}
                placeholder={t('leads.settings.fields.new_option_placeholder')}
                className={INPUT_SM_CLASSES + ' flex-1'}
                aria-label={t('leads.settings.fields.new_option_placeholder')}
              />
              <button type="button" onClick={() => addOptions(optInput)} className={`${BUTTON_SECONDARY_SM_CLASSES} ${BTN_ICON} flex-shrink-0`}><PlusIcon className="w-4 h-4" />{t('leads.settings.fields.add_option')}</button>
            </div>
          </div>
        )}
      </div>
      {editing && <FieldEditModal field={editing} onClose={() => setEditing(null)} onSaved={reload} />}
    </SettingsCard>
  );
};

/** Editar un campo ya creado: nombre, tipo, obligatorio y (en listas) las opciones. */
const FieldEditModal: React.FC<{ field: LeadCustomField; onClose: () => void; onSaved: () => Promise<void> }> = ({ field, onClose, onSaved }) => {
  const { t } = useTranslation();
  const [type, setType] = useState<LeadCustomFieldType>(field.type);
  const isSelect = type === 'select';
  const original = field.options || [];
  const [label, setLabel] = useState(field.label);
  const [required, setRequired] = useState(!!field.required);
  const [options, setOptions] = useState<string[]>(original);
  const [newOpt, setNewOpt] = useState('');
  const [saving, setSaving] = useState(false);
  const clean = options.map(o => o.trim()).filter(Boolean);
  const typeChanged = type !== field.type;
  // Opciones originales que ya no están (quitadas o renombradas): los leads que las tengan conservan ese valor.
  const dropped = isSelect ? original.filter(o => !clean.includes(o)) : [];
  const dirty = label !== field.label || required !== !!field.required || typeChanged || (isSelect && (clean.length !== original.length || clean.some((o, i) => o !== original[i])));

  const addOpt = () => {
    const v = newOpt.trim();
    if (!v) return;
    if (clean.some(o => o.toLowerCase() === v.toLowerCase())) { toast.error(t('leads.settings.fields.option_duplicate')); return; }
    setOptions(p => [...p, v]); setNewOpt('');
  };
  const save = async () => {
    if (!label.trim()) { toast.error(t('leads.settings.fields.label_required')); return; }
    if (isSelect && !clean.length) { toast.error(t('leads.settings.fields.options_min_one')); return; }
    if (isSelect && new Set(clean.map(o => o.toLowerCase())).size !== clean.length) { toast.error(t('leads.settings.fields.option_duplicate')); return; }
    setSaving(true);
    try {
      await leadsService.updateCustomField(field.id, { label: label.trim(), type, required, ...(isSelect ? { options: clean } : { options: null }) } as any);
      await onSaved();
      toast.success(t('leads.settings.saved'));
      onClose();
    } catch (e) { err(e, t('leads.settings.err.save')); } finally { setSaving(false); }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={t('leads.settings.fields.edit_title')} size="md" isDirty={dirty}>
      <div className="space-y-4">
        <div>
          <label className={LABEL_CLASSES}>{t('leads.settings.fields.label_label')}</label>
          <input value={label} onChange={e => setLabel(e.target.value)} maxLength={120} className={inputFormStyle} autoFocus />
        </div>
        <div>
          <label className={LABEL_CLASSES}>{t('leads.settings.col.type')}</label>
          <select value={type} onChange={e => setType(e.target.value as LeadCustomFieldType)} className={inputFormStyle + ' !w-auto'} aria-label={t('leads.settings.fields.type_title')}>
            {FIELD_TYPES.map(ft => <option key={ft} value={ft}>{t(fieldTypeKey(ft))}</option>)}
          </select>
          {typeChanged ? (
            <p className="mt-2 text-sm px-3 py-2 rounded-md border border-amber-300 dark:border-amber-700/70 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200" role="status">
              {t('leads.settings.fields.type_change_warning')}
            </p>
          ) : (
            <Hint>{t('leads.settings.fields.type_change_hint')}</Hint>
          )}
        </div>
        <div>
          <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300 cursor-pointer" title={t('leads.settings.fields.required_title')}>
            <input type="checkbox" checked={required} onChange={e => setRequired(e.target.checked)} className={CHECKBOX} /> {t('leads.settings.required')}
          </label>
          <Hint>{t('leads.settings.fields.required_title')}</Hint>
        </div>
        {isSelect && (
          <div className={BOX}>
            <label className={LABEL_CLASSES}>{t('leads.settings.fields.options_label')}</label>
            <ul className="space-y-2">
              {options.map((o, i) => (
                <li key={i} className="flex items-center gap-2">
                  <input value={o} onChange={e => setOptions(p => p.map((x, j) => (j === i ? e.target.value : x)))} maxLength={200} className={INPUT_SM_CLASSES + ' flex-1'} aria-label={t('leads.settings.fields.option_aria', { n: i + 1 })} />
                  <button type="button" onClick={() => setOptions(p => p.filter((_, j) => j !== i))} className={ROW_DELETE_BTN} aria-label={t('leads.settings.fields.remove_option_aria', { name: o || String(i + 1) })} title={t('leads.settings.fields.remove_option')}><DeleteIcon className="w-5 h-5" /></button>
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-2 mt-2">
              <input value={newOpt} onChange={e => setNewOpt(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addOpt(); } }} maxLength={200} placeholder={t('leads.settings.fields.new_option_placeholder')} className={INPUT_SM_CLASSES + ' flex-1'} aria-label={t('leads.settings.fields.new_option_placeholder')} />
              <button type="button" onClick={addOpt} className={`${BUTTON_SECONDARY_SM_CLASSES} ${BTN_ICON} flex-shrink-0`}><PlusIcon className="w-4 h-4" />{t('leads.settings.fields.add_option')}</button>
            </div>
            <Hint className="mt-2">{t('leads.settings.fields.options_hint')}</Hint>
            {dropped.length > 0 && (
              <p className="mt-2 text-sm px-3 py-2 rounded-md border border-amber-300 dark:border-amber-700/70 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200" role="status">
                <span translate="no">{t('leads.settings.fields.options_dropped_warning', { options: dropped.map(d => `"${d}"`).join(', ') })}</span>
              </p>
            )}
          </div>
        )}
        <div className={MODAL_FOOTER}>
          <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>{t('leads.common.cancel')}</button>
          <button type="button" onClick={save} disabled={saving} className={`${BUTTON_PRIMARY_SM_CLASSES} disabled:opacity-50`}>{saving ? t('leads.common.saving') : t('leads.common.save')}</button>
        </div>
      </div>
    </Modal>
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
  const rows = list.map((reason, i) => ({ id: String(i), reason }));
  const columns: TableColumn<{ id: string; reason: string }>[] = [
    { header: t('leads.settings.col.reason'), accessor: 'reason', noWrap: false },
  ];
  return (
    <SettingsCard title={t('leads.settings.tab.lost')} subtitle={t('leads.settings.lost.help')} icon={<ExclamationTriangleIcon className="w-5 h-5" />}>
      {rows.length === 0 ? (
        <EmptyState icon={<ExclamationTriangleIcon className="w-12 h-12" />} title={t('leads.settings.lost.empty')} description={t('leads.settings.lost.empty_hint')} className="!py-8" />
      ) : (
        <DataTable<{ id: string; reason: string }>
          tableId="leads_settings_lost"
          data={rows}
          columns={columns}
          containerClassName={TABLE_IN_CARD}
          searchable={false} filterable={false} paginated={false}
          actions={r => (
            <button type="button" onClick={() => save(list.filter((_, j) => String(j) !== r.id))} disabled={saving} className={`${ROW_DELETE_BTN} disabled:opacity-50`} aria-label={t('leads.settings.lost.remove_aria', { name: r.reason })} title={t('leads.settings.lost.remove_title')}><DeleteIcon className="w-5 h-5" /></button>
          )}
        />
      )}
      <div className={ADD_ROW}>
        <input value={item} onChange={e => setItem(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && item.trim()) { save([...list, item.trim()]); setItem(''); } }} placeholder={t('leads.settings.lost.new_placeholder')} className={inputFormStyle + ' !w-72 max-w-full'} aria-label={t('leads.settings.lost.new_aria')} />
        <button onClick={() => { if (item.trim()) { save([...list, item.trim()]); setItem(''); } }} disabled={saving} className={`${BUTTON_PRIMARY_SM_CLASSES} ${BTN_ICON} disabled:opacity-50`}><PlusIcon className="w-4 h-4" />{t('leads.settings.add_btn')}</button>
        <Hint className="w-full">{t('leads.settings.lost.add_hint')}</Hint>
      </div>
    </SettingsCard>
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
  // Regenerar rompe al instante el enlace/código ya compartidos: pedir confirmación.
  const [confirmRegen, setConfirmRegen] = useState(false);

  return (
    <>
      <SettingsCard
        title={t('leads.settings.tab.form')}
        subtitle={t('leads.settings.form.help')}
        help={[
          t('leads.settings.form.help_fields'),
          t('leads.settings.form.help_duplicates'),
          t('leads.settings.form.help_spam'),
          t('leads.settings.form.help_save'),
        ]}
        icon={<DocumentTextIcon className="w-5 h-5" />}
      >
        <div className={`${BOX} flex items-center justify-between gap-4 mb-4 ${draft.formEnabled ? 'bg-green-50 dark:bg-green-900/20 !border-green-300 dark:!border-green-700' : 'bg-neutral-50 dark:bg-neutral-900'}`}>
          <div>
            <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{t('leads.settings.form.enabled')}</p>
            <Hint className="mt-0.5">{t('leads.settings.form.enabled_hint')}</Hint>
          </div>
          <Toggle checked={draft.formEnabled} onChange={v => setDraft(d => ({ ...d, formEnabled: v }))} label={t('leads.settings.form.enabled')} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLASSES}>{t('leads.settings.form.title_label')}</label>
            <input value={draft.formTitle} onChange={e => setDraft(d => ({ ...d, formTitle: e.target.value }))} placeholder={t('leads.settings.form.title_placeholder')} className={inputFormStyle} />
            <Hint>{t('leads.settings.form.title_hint')}</Hint>
          </div>
          <div>
            <label className={LABEL_CLASSES}>{t('leads.settings.form.success_label')}</label>
            <input value={draft.formSuccessMessage} onChange={e => setDraft(d => ({ ...d, formSuccessMessage: e.target.value }))} placeholder={t('leads.settings.form.success_placeholder')} className={inputFormStyle} />
            <Hint>{t('leads.settings.form.success_hint')}</Hint>
          </div>
          <div>
            <label className={LABEL_CLASSES}>{t('leads.settings.form.pipeline_label')}</label>
            <select value={draft.formPipelineId} onChange={e => setDraft(d => ({ ...d, formPipelineId: e.target.value, formStageId: '' }))} className={inputFormStyle}>
              <option value="">{t('leads.settings.form.default_pipeline')}</option>
              {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <Hint>{t('leads.settings.form.pipeline_hint')}</Hint>
          </div>
          <div>
            <label className={LABEL_CLASSES}>{t('leads.settings.form.initial_stage')}</label>
            <select value={draft.formStageId} onChange={e => setDraft(d => ({ ...d, formStageId: e.target.value }))} className={inputFormStyle}>
              <option value="">{t('leads.settings.form.first_stage')}</option>
              {(pipe?.stages || []).filter(s => s.type === 'open').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <Hint>{t('leads.settings.form.initial_stage_hint')}</Hint>
          </div>
          <div className="sm:col-span-2">
            <label className={LABEL_CLASSES}>{t('leads.settings.form.assign_to')}</label>
            <select value={draft.formAssigneeId} onChange={e => setDraft(d => ({ ...d, formAssigneeId: e.target.value }))} className={inputFormStyle}>
              <option value="">{t('leads.settings.form.nobody')}</option>
              {assignees.map(a => <option key={a.uid} value={a.uid}>{a.name}</option>)}
            </select>
            <Hint>{t('leads.settings.form.assign_to_hint')}</Hint>
          </div>
        </div>
        <div className="flex justify-end pt-4 mt-4 border-t border-neutral-200 dark:border-neutral-700">
          <button onClick={save} disabled={saving} className={`${BUTTON_PRIMARY_SM_CLASSES} disabled:opacity-50`}>{saving ? t('leads.common.saving') : t('leads.common.save')}</button>
        </div>
      </SettingsCard>

      {link && (
        <SettingsCard title={t('leads.settings.form.share_title')} subtitle={t('leads.settings.form.share_help')} icon={<InformationCircleIcon className="w-5 h-5" />}>
          <div className="space-y-4">
            <div>
              <label className={LABEL_CLASSES}>{t('leads.settings.form.public_link')}</label>
              <div className="flex flex-wrap items-center gap-2">
                <input readOnly value={link} className={inputFormStyle + ' flex-1 min-w-[220px] font-mono !text-sm'} onFocus={e => e.currentTarget.select()} aria-label={t('leads.settings.form.public_link')} />
                <button onClick={() => copy(link)} className={BUTTON_SECONDARY_SM_CLASSES} title={t('leads.settings.form.copy_link_title')}>{t('leads.settings.form.copy')}</button>
                <a href={link} target="_blank" rel="noreferrer" className={BUTTON_SECONDARY_SM_CLASSES} title={t('leads.settings.form.open_title')}>{t('leads.settings.form.open')}</a>
              </div>
              <Hint>{t('leads.settings.form.public_link_hint')}</Hint>
              {!draft.formEnabled && (
                <div className="mt-2 p-3 rounded-md bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-700 flex items-start gap-2">
                  <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                  <p className="text-sm text-amber-800 dark:text-amber-300">{t('leads.settings.form.disabled_warning')}</p>
                </div>
              )}
            </div>
            <div>
              <label className={LABEL_CLASSES}>{t('leads.settings.form.embed_label')}</label>
              <div className="flex flex-wrap items-start gap-2">
                <textarea readOnly rows={3} value={embed} className={inputFormStyle + ' !h-auto flex-1 min-w-[220px] font-mono !text-sm'} onFocus={e => e.currentTarget.select()} aria-label={t('leads.settings.form.embed_label')} />
                <button onClick={() => copy(embed)} className={BUTTON_SECONDARY_SM_CLASSES} title={t('leads.settings.form.copy_embed_title')}>{t('leads.settings.form.copy')}</button>
              </div>
              <Hint>{t('leads.settings.form.embed_hint')}</Hint>
            </div>
            <div className="pt-4 border-t border-neutral-200 dark:border-neutral-700">
              <button onClick={() => setConfirmRegen(true)} className={`${BUTTON_SECONDARY_SM_CLASSES} text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/50`} title={t('leads.settings.form.regenerate_hint')}>{t('leads.settings.form.regenerate')}</button>
              <Hint>{t('leads.settings.form.regenerate_hint')}</Hint>
            </div>
          </div>
        </SettingsCard>
      )}
      <ConfirmationModal
        isOpen={confirmRegen}
        onClose={() => setConfirmRegen(false)}
        onConfirm={() => { setConfirmRegen(false); regenerate(); }}
        title={t('leads.settings.form.regenerate_confirm_title')}
        message={t('leads.settings.form.regenerate_confirm_msg')}
        confirmButtonText={t('leads.settings.form.regenerate_confirm_btn')}
      />
    </>
  );
};

// ── Automatización ──
const AutomationTab: React.FC<{ settings: LeadSettings; setSettings: (s: LeadSettings) => void }> = ({ settings, setSettings }) => {
  const { t } = useTranslation();
  const [coldDays, setColdDays] = useState(String(settings.coldDays));
  const update = async (data: Partial<LeadSettings>) => {
    try { const s = await leadsService.updateSettings(data); setSettings(s); toast.success(t('leads.settings.saved')); } catch (e) { err(e, t('leads.settings.err.save')); }
  };
  // Zona horaria del negocio (GlobalSettings, la misma de Configuración): define "hoy", meses de metas y rangos de reportes.
  const { settings: globalSettings, updateSettings: updateGlobalSettings } = useGlobalSettings();
  const { currentUser } = useAuth();
  const isManager = currentUser?.role === 'MANAGER';
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <SettingsCard title={t('leads.settings.tz.title')} subtitle={t('leads.settings.tz.help')} icon={<ClockIcon className="w-5 h-5" />}>
        <select
          value={globalSettings.timezone || 'America/Puerto_Rico'}
          disabled={!isManager}
          onChange={e => { updateGlobalSettings({ timezone: e.target.value }); toast.success(t('leads.settings.tz.saved')); }}
          className={inputFormStyle}
          aria-label={t('leads.settings.tz.title')}
        >
          {timezoneOptions(globalSettings.timezone).map(tz => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
        </select>
        {!isManager && <Hint>{t('leads.settings.tz.manager_only')}</Hint>}
      </SettingsCard>

      <SettingsCard
        title={t('leads.settings.automation.cold_title')}
        subtitle={t('leads.settings.automation.cold_help')}
        help={[
          t('leads.settings.automation.cold_help_activity'),
          t('leads.settings.automation.cold_help_notify'),
          t('leads.settings.automation.cold_help_filter'),
        ]}
        icon={<FireIcon className="w-5 h-5" />}
      >
        <div className="flex flex-wrap items-center gap-2">
          <input type="number" min={1} max={365} value={coldDays} onChange={e => setColdDays(e.target.value)} className={inputFormStyle + ' !w-28'} aria-label={t('leads.settings.automation.cold_days_aria')} />
          <span className="text-sm text-neutral-500 dark:text-neutral-400">{t('leads.settings.automation.days')}</span>
          <button onClick={() => { const n = Math.max(1, Math.min(365, Number(coldDays) || 7)); update({ coldDays: n }); }} className={BUTTON_PRIMARY_SM_CLASSES}>{t('leads.common.save')}</button>
        </div>
        <Hint className="mt-2">{t('leads.settings.automation.cold_example')}</Hint>
      </SettingsCard>

      <SettingsCard
        title={t('leads.settings.automation.capture_title')}
        subtitle={t('leads.settings.automation.capture_help')}
        help={[t('leads.settings.automation.capture_help_where'), t('leads.settings.automation.capture_help_module')]}
        icon={<SparklesIcon className="w-5 h-5" />}
      >
        <div className="space-y-3">
          <div className={`${BOX} flex items-start justify-between gap-4`}>
            <div>
              <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{t('leads.settings.automation.ecommerce_title')}</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{t('leads.settings.automation.ecommerce_help')}</p>
            </div>
            <Toggle checked={settings.ecommerceToLead} onChange={v => update({ ecommerceToLead: v })} label={t('leads.settings.automation.ecommerce_title')} />
          </div>
          <div className={`${BOX} flex items-start justify-between gap-4`}>
            <div>
              <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{t('leads.settings.automation.whatsapp_title')}</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{t('leads.settings.automation.whatsapp_help')}</p>
            </div>
            <Toggle checked={settings.whatsappToLead} onChange={v => update({ whatsappToLead: v })} label={t('leads.settings.automation.whatsapp_title')} />
          </div>
        </div>
      </SettingsCard>

      <SettingsCard title={t('leads.settings.automation.reminders_title')} subtitle={t('leads.settings.automation.reminders_help')} icon={<BellIcon className="w-5 h-5" />} />
    </div>
  );
};
