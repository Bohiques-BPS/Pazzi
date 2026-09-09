import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { tasksService } from '../../services/tasks';
import { TaskDetailModal } from '../../components/tasks/TaskDetailModal';
import { useData } from '../../contexts/DataContext';
import { Task } from '../../types';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { CalendarDaysIcon, ExclamationTriangleIcon, BellIcon } from '../../components/icons';

const PRIORITY_CFG: Record<string, { label: string; cls: string }> = {
    urgent: { label: 'Urgente', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
    high: { label: 'Alta', cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' },
    medium: { label: 'Media', cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' },
    low: { label: 'Baja', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
};

/** Convierte un registro del backend al shape Task que espera el modal de detalle. */
const toTask = (r: any): Task => ({
    id: r.id,
    projectId: r.projectId,
    title: r.title,
    description: r.description || '',
    status: r.status,
    section: r.section ?? null,
    archived: !!r.archived,
    order: r.order ?? 0,
    assignedEmployeeIds: Array.isArray(r.employees) ? r.employees.map((e: any) => e.userId) : [],
    dueDate: r.dueDate ? String(r.dueDate).split('T')[0] : null,
    priority: r.priority ?? null,
    remindAt: r.remindAt ?? null,
    ...(r.comments ? { comments: r.comments } : {}),
    ...(r.checklists ? { checklists: r.checklists } : {}),
} as any);

type Bucket = 'overdue' | 'today' | 'week' | 'later' | 'nodate';
const BUCKET_META: Record<Bucket, { label: string; accent: string }> = {
    overdue: { label: 'Vencidas', accent: 'text-red-600 dark:text-red-400' },
    today: { label: 'Hoy', accent: 'text-amber-600 dark:text-amber-400' },
    week: { label: 'Próximos 7 días', accent: 'text-neutral-700 dark:text-neutral-200' },
    later: { label: 'Más adelante', accent: 'text-neutral-700 dark:text-neutral-200' },
    nodate: { label: 'Sin fecha', accent: 'text-neutral-500 dark:text-neutral-400' },
};

const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };

/** Vista "Mis tareas": tareas asignadas al usuario en todos los proyectos, por vencimiento. */
export const MyTasksPage: React.FC = () => {
    const { updateTask, setTasks } = useData();
    const [rows, setRows] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [includeDone, setIncludeDone] = useState(false);
    const [selected, setSelected] = useState<any | null>(null);

    const load = useCallback(() => {
        let active = true;
        setLoading(true); setError('');
        tasksService.getMine({ includeDone })
            .then(data => { if (active) setRows(Array.isArray(data) ? data : []); })
            .catch(() => { if (active) setError('No se pudieron cargar tus tareas.'); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [includeDone]);

    useEffect(() => { const c = load(); return c; }, [load]);

    const grouped = useMemo(() => {
        const today = startOfToday();
        const in7 = new Date(today.getTime() + 7 * 86400000);
        const g: Record<Bucket, any[]> = { overdue: [], today: [], week: [], later: [], nodate: [] };
        for (const r of rows) {
            if (!r.dueDate) { g.nodate.push(r); continue; }
            const d = new Date(String(r.dueDate).split('T')[0] + 'T00:00:00');
            if (d < today) g.overdue.push(r);
            else if (d.getTime() === today.getTime()) g.today.push(r);
            else if (d <= in7) g.week.push(r);
            else g.later.push(r);
        }
        return g;
    }, [rows]);

    const total = rows.length;

    const fmtDue = (due: string) => new Date(String(due).split('T')[0] + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

    const renderRow = (r: any) => {
        const prio = r.priority ? PRIORITY_CFG[r.priority] : null;
        const checklists = Array.isArray(r.checklists) ? r.checklists : [];
        const done = checklists.filter((c: any) => c.checked).length;
        const isDone = r.status === 'Hecho';
        const overdue = r.dueDate && new Date(String(r.dueDate).split('T')[0] + 'T00:00:00') < startOfToday() && !isDone;
        return (
            <button
                key={r.id}
                onClick={() => setSelected(r)}
                className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700/40 transition-colors"
            >
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-medium ${isDone ? 'line-through text-neutral-400' : 'text-neutral-800 dark:text-neutral-100'}`}>{r.title}</span>
                        {prio && <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${prio.cls}`}>{prio.label}</span>}
                        {r.remindAt && <BellIcon className="w-3.5 h-3.5 text-primary" />}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-neutral-500 dark:text-neutral-400 flex-wrap">
                        <span translate="no">{r.project?.name || '—'}</span>
                        <span className="opacity-40">·</span>
                        <span>{r.status}</span>
                        {checklists.length > 0 && <><span className="opacity-40">·</span><span>☑ {done}/{checklists.length}</span></>}
                    </div>
                </div>
                {r.dueDate && (
                    <span className={`flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded whitespace-nowrap
                        ${overdue ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300'}`}>
                        {overdue ? <ExclamationTriangleIcon className="w-3 h-3" /> : <CalendarDaysIcon className="w-3 h-3" />}
                        {fmtDue(r.dueDate)}
                    </span>
                )}
            </button>
        );
    };

    return (
        <div>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-3xl font-bold text-neutral-800 dark:text-neutral-100">Mis tareas</h1>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                        Tareas asignadas a ti en todos los proyectos, ordenadas por vencimiento.
                    </p>
                </div>
                <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300 cursor-pointer">
                    <input type="checkbox" checked={includeDone} onChange={e => setIncludeDone(e.target.checked)} className="h-4 w-4" />
                    Incluir completadas
                </label>
            </div>

            {loading ? (
                <LoadingSkeleton variant="list" rows={8} />
            ) : error ? (
                <p className="text-center text-red-500 py-6">{error}</p>
            ) : total === 0 ? (
                <div className="text-center py-16 text-neutral-500 dark:text-neutral-400">
                    <p className="text-lg font-medium">No tienes tareas asignadas 🎉</p>
                    <p className="text-sm mt-1">Cuando te asignen tareas en un proyecto aparecerán aquí.</p>
                    <Link to="/pm/projects" className="inline-block mt-3 text-primary hover:underline text-sm">Ir a Proyectos</Link>
                </div>
            ) : (
                <div className="space-y-6">
                    {(Object.keys(BUCKET_META) as Bucket[]).map(bucket => {
                        const items = grouped[bucket];
                        if (!items.length) return null;
                        const meta = BUCKET_META[bucket];
                        return (
                            <div key={bucket}>
                                <h2 className={`text-sm font-semibold uppercase tracking-wide mb-2 ${meta.accent}`}>
                                    {meta.label} <span className="opacity-60">({items.length})</span>
                                </h2>
                                <div className="space-y-2">{items.map(renderRow)}</div>
                            </div>
                        );
                    })}
                </div>
            )}

            {selected && (
                <TaskDetailModal
                    task={toTask(selected)}
                    onClose={() => setSelected(null)}
                    onSave={(taskId, updates) => { updateTask(taskId, updates); setSelected(null); load(); }}
                    onArchive={(taskId) => { updateTask(taskId, { archived: true } as any); setSelected(null); load(); }}
                    onDelete={(taskId) => { setTasks(prev => prev.filter(t => t.id !== taskId)); setSelected(null); load(); }}
                />
            )}
        </div>
    );
};

export default MyTasksPage;
