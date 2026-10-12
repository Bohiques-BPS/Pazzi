import React, { useEffect, useState } from 'react';
import { leadsService, FunnelReport, PerformanceReport } from '../../services/leads';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { MiniChart } from '../../components/pm/MiniChart';

const money = (n: number) => `$${(Number(n) || 0).toFixed(2)}`;

export const LeadsReportsPage: React.FC = () => {
  const [funnel, setFunnel] = useState<FunnelReport | null>(null);
  const [perf, setPerf] = useState<PerformanceReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([leadsService.funnel().catch(() => null), leadsService.performance().catch(() => null)])
      .then(([f, p]) => { setFunnel(f); setPerf(p); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="space-y-4"><LoadingSkeleton variant="block" /><LoadingSkeleton variant="table" rows={5} /></div>;

  const openStages = funnel?.funnel.filter(s => s.type === 'open') || [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">Reportes de Leads</h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Abiertos', value: funnel?.totals.open ?? 0 },
          { label: 'Ganados', value: funnel?.totals.won ?? 0 },
          { label: 'Perdidos', value: funnel?.totals.lost ?? 0 },
          { label: 'Conversión', value: `${funnel?.totals.conversion ?? 0}%` },
        ].map((k, i) => (
          <div key={i} className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-5 shadow-sm">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{k.label}</p>
            <p className="text-3xl font-bold text-neutral-800 dark:text-neutral-100 mt-1">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-5 shadow-sm">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Pipeline ponderado (valor × probabilidad)</p>
        <p className="text-2xl font-bold text-primary dark:text-teal-300 mt-1">{money(funnel?.totals.weightedPipeline ?? 0)}</p>
      </div>

      {/* Embudo */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100 mb-3">Embudo por etapa</h2>
        {openStages.length > 0 && (
          <MiniChart
            labels={openStages.map(s => s.name)}
            series={[{ label: 'Leads', color: '#0D9488', values: openStages.map(s => s.count) }]}
            height={200}
          />
        )}
        <div className="mt-3 space-y-1">
          {(funnel?.funnel || []).map(s => (
            <div key={s.stageId} className="flex items-center justify-between text-sm py-1 border-b border-neutral-100 dark:border-neutral-700/60">
              <span className="text-neutral-700 dark:text-neutral-200">{s.name}</span>
              <span className="text-neutral-500 dark:text-neutral-400 tabular-nums">{s.count} leads · {money(s.value)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Rendimiento por empleado */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-x-auto shadow-sm">
        <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100 p-5 pb-3">Rendimiento por responsable</h2>
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-50 dark:bg-neutral-900/50 border-y border-neutral-200 dark:border-neutral-700">
            <tr>{['Responsable', 'Abiertos', 'Ganados', 'Perdidos', 'Valor ganado'].map(h => <th key={h} className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700/60">
            {(perf?.rows || []).map((r, i) => (
              <tr key={i}>
                <td className="px-4 py-2 text-neutral-800 dark:text-neutral-100">{r.name}</td>
                <td className="px-4 py-2 tabular-nums">{r.open}</td>
                <td className="px-4 py-2 tabular-nums text-green-600 dark:text-green-400">{r.won}</td>
                <td className="px-4 py-2 tabular-nums text-red-600 dark:text-red-400">{r.lost}</td>
                <td className="px-4 py-2 tabular-nums">{money(r.value)}</td>
              </tr>
            ))}
            {(perf?.rows || []).length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-neutral-400">Sin datos.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};
