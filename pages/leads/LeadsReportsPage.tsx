import React, { useEffect, useMemo, useState } from 'react';
import {
  leadsService, FunnelReport, PerformanceReport, SourcesReport, StageTimeReport, ForecastReport, LostReasonsReport,
} from '../../services/leads';
import type { Pipeline } from '../../types';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { MiniChart } from '../../components/pm/MiniChart';
import { inputFormStyle } from '../../constants';

const money = (n: number) => `$${(Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

type Preset = 'all' | '30' | '90' | 'month' | 'year' | 'custom';

const Card: React.FC<{ title: string; children: React.ReactNode; subtitle?: string }> = ({ title, subtitle, children }) => (
  <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-5 shadow-sm">
    <h2 className="text-base font-semibold text-neutral-800 dark:text-neutral-100">{title}</h2>
    {subtitle && <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{subtitle}</p>}
    <div className="mt-3">{children}</div>
  </div>
);

const Bar: React.FC<{ label: string; value: number; max: number; color?: string; right: string }> = ({ label, value, max, color, right }) => (
  <div className="py-1">
    <div className="flex justify-between text-sm mb-0.5 gap-2">
      <span className="text-neutral-700 dark:text-neutral-200 truncate">{label}</span>
      <span className="text-neutral-500 dark:text-neutral-400 tabular-nums flex-shrink-0">{right}</span>
    </div>
    <div className="h-2.5 w-full bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${max > 0 ? Math.max(2, (value / max) * 100) : 0}%`, background: color || '#0D9488' }} />
    </div>
  </div>
);

