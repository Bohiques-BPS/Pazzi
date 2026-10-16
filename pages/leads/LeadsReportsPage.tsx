import React, { useEffect, useMemo, useState } from 'react';
import {
  leadsService, FunnelReport, PerformanceReport, SourcesReport, StageTimeReport, ForecastReport, LostReasonsReport,
} from '../../services/leads';
import type { Pipeline, GoalProgressRow } from '../../types';
import { goalLabel } from './LeadsAutomationTabs';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { MiniChart } from '../../components/pm/MiniChart';
import { DataTable, TableColumn } from '../../components/DataTable';
import {
  ClipboardDocumentListIcon, BanknotesIcon, XMarkIcon, ChartPieIcon, StarIcon, ChartBarIcon, ClockIcon,
  CalendarDaysIcon, TagIcon, ExclamationTriangleIcon, UsersIcon,
} from '../../components/icons';
import { INPUT_SM_CLASSES } from '../../constants';
import { useTranslation, useGlobalSettings } from '../../contexts/GlobalSettingsContext';
import { useNavigate } from 'react-router-dom';

const money = (n: number) => `$${(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

type Preset = 'all' | '30' | '90' | 'month' | 'year' | 'custom';

// Paleta del dashboard de Gestión (ProjectsDashboardPage).
const PRIMARY = '#0D9488';
const PRIMARY_LIGHT = '#5EEAD4';

// Tabla dentro de una Card: sin la sombra propia de DataTable, con el borde de la app.
const TABLE_IN_CARD = '!shadow-none border border-neutral-200 dark:border-neutral-700 overflow-hidden';

const pct = (value: number, max: number) => (max > 0 ? Math.max(2, Math.min(100, (value / max) * 100)) : 0);

/** KPI con el mismo diseño que ProjectsDashboardPage. */
const KpiCard: React.FC<{ label: string; value: string; sub?: string; icon: React.ReactNode }> = ({ label, value, sub, icon }) => (
  <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-5 shadow-sm">
    <div className="flex items-start justify-between">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{label}</p>
      <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">{icon}</span>
    </div>
    <div className="text-3xl font-bold text-neutral-800 dark:text-neutral-100 mt-2 tabular-nums">{value}</div>
    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{sub || ' '}</p>
  </div>
);

/** Card de sección con el mismo diseño que ProjectsDashboardPage (+ acción opcional a la derecha). */
const Card: React.FC<{ title: string; subtitle?: string; icon?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode }> = ({ title, subtitle, icon, action, children }) => (
  <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-5 shadow-sm min-w-0">
    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
      <div className="flex items-center gap-2 min-w-0">
        {icon && <span className="text-neutral-400 flex-shrink-0">{icon}</span>}
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-neutral-800 dark:text-neutral-100">{title}</h2>
          {subtitle && <p className="text-xs text-neutral-400 dark:text-neutral-500">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
    {children}
  </div>
);

const Empty: React.FC<{ text: string }> = ({ text }) => (
  <p className="text-sm text-neutral-400 text-center py-6">{text}</p>
);

/** Fila con barra de progreso al estilo del dashboard (h-1.5, rounded-full). */
const BarRow: React.FC<{ label: React.ReactNode; value: number; max: number; color?: string; right: string; dot?: string | null }> = ({ label, value, max, color, right, dot }) => (
  <div className="py-2 px-2 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700/40 transition-colors">
    <div className="flex items-center justify-between gap-3 mb-1.5">
      <span className="flex items-center gap-2 min-w-0">
        {dot !== undefined && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: dot || '#9CA3AF' }} />}
        <span className="font-semibold text-sm text-neutral-800 dark:text-neutral-100 truncate">{label}</span>
      </span>
      <span className="text-xs text-neutral-500 dark:text-neutral-400 tabular-nums flex-shrink-0">{right}</span>
    </div>
    <div className="h-1.5 w-full bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${pct(value, max)}%`, background: color || PRIMARY }} />
    </div>
  </div>
);

