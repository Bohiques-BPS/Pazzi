import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { tasksService } from '../../services/tasks';
import { TaskDetailModal } from '../../components/tasks/TaskDetailModal';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Task } from '../../types';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { INPUT_SM_CLASSES } from '../../constants';
import { toast } from '../../hooks/useToast';
import { ApiError } from '../../services/api';
import { CalendarDaysIcon, ExclamationTriangleIcon, BellIcon, ChevronDownIcon, MagnifyingGlassIcon, ChatBubbleLeftRightIcon } from '../../components/icons';

/**
 * Mis tareas: lo asignado al usuario en todos los proyectos.
 * - Resumen por vencimiento (tarjetas que también filtran).
 * - Filtros: texto, proyecto, prioridad, estado; agrupar y ordenar. Se recuerdan en este navegador.
 * - Cada fila: mover de columna sin abrir el tablero (con "Deshacer"), progreso de la lista,
 *   comentarios, recordatorio y vencimiento relativo ("Vence hoy", "Hace 3 días").
 */

const PRIORITY_CFG: Record<string, { label: string; cls: string; bar: string; weight: number }> = {
    urgent: { label: 'Urgente', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', bar: 'bg-red-500', weight: 4 },
    high: { label: 'Alta', cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300', bar: 'bg-orange-400', weight: 3 },
    medium: { label: 'Media', cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300', bar: 'bg-yellow-400', weight: 2 },
    low: { label: 'Baja', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', bar: 'bg-blue-400', weight: 1 },
};
const DEFAULT_COLUMNS = ['Tareas por realizar', 'En progreso', 'Para aprobar', 'Hecho'];
const isDoneStatus = (s?: string | null) => /hecho|done|completad|terminad|finaliz/i.test(String(s ?? ''));

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
const BUCKETS: { id: Bucket; label: string; accent: string; card: string }[] = [
    { id: 'overdue', label: 'Vencidas', accent: 'text-red-600 dark:text-red-400', card: 'border-red-200 dark:border-red-900/60' },
    { id: 'today', label: 'Hoy', accent: 'text-amber-600 dark:text-amber-400', card: 'border-amber-200 dark:border-amber-900/60' },
    { id: 'week', label: 'Próximos 7 días', accent: 'text-primary', card: 'border-primary/30' },
    { id: 'later', label: 'Más adelante', accent: 'text-neutral-700 dark:text-neutral-200', card: 'border-neutral-200 dark:border-neutral-700' },
    { id: 'nodate', label: 'Sin fecha', accent: 'text-neutral-500 dark:text-neutral-400', card: 'border-neutral-200 dark:border-neutral-700' },
];
type GroupBy = 'due' | 'project' | 'priority' | 'status' | 'none';
type SortBy = 'due' | 'priority' | 'recent';

const DAY = 86400000;
const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const dueDateOf = (r: any) => (r.dueDate ? new Date(String(r.dueDate).split('T')[0] + 'T00:00:00') : null);
const bucketOf = (r: any): Bucket => {
    const d = dueDateOf(r);
    if (!d) return 'nodate';
    const today = startOfToday();
    if (d < today) return 'overdue';
    if (d.getTime() === today.getTime()) return 'today';
    if (d.getTime() <= today.getTime() + 7 * DAY) return 'week';
    return 'later';
};
/** "Vence hoy", "Mañana", "En 3 días", "Hace 2 días"… */
const relDue = (r: any) => {
    const d = dueDateOf(r);
    if (!d) return '';
    const n = Math.round((d.getTime() - startOfToday().getTime()) / DAY);
    if (n === 0) return 'Vence hoy';
    if (n === 1) return 'Mañana';
    if (n === -1) return 'Ayer';
    if (n < 0) return `Hace ${-n} días`;
    if (n < 7) return `En ${n} días`;
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
};

const PREFS_KEY = 'pazzi_mytasks_prefs';
const loadPrefs = (): any => { try { return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}'); } catch { return {}; } };

export const MyTasksPage: React.FC = () => {
    const { updateTask, setTasks } = useData();
    const { currentUser } = useAuth();
    const prefs = useMemo(loadPrefs, []);
    const [rows, setRows] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [includeDone, setIncludeDone] = useState<boolean>(!!prefs.includeDone);
    const [selected, setSelected] = useState<any | null>(null);
    // Filtros
    const [q, setQ] = useState('');
    const [fProject, setFProject] = useState<string>(prefs.project || '');
    const [fPriority, setFPriority] = useState<string>(prefs.priority || '');
    const [fStatus, setFStatus] = useState<string>(prefs.status || '');
    const [fBucket, setFBucket] = useState<Bucket | ''>('');
    const [groupBy, setGroupBy] = useState<GroupBy>(prefs.groupBy || 'due');
    const [sortBy, setSortBy] = useState<SortBy>(prefs.sortBy || 'due');
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
    const [movingId, setMovingId] = useState<string | null>(null);

    useEffect(() => {
        try { localStorage.setItem(PREFS_KEY, JSON.stringify({ includeDone, project: fProject, priority: fPriority, status: fStatus, groupBy, sortBy })); } catch { /* sin almacenamiento */ }
    }, [includeDone, fProject, fPriority, fStatus, groupBy, sortBy]);

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

    const projects = useMemo(() => {
        const m = new Map<string, string>();
        for (const r of rows) if (r.projectId) m.set(r.projectId, r.project?.name || '—');
        return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
    }, [rows]);
    const statuses = useMemo(() => [...new Set(rows.map(r => r.status).filter(Boolean))].sort(), [rows]);

    // Filtros sin el de la tarjeta (para que los contadores de las tarjetas respeten los demás filtros).
    const baseFiltered = useMemo(() => {
        const term = q.trim().toLowerCase();
        return rows.filter(r =>
            (!term || `${r.title} ${r.project?.name || ''} ${r.description || ''}`.toLowerCase().includes(term)) &&
            (!fProject || r.projectId === fProject) &&
            (!fPriority || (fPriority === 'none' ? !r.priority : r.priority === fPriority)) &&
            (!fStatus || r.status === fStatus));
    }, [rows, q, fProject, fPriority, fStatus]);
    const counts = useMemo(() => {
        const c: Record<Bucket, number> = { overdue: 0, today: 0, week: 0, later: 0, nodate: 0 };
        for (const r of baseFiltered) if (!isDoneStatus(r.status)) c[bucketOf(r)]++;
        return c;
    }, [baseFiltered]);
    const filtered = useMemo(() => {
        const list = fBucket ? baseFiltered.filter(r => bucketOf(r) === fBucket) : [...baseFiltered];
        const due = (r: any) => dueDateOf(r)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        const prio = (r: any) => PRIORITY_CFG[r.priority]?.weight ?? 0;
        list.sort((a, b) =>
            sortBy === 'priority' ? (prio(b) - prio(a)) || (due(a) - due(b))
                : sortBy === 'recent' ? new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
                    : (due(a) - due(b)) || (prio(b) - prio(a)));
        return list;
    }, [baseFiltered, fBucket, sortBy]);

    const groups = useMemo((): { key: string; label: string; accent?: string; items: any[] }[] => {
        if (groupBy === 'none') return [{ key: 'all', label: 'Todas', items: filtered }];
        if (groupBy === 'due') {
            return BUCKETS.map(b => ({ key: b.id, label: b.label, accent: b.accent, items: filtered.filter(r => bucketOf(r) === b.id) }));
        }
        if (groupBy === 'priority') {
            const order = ['urgent', 'high', 'medium', 'low', ''];
            return order.map(p => ({ key: p || 'none', label: p ? PRIORITY_CFG[p].label : 'Sin prioridad', items: filtered.filter(r => (r.priority || '') === p) }));
        }
        const keyOf = (r: any) => (groupBy === 'project' ? (r.project?.name || '—') : (r.status || '—'));
        const map = new Map<string, any[]>();
        for (const r of filtered) { const k = keyOf(r); map.set(k, [...(map.get(k) || []), r]); }
        return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([k, items]) => ({ key: k, label: k, items }));
    }, [filtered, groupBy]);

    const activeFilters = [q.trim(), fProject, fPriority, fStatus, fBucket].filter(Boolean).length;
    const clearFilters = () => { setQ(''); setFProject(''); setFPriority(''); setFStatus(''); setFBucket(''); };

    // Mover de columna desde la lista. Si queda fuera de la vista (p. ej. pasa a "Hecho"), se puede deshacer.
    const moveTask = async (r: any, status: string) => {
        if (!status || status === r.status) return;
        const prev = r.status;
        setMovingId(r.id);
        try {
            await tasksService.update(r.id, { status } as any);
            setRows(list => (isDoneStatus(status) && !includeDone) ? list.filter(x => x.id !== r.id) : list.map(x => x.id === r.id ? { ...x, status } : x));
            updateTask(r.id, { status } as any);
            toast.undo(`"${r.title}" movida a ${status}`, async () => {
                try {
                    await tasksService.update(r.id, { status: prev } as any);
                    updateTask(r.id, { status: prev } as any);
                    load();
                } catch (err) { toast.error(err instanceof ApiError ? err.message : 'No se pudo deshacer.'); }
            }, { duration: 6000 });
        } catch (err) {
            toast.error(err instanceof ApiError ? err.message : 'No se pudo mover la tarea.');
        } finally { setMovingId(null); }
    };

    const renderRow = (r: any) => {
        const prio = r.priority ? PRIORITY_CFG[r.priority] : null;
        const checklists = Array.isArray(r.checklists) ? r.checklists : [];
        const doneItems = checklists.filter((c: any) => c.checked).length;
        const comments = Array.isArray(r.comments) ? r.comments.length : 0;
        const isDone = isDoneStatus(r.status);
        const b = bucketOf(r);
        const dueCls = isDone ? 'bg-neutral-100 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400'
            : b === 'overdue' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                : b === 'today' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                    : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300';
        const columns: string[] = (Array.isArray(r.project?.taskColumns) && r.project.taskColumns.length ? r.project.taskColumns : DEFAULT_COLUMNS);
        const options = columns.includes(r.status) ? columns : [r.status, ...columns];
        return (
            <div
                key={r.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelected(r)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); setSelected(r); } }}
                className={`group relative flex items-center gap-3 pl-4 pr-3 py-3 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:border-primary/40 hover:shadow-sm transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40 ${isDone ? 'opacity-70' : ''}`}
            >
                <span className={`absolute left-0 top-2 bottom-2 w-1 rounded-r ${prio ? prio.bar : 'bg-neutral-200 dark:bg-neutral-700'}`} aria-hidden />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-semibold ${isDone ? 'line-through text-neutral-400' : 'text-neutral-800 dark:text-neutral-100'}`}><span translate="no">{r.title}</span></span>
                        {prio && <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${prio.cls}`}>{prio.label}</span>}
                        {r.remindAt && <span title="Tiene recordatorio"><BellIcon className="w-3.5 h-3.5 text-primary" /></span>}
                    </div>
                    <div className="flex items-center gap-x-3 gap-y-1 mt-1 text-xs text-neutral-500 dark:text-neutral-400 flex-wrap">
                        <span className="font-medium text-neutral-600 dark:text-neutral-300" translate="no">{r.project?.name || '—'}</span>
                        {checklists.length > 0 && (
                            <span className="inline-flex items-center gap-1.5" title="Lista de verificación">
                                <span className="w-16 h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden"><span className="block h-full bg-primary" style={{ width: `${(doneItems / checklists.length) * 100}%` }} /></span>
                                {doneItems}/{checklists.length}
                            </span>
                        )}
                        {comments > 0 && <span className="inline-flex items-center gap-1" title="Comentarios"><ChatBubbleLeftRightIcon className="w-3.5 h-3.5" />{comments}</span>}
                    </div>
                </div>
                {/* Mover de columna sin abrir el tablero. */}
                <select
                    value={r.status}
                    disabled={movingId === r.id}
                    onClick={e => e.stopPropagation()}
                    onKeyDown={e => e.stopPropagation()}
                    onChange={e => moveTask(r, e.target.value)}
                    title="Mover a otra columna"
                    className="hidden sm:block text-xs max-w-[11rem] rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-200 px-2 py-1"
                >
                    {options.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {r.dueDate ? (
                    <span className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded whitespace-nowrap ${dueCls}`} title={dueDateOf(r)?.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}>
                        {b === 'overdue' && !isDone ? <ExclamationTriangleIcon className="w-3 h-3" /> : <CalendarDaysIcon className="w-3 h-3" />}
                        {relDue(r)}
                    </span>
                ) : <span className="text-[11px] text-neutral-400 whitespace-nowrap">Sin fecha</span>}
                {r.projectId && (
                    <Link
                        to={`/pm/projects/${r.projectId}?tab=tasks&task=${r.id}`}
                        onClick={e => e.stopPropagation()}
                        onKeyDown={e => e.stopPropagation()}
                        className="flex-shrink-0 text-[11px] font-semibold px-2 py-1 rounded border border-primary/40 text-primary hover:bg-primary/10 whitespace-nowrap"
                        title="Abrir el tablero del proyecto con esta tarea"
                    >
                        Tablero
                    </Link>
                )}
            </div>
        );
    };

    const firstName = String((currentUser as any)?.name || '').split(' ')[0];
    const pendingTotal = Object.values(counts).reduce((a, n) => a + n, 0);

    return (
        <div>
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-3xl font-bold text-neutral-800 dark:text-neutral-100">Mis tareas</h1>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                        {loading ? 'Cargando…' : pendingTotal === 0 ? `${firstName ? firstName + ', no' : 'No'} tienes tareas pendientes.`
                            : `${firstName ? firstName + ', tienes' : 'Tienes'} ${pendingTotal} pendiente(s)${counts.overdue ? `, ${counts.overdue} vencida(s)` : ''}${counts.today ? ` y ${counts.today} para hoy` : ''}.`}
                    </p>
                </div>
                <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300 cursor-pointer">
                    <input type="checkbox" checked={includeDone} onChange={e => setIncludeDone(e.target.checked)} className="h-4 w-4" />
                    Incluir completadas
                </label>
            </div>

            {/* Resumen por vencimiento: también filtra. */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
                {BUCKETS.map(b => {
                    const active = fBucket === b.id;
                    return (
                        <button key={b.id} type="button" onClick={() => setFBucket(active ? '' : b.id)}
                            className={`text-left rounded-xl border p-3 bg-white dark:bg-neutral-800 transition ${active ? 'ring-2 ring-primary border-primary' : `${b.card} hover:shadow-sm`}`}>
                            <div className={`text-2xl font-bold tabular-nums ${b.accent}`}>{counts[b.id]}</div>
                            <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{b.label}</div>
                        </button>
                    );
                })}
            </div>

            {/* Filtros */}
            <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-3 mb-4 flex flex-wrap items-end gap-3">
                <label className="text-xs text-neutral-600 dark:text-neutral-300 flex-1 min-w-[12rem]">
                    <span className="block mb-1 font-medium">Buscar</span>
                    <span className="relative block">
                        <MagnifyingGlassIcon className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Título, proyecto o descripción…" className={`${INPUT_SM_CLASSES} w-full pl-8`} />
                    </span>
                </label>
                <label className="text-xs text-neutral-600 dark:text-neutral-300">
                    <span className="block mb-1 font-medium">Proyecto</span>
                    <select value={fProject} onChange={e => setFProject(e.target.value)} className={`${INPUT_SM_CLASSES} min-w-[9rem] max-w-[14rem]`}>
                        <option value="">Todos</option>
                        {projects.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                    </select>
                </label>
                <label className="text-xs text-neutral-600 dark:text-neutral-300">
                    <span className="block mb-1 font-medium">Prioridad</span>
                    <select value={fPriority} onChange={e => setFPriority(e.target.value)} className={INPUT_SM_CLASSES}>
                        <option value="">Todas</option>
                        <option value="urgent">Urgente</option>
                        <option value="high">Alta</option>
                        <option value="medium">Media</option>
                        <option value="low">Baja</option>
                        <option value="none">Sin prioridad</option>
                    </select>
                </label>
                <label className="text-xs text-neutral-600 dark:text-neutral-300">
                    <span className="block mb-1 font-medium">Estado</span>
                    <select value={fStatus} onChange={e => setFStatus(e.target.value)} className={`${INPUT_SM_CLASSES} min-w-[8rem]`}>
                        <option value="">Todos</option>
                        {statuses.map(st => <option key={st} value={st}>{st}</option>)}
                    </select>
                </label>
                <label className="text-xs text-neutral-600 dark:text-neutral-300">
                    <span className="block mb-1 font-medium">Agrupar por</span>
                    <select value={groupBy} onChange={e => setGroupBy(e.target.value as GroupBy)} className={INPUT_SM_CLASSES}>
                        <option value="due">Vencimiento</option>
                        <option value="project">Proyecto</option>
                        <option value="priority">Prioridad</option>
                        <option value="status">Estado</option>
                        <option value="none">Sin agrupar</option>
                    </select>
                </label>
                <label className="text-xs text-neutral-600 dark:text-neutral-300">
                    <span className="block mb-1 font-medium">Ordenar</span>
                    <select value={sortBy} onChange={e => setSortBy(e.target.value as SortBy)} className={INPUT_SM_CLASSES}>
                        <option value="due">Vencimiento</option>
                        <option value="priority">Prioridad</option>
                        <option value="recent">Actualizadas recientemente</option>
                    </select>
                </label>
                {activeFilters > 0 && <button type="button" onClick={clearFilters} className="text-sm text-primary hover:underline pb-1.5">Limpiar filtros</button>}
            </div>

            {loading ? (
                <LoadingSkeleton variant="list" rows={8} />
            ) : error ? (
                <p className="text-center text-red-500 py-6">{error}</p>
            ) : rows.length === 0 ? (
                <div className="text-center py-16 text-neutral-500 dark:text-neutral-400">
                    <p className="text-lg font-medium">No tienes tareas asignadas</p>
                    <p className="text-sm mt-1">Cuando te asignen tareas en un proyecto aparecerán aquí.</p>
                    <Link to="/pm/projects" className="inline-block mt-3 text-primary hover:underline text-sm">Ir a Proyectos</Link>
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-12 text-neutral-500 dark:text-neutral-400">
                    <p className="font-medium">Ninguna tarea coincide con los filtros.</p>
                    <button type="button" onClick={clearFilters} className="mt-2 text-primary hover:underline text-sm">Limpiar filtros</button>
                </div>
            ) : (
                <div className="space-y-5">
                    {groups.filter(g => g.items.length).map(g => {
                        const isCollapsed = !!collapsed[g.key];
                        return (
                            <section key={g.key}>
                                {groupBy !== 'none' && (
                                    <button type="button" onClick={() => setCollapsed(c => ({ ...c, [g.key]: !c[g.key] }))}
                                        className={`flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide mb-2 ${g.accent || 'text-neutral-700 dark:text-neutral-200'}`}>
                                        <ChevronDownIcon className={`w-4 h-4 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                                        <span translate="no">{g.label}</span> <span className="opacity-60">({g.items.length})</span>
                                    </button>
                                )}
                                {!isCollapsed && <div className="space-y-2">{g.items.map(renderRow)}</div>}
                            </section>
                        );
                    })}
                </div>
            )}

            {selected && (
                <TaskDetailModal
                    key={(selected as any).id}
                    task={toTask(selected)}
                    onClose={() => setSelected(null)}
                    onSave={(taskId, updates) => { updateTask(taskId, updates); setSelected(null); load(); }}
                    onArchive={(taskId) => { updateTask(taskId, { archived: true } as any); setSelected(null); load(); }}
                    onDelete={(taskId) => { setRows(prev => prev.filter(r => r.id !== taskId)); setTasks(prev => prev.filter(t => t.id !== taskId)); setSelected(null); }}
                    onRestore={() => { load(); }}
                />
            )}
        </div>
    );
};

export default MyTasksPage;
