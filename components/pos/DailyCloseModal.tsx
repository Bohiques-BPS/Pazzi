import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from '../Modal';
import { cajasService, type CajaSession, type SessionTotals } from '../../services/cajas';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';
import { LoadingSkeleton } from '../ui/LoadingSkeleton';

interface DailyCloseModalProps {
    isOpen: boolean;
    onClose: () => void;
    cajaId: string;
    cajaName?: string;
    /** Umbral (valor absoluto) de diferencia de efectivo que exige confirmación. */
    differenceThreshold?: number;
    /** Se llama al cerrar el turno con éxito (para que el POS resetee/navegue). */
    onClosed?: () => void;
    /** Abre el historial de turnos (para revisar/reimprimir turnos ya cerrados). */
    onOpenHistory?: () => void;
}

const money = (n: number | null | undefined) => `$${(Number(n) || 0).toFixed(2)}`;
const isCash = (m: string) => /efectivo|cash/i.test(m);
// Métodos que NO son dinero físico/electrónico a contar (crédito de cliente, factura pendiente):
// se muestran en el desglose como informativos, pero no se cuentan ni entran al total contado.
const isNonCountable = (m: string) => /cr[ée]dito|credit|factura|invoice/i.test(m);

/** Fila del cuadre: método, esperado por el POS, contado por el cajero. */
interface CuadreRow {
    key: string;
    label: string;
    expected: number;
    cash: boolean;
    countable: boolean;
}