export const LeadsReportsPage: React.FC = () => {
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

  const t = funnel?.totals;
  const funnelMax = Math.max(1, ...(funnel?.funnel || []).map(s => s.count));
  const sourcesMax = Math.max(1, ...(sources?.rows || []).map(s => s.total));
  const lostMax = Math.max(1, ...(lost?.rows || []).map(s => s.count));
  const stageMax = Math.max(1, ...(stageTime?.rows || []).map(s => s.avgDays));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">Reportes de Leads</h1>
        <div className="flex flex-wrap items-end gap-2">
          {pipelines.length > 1 && (
            <select value={pipelineId} onChange={e => setPipelineId(e.target.value)} className={inputFormStyle + ' !w-auto !py-1.5 text-sm'}>
              {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
          <select value={preset} onChange={e => setPreset(e.target.value as Preset)} className={inputFormStyle + ' !w-auto !py-1.5 text-sm'}>
            <option value="all">Todo el tiempo</option>
            <option value="30">Últimos 30 días</option>
            <option value="90">Últimos 90 días</option>
            <option value="month">Este mes</option>
            <option value="year">Este año</option>
            <option value="custom">Personalizado…</option>
          </select>
          {preset === 'custom' && (
            <>
              <input type="date" value={from} onChange={e => setFrom(e.target.value)} className={inputFormStyle + ' !w-auto !py-1.5 text-sm'} aria-label="Desde" />
              <input type="date" value={to} onChange={e => setTo(e.target.value)} className={inputFormStyle + ' !w-auto !py-1.5 text-sm'} aria-label="Hasta" />
            </>
          )}
        </div>
      </div>
      <p className="text-xs text-neutral-500 dark:text-neutral-400 -mt-4">El rango filtra por fecha de creación del lead. El pronóstico usa siempre los leads abiertos con cierre estimado.</p>

      {loading ? <div className="space-y-4"><LoadingSkeleton variant="block" /><LoadingSkeleton variant="table" rows={5} /></div> : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Abiertos', value: String(t?.open ?? 0), sub: money(t?.openValue ?? 0) },
              { label: 'Ganados', value: String(t?.won ?? 0), sub: money(t?.wonValue ?? 0) },
              { label: 'Perdidos', value: String(t?.lost ?? 0), sub: '' },
              { label: 'Conversión', value: `${t?.conversion ?? 0}%`, sub: 'ganados / cerrados' },
            ].map((k, i) => (
              <div key={i} className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-5 shadow-sm">
                <p className="text-sm text-neutral-500 dark:text-neutral-400">{k.label}</p>
                <p className="text-3xl font-bold text-neutral-800 dark:text-neutral-100 mt-1 tabular-nums">{k.value}</p>
                {k.sub && <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{k.sub}</p>}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Embudo por etapa" subtitle={`Pipeline ponderado (valor × probabilidad): ${money(t?.weightedPipeline ?? 0)}`}>
              {(funnel?.funnel || []).map(s => (
                <Bar key={s.stageId} label={s.name} value={s.count} max={funnelMax} color={s.color || undefined} right={`${s.count} · ${money(s.value)}`} />
              ))}
              {!(funnel?.funnel || []).length && <p className="text-sm text-neutral-400">Sin datos.</p>}
            </Card>

            <Card title="Tiempo promedio en cada etapa" subtitle="Días que un lead permanece en la etapa (según su historial).">
              {(stageTime?.rows || []).filter(r => r.type !== 'won' && r.type !== 'lost').map(r => (
                <Bar key={r.stageId} label={r.name} value={r.avgDays} max={stageMax} color="#6366f1" right={r.samples ? `${r.avgDays} d · ${r.samples} mov.` : '—'} />
              ))}
              {!(stageTime?.rows || []).length && <p className="text-sm text-neutral-400">Sin datos.</p>}
            </Card>
          </div>

          <Card title="Pronóstico de cierres" subtitle="Valor de los leads abiertos según su mes de cierre estimado.">
            {(forecast?.rows || []).length > 0 ? (
              <>
                <MiniChart
                  labels={(forecast?.rows || []).map(r => { const [y, m] = r.month.split('-'); return `${MONTHS[Number(m) - 1]} ${y.slice(2)}`; })}
                  series={[
                    { label: 'Valor', color: '#0D9488', values: (forecast?.rows || []).map(r => r.value) },
                    { label: 'Ponderado', color: '#6366f1', values: (forecast?.rows || []).map(r => r.weighted) },
                  ]}
                  area
                  height={210}
                  formatY={(n) => money(n)}
                />
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead><tr className="text-left text-[11px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400"><th className="py-1.5 pr-3">Mes</th><th className="py-1.5 pr-3">Leads</th><th className="py-1.5 pr-3">Valor</th><th className="py-1.5">Ponderado</th></tr></thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700/60">
                      {(forecast?.rows || []).map(r => (
                        <tr key={r.month}><td className="py-1.5 pr-3">{r.month}</td><td className="py-1.5 pr-3 tabular-nums">{r.count}</td><td className="py-1.5 pr-3 tabular-nums">{money(r.value)}</td><td className="py-1.5 tabular-nums">{money(r.weighted)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : <p className="text-sm text-neutral-400">Asigna una "fecha de cierre estimado" a tus leads abiertos para ver el pronóstico.</p>}
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Leads por fuente" subtitle="Qué canal trae más leads y cuál convierte mejor.">
              {(sources?.rows || []).map(r => (
                <Bar key={r.sourceId} label={r.name} value={r.total} max={sourcesMax} color="#0ea5e9" right={`${r.total} · ${r.conversion}% conv. · ${money(r.wonValue)}`} />
              ))}
              {!(sources?.rows || []).length && <p className="text-sm text-neutral-400">Sin datos.</p>}
            </Card>

            <Card title="Motivos de pérdida">
              {(lost?.rows || []).map(r => (
                <Bar key={r.reason} label={r.reason} value={r.count} max={lostMax} color="#dc2626" right={`${r.count} · ${money(r.value)}`} />
              ))}
              {!(lost?.rows || []).length && <p className="text-sm text-neutral-400">Sin leads perdidos en el rango.</p>}
            </Card>
          </div>

          <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-x-auto shadow-sm">
            <h2 className="text-base font-semibold text-neutral-800 dark:text-neutral-100 p-5 pb-3">Rendimiento por responsable</h2>
            <table className="min-w-full text-sm">
              <thead className="bg-neutral-50 dark:bg-neutral-900/50 border-y border-neutral-200 dark:border-neutral-700">
                <tr>{['Responsable', 'Abiertos', 'Ganados', 'Perdidos', 'Conversión', 'Valor ganado', 'Actividades'].map(h => <th key={h} className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700/60">
                {(perf?.rows || []).map((r, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2 text-neutral-800 dark:text-neutral-100"><span translate="no">{r.name}</span></td>
                    <td className="px-4 py-2 tabular-nums">{r.open}</td>
                    <td className="px-4 py-2 tabular-nums text-green-700 dark:text-green-400">{r.won}</td>
                    <td className="px-4 py-2 tabular-nums text-red-600 dark:text-red-400">{r.lost}</td>
                    <td className="px-4 py-2 tabular-nums">{r.conversion}%</td>
                    <td className="px-4 py-2 tabular-nums">{money(r.value)}</td>
                    <td className="px-4 py-2 tabular-nums">{r.activities}</td>
                  </tr>
                ))}
                {(perf?.rows || []).length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-neutral-400">Sin datos.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};
