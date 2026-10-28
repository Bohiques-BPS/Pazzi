import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { BUTTON_SECONDARY_SM_CLASSES, INPUT_SM_CLASSES } from '../../constants';
import { taskReportService, type TaskReport, type TaskReportItem, type TaskReportRow } from '../../services/reports';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';
import { LoadingSkeleton } from '../ui/LoadingSkeleton';
import { EmptyState } from '../ui/EmptyState';
import { MiniChart } from './MiniChart';
import { exportToPDF, exportToExcel, type ExportColumn } from '../../utils/reportExport';

/**
 * Reportes PM › Tareas: cómo van las tareas en un período (semana, mes, año o personalizado),
 * por colaborador y por proyecto, más el detalle de las tareas con movimiento.
 */

type Period = 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'this_year' | 'last_year' | 'custom';
const PERIODS: { key: Period; label: string }[] = [
    { key: 'this_week', label: 'Esta semana' }, { key: 'last_week', label: 'Semana pasada' },
    { key: 'this_month', label: 'Este mes' }, { key: 'last_month', label: 'Mes pasado' },
    { key: 'this_year', label: 'Este año' }, { key: 'last_year', label: 'Año pasado' },
    { key: 'custom', label: 'Personalizado' },
];

function periodRange(p: Period, cs: string, ce: string): { from: string; to: string } {
    const t = new Date();
    const start = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
    const end = (d: Date) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };
    let s = start(t), e = end(t);
    switch (p) {
        case 'this_week': s.setDate(s.getDate() - s.getDay()); e = end(new Date(s.getTime() + 6 * 86400000)); break;
        case 'last_week': s.setDate(s.getDate() - s.getDay() - 7); e = end(new Date(s.getTime() + 6 * 86400000)); break;
        case 'this_month': s = new Date(t.getFullYear(), t.getMonth(), 1); e = new Date(t.getFullYear(), t.getMonth() + 1, 0, 23, 59, 59, 999); break;
        case 'last_month': s = new Date(t.getFullYear(), t.getMonth() - 1, 1); e = new Date(t.getFullYear(), t.getMonth(), 0, 23, 59, 59, 999); break;
        case 'this_year': s = new Date(t.getFullYear(), 0, 1); e = new Date(t.getFullYear(), 11, 31, 23, 59, 59, 999); break;
        case 'last_year': s = new Date(t.getFullYear() - 1, 0, 1); e = new Date(t.getFullYear() - 1, 11, 31, 23, 59, 59, 999); break;
        case 'custom': if (cs) s = new Date(cs + 'T00:00:00'); if (ce) e = new Date(ce + 'T23:59:59.999'); break;
    }
    return { from: s.toISOString(), to: e.toISOString() };
}

const pct = (n: number | null) => (n == null ? '—' : `${n.toFixed(0)}%`);
const days = (n: number | null) => (n == null ? '—' : `${n.toFixed(1)} d`);
const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString() : '—');

