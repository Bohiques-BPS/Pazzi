
import React, { useMemo, useState } from 'react';
import { Modal } from '../Modal';
import { Client, Sale } from '../../types';
import { useData } from '../../contexts/DataContext';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import { BanknotesIcon } from '../icons';
import { RecordSalePaymentModal } from '../forms/RecordSalePaymentModal';
import { AdminAuthModal } from './AdminAuthModal';

interface ClientPendingInvoicesModalProps {
    isOpen: boolean;
    onClose: () => void;
    client: Client | null;
}

export const ClientPendingInvoicesModal: React.FC<ClientPendingInvoicesModalProps> = ({ isOpen, onClose, client }) => {
    const { sales, salePayments, addSalePayment } = useData();
    const [saleToPay, setSaleToPay] = useState<(Sale & { balance: number }) | null>(null);
    
    // Auth States
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [pendingAuthSale, setPendingAuthSale] = useState<(Sale & { balance: number }) | null>(null);

    const pendingSales = useMemo(() => {
        if (!client) return [];
        
        return sales
            .filter(s => s.clientId === client.id && s.paymentStatus !== 'Anulado' && !s.isReturn)
            .map(sale => {
                const payments = salePayments.filter(p => p.saleId === sale.id);
                const paid = payments.reduce((sum, p) => sum + p.amountPaid, 0);
                const balance = sale.totalAmount - paid;
                return { ...sale, balance };
            })
            .filter(s => s.balance > 0.01)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [client, sales, salePayments]);

    const totalDebt = pendingSales.reduce((acc, s) => acc + s.balance, 0);

    const handleInitiatePayment = (sale: Sale & { balance: number }) => {
        setPendingAuthSale(sale);
        setShowAuthModal(true);
    };

    const handleAuthSuccess = () => {
        if (pendingAuthSale) {
            setSaleToPay(pendingAuthSale);
            setPendingAuthSale(null);
        }
    };

    const handlePaymentConfirm = (saleId: string, amount: number, method: string, notes: string, attachment?: string) => {
        addSalePayment({
            saleId,
            amountPaid: amount,
            paymentMethodUsed: method,
            paymentDate: new Date().toISOString(),
            notes: `Abono POS. ${notes}`.trim(),
            attachment: attachment
        });
        // Note: We don't close the main modal so the user can see the list update or pay another one
    };

    if (!client) return null;

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title={`Cuentas por Cobrar: ${client.name} ${client.lastName}`} size="xl">
                <div className="space-y-4">
                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-100 dark:border-red-800 flex justify-between items-center">
                        <span className="text-neutral-700 dark:text-neutral-200 font-medium">Deuda Total Pendiente:</span>
                        <span className="text-2xl font-bold text-red-600 dark:text-red-400">${totalDebt.toFixed(2)}</span>
                    </div>

                    {pendingSales.length > 0 ? (
                        <div className="overflow-x-auto max-h-[60vh]">
                            <table className="min-w-full text-sm">
                                <thead className="bg-neutral-100 dark:bg-neutral-700 sticky top-0">
                                    <tr>
                                        <th className="px-4 py-2 text-left font-medium text-neutral-600 dark:text-neutral-300">Venta</th>
                                        <th className="px-4 py-2 text-left font-medium text-neutral-600 dark:text-neutral-300">Fecha</th>
                                        <th className="px-4 py-2 text-right font-medium text-neutral-600 dark:text-neutral-300">Total</th>
                                        <th className="px-4 py-2 text-right font-medium text-neutral-600 dark:text-neutral-300">Balance</th>
                                        <th className="px-4 py-2 text-center font-medium text-neutral-600 dark:text-neutral-300">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                                    {pendingSales.map(sale => (
                                        <tr key={sale.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                                            <td className="px-4 py-3 font-mono">{sale.id.substring(0,8).toUpperCase()}</td>
                                            <td className="px-4 py-3">{new Date(sale.date).toLocaleDateString()}</td>
                                            <td className="px-4 py-3 text-right">${sale.totalAmount.toFixed(2)}</td>
                                            <td className="px-4 py-3 text-right font-bold text-red-500">${sale.balance.toFixed(2)}</td>
                                            <td className="px-4 py-3 text-center">
                                                <button 
                                                    onClick={() => handleInitiatePayment(sale)}
                                                    className={`${BUTTON_PRIMARY_SM_CLASSES} !py-1 !px-2 !text-xs flex items-center mx-auto bg-green-600 hover:bg-green-700`}
                                                >
                                                    <BanknotesIcon className="w-3 h-3 mr-1" /> Abonar
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-center text-neutral-500 py-8">El cliente no tiene facturas pendientes de pago.</p>
                    )}

                    <div className="flex justify-end pt-4 border-t dark:border-neutral-700">
                        <button onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>Cerrar</button>
                    </div>
                </div>
            </Modal>

            <AdminAuthModal 
                isOpen={showAuthModal} 
                onClose={() => setShowAuthModal(false)} 
                onConfirm={handleAuthSuccess}
            />

            <RecordSalePaymentModal 
                isOpen={!!saleToPay} 
                onClose={() => setSaleToPay(null)} 
                sale={saleToPay} 
                onConfirm={handlePaymentConfirm}
            />
        </>
    );
};
