import React, { useEffect, useState } from 'react';
import { Modal } from '../Modal';
import { cajaReportsService } from '../../services/reports';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import { toast } from '../../hooks/useToast';

interface DailyCloseModalProps {
    isOpen: boolean;
    onClose: () => void;
    cajaId: string;
}

const money = (n: number) => `$${(Number(n) || 0).toFixed(2)}`;

type DailyData = Awaited<ReturnType<typeof cajaReportsService.dailyClose>>;

const Stat: React.FC<{ label: string; value: React.ReactNode; strong?: boolean }> = ({ label, value, strong }) => (
    <div className="bg-neutral-100 dark:bg-neutral-900 rounded-lg p-3 text-center">
        <p className="text-xs text-neutral-500 dark:text-neutral-400">{label}</p>
        <p className={`${strong ? 'text-2xl font-bold' : 'text-lg font-semibold'} text-neutral-800 dark:text-neutral-100`}>{value}</p>
    </div>
);

export const DailyCloseModal: React.FC<DailyCloseModalProps> = ({ isOpen, onClose, cajaId }) => {
    const [data, setData] = useState<DailyData | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen || !cajaId) return;
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString();
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();
        setLoading(true);
        setData(null);
        cajaReportsService.dailyClose(cajaId, start, end)
            .then(setData)
            .catch(err => toast.error(err?.message || 'No se pudo cargar el cuadre diario.'))
            .finally(() => setLoading(false));
    }, [isOpen, cajaId]);

    const row = (label: string, value: string, opts?: { bold?: boolean; neg?: boolean }) => (
        <div className={`flex justify-between ${opts?.bold ? 'font-bold text-base pt-1 border-t border-neutral-200 dark:border-neutral-700' : ''}`}>
            <span className="text-neutral-600 dark:text-neutral-300">{label}</span>
            <span className={opts?.neg ? 'text-red-600 dark:text-red-400' : ''}>{value}</span>
        </div>
    );

    const t = data?.totals;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Cuadre Diario (F7)" size="lg">
            {loading ? (
                <p className="text-center text-neutral-500 py-8">Cargando cuadre…</p>
            ) : !data || !t ? (
                <p className="text-center text-neutral-500 py-8">Sin datos para hoy.</p>
            ) : (
                <div className="space-y-4">
                    <div className="text-sm text-neutral-500 dark:text-neutral-400">
                        {data.cajaName} · {new Date(data.date).toLocaleDateString()}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <Stat label="Ventas del día" value={money(t.totalSales)} strong />
                        <Stat label="Transacciones" value={t.salesCount} />
                        <Stat label="Devoluciones" value={t.returnsCount} />
                        <Stat label="Efectivo" value={money(t.cashSales)} />
                        <Stat label="Tarjeta" value={money(t.cardSales)} />
                        <Stat label="Otros" value={money(t.otherSales)} />
                    </div>

                    <div className="bg-neutral-100 dark:bg-neutral-900 rounded-lg p-4 space-y-1 text-sm">
                        <p className="font-semibold text-primary mb-1">Efectivo esperado en caja</p>
                        {row('Fondo inicial', money(t.openingFloat))}
                        {row('+ Ventas en efectivo', money(t.cashSales))}
                        {row('+ Entradas de efectivo', money(t.cashIn))}
                        {row('− Retiros / payouts', `-${money(t.payouts)}`, { neg: true })}
                        {row('− Devoluciones en efectivo', `-${money(t.cashRefunds)}`, { neg: true })}
                        {row('= Efectivo esperado', money(t.expectedCash), { bold: true })}
                        {data.currentSession && (
                            <p className="text-xs text-neutral-400 pt-1">
                                Turno abierto ahora: esperado {money(data.currentSession.expectedCash)} (fondo {money(data.currentSession.openingFloat)}).
                            </p>
                        )}
                    </div>

                    {data.byMethod.length > 0 && (
                        <div>
                            <h4 className="font-semibold text-neutral-700 dark:text-neutral-200 mb-1">Por método de pago (recibido)</h4>
                            <table className="w-full text-sm">
                                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
                                    {data.byMethod.map(m => (
                                        <tr key={m.method}>
                                            <td className="py-1.5">{m.method}</td>
                                            <td className="py-1.5 text-right text-neutral-500">{m.count}</td>
                                            <td className="py-1.5 text-right font-medium">{money(m.amount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-700">
                        <button onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>Cerrar</button>
                        <button onClick={() => window.print()} className={BUTTON_PRIMARY_SM_CLASSES}>🖨️ Imprimir</button>
                    </div>
                </div>
            )}
        </Modal>
    );
};
