import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { timeclockService, type TimeClockPunch } from '../../services/timeclock';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';
import { INPUT_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES, BUTTON_PRIMARY_SM_CLASSES } from '../../constants';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { buildTimesheet, bucketsFor, formatHours, timeOf, type Grouping } from '../../utils/timesheet';

const GROUP_LABELS: Record<Grouping, string> = { day: 'Día', month: 'Mes', year: 'Año' };

const todayISO = () => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate()).toISOString().slice(0, 10);
};

export const AttendancePage: React.FC = () => {
    const { employees } = useData();
    const [rows, setRows] = useState<TimeClockPunch[]>([]);
    const [loading, setLoading] = useState(false);
    const [employeeId, setEmployeeId] = useState('');
    const [from, setFrom] = useState(todayISO());
    const [to, setTo] = useState(todayISO());
    const [view, setView] = useState<'hours' | 'punches'>('hours');
    const [grouping, setGrouping] = useState<Grouping>('day');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const start = from ? new Date(`${from}T00:00:00`).toISOString() : undefined;
            const end = to ? new Date(`${to}T23:59:59.999`).toISOString() : undefined;
            setRows(await timeclockService.list({ employeeId: employeeId || undefined, startDate: start, endDate: end }));
        } catch (err) {
            toast.error(err instanceof ApiError ? err.message : 'No se pudo cargar la asistencia.');
        } finally {
            setLoading(false);
        }
    }, [employeeId, from, to]);

    useEffect(() => { load(); }, [load]);

    // Los ponches llegan desc; para el cálculo de horas los ordena internamente buildTimesheet.
    const timesheet = useMemo(() => buildTimesheet(rows), [rows]);

    const exportPdf = async () => {
        try {
            const { jsPDF } = await import('jspdf');
            const autoTable = (await import('jspdf-autotable')).default as any;
            const doc = new jsPDF();
            doc.setFontSize(14); doc.text('Reporte de horas trabajadas', 14, 16);
            doc.setFontSize(10); doc.text(`Período: ${from} a ${to}  ·  Agrupado por: ${GROUP_LABELS[grouping]}`, 14, 22);
            let y = 28;
            for (const emp of timesheet.employees) {
                doc.setFontSize(11); doc.setFont('helvetica', 'bold');
                doc.text(`${emp.employeeName}  —  Total: ${formatHours(emp.totalHours)}${emp.openCount ? `  (${emp.openCount} sin salida)` : ''}`, 14, y);
                const buckets = bucketsFor(emp, grouping);
                // Por día: detalle de cada entrada/salida. Por mes/año: total por período.
                const head = grouping === 'day' ? [['Fecha', 'Entrada', 'Salida', 'Horas']] : [[GROUP_LABELS[grouping], 'Horas']];
                const body = grouping === 'day'
                    ? buckets.flatMap(b => b.sessions.map(s => [b.label, timeOf(s.inAt), timeOf(s.outAt), s.open ? 'Turno abierto' : formatHours(s.hours)]))
                    : buckets.map(b => [b.label, formatHours(b.hours)]);
                autoTable(doc, {
                    startY: y + 2,
                    head,
                    body,
                    styles: { fontSize: 9 },
                    headStyles: { fillColor: [0, 137, 123] },
                    margin: { left: 14, right: 14 },
                });
                y = (doc as any).lastAutoTable.finalY + 8;
                if (y > 265) { doc.addPage(); y = 20; }
            }
            doc.setFontSize(12); doc.setFont('helvetica', 'bold');
            doc.text(`Total general: ${formatHours(timesheet.grandTotalHours)}`, 14, y);
            doc.save(`horas-trabajadas-${from}_a_${to}.pdf`);
        } catch (err: any) {
            toast.error(err?.message || 'No se pudo generar el PDF.');
        }
    };

    return (
        <div>
            <h1 className="text-2xl font-semibold text-neutral-700 dark:text-neutral-200 mb-2">Horarios de empleados</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">Horas trabajadas calculadas desde los ponches (entrada/salida) que marcan los colaboradores con F9 en la caja.</p>

            <div className="flex flex-wrap gap-2 items-end mb-4">
                <div>
                    <label className="block text-xs text-neutral-500 mb-1">Colaborador</label>
                    <select value={employeeId} onChange={e => setEmployeeId(e.target.value)} className={INPUT_SM_CLASSES}>
                        <option value="">Todos</option>
                        {employees.map(e => <option key={e.id} value={e.id}>{e.name} {e.lastName}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs text-neutral-500 mb-1">Desde</label>
                    <input type="date" value={from} onChange={e => setFrom(e.target.value)} className={INPUT_SM_CLASSES} />
                </div>
                <div>
                    <label className="block text-xs text-neutral-500 mb-1">Hasta</label>
                    <input type="date" value={to} onChange={e => setTo(e.target.value)} className={INPUT_SM_CLASSES} />
                </div>
                <button onClick={load} className={BUTTON_SECONDARY_SM_CLASSES}>Actualizar</button>
                <div>
                    <label className="block text-xs text-neutral-500 mb-1">Agrupar por</label>
                    <select value={grouping} onChange={e => setGrouping(e.target.value as Grouping)} className={INPUT_SM_CLASSES}>
                        <option value="day">Día</option>
                        <option value="month">Mes</option>
                        <option value="year">Año</option>
                    </select>
                </div>
                <div className="ml-auto flex items-end gap-2">
                    <div className="inline-flex rounded-md overflow-hidden border border-neutral-300 dark:border-neutral-600">
                        <button onClick={() => setView('hours')} className={`px-3 py-1.5 text-sm ${view === 'hours' ? 'bg-primary text-white' : 'bg-white dark:bg-neutral-800'}`}>Horas</button>
                        <button onClick={() => setView('punches')} className={`px-3 py-1.5 text-sm ${view === 'punches' ? 'bg-primary text-white' : 'bg-white dark:bg-neutral-800'}`}>Ponches</button>
                    </div>
                    <button onClick={exportPdf} disabled={timesheet.employees.length === 0} className={`${BUTTON_PRIMARY_SM_CLASSES} disabled:opacity-50`}>📄 PDF</button>
                </div>
            </div>

            {loading ? <LoadingSkeleton variant="list" rows={6} /> : rows.length === 0 ? (
                <EmptyState title="Sin ponches" description="No hay entradas/salidas en el rango seleccionado." />
            ) : view === 'hours' ? (
                <div className="space-y-4">
                    {timesheet.employees.map(emp => {
                        const buckets = bucketsFor(emp, grouping);
                        return (
                            <div key={emp.key} className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden">
                                <div className="flex items-center justify-between px-4 py-2 bg-neutral-50 dark:bg-neutral-900/50">
                                    <span className="font-semibold text-neutral-800 dark:text-neutral-100">{emp.employeeName}</span>
                                    <span className="text-sm">
                                        Total: <strong>{formatHours(emp.totalHours)}</strong>
                                        {emp.openCount > 0 && <span className="ml-2 text-xs text-amber-600">({emp.openCount} sin salida)</span>}
                                    </span>
                                </div>
                                <div className="divide-y divide-neutral-100 dark:divide-neutral-700">
                                    {buckets.map(b => (
                                        <div key={b.period} className="px-4 py-2">
                                            <div className="flex items-center justify-between">
                                                <span className="font-medium text-neutral-700 dark:text-neutral-200 capitalize">{b.label}</span>
                                                <span className="text-sm font-semibold">{formatHours(b.hours)}{b.openCount > 0 && <span className="ml-1 text-xs text-amber-600">({b.openCount} sin salida)</span>}</span>
                                            </div>
                                            {/* Por día: detalle de cada entrada/salida (el horario del día). */}
                                            {grouping === 'day' && (
                                                <div className="mt-1 ml-2 space-y-0.5">
                                                    {b.sessions.map((s, i) => (
                                                        <div key={i} className="flex justify-between text-xs text-neutral-500 dark:text-neutral-400">
                                                            <span>{timeOf(s.inAt)} → {timeOf(s.outAt)}</span>
                                                            <span>{s.open ? <span className="text-amber-600">Turno abierto</span> : formatHours(s.hours)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                    <div className="text-right text-lg font-bold text-neutral-800 dark:text-neutral-100">
                        Total general: {formatHours(timesheet.grandTotalHours)}
                    </div>
                </div>
            ) : (
                <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden">
                    <table className="min-w-full text-sm">
                        <thead className="bg-neutral-50 dark:bg-neutral-900/50 text-neutral-500">
                            <tr>
                                <th className="text-left px-4 py-2">Colaborador</th>
                                <th className="text-left px-4 py-2">Tipo</th>
                                <th className="text-left px-4 py-2">Fecha y hora</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
                            {rows.map(r => (
                                <tr key={r.id}>
                                    <td className="px-4 py-2 font-medium text-neutral-800 dark:text-neutral-100">{r.employeeName}</td>
                                    <td className="px-4 py-2">
                                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${r.type === 'IN' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'}`}>
                                            {r.type === 'IN' ? 'Entrada' : 'Salida'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 text-neutral-600 dark:text-neutral-300">{new Date(r.punchedAt).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