const STATE: Record<TaskReportItem['state'], { label: string; cls: string }> = {
    on_time: { label: 'Completada a tiempo', cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' },
    late: { label: 'Completada tarde', cls: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' },
    overdue: { label: 'Vencida', cls: 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300' },
    done: { label: 'Completada', cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' },
    open: { label: 'Abierta', cls: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300' },
};

const Kpi: React.FC<{ title: string; value: string; sub?: string; tone?: 'green' | 'red' | 'default' }> = ({ title, value, sub, tone = 'default' }) => (
    <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{title}</p>
        <div className={`text-2xl font-bold mt-1 tabular-nums ${tone === 'green' ? 'text-emerald-600 dark:text-emerald-400' : tone === 'red' ? 'text-red-600 dark:text-red-400' : 'text-neutral-800 dark:text-neutral-100'}`}>{value}</div>
        {sub && <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{sub}</p>}
    </div>
);

type View = 'user' | 'project' | 'tasks';

export const TaskReports: React.FC = () => {
    const navigate = useNavigate();
    const { employees, projects } = useData();
    const [period, setPeriod] = useState<Period>('this_month');
    const today = new Date().toISOString().slice(0, 10);
    const [customStart, setCustomStart] = useState(today);
    const [customEnd, setCustomEnd] = useState(today);
    const [userId, setUserId] = useState('');
    const [projectId, setProjectId] = useState('');
    const [view, setView] = useState<View>('user');
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<TaskReport | null>(null);

    // Colaboradores: la asignación de tareas usa User.id (Employee.userId).
    // (Sin usuario se manda el Employee.id; el servidor reconoce ambos.)
    const collaborators = useMemo(() => employees
        .map(e => ({ id: ((e as any).userId || e.id) as string, name: `${e.name} ${e.lastName || ''}`.trim() }))
        .sort((a, b) => a.name.localeCompare(b.name)), [employees]);
    const projectOptions = useMemo(() => [...projects]
        .filter(p => !(p as any).billingOnly)
        .sort((a, b) => a.name.localeCompare(b.name)), [projects]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            setData(await taskReportService.get({ ...periodRange(period, customStart, customEnd), userId, projectId }));
        } catch (err) {
            toast.error(err instanceof ApiError ? err.message : 'No se pudo generar el reporte de tareas.');
        } finally { setLoading(false); }
    }, [period, customStart, customEnd, userId, projectId]);
    useEffect(() => { load(); }, [load]);

    const periodLabel = PERIODS.find(p => p.key === period)?.label || '';
    const s = data?.summary;
    const groupRows: TaskReportRow[] = view === 'user' ? (data?.byUser || []) : (data?.byProject || []);
    const groupCols: ExportColumn[] = [
        { header: view === 'user' ? 'Colaborador' : 'Proyecto', key: 'label' },
        { header: 'Completadas', key: 'completed' }, { header: 'Creadas', key: 'created' },
        { header: 'Abiertas (hoy)', key: 'open' }, { header: 'Vencidas', key: 'overdue' },
        { header: 'A tiempo', key: 'onTime' }, { header: 'Prom. para completar', key: 'avg' },
    ];
    const taskCols: ExportColumn[] = [
        { header: 'Tarea', key: 'title' }, { header: 'Proyecto', key: 'project' }, { header: 'Colaboradores', key: 'assignees' },
        { header: 'Columna', key: 'status' }, { header: 'Creada', key: 'created' }, { header: 'Vence', key: 'due' },
        { header: 'Completada', key: 'completed' }, { header: 'Resultado', key: 'state' },
    ];
    const exportData = (): { title: string; cols: ExportColumn[]; rows: Record<string, any>[] } => view === 'tasks'
        ? {
            title: `Tareas — ${periodLabel}`, cols: taskCols,
            rows: (data?.tasks || []).map(t => ({ title: t.title, project: t.project, assignees: t.assignees.join(', ') || 'Sin asignar', status: t.status, created: fmtDate(t.createdAt), due: fmtDate(t.dueDate), completed: fmtDate(t.completedAt), state: STATE[t.state].label })),
        }
        : {
            title: `Tareas por ${view === 'user' ? 'colaborador' : 'proyecto'} — ${periodLabel}`, cols: groupCols,
            rows: groupRows.map(r => ({ label: r.label, completed: r.completed, created: r.created, open: r.open, overdue: r.overdue, onTime: pct(r.onTimeRate), avg: days(r.avgDays) })),
        };
    const canExport = view === 'tasks' ? !!data?.tasks.length : groupRows.length > 0;

    // Clic en una fila agrupada = filtrar por ese colaborador / proyecto.
    const drill = (r: TaskReportRow) => {
        if (r.key === '__none__') return;
        if (view === 'user') setUserId(r.key); else setProjectId(r.key);
        setView('tasks');
    };

    const seriesLabels = (data?.series || []).map(p => data?.seriesUnit === 'month' ? p.key : p.key.slice(5));
    const thCls = 'px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide';

    return (
        <div className="space-y-4">
            {/* Filtros */}
            <div className="bg-neutral-50 dark:bg-neutral-800/60 rounded-lg p-3">
                <div className="flex flex-wrap items-end gap-2">
                    <div>
                        <label className="block text-xs text-neutral-500 mb-1">Período</label>
                        <select value={period} onChange={e => setPeriod(e.target.value as Period)} className={INPUT_SM_CLASSES}>
                            {PERIODS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                        </select>
                    </div>
                    {period === 'custom' && (
                        <>
                            <div><label className="block text-xs text-neutral-500 mb-1">Desde</label><input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className={INPUT_SM_CLASSES} /></div>
                            <div><label className="block text-xs text-neutral-500 mb-1">Hasta</label><input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className={INPUT_SM_CLASSES} /></div>
                        </>
                    )}
                    <div className="min-w-[180px]">
                        <label className="block text-xs text-neutral-500 mb-1">Colaborador</label>
                        <select value={userId} onChange={e => setUserId(e.target.value)} className={`${INPUT_SM_CLASSES} w-full`}>
                            <option value="">Todos</option>
                            {collaborators.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div className="min-w-[200px]">
                        <label className="block text-xs text-neutral-500 mb-1">Proyecto</label>
                        <select value={projectId} onChange={e => setProjectId(e.target.value)} className={`${INPUT_SM_CLASSES} w-full`}>
                            <option value="">Todos</option>
                            {projectOptions.map(p => <option key={p.id} value={p.id}>{(p as any).projectKey ? `[${String((p as any).projectKey).toUpperCase()}] ` : ''}{p.name}</option>)}
                        </select>
                    </div>
                    {(userId || projectId) && <button type="button" onClick={() => { setUserId(''); setProjectId(''); }} className={`${BUTTON_SECONDARY_SM_CLASSES} !text-red-600`}>Limpiar filtros</button>}
                    <div className="ml-auto flex gap-2">
                        <button type="button" onClick={load} className={BUTTON_SECONDARY_SM_CLASSES}>Actualizar</button>
                        <button type="button" disabled={!canExport} onClick={() => { const x = exportData(); exportToExcel(x.title, x.cols, x.rows); }} className={`${BUTTON_SECONDARY_SM_CLASSES} disabled:opacity-50`}>Excel</button>
                        <button type="button" disabled={!canExport} onClick={() => { const x = exportData(); exportToPDF(x.title, x.cols, x.rows); }} className={`${BUTTON_SECONDARY_SM_CLASSES} disabled:opacity-50`}>PDF</button>
                    </div>
                </div>
                {data?.truncated && <p className="text-xs text-amber-700 dark:text-amber-400 mt-2">Hay demasiadas tareas; se tomaron las 20,000 más recientes. Filtra por proyecto o colaborador.</p>}
            </div>

            {loading && !data ? <LoadingSkeleton variant="cards" count={4} /> : !s ? null : (
                <>
                    {/* Resumen */}
                    <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 ${loading ? 'opacity-60' : ''}`}>
                        <Kpi title="Completadas" value={String(s.completed)} sub="en el período" tone="green" />
                        <Kpi title="Creadas" value={String(s.created)} sub="en el período" />
                        <Kpi title="Abiertas" value={String(s.open)} sub={s.openOverdue ? `${s.openOverdue} con fecha vencida` : 'estado actual'} tone={s.openOverdue ? 'red' : 'default'} />
                        <Kpi title="Vencidas" value={String(s.overdue)} sub="vencían en el período y no se terminaron a tiempo" tone={s.overdue ? 'red' : 'default'} />
                        <Kpi title="A tiempo" value={pct(s.onTimeRate)} sub="de las completadas" tone="green" />
                        <Kpi title="Tiempo promedio" value={days(s.avgDays)} sub="de creada a completada" />
                    </div>

                    {/* Tendencia + columnas */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                        <div className="lg:col-span-2 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 shadow-sm">
                            <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200 mb-2">Creadas vs. completadas {data?.seriesUnit === 'month' ? 'por mes' : 'por día'}</h3>
                            {(data?.series.length || 0) > 1 ? (
                                <MiniChart
                                    labels={seriesLabels}
                                    series={[
                                        { label: 'Completadas', color: '#0D9488', values: data!.series.map(p => p.completed) },
                                        { label: 'Creadas', color: '#7C3AED', values: data!.series.map(p => p.created) },
                                    ]}
                                    area height={200} formatY={n => String(Math.round(n))}
                                />
                            ) : <p className="text-sm text-neutral-500 py-8 text-center">Elige un período de más de un día para ver la tendencia.</p>}
                        </div>
                        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 shadow-sm">
                            <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200 mb-3">Tareas abiertas por columna</h3>
                            {data!.byStatus.length === 0 ? <p className="text-sm text-neutral-500">No hay tareas abiertas.</p> : (
                                <div className="space-y-2">
                                    {data!.byStatus.map(b => (
                                        <div key={b.status}>
                                            <div className="flex justify-between text-sm text-neutral-600 dark:text-neutral-300"><span className="truncate">{b.status}</span><span className="font-semibold tabular-nums">{b.count}</span></div>
                                            <div className="h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-700 overflow-hidden"><div className="h-full bg-primary" style={{ width: `${(b.count / Math.max(1, s.open)) * 100}%` }} /></div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Detalle */}
                    <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm overflow-hidden">
                        <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-neutral-200 dark:border-neutral-700">
                            {([['user', 'Por colaborador'], ['project', 'Por proyecto'], ['tasks', 'Lista de tareas']] as [View, string][]).map(([k, l]) => (
                                <button key={k} type="button" onClick={() => setView(k)}
                                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${view === k ? 'bg-primary text-white border-primary' : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700'}`}>
                                    {l}
                                </button>
                            ))}
                            <span className="ml-auto text-xs text-neutral-500">
                                {view === 'tasks' ? `${data!.tasks.length} tareas` : `${groupRows.length} filas`}
                            </span>
                        </div>

                        {view !== 'tasks' ? (
                            groupRows.length === 0 ? <div className="p-6"><EmptyState title="Sin tareas en este período" description="Cambia el período o los filtros." /></div> : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-sm">
                                        <thead className="bg-neutral-50 dark:bg-neutral-900/40 text-neutral-500 dark:text-neutral-400">
                                            <tr>
                                                <th className={thCls}>{view === 'user' ? 'Colaborador' : 'Proyecto'}</th>
                                                <th className={`${thCls} text-right`}>Completadas</th>
                                                <th className={`${thCls} text-right`}>Creadas</th>
                                                <th className={`${thCls} text-right`}>Abiertas (hoy)</th>
                                                <th className={`${thCls} text-right`}>Vencidas</th>
                                                <th className={`${thCls} text-right`}>A tiempo</th>
                                                <th className={`${thCls} text-right`}>Prom. para completar</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
                                            {groupRows.map(r => (
                                                <tr key={r.key} onClick={() => drill(r)} title={r.key === '__none__' ? undefined : 'Ver sus tareas'}
                                                    className={`text-neutral-700 dark:text-neutral-200 ${r.key === '__none__' ? '' : 'cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-700/40'}`}>
                                                    <td className="px-3 py-2 font-medium">{r.label}</td>
                                                    <td className="px-3 py-2 text-right tabular-nums font-semibold text-emerald-700 dark:text-emerald-400">{r.completed}</td>
                                                    <td className="px-3 py-2 text-right tabular-nums">{r.created}</td>
                                                    <td className="px-3 py-2 text-right tabular-nums">{r.open}</td>
                                                    <td className={`px-3 py-2 text-right tabular-nums ${r.overdue ? 'text-red-600 dark:text-red-400 font-semibold' : ''}`}>{r.overdue}</td>
                                                    <td className="px-3 py-2 text-right tabular-nums">{pct(r.onTimeRate)}</td>
                                                    <td className="px-3 py-2 text-right tabular-nums">{days(r.avgDays)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )
                        ) : (
                            data!.tasks.length === 0 ? <div className="p-6"><EmptyState title="Sin tareas en este período" description="Cambia el período o los filtros." /></div> : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-sm">
                                        <thead className="bg-neutral-50 dark:bg-neutral-900/40 text-neutral-500 dark:text-neutral-400">
                                            <tr>
                                                <th className={thCls}>Tarea</th><th className={thCls}>Proyecto</th><th className={thCls}>Colaboradores</th>
                                                <th className={thCls}>Columna</th><th className={thCls}>Creada</th><th className={thCls}>Vence</th>
                                                <th className={thCls}>Completada</th><th className={thCls}>Resultado</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
                                            {data!.tasks.map(tk => (
                                                <tr key={tk.id} onClick={() => navigate(`/pm/projects/${tk.projectId}?tab=tasks`)} title="Abrir el tablero del proyecto"
                                                    className="cursor-pointer text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700/40">
                                                    <td className="px-3 py-2 font-medium max-w-[280px]"><span className="line-clamp-2">{tk.isSubtask && <span className="text-neutral-400">↳ </span>}{tk.title}</span></td>
                                                    <td className="px-3 py-2 whitespace-nowrap">{tk.project}</td>
                                                    <td className="px-3 py-2 max-w-[200px] truncate" title={tk.assignees.join(', ')}>{tk.assignees.join(', ') || <span className="text-neutral-400">Sin asignar</span>}</td>
                                                    <td className="px-3 py-2 whitespace-nowrap">{tk.status}{tk.archived && <span className="text-neutral-400"> · archivada</span>}</td>
                                                    <td className="px-3 py-2 whitespace-nowrap tabular-nums">{fmtDate(tk.createdAt)}</td>
                                                    <td className="px-3 py-2 whitespace-nowrap tabular-nums">{fmtDate(tk.dueDate)}</td>
                                                    <td className="px-3 py-2 whitespace-nowrap tabular-nums">{fmtDate(tk.completedAt)}</td>
                                                    <td className="px-3 py-2 whitespace-nowrap"><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATE[tk.state].cls}`}>{STATE[tk.state].label}</span></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )
                        )}
                    </div>
                </>
            )}
        </div>
    );
};