/** Número + mini barra para columnas de tabla. */
const InlineBar: React.FC<{ value: number; max: number; color?: string }> = ({ value, max, color }) => (
  <div className="flex items-center gap-2 min-w-[120px]">
    <span className="w-8 text-right tabular-nums">{value}</span>
    <div className="flex-1 h-1.5 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${pct(value, max)}%`, background: color || PRIMARY }} />
    </div>
  </div>
);

type PerfRow = PerformanceReport['rows'][number] & { id: string };
type SourceRow = SourcesReport['rows'][number] & { id: string };
type LostRow = LostReasonsReport['rows'][number] & { id: string };
type ForecastRow = ForecastReport['rows'][number] & { id: string };

export const LeadsReportsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { settings: globalSettings } = useGlobalSettings();
  // Los rangos de fechas se calculan en el servidor con la zona horaria del negocio.
  const [reportTz, setReportTz] = useState(globalSettings.timezone || 'America/Puerto_Rico');
  const MONTHS = useMemo(() => t('leads.reports.months_short').split(','), [t]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [pipelineId, setPipelineId] = useState('');
  const [preset, setPreset] = useState<Preset>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [funnel, setFunnel] = useState<FunnelReport | null>(null);
  const [perf, setPerf] = useState<PerformanceReport | null>(null);
  const [sources, setSources] = useState<SourcesReport | null>(null);
  const [stageTime, setStageTime] = useState<StageTimeReport | null>(null);
  const [forecast, setForecast] = useState<ForecastReport | null>(null);
  const [lost, setLost] = useState<LostReasonsReport | null>(null);
  const [goalPeriod, setGoalPeriod] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; });
  const [goals, setGoals] = useState<GoalProgressRow[]>([]);
  useEffect(() => { leadsService.goalsProgress(goalPeriod).then(r => setGoals(r.rows)).catch(() => setGoals([])); }, [goalPeriod]);

  const range = useMemo(() => {
    const now = new Date();
    if (preset === '30') return { from: ymd(new Date(now.getTime() - 30 * 86400000)), to: ymd(now) };
    if (preset === '90') return { from: ymd(new Date(now.getTime() - 90 * 86400000)), to: ymd(now) };
    if (preset === 'month') return { from: ymd(new Date(now.getFullYear(), now.getMonth(), 1)), to: ymd(now) };
    if (preset === 'year') return { from: ymd(new Date(now.getFullYear(), 0, 1)), to: ymd(now) };
    if (preset === 'custom') return { from: from || undefined, to: to || undefined };
    return {};
  }, [preset, from, to]);

  useEffect(() => {
    leadsService.getConfig().then(cfg => {
      setPipelines(cfg.pipelines);
      if (cfg.settings?.timezone) setReportTz(cfg.settings.timezone);
      setPipelineId((cfg.pipelines.find(p => p.isDefault) || cfg.pipelines[0])?.id || '');
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!pipelineId) return;
    setLoading(true);
    const r = { ...range, pipelineId };
    Promise.all([
      leadsService.funnel(r).catch(() => null),
      leadsService.performance(range).catch(() => null),
      leadsService.sources(range).catch(() => null),
      leadsService.stageTime(r).catch(() => null),
      leadsService.forecast().catch(() => null),
      leadsService.lostReasons(range).catch(() => null),
    ]).then(([f, p, s, st, fc, l]) => { setFunnel(f); setPerf(p); setSources(s); setStageTime(st); setForecast(fc); setLost(l); })
      .finally(() => setLoading(false));
  }, [pipelineId, range]);

  const totals = funnel?.totals;
  const funnelMax = Math.max(1, ...(funnel?.funnel || []).map(s => s.count));
  const sourcesMax = Math.max(1, ...(sources?.rows || []).map(s => s.total));
  const lostMax = Math.max(1, ...(lost?.rows || []).map(s => s.count));
  const stageMax = Math.max(1, ...(stageTime?.rows || []).map(s => s.avgDays));

  // Filas con id estable para DataTable.
  const perfRows: PerfRow[] = useMemo(() => (perf?.rows || []).map((r, i) => ({ ...r, id: r.userId || `row-${i}` })), [perf]);
  const sourceRows: SourceRow[] = useMemo(() => (sources?.rows || []).map((r, i) => ({ ...r, id: r.sourceId || `src-${i}` })), [sources]);
  const lostRows: LostRow[] = useMemo(() => (lost?.rows || []).map((r, i) => ({ ...r, id: `${r.reason}-${i}` })), [lost]);
  const forecastRows: ForecastRow[] = useMemo(() => (forecast?.rows || []).map(r => ({ ...r, id: r.month })), [forecast]);
  const stageRows = (stageTime?.rows || []).filter(r => r.type !== 'won' && r.type !== 'lost');

  const perfColumns: TableColumn<PerfRow>[] = [
    { header: t('leads.common.assignee'), accessor: r => <span translate="no">{r.name}</span>, sortKey: 'name', sortable: true, sortValue: r => r.name, filterType: 'none' },
    { header: t('leads.common.status.open_pl'), accessor: 'open', className: 'tabular-nums' },
    { header: t('leads.common.status.won_pl'), accessor: r => <span className="text-green-700 dark:text-green-400">{r.won}</span>, sortKey: 'won', sortable: true, sortValue: r => r.won, className: 'tabular-nums' },
    { header: t('leads.common.status.lost_pl'), accessor: r => <span className="text-red-600 dark:text-red-400">{r.lost}</span>, sortKey: 'lost', sortable: true, sortValue: r => r.lost, className: 'tabular-nums' },
    { header: t('leads.reports.kpi.conversion'), accessor: r => `${r.conversion}%`, sortKey: 'conversion', sortable: true, sortValue: r => r.conversion, className: 'tabular-nums' },
    { header: t('leads.common.metric.won_value'), accessor: r => money(r.value), sortKey: 'value', sortable: true, sortValue: r => r.value, className: 'tabular-nums' },
    { header: t('leads.common.metric.activities'), accessor: 'activities', className: 'tabular-nums' },
  ];

  const sourceColumns: TableColumn<SourceRow>[] = [
    { header: t('leads.reports.sources.source'), accessor: r => <span translate="no">{r.name}</span>, sortKey: 'name', sortable: true, sortValue: r => r.name },
    { header: t('leads.common.leads'), accessor: r => <InlineBar value={r.total} max={sourcesMax} />, sortKey: 'total', sortable: true, sortValue: r => r.total },
    { header: t('leads.reports.kpi.conversion'), accessor: r => `${r.conversion}%`, sortKey: 'conversion', sortable: true, sortValue: r => r.conversion, className: 'tabular-nums' },
    { header: t('leads.common.metric.won_value'), accessor: r => money(r.wonValue), sortKey: 'wonValue', sortable: true, sortValue: r => r.wonValue, className: 'tabular-nums' },
  ];

  const lostColumns: TableColumn<LostRow>[] = [
    { header: t('leads.reports.lost.reason'), accessor: r => <span translate="no">{r.reason}</span>, sortKey: 'reason', sortable: true, sortValue: r => r.reason, noWrap: false },
    { header: t('leads.common.leads'), accessor: r => <InlineBar value={r.count} max={lostMax} color="#dc2626" />, sortKey: 'count', sortable: true, sortValue: r => r.count },
    { header: t('leads.common.value'), accessor: r => money(r.value), sortKey: 'value', sortable: true, sortValue: r => r.value, className: 'tabular-nums' },
  ];

  const forecastColumns: TableColumn<ForecastRow>[] = [
    { header: t('leads.reports.forecast.month'), accessor: 'month' },
    { header: t('leads.common.leads'), accessor: 'count', className: 'tabular-nums' },
    { header: t('leads.common.value'), accessor: r => money(r.value), sortKey: 'value', sortable: true, sortValue: r => r.value, className: 'tabular-nums' },
    { header: t('leads.reports.forecast.weighted'), accessor: r => money(r.weighted), sortKey: 'weighted', sortable: true, sortValue: r => r.weighted, className: 'tabular-nums' },
  ];

  const tableProps = { searchable: false, filterable: false, paginated: false, containerClassName: TABLE_IN_CARD } as const;

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-3xl font-bold text-neutral-800 dark:text-neutral-100">{t('leads.reports.title')}</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            <span translate="no">{t('leads.reports.tz_note', { tz: reportTz })}</span>{' '}
            <button type="button" onClick={() => navigate('/leads/settings?tab=automation')} className="text-primary font-medium hover:underline">{t('leads.reports.tz_change')}</button>
          </p>
        </div>
      </div>

      {/* Filtros (mismo estilo que Reportes POS) */}
      <div className="flex flex-wrap gap-2 items-end bg-neutral-50 dark:bg-neutral-700/50 p-3 rounded-md">
        {pipelines.length > 1 && (
          <div>
            <label htmlFor="leads-reports-pipeline" className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">{t('leads.common.pipeline')}</label>
            <select id="leads-reports-pipeline" value={pipelineId} onChange={e => setPipelineId(e.target.value)} className={INPUT_SM_CLASSES}>
              {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}
        <div>
          <label htmlFor="leads-reports-range" className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">{t('leads.reports.range.label')}</label>
          <select id="leads-reports-range" value={preset} onChange={e => setPreset(e.target.value as Preset)} className={INPUT_SM_CLASSES}>
            <option value="all">{t('leads.reports.range.all')}</option>
            <option value="30">{t('leads.reports.range.last30')}</option>
            <option value="90">{t('leads.reports.range.last90')}</option>
            <option value="month">{t('leads.reports.range.month')}</option>
            <option value="year">{t('leads.reports.range.year')}</option>
            <option value="custom">{t('leads.reports.range.custom')}</option>
          </select>
        </div>
        {preset === 'custom' && (
          <>
            <div>
              <label htmlFor="leads-reports-from" className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">{t('leads.reports.range.from')}</label>
              <input id="leads-reports-from" type="date" value={from} onChange={e => setFrom(e.target.value)} className={INPUT_SM_CLASSES} />
            </div>
            <div>
              <label htmlFor="leads-reports-to" className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">{t('leads.reports.range.to')}</label>
              <input id="leads-reports-to" type="date" value={to} onChange={e => setTo(e.target.value)} className={INPUT_SM_CLASSES} />
            </div>
          </>
        )}
        <p className="basis-full text-xs text-neutral-500 dark:text-neutral-400">{t('leads.reports.range_hint')}</p>
      </div>

      {loading ? (
        <div className="space-y-6"><LoadingSkeleton variant="cards" count={4} /><LoadingSkeleton variant="table" rows={5} /></div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label={t('leads.common.status.open_pl')} value={String(totals?.open ?? 0)} sub={money(totals?.openValue ?? 0)} icon={<ClipboardDocumentListIcon className="w-4 h-4" />} />
            <KpiCard label={t('leads.common.status.won_pl')} value={String(totals?.won ?? 0)} sub={money(totals?.wonValue ?? 0)} icon={<BanknotesIcon className="w-4 h-4" />} />
            <KpiCard label={t('leads.common.status.lost_pl')} value={String(totals?.lost ?? 0)} icon={<XMarkIcon className="w-4 h-4" />} />
            <KpiCard label={t('leads.reports.kpi.conversion')} value={`${totals?.conversion ?? 0}%`} sub={t('leads.reports.kpi.conversion_sub')} icon={<ChartPieIcon className="w-4 h-4" />} />
          </div>

          {/* Metas del mes */}
          <Card
            title={t('leads.reports.goals.title')}
            subtitle={t('leads.reports.goals.hint')}
            icon={<StarIcon className="w-5 h-5" />}
            action={<input type="month" value={goalPeriod} onChange={e => e.target.value && setGoalPeriod(e.target.value)} className={INPUT_SM_CLASSES} aria-label={t('leads.reports.goals.title')} />}
          >
            {goals.length === 0 ? <Empty text={t('leads.reports.goals.empty')} /> : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {goals.map(r => (
                  <div key={r.userId} className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-3">
                    <p className="font-semibold text-sm text-neutral-800 dark:text-neutral-100 px-2 mb-1 truncate"><span translate="no">{r.name}</span></p>
                    {r.goals.map(g => (
                      <BarRow key={g.metric} label={goalLabel(t, g.metric)} value={Math.min(g.actual, g.target)} max={g.target}
                        color={g.pct >= 100 ? '#16a34a' : g.pct >= 60 ? '#f59e0b' : '#dc2626'}
                        right={`${g.metric === 'won_value' ? money(g.actual) : g.actual} / ${g.metric === 'won_value' ? money(g.target) : g.target} · ${g.pct}%`} />
                    ))}
                  </div>
                ))}
              </div>
            )}
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title={t('leads.reports.funnel.title')} subtitle={t('leads.reports.funnel.subtitle', { value: money(totals?.weightedPipeline ?? 0) })} icon={<ChartBarIcon className="w-5 h-5" />}>
              {(funnel?.funnel || []).length === 0 ? <Empty text={t('leads.reports.no_data')} /> : (
                <div className="space-y-0.5">
                  {(funnel?.funnel || []).map(s => (
                    <BarRow key={s.stageId} label={<span translate="no">{s.name}</span>} dot={s.color || null} value={s.count} max={funnelMax} right={`${s.count} · ${money(s.value)}`} />
                  ))}
                </div>
              )}
            </Card>

            <Card title={t('leads.reports.stage_time.title')} subtitle={t('leads.reports.stage_time.subtitle')} icon={<ClockIcon className="w-5 h-5" />}>
              {stageRows.length === 0 ? <Empty text={t('leads.reports.no_data')} /> : (
                <div className="space-y-0.5">
                  {stageRows.map(r => (
                    <BarRow key={r.stageId} label={<span translate="no">{r.name}</span>} value={r.avgDays} max={stageMax} color={PRIMARY_LIGHT} right={r.samples ? t('leads.reports.stage_time.right', { days: r.avgDays, samples: r.samples }) : '—'} />
                  ))}
                </div>
              )}
            </Card>
          </div>

          <Card title={t('leads.reports.forecast.title')} subtitle={t('leads.reports.forecast.subtitle')} icon={<CalendarDaysIcon className="w-5 h-5" />}>
            {forecastRows.length === 0 ? <Empty text={t('leads.reports.forecast.empty')} /> : (
              <div className="space-y-4">
                <MiniChart
                  labels={forecastRows.map(r => { const [y, m] = r.month.split('-'); return `${MONTHS[Number(m) - 1]} ${y.slice(2)}`; })}
                  series={[
                    { label: t('leads.common.value'), color: PRIMARY, values: forecastRows.map(r => r.value) },
                    { label: t('leads.reports.forecast.weighted'), color: PRIMARY_LIGHT, values: forecastRows.map(r => r.weighted) },
                  ]}
                  area
                  height={210}
                  formatY={(n) => money(n)}
                />
                <DataTable<ForecastRow> data={forecastRows} columns={forecastColumns} tableId="leads-reports-forecast" {...tableProps} />
              </div>
            )}
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title={t('leads.reports.sources.title')} subtitle={t('leads.reports.sources.subtitle')} icon={<TagIcon className="w-5 h-5" />}>
              {sourceRows.length === 0 ? <Empty text={t('leads.reports.no_data')} /> : (
                <DataTable<SourceRow> data={sourceRows} columns={sourceColumns} tableId="leads-reports-sources" {...tableProps} />
              )}
            </Card>

            <Card title={t('leads.reports.lost.title')} icon={<ExclamationTriangleIcon className="w-5 h-5" />}>
              {lostRows.length === 0 ? <Empty text={t('leads.reports.lost.empty')} /> : (
                <DataTable<LostRow> data={lostRows} columns={lostColumns} tableId="leads-reports-lost" {...tableProps} />
              )}
            </Card>
          </div>

          <Card title={t('leads.reports.perf.title')} icon={<UsersIcon className="w-5 h-5" />}>
            {perfRows.length === 0 ? <Empty text={t('leads.reports.no_data')} /> : (
              <DataTable<PerfRow> data={perfRows} columns={perfColumns} tableId="leads-reports-perf" {...tableProps} />
            )}
          </Card>
        </>
      )}
    </div>
  );
};
