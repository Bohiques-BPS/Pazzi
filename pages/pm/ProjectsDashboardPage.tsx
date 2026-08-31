import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { Project, ProjectStatus, VisitStatus } from '../../types';
import { BriefcaseIcon, ExclamationTriangleIcon, ChartBarIcon, BanknotesIcon, CalendarDaysIcon } from '../../components/icons';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import { MiniChart } from '../../components/pm/MiniChart';
import { useTranslation } from '../../contexts/GlobalSettingsContext';

const PRIMARY = '#0D9488';
const PRIMARY_LIGHT = '#5EEAD4';

export const ProjectsDashboardPage: React.FC = () => {
    const { t } = useTranslation();
    const { projects, visits, sales, tasks, getClientById, getEmployeeById } = useData();
    const navigate = useNavigate();

    const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
    const money = (n: number) => '$' + Math.round(n || 0).toLocaleString('en-US');
    const moneyK = (n: number) => n >= 1000 ? `${Math.round(n / 1000)}k` : String(Math.round(n));

    // Progreso de un proyecto = tareas 'Hecho' / total (sin archivar).
    const progressOf = (projectId: string) => {
        const pt = tasks.filter(tk => tk.projectId === projectId && !tk.archived);
        const done = pt.filter(tk => tk.status === 'Hecho').length;
        return pt.length ? Math.round((done / pt.length) * 100) : 0;
    };
    const isOverdueTask = (tk: any) => tk.dueDate && !tk.archived && tk.status !== 'Hecho' && new Date(tk.dueDate + 'T00:00:00') < today;

    // Proyectos en riesgo/retrasados: en pausa, o activos con alguna tarea vencida.
    const atRiskIds = useMemo(() => {
        const s = new Set<string>();
        projects.forEach(p => {
            if (p.status === ProjectStatus.PAUSED) s.add(p.id);
            else if (p.status === ProjectStatus.ACTIVE && tasks.some(tk => tk.projectId === p.id && isOverdueTask(tk))) s.add(p.id);
        });
        return s;
    }, [projects, tasks]);

    // ── Series mensuales (últimos 6 meses) desde ventas ──
    const cashFlow = useMemo(() => {
        const months: { key: string; label: string }[] = [];
        const base = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
            months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString('es-ES', { month: 'short' }) });
        }
        const facturado: Record<string, number> = {}; const cobrado: Record<string, number> = {};
        months.forEach(m => { facturado[m.key] = 0; cobrado[m.key] = 0; });
        sales.forEach(sale => {
            if (sale.paymentStatus === 'Anulado') return;
            const d = new Date(sale.date);
            const key = `${d.getFullYear()}-${d.getMonth()}`;
            if (!(key in facturado)) return;
            facturado[key] += sale.totalAmount || 0;
            const paid = Array.isArray(sale.payments) && sale.payments.length
                ? sale.payments.reduce((s, p) => s + (p.amount || 0), 0)
                : (sale.paymentStatus === 'Pagado' ? (sale.totalAmount || 0) : 0);
            cobrado[key] += paid;
        });
        return {
            labels: months.map(m => m.label),
            facturado: months.map(m => facturado[m.key]),
            cobrado: months.map(m => cobrado[m.key]),
        };
    }, [sales]);

    // ── KPIs ──
    const kpis = useMemo(() => {
        const active = projects.filter(p => p.status === ProjectStatus.ACTIVE).length;
        const completedYear = projects.filter(p => {
            if (p.status !== ProjectStatus.COMPLETED) return false;
            const ref = p.invoiceDate || p.paymentDueDate;
            if (!ref) return true; // completado sin fecha → cuenta igual
            return new Date(ref + 'T00:00:00').getFullYear() === today.getFullYear();
        }).length;
        const year = today.getFullYear();
        let facturadoYear = 0, cobradoYear = 0;
        sales.forEach(sale => {
            if (sale.paymentStatus === 'Anulado') return;
            if (new Date(sale.date).getFullYear() !== year) return;
            facturadoYear += sale.totalAmount || 0;
            cobradoYear += Array.isArray(sale.payments) && sale.payments.length
                ? sale.payments.reduce((s, p) => s + (p.amount || 0), 0)
                : (sale.paymentStatus === 'Pagado' ? (sale.totalAmount || 0) : 0);
        });
        const cobranza = facturadoYear > 0 ? Math.round((cobradoYear / facturadoYear) * 100) : 0;
        return { active, atRisk: atRiskIds.size, completedYear, cobranza, facturadoYear, cobradoYear };
    }, [projects, sales, atRiskIds]);

    // ── Listas ──
    const projectsInProgress = useMemo(() =>
        projects
            .filter(p => p.status === ProjectStatus.ACTIVE || p.status === ProjectStatus.PAUSED || p.status === ProjectStatus.PENDING)
            .sort((a, b) => (a.status === ProjectStatus.ACTIVE ? -1 : 1) - (b.status === ProjectStatus.ACTIVE ? -1 : 1))
            .slice(0, 6),
        [projects]);

    const upcomingActivities = useMemo(() => {
        const items: { date: Date; title: string; sub: string; kind: string }[] = [];
        visits.forEach(v => {
            if (v.status !== VisitStatus.PROGRAMADO) return;
            const d = new Date(v.date + 'T00:00:00');
            if (d < today) return;
            const proj = v.projectId ? projects.find(p => p.id === v.projectId) : null;
            items.push({ date: d, title: v.title, sub: `${proj?.name || 'General'} · Visita`, kind: 'visit' });
        });
        projects.forEach(p => {
            if (p.paymentDueDate) { const d = new Date(p.paymentDueDate + 'T00:00:00'); if (d >= today) items.push({ date: d, title: `Vencimiento de pago`, sub: `${p.name} · Pago`, kind: 'pay' }); }
            if (p.workEndDate) { const d = new Date(p.workEndDate + 'T00:00:00'); if (d >= today) items.push({ date: d, title: `Entrega / cierre`, sub: `${p.name} · Hito`, kind: 'milestone' }); }
        });
        return items.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 5);
    }, [visits, projects]);

    const riskAlerts = useMemo(() =>
        projects.filter(p => atRiskIds.has(p.id)).map(p => {
            const overdue = tasks.filter(tk => tk.projectId === p.id && isOverdueTask(tk)).length;
            const reason = p.status === ProjectStatus.PAUSED ? 'Proyecto en pausa' : `${overdue} tarea(s) vencida(s)`;
            return { project: p, reason, impact: p.status === ProjectStatus.PAUSED ? 'Medio' : (overdue >= 3 ? 'Alto' : 'Medio') };
        }).slice(0, 5),
        [projects, atRiskIds, tasks]);

    const statusBadge = (p: Project) => {
        if (atRiskIds.has(p.id)) return { txt: p.status === ProjectStatus.PAUSED ? 'En pausa' : 'En riesgo', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' };
        if (p.status === ProjectStatus.ACTIVE) return { txt: 'En progreso', cls: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300' };
        if (p.status === ProjectStatus.COMPLETED) return { txt: 'Completado', cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' };
        return { txt: 'Pendiente', cls: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300' };
    };

    const KpiCard: React.FC<{ label: string; value: string; sub: string; icon: React.ReactNode }> = ({ label, value, sub, icon }) => (
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-5 shadow-sm">
            <div className="flex items-start justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{label}</p>
                <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">{icon}</span>
            </div>
            <div className="text-3xl font-bold text-neutral-800 dark:text-neutral-100 mt-2">{value}</div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{sub}</p>
        </div>
    );

    const Card: React.FC<{ title: string; subtitle?: string; icon?: React.ReactNode; children: React.ReactNode }> = ({ title, subtitle, icon, children }) => (
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
                {icon && <span className="text-neutral-400">{icon}</span>}
                <div>
                    <h2 className="text-base font-semibold text-neutral-800 dark:text-neutral-100">{title}</h2>
                    {subtitle && <p className="text-xs text-neutral-400 dark:text-neutral-500">{subtitle}</p>}
                </div>
            </div>
            {children}
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Cabecera */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <div>
                    <h1 className="text-3xl font-bold text-neutral-800 dark:text-neutral-100">{t('pm2x.dashboard.title')}</h1>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Resumen ejecutivo de proyectos, cobros y próximas actividades.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Link to="/pm/projects" className={BUTTON_SECONDARY_SM_CLASSES}>Ver todos los proyectos</Link>
                    <Link to="/pm/reports" className={BUTTON_PRIMARY_SM_CLASSES}>Reportes PM</Link>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard label="Proyectos activos" value={String(kpis.active)} sub={`${projects.length} en cartera`} icon={<BriefcaseIcon className="w-4 h-4" />} />
                <KpiCard label="En riesgo / retrasados" value={String(kpis.atRisk)} sub="Requieren acción" icon={<ExclamationTriangleIcon className="w-4 h-4" />} />
                <KpiCard label="Completados (año)" value={String(kpis.completedYear)} sub="Cerrados este año" icon={<ChartBarIcon className="w-4 h-4" />} />
                <KpiCard label="Cobranza (año)" value={`${kpis.cobranza}%`} sub={`${money(kpis.cobradoYear)} de ${money(kpis.facturadoYear)}`} icon={<BanknotesIcon className="w-4 h-4" />} />
            </div>

            {/* Gráficas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Facturación por mes" subtitle="Últimos 6 meses del portafolio">
                    <MiniChart labels={cashFlow.labels} area formatY={moneyK} series={[{ label: 'Facturado', color: PRIMARY, values: cashFlow.facturado }]} />
                </Card>
                <Card title="Facturado vs. cobrado" subtitle="Flujo de caja de los últimos 6 meses">
                    <MiniChart labels={cashFlow.labels} formatY={moneyK} series={[
                        { label: 'Facturado', color: PRIMARY, values: cashFlow.facturado },
                        { label: 'Cobrado', color: PRIMARY_LIGHT, values: cashFlow.cobrado },
                    ]} />
                </Card>
            </div>

            {/* Listas */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Proyectos en curso */}
                <div className="lg:col-span-2">
                    <Card title="Proyectos en curso o próximos">
                        <div className="space-y-1">
                            {projectsInProgress.length === 0 ? (
                                <p className="text-sm text-neutral-400 text-center py-6">No hay proyectos en curso.</p>
                            ) : projectsInProgress.map(p => {
                                const client = p.clientId ? getClientById(p.clientId) : null;
                                const owner = (p.assignedEmployeeIds || []).map(id => getEmployeeById(id)).filter(Boolean)[0];
                                const prog = progressOf(p.id);
                                const badge = statusBadge(p);
                                return (
                                    <button key={p.id} onClick={() => navigate(`/pm/projects/${p.id}`)} className="w-full text-left flex items-center gap-4 py-3 px-2 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700/40 transition-colors">
                                        <div className="min-w-0 flex-1">
                                            <p className="font-semibold text-sm text-neutral-800 dark:text-neutral-100 truncate">{p.name}</p>
                                            <p className="text-xs text-neutral-400 truncate">{[client ? `${client.name} ${client.lastName || ''}`.trim() : 'Sin cliente', owner ? `${owner.name}` : null].filter(Boolean).join(' · ')}</p>
                                        </div>
                                        <div className="hidden sm:flex items-center gap-2 w-40 flex-shrink-0">
                                            <div className="flex-1 h-1.5 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
                                                <div className="h-full rounded-full" style={{ width: `${prog}%`, background: PRIMARY }} />
                                            </div>
                                            <span className="text-xs text-neutral-500 w-9 text-right">{prog}%</span>
                                        </div>
                                        <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${badge.cls}`}>{badge.txt}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </Card>
                </div>

                {/* Próximos hitos + riesgos */}
                <div className="space-y-6">
                    <Card title="Próximos hitos y visitas" icon={<CalendarDaysIcon className="w-5 h-5" />}>
                        <div className="space-y-3">
                            {upcomingActivities.length === 0 ? (
                                <p className="text-sm text-neutral-400 text-center py-4">Nada programado.</p>
                            ) : upcomingActivities.map((a, i) => (
                                <div key={i} className="flex items-start gap-3">
                                    <div className="flex flex-col items-center justify-center bg-primary/10 text-primary rounded-lg px-2 py-1 min-w-[42px] flex-shrink-0">
                                        <span className="text-sm font-bold leading-none">{a.date.getDate()}</span>
                                        <span className="text-[10px] uppercase">{a.date.toLocaleDateString('es-ES', { month: 'short' })}</span>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate">{a.title}</p>
                                        <p className="text-xs text-neutral-400 truncate">{a.sub}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Card title="Alertas de riesgo" icon={<ExclamationTriangleIcon className="w-5 h-5" />}>
                        <div className="space-y-3">
                            {riskAlerts.length === 0 ? (
                                <p className="text-sm text-neutral-400 text-center py-4">Sin alertas. 🎉</p>
                            ) : riskAlerts.map(({ project, reason, impact }) => (
                                <button key={project.id} onClick={() => navigate(`/pm/projects/${project.id}`)} className="w-full text-left flex items-center justify-between gap-2 py-1">
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate">{reason}</p>
                                        <p className="text-xs text-neutral-400 truncate">{project.name}</p>
                                    </div>
                                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${impact === 'Alto' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'}`}>Impacto {impact}</span>
                                </button>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};
