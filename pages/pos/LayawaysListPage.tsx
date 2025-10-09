import React, { useState, useMemo } from 'react';
import { Layaway, LayawayStatus } from '../../types';
import { useData } from '../../contexts/DataContext';
import { DataTable, TableColumn } from '../../components/DataTable';
import { RecordLayawayPaymentModal } from '../../components/forms/RecordLayawayPaymentModal';
import { ConfirmationModal } from '../../components/Modal';
import { BanknotesIcon, TrashIconMini } from '../../components/icons';

export const LayawaysListPage: React.FC = () => {
    const { layaways, getClientById, salePayments, setLayaways } = useData();

    const [paymentModalLayaway, setPaymentModalLayaway] = useState<Layaway | null>(null);
    const [cancelConfirmLayaway, setCancelConfirmLayaway] = useState<Layaway | null>(null);
    const [completeConfirmLayaway, setCompleteConfirmLayaway] = useState<Layaway | null>(null);

    const layawayData = useMemo(() => {
        return layaways.map(layaway => {
            const payments = salePayments.filter(p => p.layawayId === layaway.id);
            const amountPaid = payments.reduce((sum, p) => sum + p.amountPaid, 0);
            const balance = layaway.totalAmount - amountPaid;
            const client = getClientById(layaway.clientId);
            return {
                ...layaway,
                amountPaid,
                balance,
                clientName: client ? `${client.name} ${client.lastName}` : 'N/A'
            };
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [layaways, salePayments, getClientById]);

    const handleOpenPaymentModal = (layaway: Layaway) => {
        setPaymentModalLayaway(layaway);
    };

    const handleOpenCancelModal = (layaway: Layaway) => {
        setCancelConfirmLayaway(layaway);
    };

    const handleOpenCompleteModal = (layaway: Layaway) => {
        setCompleteConfirmLayaway(layaway);
    };

    const confirmCancellation = () => {
        if (!cancelConfirmLayaway) return;
        setLayaways(prev => prev.map(l => l.id === cancelConfirmLayaway.id ? { ...l, status: LayawayStatus.CANCELADO } : l));
        // Note: Stock is not automatically returned. This would be a more complex feature.
        alert(`Apartado #${cancelConfirmLayaway.id.slice(-6)} cancelado. El stock NO ha sido devuelto automáticamente.`);
        setCancelConfirmLayaway(null);
    };
    
    const confirmCompletion = () => {
        if (!completeConfirmLayaway) return;
        setLayaways(prev => prev.map(l => l.id === completeConfirmLayaway.id ? { ...l, status: LayawayStatus.COMPLETADO } : l));
        alert(`Apartado #${completeConfirmLayaway.id.slice(-6)} marcado como completado y entregado.`);
        setCompleteConfirmLayaway(null);
    };


    const columns: TableColumn<(typeof layawayData)[0]>[] = [
        { header: 'ID Apartado', accessor: (l) => l.id.slice(-8).toUpperCase() },
        { header: 'Fecha', accessor: (l) => new Date(l.date).toLocaleDateString() },
        { header: 'Cliente', accessor: 'clientName' },
        { header: 'Total', accessor: (l) => `$${l.totalAmount.toFixed(2)}` },
        { header: 'Pagado', accessor: (l) => `$${l.amountPaid.toFixed(2)}` },
        { header: 'Balance', accessor: (l) => <span className="font-semibold text-red-600 dark:text-red-400">${l.balance.toFixed(2)}</span> },
        {
            header: 'Estado',
            accessor: (l) => (
                 <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    l.status === LayawayStatus.ACTIVO ? 'bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-100' :
                    l.status === LayawayStatus.COMPLETADO ? 'bg-blue-100 text-blue-700 dark:bg-blue-700 dark:text-blue-100' :
                    'bg-red-100 text-red-700 dark:bg-red-600 dark:text-red-100'
                }`}>{l.status}</span>
            )
        },
    ];

    return (
        <div>
            <h1 className="text-2xl font-semibold text-neutral-700 dark:text-neutral-200 mb-6">
                Gestión de Apartados (Layaway)
            </h1>
            <DataTable<(typeof layawayData)[0]>
                data={layawayData}
                columns={columns}
                actions={(layaway) => (
                    <div className="flex space-x-1">
                        <button
                            onClick={() => handleOpenPaymentModal(layaway)}
                            className="text-green-500 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 p-1 disabled:opacity-40 disabled:cursor-not-allowed"
                            title="Registrar Abono"
                            disabled={layaway.status !== LayawayStatus.ACTIVO}
                        >
                            <BanknotesIcon className="w-4 h-4" />
                        </button>
                        {layaway.balance <= 0 && layaway.status === LayawayStatus.ACTIVO && (
                             <button
                                onClick={() => handleOpenCompleteModal(layaway)}
                                className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 p-1"
                                title="Marcar como Completado/Entregado"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            </button>
                        )}
                        <button
                            onClick={() => handleOpenCancelModal(layaway)}
                            className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1 disabled:opacity-40 disabled:cursor-not-allowed"
                            title="Cancelar Apartado"
                            disabled={layaway.status !== LayawayStatus.ACTIVO}
                        >
                            <TrashIconMini className="w-4 h-4" />
                        </button>
                    </div>
                )}
            />
            
            <RecordLayawayPaymentModal
                isOpen={!!paymentModalLayaway}
                onClose={() => setPaymentModalLayaway(null)}
                layaway={paymentModalLayaway}
            />

            {cancelConfirmLayaway && (
                 <ConfirmationModal
                    isOpen={!!cancelConfirmLayaway}
                    onClose={() => setCancelConfirmLayaway(null)}
                    onConfirm={confirmCancellation}
                    title="Confirmar Cancelación de Apartado"
                    message={`¿Está seguro de que desea cancelar el apartado #${cancelConfirmLayaway.id.slice(-6)}? El stock NO será devuelto automáticamente.`}
                    confirmButtonText="Sí, Cancelar"
                />
            )}
            {completeConfirmLayaway && (
                <ConfirmationModal
                    isOpen={!!completeConfirmLayaway}
                    onClose={() => setCompleteConfirmLayaway(null)}
                    onConfirm={confirmCompletion}
                    title="Confirmar Completado"
                    message={`¿Marcar el apartado #${completeConfirmLayaway.id.slice(-6)} como completado y entregado?`}
                    confirmButtonText="Sí, Completar"
                />
            )}
        </div>
    );
};
