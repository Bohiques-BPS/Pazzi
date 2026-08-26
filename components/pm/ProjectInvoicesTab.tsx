import React, { useEffect, useState } from 'react';
import { salesService } from '../../services/sales';
import { useTranslation } from '../../contexts/GlobalSettingsContext';
import { LoadingSkeleton } from '../ui/LoadingSkeleton';

const money = (n: number) => `$${(Number(n) || 0).toFixed(2)}`;

interface ProjectSale {
    id: string;
    saleNumber?: number | null;
    date?: string;
    totalAmount: number;
    paymentStatus?: string | null;
    cashierName?: string | null;
    employee?: { name?: string; lastName?: string } | null;
    client?: { name?: string; lastName?: string } | null;
}

const statusCls = (s?: string | null) => {
    const v = (s || '').toLowerCase();
    if (v.includes('pagad')) return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300';
    if (v.includes('pendiente') || v.includes('cr')) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
    if (v.includes('anulad')) return 'bg-neutral-200 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-300';
    return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
};

/** Lista las facturas/ventas asignadas a un proyecto (pestaña "Facturación" del proyecto). */
export const ProjectInvoicesTab: React.FC<{ projectId: string }> = ({ projectId }) => {
    const { t } = useTranslation();
    const [sales, setSales] = useState<ProjectSale[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let alive = true;
        setLoading(true); setError(null);
        salesService.getAll({ projectId } as any)
            .then(data => { if (alive) setSales(Array.isArray(data) ? data : []); })
            .catch(() => { if (alive) setError(t('pm2x.project.invoices_error')); })
            .finally(() => { if (alive) setLoading(false); });
        return () => { alive = false; };
    }, [projectId, t]);

    if (loading) return <LoadingSkeleton variant="table" rows={4} />;
    if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;

    const active = sales.filter(s => !(s.paymentStatus || '').toLowerCase().includes('anulad'));
    const total = active.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
    const paid = active.filter(s => (s.paymentStatus || '').toLowerCase().includes('pagad')).reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
    const pending = total - paid;

    if (sales.length === 0) {
        return <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('pm2x.project.invoices_empty')}</p>;
    }

    return (
        <div className="space-y-4">
            {/* Resumen */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-neutral-50 dark:bg-neutral-700/50 rounded-lg p-3">
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{t('pm2x.project.invoices_total')}</p>
                    <p className="text-lg font-bold text-neutral-800 dark:text-neutral-100 tabular-nums">{money(total)}</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                    <p className="text-xs text-green-700 dark:text-green-300">{t('pm2x.project.invoices_paid')}</p>
                    <p className="text-lg font-bold text-green-700 dark:text-green-300 tabular-nums">{money(paid)}</p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
                    <p className="text-xs text-amber-700 dark:text-amber-300">{t('pm2x.project.invoices_pending')}</p>
                    <p className="text-lg font-bold text-amber-700 dark:text-amber-300 tabular-nums">{money(pending)}</p>
                </div>
            </div>

            {/* Tabla */}
            <div className="overflow-x-auto border border-neutral-200 dark:border-neutral-700 rounded-lg">
                <table className="w-full text-sm">
                    <thead className="bg-neutral-50 dark:bg-neutral-700/50 text-left text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                        <tr>
                            <th className="px-3 py-2">#</th>
                            <th className="px-3 py-2">{t('common.date')}</th>
                            <th className="px-3 py-2">{t('posx.invoices.cashier_label')}</th>
                            <th className="px-3 py-2 text-center">{t('common.status')}</th>
                            <th className="px-3 py-2 text-right">{t('common.total')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
                        {sales.map(s => {
                            const cashier = s.cashierName || (s.employee ? `${s.employee.name || ''} ${s.employee.lastName || ''}`.trim() : '—');
                            return (
                                <tr key={s.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/40">
                                    <td className="px-3 py-2 font-semibold text-neutral-700 dark:text-neutral-200">{s.saleNumber ? `#${s.saleNumber}` : '—'}</td>
                                    <td className="px-3 py-2 text-neutral-600 dark:text-neutral-300 whitespace-nowrap">{s.date ? new Date(s.date).toLocaleDateString() : '—'}</td>
                                    <td className="px-3 py-2 text-neutral-600 dark:text-neutral-300">{cashier || '—'}</td>
                                    <td className="px-3 py-2 text-center"><span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${statusCls(s.paymentStatus)}`}>{s.paymentStatus || '—'}</span></td>
                                    <td className="px-3 py-2 text-right font-medium tabular-nums text-neutral-800 dark:text-neutral-100">{money(s.totalAmount)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
