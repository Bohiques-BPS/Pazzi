import React, { useEffect, useMemo, useState } from 'react';
import { projectsService, ProjectActivityItem } from '../../services/projects';
import { Squares2X2Icon, ListBulletIcon } from '../icons';

interface Props { projectId: string; }

/** Metadatos visuales por tipo de evento (color del punto + etiqueta legible). */
const TYPE_META: Record<string, { label: string; dot: string; chip: string }> = {
    PROJECT_CREATED:     { label: 'Proyecto',     dot: 'bg-teal-500',    chip: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300' },
    TASK_CREATED:        { label: 'Tarea creada', dot: 'bg-blue-500',    chip: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
    TASK_MOVED:          { label: 'Movimiento',   dot: 'bg-indigo-500',  chip: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' },
    TASK_UPDATED:        { label: 'Edición',      dot: 'bg-amber-500',   chip: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
    TASK_ASSIGNED:       { label: 'Asignación',   dot: 'bg-green-500',   chip: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
    TASK_UNASSIGNED:     { label: 'Asignación',   dot: 'bg-rose-500',    chip: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' },
    TASK_DELETED:        { label: 'Tarea',        dot: 'bg-red-500',     chip: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
    TASK_COMMENT:        { label: 'Comentario',   dot: 'bg-sky-500',     chip: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300' },
    EMPLOYEE_ASSIGNED:   { label: 'Equipo',       dot: 'bg-green-500',   chip: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
    EMPLOYEE_UNASSIGNED: { label: 'Equipo',       dot: 'bg-rose-500',    chip: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' },
    VISIT_CREATED:       { label: 'Visita',       dot: 'bg-violet-500',  chip: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' },
    MEETING_CREATED:     { label: 'Seguimiento',  dot: 'bg-purple-500',  chip: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
    INVOICE_GENERATED:   { label: 'Factura',      dot: 'bg-emerald-500', chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
    CHAT_MESSAGE:        { label: 'Chat',         dot: 'bg-neutral-400', chip: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300' },
};
const metaFor = (type: string) => TYPE_META[type] || { label: type, dot: 'bg-neutral-400', chip: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300' };

const fmtDateTime = (iso: string) => {
    try { return new Date(iso).toLocaleString('es', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return iso; }
};
const fmtDay = (iso: string) => {
    try { return new Date(iso).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); }
    catch { return iso; }
};

export const ProjectHistoryTab: React.FC<Props> = ({ projectId }) => {
    const [items, setItems] = useState<ProjectActivityItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [view, setView] = useState<'timeline' | 'table'>('timeline');
    const [filter, setFilter] = useState<string>('all');

    useEffect(() => {
        let active = true;
        setLoading(true); setError('');
        projectsService.getActivity(projectId)
            .then(data => { if (active) setItems(Array.isArray(data) ? data : []); })
            .catch(() => { if (active) setError('No se pudo cargar el histórico.'); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [projectId]);

    // Categorías presentes (para los chips de filtro), agrupando asignaciones.
    const filterGroups = useMemo(() => {
        const present = new Set(items.map(i => i.type));
        const groups: { key: string; label: string; match: (t: string) => boolean }[] = [
            { key: 'all', label: 'Todo', match: () => true },
            { key: 'tasks', label: 'Tareas', match: t => t.startsWith('TASK_') && t !== 'TASK_COMMENT' },
            { key: 'moves', label: 'Movimientos', match: t => t === 'TASK_MOVED' },
            { key: 'team', label: 'Asignaciones', match: t => t === 'EMPLOYEE_ASSIGNED' || t === 'EMPLOYEE_UNASSIGNED' || t === 'TASK_ASSIGNED' || t === 'TASK_UNASSIGNED' },
            { key: 'comments', label: 'Comentarios', match: t => t === 'TASK_COMMENT' },
            { key: 'visits', label: 'Visitas y seguimientos', match: t => t === 'VISIT_CREATED' || t === 'MEETING_CREATED' },
            { key: 'chat', label: 'Chat', match: t => t === 'CHAT_MESSAGE' },
        ];
        return groups.filter(g => g.key === 'all' || [...present].some(g.match));
    }, [items]);

    const activeGroup = filterGroups.find(g => g.key === filter) || filterGroups[0];
    const visible = useMemo(() => items.filter(i => activeGroup.match(i.type)), [items, activeGroup]);

    // Agrupa por día para el timeline.
    const byDay = useMemo(() => {
        const map = new Map<string, ProjectActivityItem[]>();
        for (const it of visible) {
            const key = new Date(it.at).toISOString().slice(0, 10);
            (map.get(key) || map.set(key, []).get(key)!).push(it);
        }
        return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
    }, [visible]);

    if (loading) return <div className="py-10 text-center text-neutral-500 dark:text-neutral-400">Cargando histórico…</div>;
    if (error) return <div className="py-10 text-center text-red-600 dark:text-red-400">{error}</div>;

    return (
        <div>
            {/* Barra: filtros + toggle de vista */}
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                    {filterGroups.map(g => (
                        <button key={g.key} onClick={() => setFilter(g.key)}
                            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${filter === g.key ? 'bg-primary text-white shadow-sm' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600'}`}>
                            {g.label}
                        </button>
                    ))}
                </div>
                <div className="flex items-center bg-neutral-100 dark:bg-neutral-700 p-0.5 rounded-md flex-shrink-0">
                    <button onClick={() => setView('timeline')} title="Línea de tiempo" className={`p-1.5 rounded-md ${view === 'timeline' ? 'bg-primary text-white shadow' : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600'}`}><Squares2X2Icon className="w-5 h-5" /></button>
                    <button onClick={() => setView('table')} title="Tabla" className={`p-1.5 rounded-md ${view === 'table' ? 'bg-primary text-white shadow' : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600'}`}><ListBulletIcon className="w-5 h-5" /></button>
                </div>
            </div>

            {visible.length === 0 ? (
                <div className="py-12 text-center text-neutral-500 dark:text-neutral-400">Sin actividad para mostrar.</div>
            ) : view === 'timeline' ? (
                <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-1">
                    {byDay.map(([day, dayItems]) => (
                        <div key={day}>
                            <div className="sticky top-0 z-10 bg-white dark:bg-neutral-800 py-1 mb-2">
                                <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">{fmtDay(day + 'T00:00:00')}</span>
                            </div>
                            <ol className="relative border-l-2 border-neutral-200 dark:border-neutral-700 ml-2 space-y-4">
                                {dayItems.map(it => {
                                    const m = metaFor(it.type);
                                    return (
                                        <li key={it.id} className="ml-4">
                                            <span className={`absolute -left-[9px] mt-1.5 w-4 h-4 rounded-full border-2 border-white dark:border-neutral-800 ${m.dot}`} />
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${m.chip}`}>{m.label}</span>
                                                <span className="text-xs text-neutral-400 dark:text-neutral-500">{fmtDateTime(it.at)}</span>
                                                {it.actorName && <span translate="no" className="text-xs text-neutral-500 dark:text-neutral-400">· {it.actorName}</span>}
                                            </div>
                                            <p className="text-sm text-neutral-800 dark:text-neutral-100 mt-0.5">{it.title}</p>
                                            {it.description && <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-3 whitespace-pre-wrap">{it.description}</p>}
                                        </li>
                                    );
                                })}
                            </ol>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700 max-h-[60vh]">
                    <table className="min-w-full text-sm">
                        <thead className="bg-neutral-50 dark:bg-neutral-900/50 border-b border-neutral-200 dark:border-neutral-700 sticky top-0">
                            <tr>
                                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Fecha</th>
                                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Tipo</th>
                                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Detalle</th>
                                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Quién</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700/60 text-neutral-700 dark:text-neutral-200">
                            {visible.map(it => {
                                const m = metaFor(it.type);
                                return (
                                    <tr key={it.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/30">
                                        <td className="px-3 py-2 whitespace-nowrap text-xs text-neutral-500 dark:text-neutral-400">{fmtDateTime(it.at)}</td>
                                        <td className="px-3 py-2 whitespace-nowrap"><span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${m.chip}`}>{m.label}</span></td>
                                        <td className="px-3 py-2">
                                            <div>{it.title}</div>
                                            {it.description && <div className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 whitespace-pre-wrap">{it.description}</div>}
                                        </td>
                                        <td translate="no" className="px-3 py-2 whitespace-nowrap text-xs text-neutral-500 dark:text-neutral-400">{it.actorName || '—'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default ProjectHistoryTab;
