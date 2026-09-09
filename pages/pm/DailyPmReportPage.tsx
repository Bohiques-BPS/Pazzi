import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { projectsService, type DailyActivityReport } from '../../services/projects';
import { useTranslation } from '../../contexts/GlobalSettingsContext';
import { toast } from '../../hooks/useToast';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';

/** Etiqueta legible (categoría) por tipo de acción para el resumen y el PDF. */
const TYPE_LABELS: Record<string, string> = {
    PROJECT_CREATED: 'Proyecto creado',
    PROJECT_UPDATED: 'Proyecto editado',
    TASK_CREATED: 'Tarea creada',
    TASK_MOVED: 'Tarea movida',
    TASK_UPDATED: 'Tarea editada',
    TASK_ASSIGNED: 'Tarea asignada',
    TASK_UNASSIGNED: 'Tarea desasignada',
    TASK_DELETED: 'Tarea eliminada',
    EMPLOYEE_ASSIGNED: 'Empleado asignado',
    EMPLOYEE_UNASSIGNED: 'Empleado quitado',
    VISIT_CREATED: 'Visita programada',
    MEETING_CREATED: 'Seguimiento agendado',
};
const labelOf = (type: string) => TYPE_LABELS[type] || type;

/** yyyy-mm-dd de una fecha local (para el <input type="date">). */
const toDateInput = (d: Date) => {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/** Rango [inicio, fin) del día local a partir del valor del input date. */
const dayRange = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const start = new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    return { start: start.toISOString(), end: end.toISOString() };
};

const timeOf = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/**
 * Reporte diario: acciones de gestión de proyectos del usuario conectado (crear/editar proyectos,
 * crear/mover tareas, programar visitas/seguimientos, etc.). Permite descargar un PDF del día.
 */
