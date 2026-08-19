import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from '../Modal';
import { cajasService, type CajaSession, type SessionTotals } from '../../services/cajas';
import { ApiError } from '../../services/api';
import { LoadingSkeleton } from '../ui/LoadingSkeleton';

interface CajaHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    cajaId: string;
    cajaName?: string;
}

const money = (n: number | null | undefined) => `$${(Number(n) || 0).toFixed(2)}`;
const isCash = (m: string) => /efectivo|cash/i.test(m);

/** Fila del cuadre en modo lectura: método, esperado (POS) y contado (guardado al cerrar). */
interface ViewRow { label: string; expected: number; counted: number; cash: boolean; }

export const CajaHistoryModal: React.FC<CajaHistoryModalProps> = ({ isOpen, onClose, cajaId, cajaName }) => {
    const [loading, setLoading] = useState(true);
    const [sessions, setSessions] = useState<CajaSession[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Turno seleccionado (detalle/cuadre).
    const [selId, setSelId] = useState<string | null>(null);
    const [detail, setDetail] = useState<{ session: CajaSession; totals: SessionTotals } | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);

    useEffect(() => {
        if (!isOpen || !cajaId) return;
        let cancelled = false;
        setLoading(true); setError(null); setSessions([]); setSelId(null); setDetail(null);
        cajasService.getSessions(cajaId, { limit: 60 })
            .then(({ items }) => { if (!cancelled) setSessions(items); })
            .catch(err => { if (!cancelled) setError(err instanceof ApiError ? err.message : 'No se pudo cargar el historial.'); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [isOpen, cajaId]);

    const openDetail = async (sessionId: string) => {
        setSelId(sessionId); setDetail(null); setDetailLoading(true);
        try {
            const d = await cajasService.getSessionDetail(sessionId);
            setDetail({ session: d.session, totals: d.totals });
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'No se pudo cargar el cuadre del turno.');
        } finally { setDetailLoading(false); }
    };

    const rows: ViewRow[] = useMemo(() => {
        if (!detail) return [];
        const counted = (detail.session.countedByMethod || {}) as Record<string, number>;
        const others = detail.totals.byMethod.filter(m => !isCash(m.method));
        return [
            { label: 'Efectivo (gaveta)', expected: detail.totals.expectedCash, counted: Number(counted['Efectivo'] ?? 0), cash: true },
            ...others.map(m => ({ label: m.method, expected: m.amount, counted: Number(counted[m.method] ?? 0), cash: false })),
        ];
    }, [detail]);

    const diffColor = (d: number) => d === 0 ? 'text-neutral-500' : d > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400';
    const fmtRange = (s: CajaSession) => {
        const o = new Date(s.openedAt);
        const c = s.closedAt ? new Date(s.closedAt) : null;
        return `${o.toLocaleDateString()} ${o.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}${c ? ` → ${c.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}`;
    };
    const cajero = (s: CajaSession) => s.openedByUser ? `${s.openedByUser.name} ${s.openedByUser.lastName || ''}`.trim() : '—';

    const totalExpected = rows.reduce((a, r) => a + r.expected, 0);
    const totalCounted = rows.reduce((a, r) => a + r.counted, 0);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Historial de turnos ${cajaName ? `· ${cajaName}` : ''}`} size="5xl">
            {loading ? (
                <LoadingSkeleton variant="list" rows={5} />
            ) : error && sessions.length === 0 ? (
                <p className="text-center text-neutral-500 py-8">{error}</p>
            ) : sessions.length === 0 ? (
                <p className="text-center text-neutral-500 py-8">Esta caja aún no tiene turnos.</p>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 text-sm">
                    {/* Lista de turnos */}
                    <div className="lg:col-span-2 border border-neutral-200 dark:border-neutral-700 rounded-md overflow-hidden max-h-[70vh] overflow-y-auto">
                        {sessions.map(s => {
                            const active = s.id === selId;
                            const diff = s.difference ?? null;
                            return (
                                <button
                                    key={s.id}
                                    onClick={() => openDetail(s.id)}
                                    className={`w-full text-left px-3 py-2 border-b border-neutral-100 dark:border-neutral-700 ${active ? 'bg-primary/10' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800'}`}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="font-medium text-neutral-800 dark:text-neutral-100">{fmtRange(s)}</span>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${s.status === 'OPEN' ? 'bg-green-100 text-green-700' : 'bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300'}`}>{s.status === 'OPEN' ? 'Abierto' : 'Cerrado'}</span>
                                    </div>
                                    <div className="text-xs text-neutral-500 mt-0.5">{cajero(s)} · #{s.id.slice(0, 8)}</div>
                                    {s.status === 'CLOSED' && (
                                        <div className="text-xs mt-0.5">
                                            Contado {money(s.countedCash)} · Esperado {money(s.expectedCash)} ·{' '}
                                            <span className={diffColor(diff ?? 0)}>{diff == null ? '—' : `${diff >= 0 ? '+' : '-'}${money(Math.abs(diff))}`}</span>
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Detalle / cuadre del turno seleccionado */}
                    <div className="lg:col-span-3">
                        {!selId ? (
                            <div className="h-full flex items-center justify-center text-neutral-400 py-10 border border-dashed border-neutral-200 dark:border-neutral-700 rounded-md">
                                Selecciona un turno para ver su cuadre.
                            </div>
                        ) : detailLoading || !detail ? (
                            <LoadingSkeleton variant="form" rows={6} />
                        ) : (
                            <div id="cuadre-print">
                                <div className="flex items-center justify-between rounded-md bg-blue-600 text-white px-4 py-2 mb-3">
                                    <span className="font-semibold">{new Date(detail.session.openedAt).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                    <span className="text-sm font-bold">Cuadre del turno</span>
                                    <span className="text-xs opacity-90">{cajaName || ''}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
                                    <div className="border border-neutral-200 dark:border-neutral-700 rounded px-2 py-1"><b>Cajero:</b> {cajero(detail.session)}</div>
                                    <div className="border border-neutral-200 dark:border-neutral-700 rounded px-2 py-1"><b>Turno #:</b> {detail.session.id.slice(0, 8)}</div>
                                    <div className="border border-neutral-200 dark:border-neutral-700 rounded px-2 py-1"><b>Estado:</b> {detail.session.status === 'OPEN' ? 'Abierto' : 'Cerrado'}</div>
                                </div>

                                <div className="border border-neutral-200 dark:border-neutral-700 rounded-md overflow-hidden">
                                    <div className="grid grid-cols-12 bg-neutral-100 dark:bg-neutral-700/50 text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                                        <div className="col-span-5 px-3 py-2">Método</div>
                                        <div className="col-span-3 px-3 py-2 text-right">Datos Caja POS</div>
                                        <div className="col-span-2 px-2 py-2 text-right">Conteo</div>
                                        <div className="col-span-2 px-3 py-2 text-right">Diferencia</div>
                                    </div>
                                    <div className="divide-y divide-neutral-100 dark:divide-neutral-700">
                                        {rows.map(r => {
                                            const d = Math.round((r.counted - r.expected) * 100) / 100;
                                            return (
                                                <div key={r.label} className="grid grid-cols-12 items-center">
                                                    <div className={`col-span-5 px-3 py-1.5 ${r.cash ? 'font-semibold text-primary' : ''}`}>{r.label}</div>
                                                    <div className="col-span-3 px-3 py-1.5 text-right tabular-nums">{money(r.expected)}</div>
                                                    <div className="col-span-2 px-2 py-1.5 text-right tabular-nums">{money(r.counted)}</div>
                                                    <div className={`col-span-2 px-3 py-1.5 text-right tabular-nums ${diffColor(d)}`}>{`${d >= 0 ? '+' : '-'}${money(Math.abs(d))}`}</div>
                                                </div>
                                            );
                                        })}
                                        <div className="grid grid-cols-12 items-center bg-neutral-50 dark:bg-neutral-800/60 font-semibold">
                                            <div className="col-span-5 px-3 py-2">Total de Valores</div>
                                            <div className="col-span-3 px-3 py-2 text-right tabular-nums">{money(totalExpected)}</div>
                                            <div className="col-span-2 px-2 py-2 text-right tabular-nums">{money(totalCounted)}</div>
                                            <div className={`col-span-2 px-3 py-2 text-right tabular-nums ${diffColor(Math.round((totalCounted - totalExpected) * 100) / 100)}`}>{money(Math.abs(totalCounted - totalExpected))}</div>
                                        </div>
                                    </div>
                                    <div className="px-3 py-2 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/40 text-xs text-neutral-600 dark:text-neutral-300 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1">
                                        <span className="flex justify-between"><span>Fondo inicial</span><span>{money(detail.totals.openingFloat)}</span></span>
                                        <span className="flex justify-between"><span>+ Ventas efectivo</span><span>{money(detail.totals.cashSales)}</span></span>
                                        <span className="flex justify-between"><span>+ Entradas</span><span>{money(detail.totals.cashIn)}</span></span>
                                        <span className="flex justify-between"><span>− Payouts</span><span>{money(detail.totals.payouts)}</span></span>
                                        <span className="flex justify-between"><span>− Devoluciones</span><span>{money(detail.totals.cashRefunds)}</span></span>
                                        <span className="flex justify-between font-semibold text-neutral-800 dark:text-neutral-100"><span>= Efectivo esperado</span><span>{money(detail.totals.expectedCash)}</span></span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2 mt-3 text-sm">
                                    <div className="border border-neutral-200 dark:border-neutral-700 rounded px-3 py-2"><div className="text-xs text-neutral-500">Transacciones</div><b>{detail.totals.salesCount}</b></div>
                                    <div className="border border-neutral-200 dark:border-neutral-700 rounded px-3 py-2"><div className="text-xs text-neutral-500">Devoluciones</div><b className="text-red-600 dark:text-red-400">{detail.totals.returnsCount}</b></div>
                                    <div className="border border-neutral-200 dark:border-neutral-700 rounded px-3 py-2"><div className="text-xs text-neutral-500">Ventas totales</div><b>{money(detail.totals.totalSales)}</b></div>
                                </div>
                                {detail.session.closingNotes && <p className="text-xs text-neutral-500 mt-2">Nota de cierre: {detail.session.closingNotes}</p>}

                                <div className="flex justify-end mt-3">
                                    <button onClick={() => window.print()} className="px-4 py-2 rounded-md bg-yellow-400 hover:bg-yellow-500 text-neutral-800 font-semibold text-sm">🖨️ Imprimir</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </Modal>
    );
};