export const DailyCloseModal: React.FC<DailyCloseModalProps> = ({
    isOpen,
    onClose,
    cajaId,
    cajaName,
    differenceThreshold = 5,
    onClosed,
    onOpenHistory,
}) => {
    const [loading, setLoading] = useState(true);
    const [session, setSession] = useState<CajaSession | null>(null);
    const [totals, setTotals] = useState<SessionTotals | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [counted, setCounted] = useState<Record<string, string>>({});
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [confirmHighDiff, setConfirmHighDiff] = useState(false);

    useEffect(() => {
        if (!isOpen || !cajaId) return;
        let cancelled = false;
        setLoading(true);
        setError(null);
        setSession(null);
        setTotals(null);
        setCounted({});
        setNotes('');
        setConfirmHighDiff(false);
        cajasService.getCurrentSession(cajaId)
            .then(({ session, totals }) => {
                if (cancelled) return;
                if (!session || !totals) { setError('Esta caja no tiene un turno abierto.'); return; }
                setSession(session);
                setTotals(totals);
            })
            .catch(err => { if (!cancelled) setError(err instanceof ApiError ? err.message : 'No se pudo cargar el cuadre.'); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [isOpen, cajaId]);

    // Filas del cuadre: Efectivo (gaveta, esperado = efectivo esperado) + cada método electrónico.
    const rows: CuadreRow[] = useMemo(() => {
        if (!totals) return [];
        const others = totals.byMethod.filter(m => !isCash(m.method));
        // Contables primero (tarjeta/ATH/cheque), luego los informativos (crédito/factura) al final.
        const sorted = [...others].sort((a, b) => Number(isNonCountable(a.method)) - Number(isNonCountable(b.method)));
        return [
            { key: '__cash__', label: 'Efectivo (gaveta)', expected: totals.expectedCash, cash: true, countable: true },
            ...sorted.map(m => ({ key: m.method, label: m.method, expected: m.amount, cash: false, countable: !isNonCountable(m.method) })),
        ];
    }, [totals]);

    const num = (v: string | undefined) => {
        const n = parseFloat(v ?? '');
        return isNaN(n) ? 0 : n;
    };

    const cashCounted = num(counted['__cash__']);
    const cashExpected = totals?.expectedCash ?? 0;
    const cashDiff = Math.round((cashCounted - cashExpected) * 100) / 100;
    const isHighDiff = Math.abs(cashDiff) >= differenceThreshold;
    const cashEntered = (counted['__cash__'] ?? '') !== '';

    // El total contable excluye las filas informativas (crédito/factura): no se cuenta ese dinero.
    const totalExpected = rows.filter(r => r.countable).reduce((s, r) => s + r.expected, 0);
    const totalCounted = rows.filter(r => r.countable).reduce((s, r) => s + num(counted[r.key]), 0);

    const handleClose = async () => {
        if (!session || !totals) return;
        if (!cashEntered || cashCounted < 0) { setError('Ingresa el efectivo contado en la gaveta.'); return; }
        if (isHighDiff && !confirmHighDiff) {
            setError(`Hay una diferencia de efectivo de ${money(Math.abs(cashDiff))}. Marca la confirmación para cerrar de todos modos.`);
            return;
        }
        // Conteo por método para el registro/cuadre.
        const countedByMethod: Record<string, number> = { Efectivo: cashCounted };
        for (const r of rows) {
            if (r.cash || !r.countable) continue; // crédito/factura no se cuentan
            countedByMethod[r.label] = num(counted[r.key]);
        }
        setSubmitting(true);
        setError(null);
        try {
            await cajasService.closeSession(cajaId, {
                countedCash: cashCounted,
                countedByMethod,
                closingNotes: notes.trim() || undefined,
                forceWithDifference: isHighDiff,
            });
            toast.success(cashDiff === 0 ? 'Turno cerrado sin diferencia ✓' : `Turno cerrado con diferencia de ${money(Math.abs(cashDiff))}`);
            onClosed?.();
            onClose();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Error al cerrar el turno.');
        } finally {
            setSubmitting(false);
        }
    };

    const openedAt = session ? new Date(session.openedAt) : null;
    // Cajero: el que realmente hizo las ventas del turno; si no hubo ventas, quien abrió el turno.
    const cajero = totals?.cashierName
        || (session?.openedByUser ? `${session.openedByUser.name} ${session.openedByUser.lastName || ''}`.trim() : '—');

    const diffColor = (d: number) => d === 0 ? 'text-neutral-500' : d > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Cuadre de tienda diario (F7)" size="5xl">
            {loading ? (
                <LoadingSkeleton variant="form" rows={6} />
            ) : error && !session ? (
                <p className="text-center text-neutral-500 py-8">{error}</p>
            ) : !totals || !session ? (
                <p className="text-center text-neutral-500 py-8">Sin datos.</p>
            ) : (
                <div className="text-sm">
                    {/* Barra superior estilo legacy */}
                    <div className="flex items-center justify-between rounded-md bg-blue-600 text-white px-4 py-2 mb-3">
                        <span className="font-semibold">{openedAt?.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                        <span className="text-lg font-bold">Cuadre de tienda diario</span>
                        <span className="text-xs opacity-90">{cajaName || ''}</span>
                    </div>

                    {/* Aviso: este turno no tiene ventas (probablemente están en un turno anterior ya cerrado). */}
                    {totals.salesCount === 0 && totals.returnsCount === 0 && (
                        <div className="mb-3 flex items-center justify-between gap-3 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
                            <span>Este turno aún no tiene ventas. Si vendiste y luego cerraste/abriste turno, esas ventas quedaron en el turno anterior.</span>
                            {onOpenHistory && <button onClick={onOpenHistory} className="whitespace-nowrap px-3 py-1.5 rounded-md bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold">Ver turnos anteriores</button>}
                        </div>
                    )}

                    {/* Fila: Fecha / Cajero / Cuadre# */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                        <Field label="Fecha" value={openedAt?.toLocaleDateString() || '—'} />
                        <Field label="Cajero" value={cajero} />
                        <Field label="Turno #" value={session.id.slice(0, 8)} />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                        {/* Columnas POS vs conteo (2/3) */}
                        <div className="lg:col-span-2 border border-neutral-200 dark:border-neutral-700 rounded-md overflow-hidden">
                            <div className="grid grid-cols-12 bg-neutral-100 dark:bg-neutral-700/50 text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                                <div className="col-span-5 px-3 py-2">Método</div>
                                <div className="col-span-3 px-3 py-2 text-right">Datos Caja POS</div>
                                <div className="col-span-2 px-2 py-2 text-right">Conteo</div>
                                <div className="col-span-2 px-3 py-2 text-right">Diferencia</div>
                            </div>
                            <div className="divide-y divide-neutral-100 dark:divide-neutral-700">
                                {rows.map(r => {
                                    const c = num(counted[r.key]);
                                    const entered = (counted[r.key] ?? '') !== '';
                                    const d = Math.round((c - r.expected) * 100) / 100;
                                    // Filas informativas (crédito/factura): muestran el total pero NO se cuentan.
                                    if (!r.countable) {
                                        return (
                                            <div key={r.key} className="grid grid-cols-12 items-center text-neutral-500 dark:text-neutral-400">
                                                <div className="col-span-5 px-3 py-1.5">{r.label} <span className="text-[10px] uppercase tracking-wide">(informativo)</span></div>
                                                <div className="col-span-3 px-3 py-1.5 text-right tabular-nums">{money(r.expected)}</div>
                                                <div className="col-span-2 px-2 py-1 text-right text-neutral-300 dark:text-neutral-600">—</div>
                                                <div className="col-span-2 px-3 py-1.5 text-right text-neutral-300 dark:text-neutral-600">—</div>
                                            </div>
                                        );
                                    }
                                    return (
                                        <div key={r.key} className="grid grid-cols-12 items-center">
                                            <div className={`col-span-5 px-3 py-1.5 ${r.cash ? 'font-semibold text-primary' : ''}`}>{r.label}</div>
                                            <div className="col-span-3 px-3 py-1.5 text-right tabular-nums">{money(r.expected)}</div>
                                            <div className="col-span-2 px-2 py-1 text-right">
                                                <input
                                                    type="number" min="0" step="0.01" inputMode="decimal"
                                                    value={counted[r.key] ?? ''}
                                                    onChange={e => setCounted(prev => ({ ...prev, [r.key]: e.target.value }))}
                                                    placeholder="0.00"
                                                    className="w-24 text-right px-2 py-1 rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 tabular-nums"
                                                    autoFocus={r.cash}
                                                />
                                            </div>
                                            <div className={`col-span-2 px-3 py-1.5 text-right tabular-nums ${entered ? diffColor(d) : 'text-neutral-300 dark:text-neutral-600'}`}>
                                                {entered ? `${d >= 0 ? '+' : '-'}${money(Math.abs(d))}` : '—'}
                                            </div>
                                        </div>
                                    );
                                })}
                                {/* Totales de reconciliación de gaveta (solo métodos contables). */}
                                <div className="grid grid-cols-12 items-center bg-neutral-50 dark:bg-neutral-800/60 font-semibold">
                                    <div className="col-span-5 px-3 py-2">Total de Valores</div>
                                    <div className="col-span-3 px-3 py-2 text-right tabular-nums">{money(totalExpected)}</div>
                                    <div className="col-span-2 px-2 py-2 text-right tabular-nums">{money(totalCounted)}</div>
                                    <div className={`col-span-2 px-3 py-2 text-right tabular-nums ${diffColor(Math.round((totalCounted - totalExpected) * 100) / 100)}`}>
                                        {money(Math.abs(totalCounted - totalExpected))}
                                    </div>
                                </div>
                                {/* Total de VENTAS del turno: incluye TODOS los métodos (efectivo, tarjeta,
                                    ATH, cheque Y crédito). El crédito no suma a la gaveta pero sí a las ventas. */}
                                <div className="grid grid-cols-12 items-center bg-primary/5 dark:bg-primary/10 text-primary dark:text-accent font-semibold border-t border-primary/20">
                                    <div className="col-span-7 px-3 py-2">Total de ventas del turno <span className="text-[10px] font-normal">(todos los métodos, incl. crédito)</span></div>
                                    <div className="col-span-5 px-3 py-2 text-right tabular-nums text-lg font-bold">{money(totals.totalSales)}</div>
                                </div>
                            </div>

                            {/* Desglose del efectivo esperado (Datos de la Caja POS) */}
                            <div className="px-3 py-2 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/40 text-xs text-neutral-600 dark:text-neutral-300 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1">
                                <Line label="Fondo inicial" value={money(totals.openingFloat)} />
                                <Line label="+ Ventas efectivo" value={money(totals.cashSales)} />
                                <Line label="+ Entradas" value={money(totals.cashIn)} />
                                <Line label="− Payouts" value={money(totals.payouts)} />
                                <Line label="− Devoluciones" value={money(totals.cashRefunds)} />
                                <Line label="= Efectivo esperado" value={money(totals.expectedCash)} strong />
                            </div>
                        </div>

                        {/* Panel de info (1/3) */}
                        <div className="border border-neutral-200 dark:border-neutral-700 rounded-md p-3 space-y-2 text-sm">
                            <div className="text-red-600 dark:text-red-400 font-medium">{totals.returnsCount} Devolución(es) en el turno</div>
                            <div className="text-neutral-700 dark:text-neutral-200">Transacciones: <b>{totals.salesCount}</b></div>
                            <div className="text-neutral-700 dark:text-neutral-200">Ventas totales: <b>{money(totals.totalSales)}</b></div>
                            <div className="border-t border-neutral-200 dark:border-neutral-700 pt-2">
                                <p className="text-xs font-semibold text-neutral-500 mb-1">Comentarios</p>
                                <p className="text-xs text-neutral-500">open {openedAt?.toLocaleString()}</p>
                                {session.openingNotes && <p className="text-xs text-neutral-500 mt-1">{session.openingNotes}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Diferencia de gaveta + notas */}
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className={`rounded-md px-4 py-3 flex items-center justify-between ${
                            !cashEntered ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'
                            : cashDiff === 0 ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                            : isHighDiff ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                            : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
                        }`}>
                            <span className="font-semibold">Diferencia de valores en gaveta</span>
                            <span className="text-lg font-bold tabular-nums">{cashEntered ? `${cashDiff >= 0 ? '+' : '-'}${money(Math.abs(cashDiff))}` : '—'}</span>
                        </div>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            rows={2}
                            placeholder="Notas / comentarios de cierre (opcional)"
                            className="w-full px-3 py-2 rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-sm"
                        />
                    </div>

                    {isHighDiff && cashEntered && (
                        <label className="flex items-start gap-2 mt-2 p-2 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 text-sm">
                            <input type="checkbox" checked={confirmHighDiff} onChange={e => setConfirmHighDiff(e.target.checked)} className="mt-0.5" />
                            <span className="text-red-700 dark:text-red-300">Confirmo que verifiqué el conteo y autorizo el cierre con una diferencia de <strong>{money(Math.abs(cashDiff))}</strong>.</span>
                        </label>
                    )}

                    {error && <div className="mt-2 p-2 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}

                    {/* Footer */}
                    <div className="flex flex-wrap items-center justify-end gap-2 mt-4 pt-3 border-t border-neutral-200 dark:border-neutral-700">
                        {onOpenHistory && <button onClick={onOpenHistory} className="mr-auto px-4 py-2 rounded-md bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-700 dark:hover:bg-neutral-600 text-neutral-800 dark:text-neutral-100 font-semibold text-sm">📋 Turnos anteriores</button>}
                        <button onClick={() => window.print()} className="px-4 py-2 rounded-md bg-yellow-400 hover:bg-yellow-500 text-neutral-800 font-semibold text-sm">🖨️ Imprimir</button>
                        <button onClick={onClose} className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white font-semibold text-sm">Cancelar</button>
                        <button onClick={handleClose} disabled={submitting} className="px-4 py-2 rounded-md bg-green-600 hover:bg-green-700 text-white font-semibold text-sm disabled:opacity-50">
                            {submitting ? 'Cerrando…' : 'Aceptar - Cerrar Turno'}
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    );
};

const Field: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div className="flex items-center gap-2 border border-neutral-200 dark:border-neutral-700 rounded-md px-3 py-1.5">
        <span className="text-xs font-semibold text-neutral-500">{label}:</span>
        <span className="text-sm text-neutral-800 dark:text-neutral-100 truncate">{value}</span>
    </div>
);

const Line: React.FC<{ label: string; value: string; strong?: boolean }> = ({ label, value, strong }) => (
    <div className={`flex justify-between ${strong ? 'font-semibold text-neutral-800 dark:text-neutral-100' : ''}`}>
        <span>{label}</span>
        <span className="tabular-nums">{value}</span>
    </div>
);
