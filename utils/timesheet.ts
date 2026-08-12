/**
 * Cálculo de horas trabajadas a partir de los ponches (entrada/salida) del sistema.
 * Empareja cada IN con el siguiente OUT del mismo empleado y suma la duración.
 */

export interface PunchLike {
    employeeId?: string;
    employeeName: string;
    type: 'IN' | 'OUT';
    punchedAt: string; // ISO
}

export interface WorkSession {
    date: string;        // YYYY-MM-DD (local) del inicio
    inAt: string;        // ISO entrada
    outAt: string | null;// ISO salida (null = turno abierto / sin salida)
    hours: number;       // horas de la sesión (0 si abierta)
    open: boolean;       // true si no tiene salida (anomalía)
}

export interface EmployeeTimesheet {
    key: string;
    employeeName: string;
    sessions: WorkSession[];
    totalHours: number;
    openCount: number;   // sesiones sin salida (para avisar)
}

const localDay = (iso: string): string => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Agrupa por empleado, ordena por hora y empareja IN→OUT. */
export function buildTimesheet(punches: PunchLike[]): { employees: EmployeeTimesheet[]; grandTotalHours: number } {
    const byEmp = new Map<string, { name: string; list: PunchLike[] }>();
    for (const p of punches) {
        const key = p.employeeId || p.employeeName;
        if (!byEmp.has(key)) byEmp.set(key, { name: p.employeeName, list: [] });
        byEmp.get(key)!.list.push(p);
    }

    const employees: EmployeeTimesheet[] = [];
    let grand = 0;

    for (const [key, { name, list }] of byEmp) {
        const sorted = [...list].sort((a, b) => new Date(a.punchedAt).getTime() - new Date(b.punchedAt).getTime());
        const sessions: WorkSession[] = [];
        let openIn: string | null = null;

        for (const p of sorted) {
            if (p.type === 'IN') {
                if (openIn) sessions.push({ date: localDay(openIn), inAt: openIn, outAt: null, hours: 0, open: true }); // IN previo sin OUT
                openIn = p.punchedAt;
            } else { // OUT
                if (openIn) {
                    const hours = Math.max(0, (new Date(p.punchedAt).getTime() - new Date(openIn).getTime()) / 3600000);
                    sessions.push({ date: localDay(openIn), inAt: openIn, outAt: p.punchedAt, hours, open: false });
                    openIn = null;
                }
                // OUT sin IN → se ignora
            }
        }
        if (openIn) sessions.push({ date: localDay(openIn), inAt: openIn, outAt: null, hours: 0, open: true });

        const totalHours = sessions.reduce((s, x) => s + x.hours, 0);
        const openCount = sessions.filter(s => s.open).length;
        grand += totalHours;
        employees.push({ key, employeeName: name, sessions, totalHours, openCount });
    }

    employees.sort((a, b) => a.employeeName.localeCompare(b.employeeName));
    return { employees, grandTotalHours: grand };
}

export type Grouping = 'day' | 'month' | 'year';

export interface PeriodBucket {
    period: string;        // clave: YYYY-MM-DD | YYYY-MM | YYYY
    label: string;         // etiqueta legible
    hours: number;         // horas del período
    sessions: WorkSession[];
    openCount: number;
}

const monthLabel = (key: string): string => {
    const [y, m] = key.split('-');
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
};

const dayLabel = (key: string): string => {
    const [y, m, d] = key.split('-');
    return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};

/** Agrupa las sesiones de un empleado por día, mes o año, con total de horas por período. */
export function bucketsFor(emp: EmployeeTimesheet, grouping: Grouping): PeriodBucket[] {
    const map = new Map<string, PeriodBucket>();
    for (const s of emp.sessions) {
        const key = grouping === 'day' ? s.date : grouping === 'month' ? s.date.slice(0, 7) : s.date.slice(0, 4);
        const label = grouping === 'day' ? dayLabel(key) : grouping === 'month' ? monthLabel(key) : key;
        if (!map.has(key)) map.set(key, { period: key, label, hours: 0, sessions: [], openCount: 0 });
        const b = map.get(key)!;
        b.hours += s.hours;
        b.sessions.push(s);
        if (s.open) b.openCount++;
    }
    return [...map.values()].sort((a, b) => a.period.localeCompare(b.period));
}

/** Formatea horas decimales como "7h 30m". */
export const formatHours = (h: number): string => {
    const total = Math.max(0, Math.round(h * 60));
    return `${Math.floor(total / 60)}h ${String(total % 60).padStart(2, '0')}m`;
};

export const timeOf = (iso: string | null): string => (iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—');