export const DailyPmReportPage: React.FC = () => {
    const { t } = useTranslation();
    const [date, setDate] = useState<string>(toDateInput(new Date()));
    const [report, setReport] = useState<DailyActivityReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [generating, setGenerating] = useState(false);

    const load = useCallback(() => {
        let active = true;
        setLoading(true); setError('');
        const { start, end } = dayRange(date);
        projectsService.getMyDailyActivity({ start, end })
            .then(data => { if (active) setReport(data); })
            .catch(() => { if (active) setError('No se pudo cargar el reporte diario.'); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [date]);

    useEffect(() => { const cleanup = load(); return cleanup; }, [load]);

    const prettyDate = useMemo(() => {
        const [y, m, d] = date.split('-').map(Number);
        return new Date(y, (m || 1) - 1, d || 1).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }, [date]);

    const summary = useMemo(() => {
        if (!report) return [] as { label: string; count: number }[];
        return Object.entries(report.counts)
            .map(([type, count]) => ({ label: labelOf(type), count }))
            .sort((a, b) => b.count - a.count);
    }, [report]);

    const downloadPdf = async () => {
        if (!report) return;
        setGenerating(true);
        try {
            const { jsPDF } = await import('jspdf');
            const autoTable = (await import('jspdf-autotable')).default as any;
            const doc = new jsPDF();
            doc.setFontSize(15); doc.setFont('helvetica', 'bold');
            doc.text('Reporte diario de gestión de proyectos', 14, 16);
            doc.setFontSize(10); doc.setFont('helvetica', 'normal');
            doc.text(`Colaborador: ${report.user.name}`, 14, 23);
            doc.text(`Fecha: ${prettyDate}`, 14, 28);
            doc.text(`Generado: ${new Date(report.generatedAt).toLocaleString()}`, 14, 33);
            doc.text(`Total de acciones: ${report.total}`, 14, 38);

            // Resumen por categoría.
            let y = 44;
            if (summary.length) {
                autoTable(doc, {
                    startY: y,
                    head: [['Resumen por categoría', 'Cantidad']],
                    body: summary.map(s => [s.label, String(s.count)]),
                    styles: { fontSize: 9 },
                    headStyles: { fillColor: [0, 137, 123] },
                    margin: { left: 14, right: 14 },
                    tableWidth: 110,
                });
                y = (doc as any).lastAutoTable.finalY + 6;
            }

            // Detalle cronológico.
            autoTable(doc, {
                startY: y,
                head: [['Hora', 'Categoría', 'Detalle', 'Proyecto']],
                body: report.items.length
                    ? report.items.map(it => [timeOf(it.at), labelOf(it.type), it.title, it.projectName || '—'])
                    : [['—', '—', 'Sin acciones registradas en el día', '—']],
                styles: { fontSize: 9, cellWidth: 'wrap' },
                headStyles: { fillColor: [0, 137, 123] },
                columnStyles: { 0: { cellWidth: 18 }, 1: { cellWidth: 34 }, 3: { cellWidth: 40 } },
                margin: { left: 14, right: 14 },
            });

            doc.save(`reporte-pm-${report.user.name.replace(/\s+/g, '_')}-${date}.pdf`);
        } catch (err: any) {
            toast.error(err?.message || 'No se pudo generar el PDF.');
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-neutral-800 dark:text-neutral-100">Generar reporte diario</h1>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Acciones de gestión de proyectos que realizaste en el día (crear/editar proyectos, crear/mover tareas, visitas, seguimientos…). Descárgalo en PDF.
                </p>
            </div>

            <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 shadow-sm">
                <div className="flex flex-wrap items-end gap-3 mb-4">
                    <div>
                        <label className="block text-xs font-semibold text-neutral-500 mb-1">Día</label>
                        <input
                            type="date"
                            value={date}
                            max={toDateInput(new Date())}
                            onChange={e => setDate(e.target.value)}
                            className="px-3 py-2 rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-sm"
                        />
                    </div>
                    <button
                        onClick={downloadPdf}
                        disabled={loading || generating || !report}
                        className="px-4 py-2 rounded-md bg-primary hover:bg-primary/90 text-white font-semibold text-sm disabled:opacity-50"
                    >
                        {generating ? 'Generando…' : '🖨️ Descargar PDF'}
                    </button>
                </div>

                {loading ? (
                    <LoadingSkeleton variant="list" rows={6} />
                ) : error ? (
                    <p className="text-center text-red-500 py-6">{error}</p>
                ) : report ? (
                    <>
                        {/* Resumen por categoría (chips). */}
                        <div className="flex flex-wrap gap-2 mb-4">
                            <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                                Total: {report.total}
                            </span>
                            {summary.map(s => (
                                <span key={s.label} className="px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-200 text-xs">
                                    {s.label}: <b>{s.count}</b>
                                </span>
                            ))}
                        </div>

                        {report.items.length === 0 ? (
                            <p className="text-center text-neutral-500 dark:text-neutral-400 py-8">
                                No hay acciones registradas para {prettyDate}.
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-xs font-semibold text-neutral-500 border-b border-neutral-200 dark:border-neutral-700">
                                            <th className="px-2 py-2 w-16">Hora</th>
                                            <th className="px-2 py-2 w-40">Categoría</th>
                                            <th className="px-2 py-2">Detalle</th>
                                            <th className="px-2 py-2 w-56">Proyecto</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700/60">
                                        {report.items.map(it => (
                                            <tr key={it.id}>
                                                <td className="px-2 py-2 tabular-nums text-neutral-500">{timeOf(it.at)}</td>
                                                <td className="px-2 py-2">
                                                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium whitespace-nowrap">{labelOf(it.type)}</span>
                                                </td>
                                                <td className="px-2 py-2 text-neutral-700 dark:text-neutral-200">{it.title}</td>
                                                <td className="px-2 py-2 text-neutral-500 dark:text-neutral-400" translate="no">{it.projectName || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                ) : null}
            </div>
        </div>
    );
};

export default DailyPmReportPage;
