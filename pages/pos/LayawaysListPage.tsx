import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DataTable, TableColumn } from '../../components/DataTable';
import { RecordLayawayPaymentModal } from '../../components/forms/RecordLayawayPaymentModal';
import { ConfirmationModal } from '../../components/Modal';
import { BanknotesIcon, TrashIconMini } from '../../components/icons';
import { useTranslation } from '../../contexts/GlobalSettingsContext';
import { layawaysService, type LayawayRecord, type LayawayStatus } from '../../services/layaways';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { PermissionGate } from '../../components/PermissionGate';

interface LayawayRow extends LayawayRecord {
    amountPaid: number;
    balance: number;
    clientName: string;
    progressPct: number;
}

export const LayawaysListPage: React.FC = () => {
    const { t } = useTranslation();
    const [layaways, setLayaways] = useState<LayawayRecord[]>([]);
    const [loading, setLoading] = useState(true);

    const [paymentModalLayaway, setPaymentModalLayaway] = useState<LayawayRecord | null>(null);
    const [cancelConfirmLayaway, setCancelConfirmLayaway] = useState<LayawayRecord | null>(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const data = await layawaysService.getAll();
            setLayaways(data);
        } catch (err) {
            if (err instanceof ApiError) toast.error(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { refresh(); }, [refresh]);

    const layawayData = useMemo<LayawayRow[]>(() => {
        return layaways
            .map(l => {
                const amountPaid = l.payments.reduce((sum, p) => sum + p.amountPaid, 0);
                const balance = Math.max(0, l.totalAmount - amountPaid);
                const clientName = l.client ? `${l.client.name} ${l.client.lastName || ''}`.trim() : 'N/A';
                const progressPct = l.totalAmount > 0 ? Math.min(100, (amountPaid / l.totalAmount) * 100) : 0;
                return { ...l, amountPaid, balance, clientName, progressPct };
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [layaways]);

    const handlePaymentRecorded = (updated: LayawayRecord) => {
        setLayaways(prev => prev.map(l => l.id === updated.id ? updated : l));
        setPaymentModalLayaway(null);
    };

    const confirmCancellation = async () => {
        if (!cancelConfirmLayaway) return;
        try {
            const updated = await layawaysService.cancel(cancelConfirmLayaway.id);
            setLayaways(prev => prev.map(l => l.id === updated.id ? updated : l));
            toast.success(t('posx.layaways.cancelled_ok'));
        } catch (err) {
            toast.error(err instanceof ApiError ? err.message : t('posx.layaways.cancel_error'));
        } finally {
            setCancelConfirmLayaway(null);
        }
    };

    const statusBadge = (s: LayawayStatus) => {
        const styles: Record<LayawayStatus, string> = {
            Activo: 'bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-100',
            Completado: 'bg-blue-100 text-blue-700 dark:bg-blue-700 dark:text-blue-100',
            Cancelado: 'bg-red-100 text-red-700 dark:bg-red-600 dark:text-red-100',
        };
        return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[s] || styles.Activo}`}>{s}</span>;
    };

    const columns: TableColumn<LayawayRow>[] = [
        { header: t('pos.layaways.col.id') || 'ID', accessor: (l) => l.id.slice(-8).toUpperCase() },
        { header: t('pos.layaways.col.date') || 'Fecha', accessor: (l) => new Date(l.date).toLocaleDateString() },
        { header: t('pos.layaways.col.client') || 'Cliente', accessor: 'clientName' },
        { header: t('pos.layaways.col.total') || 'Total', accessor: (l) => `$${l.totalAmount.toFixed(2)}`, className: 'text-right' },
        { header: t('pos.layaways.col.paid') || 'Pagado', accessor: (l) => `$${l.amountPaid.toFixed(2)}`, className: 'text-right' },
        {
            header: t('pos.layaways.col.balance') || 'Saldo',
            accessor: (l) => (
                <span className={`font-semibold ${l.balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                    ${l.balance.toFixed(2)}
                </span>
            ),
            className: 'text-right',
        },
        {
            header: t('posx.layaways.col.progress') || 'Progreso',
            accessor: (l) => (
                <div className="w-24">
                    <div className="text-xs text-neutral-500 mb-0.5">{l.progressPct.toFixed(0)}%</div>
                    <div className="w-full bg-neutral-200 dark:bg-neutral-600 rounded-full h-1.5">
                        <div
                            className={`h-1.5 rounded-full ${l.progressPct >= 100 ? 'bg-green-500' : 'bg-primary'}`}
                            style={{ width: `${l.progressPct}%` }}
                        />
                    </div>
                </div>
            ),
        },
        { header: t('posx.layaways.col.status') || 'Estado', accessor: (l) => statusBadge(l.status) },
    ];

    return (
        <div>
            <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
                <h1 className="text-2xl font-semibold text-neutral-700 dark:text-neutral-200">
                    {t('pos.layaways.title') || 'Apartados (Layaways)'}
                </h1>
            </div>

            {loading && <LoadingSkeleton variant="table" rows={6} />}

            {!loading && layawayData.length === 0 && (
                <EmptyState
                    title={t('posx.layaways.empty_title') || 'Sin apartados'}
                    description={t('posx.layaways.empty_desc') || 'Aún no hay apartados registrados. Crea uno desde la caja registradora (POS).'}
                />
            )}

            {!loading && layawayData.length > 0 && (
                <DataTable<LayawayRow> onRowClick={setPaymentModalLayaway}
                    data={layawayData}
                    columns={columns}
                    actions={(layaway) => (
                        <div className="flex space-x-1">
                            <PermissionGate require={['layaways.recordPayment', 'layaways.manage']}>
                                <button
                                    onClick={() => setPaymentModalLayaway(layaway)}
                                    className="text-green-500 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 p-1 disabled:opacity-40 disabled:cursor-not-allowed"
                                    title={t('pos.layaways.register_payment') || 'Registrar abono'}
                                    disabled={layaway.status !== 'Activo'}
                                >
                                    <BanknotesIcon className="w-4 h-4" />
                                </button>
                            </PermissionGate>
                            <PermissionGate require="layaways.manage">
                                <button
                                    onClick={() => setCancelConfirmLayaway(layaway)}
                                    className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1 disabled:opacity-40 disabled:cursor-not-allowed"
                                    title={t('pos.layaways.cancel') || 'Cancelar apartado'}
                                    disabled={layaway.status !== 'Activo'}
                                >
                                    <TrashIconMini className="w-4 h-4" />
                                </button>
                            </PermissionGate>
                        </div>
                    )}
                />
            )}

            <RecordLayawayPaymentModal
                isOpen={!!paymentModalLayaway}
                onClose={() => setPaymentModalLayaway(null)}
                layaway={paymentModalLayaway}
                onPaymentRecorded={handlePaymentRecorded}
            />

            {cancelConfirmLayaway && (
                <ConfirmationModal
                    isOpen={!!cancelConfirmLayaway}
                    onClose={() => setCancelConfirmLayaway(null)}
                    onConfirm={confirmCancellation}
                    title={t('posx.layaways.cancel_title') || 'Cancelar apartado'}
                    message={t('posx.layaways.cancel_confirm', { id: cancelConfirmLayaway.id.slice(-6).toUpperCase() }) || `¿Estás seguro de cancelar el apartado #${cancelConfirmLayaway.id.slice(-6).toUpperCase()}? Esta acción no se puede deshacer. Los pagos ya registrados quedarán pendientes de devolución manual.`}
                    confirmButtonText={t('posx.layaways.cancel_yes') || 'Sí, cancelar'}
                    cancelButtonText={t('posx.layaways.cancel_no') || 'No, mantener'}
                />
            )}
        </div>
    );
};
