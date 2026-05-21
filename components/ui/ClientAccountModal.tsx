import React, { useEffect, useState } from 'react';
import { Modal } from '../Modal';
import { Client } from '../../types';
import { clientsService, type ClientSummary } from '../../services/clients';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';
import { LoadingSkeleton } from './LoadingSkeleton';
import { EmptyState } from './EmptyState';

interface ClientAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    client: Client | null;
}

const SummaryCard: React.FC<{ label: string; value: string; tone?: 'default' | 'positive' | 'negative' }> = ({ label, value, tone = 'default' }) => (
    <div className="p-3 rounded-md border border-neutral-200 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-700/50">
        <div className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{label}</div>
        <div className={`text-lg font-bold ${
            tone === 'positive' ? 'text-green-600 dark:text-green-400' :
            tone === 'negative' ? 'text-red-600 dark:text-red-400' :
            'text-neutral-800 dark:text-neutral-100'
        }`}>
            {value}
        </div>
    </div>
);

const overdueStyle = (days: number) => {
    if (days <= 0) return 'text-neutral-500';
    if (days < 30) return 'text-amber-600 dark:text-amber-400';
    if (days < 60) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400 font-bold';
};

export const ClientAccountModal: React.FC<ClientAccountModalProps> = ({ isOpen, onClose, client }) => {
    const [data, setData] = useState<ClientSummary | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen || !client) return;
        let cancelled = false;
        setLoading(true);
        clientsService.getSummary(client.id, { period: 90 })
            .then(res => { if (!cancelled) setData(res); })
            .catch(err => {
                if (cancelled) return;
                if (err instanceof ApiError) toast.error(err.message);
            })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [isOpen, client]);

    if (!isOpen || !client) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Estado de cuenta — ${client.name} ${client.lastName || ''}`} size="4xl">
            {loading && <LoadingSkeleton variant="form" rows={6} />}

            {!loading && data && (
                <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-2">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <SummaryCard label="Total facturado" value={`$${data.summary.totalRevenue.toFixed(2)}`} />
                        <SummaryCard label="Total pagado" value={`$${data.summary.totalPaid.toFixed(2)}`} tone="positive" />
                        <SummaryCard
                            label="Balance pendiente"
                            value={`$${data.summary.totalBalance.toFixed(2)}`}
                            tone={data.summary.totalBalance > 0 ? 'negative' : 'positive'}
                        />
                        <SummaryCard label="Ventas" value={data.summary.totalSalesCount.toString()} />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <SummaryCard label="Cotizaciones" value={data.summary.totalEstimates.toString()} />
                        <SummaryCard label="Apartados" value={data.summary.totalLayaways.toString()} />
                        <SummaryCard label="Proyectos" value={data.summary.totalProjects.toString()} />
                        <SummaryCard
                            label="C×C pendientes"
                            value={`${data.summary.accountsReceivableCount} ($${data.summary.accountsReceivableTotal.toFixed(2)})`}
                            tone={data.summary.accountsReceivableCount > 0 ? 'negative' : 'default'}
                        />
                    </div>

                    <section>
                        <h3 className="text-md font-semibold text-primary border-b dark:border-neutral-600 mb-2">
                            Cuentas por cobrar ({data.accountsReceivable.length})
                        </h3>
                        {data.accountsReceivable.length === 0 ? (
                            <p className="text-sm text-neutral-500 py-2">Sin saldos pendientes.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-neutral-100 dark:bg-neutral-700/50">
                                        <tr>
                                            <th className="text-left p-2">Venta</th>
                                            <th className="text-left p-2">Fecha</th>
                                            <th className="text-right p-2">Total</th>
                                            <th className="text-right p-2">Pagado</th>
                                            <th className="text-right p-2">Saldo</th>
                                            <th className="text-left p-2">Vence</th>
                                            <th className="text-center p-2">Días vencido</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                                        {data.accountsReceivable.map(r => (
                                            <tr key={r.saleId}>
                                                <td className="p-2 font-mono text-xs">#{r.saleId.slice(-6).toUpperCase()}</td>
                                                <td className="p-2">{new Date(r.saleDate).toLocaleDateString()}</td>
                                                <td className="p-2 text-right">${r.totalAmount.toFixed(2)}</td>
                                                <td className="p-2 text-right">${r.paid.toFixed(2)}</td>
                                                <td className="p-2 text-right font-bold text-red-600 dark:text-red-400">${r.balance.toFixed(2)}</td>
                                                <td className="p-2">{r.dueDate ? new Date(r.dueDate).toLocaleDateString() : '—'}</td>
                                                <td className={`p-2 text-center ${overdueStyle(r.daysOverdue)}`}>
                                                    {r.daysOverdue > 0 ? r.daysOverdue : '—'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>

                    {data.topProducts.length > 0 && (
                        <section>
                            <h3 className="text-md font-semibold text-primary border-b dark:border-neutral-600 mb-2">
                                Productos más comprados
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {data.topProducts.map(p => (
                                    <div key={p.productId} className="p-2 border border-neutral-200 dark:border-neutral-600 rounded text-sm flex justify-between">
                                        <span className="truncate">{p.name}</span>
                                        <span className="font-bold text-primary">{p.totalQuantity}u</span>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {data.projects.length > 0 && (
                        <section>
                            <h3 className="text-md font-semibold text-primary border-b dark:border-neutral-600 mb-2">
                                Proyectos ({data.projects.length})
                            </h3>
                            <ul className="space-y-1 text-sm">
                                {data.projects.map(p => (
                                    <li key={p.id} className="flex justify-between p-2 bg-neutral-50 dark:bg-neutral-700/30 rounded">
                                        <span>{p.name}</span>
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-700">{p.status}</span>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}

                    <section>
                        <h3 className="text-md font-semibold text-primary border-b dark:border-neutral-600 mb-2">
                            Ventas recientes (últimos {data.summary.periodDays} días, {data.recentSales.length})
                        </h3>
                        {data.recentSales.length === 0 ? (
                            <p className="text-sm text-neutral-500 py-2">Sin ventas en el período.</p>
                        ) : (
                            <div className="space-y-1 text-sm">
                                {data.recentSales.map(s => (
                                    <details key={s.id} className="p-2 bg-neutral-50 dark:bg-neutral-700/30 rounded">
                                        <summary className="cursor-pointer flex justify-between items-center">
                                            <span>
                                                <span className="font-mono text-xs mr-2">#{s.id.slice(-6).toUpperCase()}</span>
                                                {new Date(s.date).toLocaleDateString()} — {s.paymentMethod}
                                            </span>
                                            <span className={`font-bold ${s.isReturn ? 'text-orange-600' : 'text-primary'}`}>
                                                {s.isReturn ? '−' : ''}${s.totalAmount.toFixed(2)}
                                            </span>
                                        </summary>
                                        <ul className="mt-2 pl-4 text-xs text-neutral-500 space-y-0.5">
                                            {s.items.map(it => (
                                                <li key={it.id}>
                                                    {it.product?.name || 'Producto'} × {it.quantity} — ${it.unitPrice.toFixed(2)}
                                                </li>
                                            ))}
                                        </ul>
                                    </details>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            )}

            {!loading && !data && (
                <EmptyState title="Sin datos del cliente" description="No se pudo cargar el resumen del cliente." />
            )}
        </Modal>
    );
};
