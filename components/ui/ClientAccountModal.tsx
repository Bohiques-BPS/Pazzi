import React, { useMemo, useState } from 'react';
import { Modal } from '../Modal';
import { Client, Project, Sale, SalePayment, ProjectStatus } from '../../types';
import { useData } from '../../contexts/DataContext';
import { ChevronDownIcon } from '../icons';

interface ClientAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    client: Client | null;
}

interface ProjectAccountDetails {
    project: Project | { id: 'general'; name: 'Cuenta General' };
    charges: number;
    payments: number;
    balance: number;
    transactions: (Sale | SalePayment)[];
}

const TransactionRow: React.FC<{ transaction: Sale | SalePayment }> = ({ transaction }) => {
    const isSale = 'items' in transaction;
    const date = isSale ? transaction.date : transaction.paymentDate;
    const description = isSale ? `Venta POS #${transaction.id.slice(-6)}` : `Abono (${transaction.paymentMethodUsed})`;
    const amount = isSale ? transaction.totalAmount : -transaction.amountPaid;

    return (
        <tr className="border-b border-neutral-200 dark:border-neutral-700 text-xs">
            <td className="px-2 py-1.5 whitespace-nowrap">{new Date(date).toLocaleDateString()}</td>
            <td className="px-2 py-1.5">{description}</td>
            <td className={`px-2 py-1.5 text-right font-mono ${isSale ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                {isSale ? '+' : '-'}${Math.abs(amount).toFixed(2)}
            </td>
        </tr>
    );
};

export const ClientAccountModal: React.FC<ClientAccountModalProps> = ({ isOpen, onClose, client }) => {
    const { sales, salePayments, projects } = useData();
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ general: true });

    const accountData = useMemo(() => {
        if (!client) return null;

        const clientSales = sales.filter(s => s.clientId === client.id);
        const clientProjects = projects.filter(p => p.clientId === client.id);
        const allClientSaleIds = clientSales.map(s => s.id);
        const allClientPayments = salePayments.filter(p => allClientSaleIds.includes(p.saleId));
        
        const projectBreakdowns: ProjectAccountDetails[] = clientProjects.map(project => {
            const projectSales = clientSales.filter(s => s.projectId === project.id);
            const projectSaleIds = projectSales.map(s => s.id);
            const projectPayments = allClientPayments.filter(p => projectSaleIds.includes(p.saleId));
            
            const charges = projectSales.reduce((sum, s) => sum + s.totalAmount, 0);
            const payments = projectPayments.reduce((sum, p) => sum + p.amountPaid, 0);
            const balance = charges - payments;
            
            const transactions = [...projectSales, ...projectPayments].sort((a, b) => 
                new Date('items' in a ? a.date : a.paymentDate).getTime() - new Date('items' in b ? b.date : b.paymentDate).getTime()
            );

            return { project, charges, payments, balance, transactions };
        });

        const generalSales = clientSales.filter(s => !s.projectId);
        const generalSaleIds = generalSales.map(s => s.id);
        const generalPayments = allClientPayments.filter(p => generalSaleIds.includes(p.saleId));
        const generalCharges = generalSales.reduce((sum, s) => sum + s.totalAmount, 0);
        const generalPaymentsTotal = generalPayments.reduce((sum, p) => sum + p.amountPaid, 0);
        const generalBalance = generalCharges - generalPaymentsTotal;
        const generalTransactions = [...generalSales, ...generalPayments].sort((a, b) => 
            new Date('items' in a ? a.date : a.paymentDate).getTime() - new Date('items' in b ? b.date : b.paymentDate).getTime()
        );

        const generalBreakdown: ProjectAccountDetails = {
            project: { id: 'general', name: 'Cuenta General' },
            charges: generalCharges,
            payments: generalPaymentsTotal,
            balance: generalBalance,
            transactions: generalTransactions
        };
        
        const grandTotalBalance = projectBreakdowns.reduce((sum, p) => sum + p.balance, 0) + generalBalance;

        return { projectBreakdowns, generalBreakdown, grandTotalBalance };
    }, [client, sales, salePayments, projects]);

    const toggleExpand = (sectionId: string) => {
        setExpandedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
    };

    if (!isOpen || !client || !accountData) return null;

    const { projectBreakdowns, generalBreakdown, grandTotalBalance } = accountData;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Estado de Cuenta: ${client.name} ${client.lastName}`} size="4xl">
            <div className="space-y-4 max-h-[70vh] flex flex-col">
                <div className="p-3 bg-neutral-100 dark:bg-neutral-900 rounded-lg flex justify-between items-center flex-shrink-0">
                    <h3 className="text-lg font-semibold text-neutral-700 dark:text-neutral-200">Balance Total del Cliente:</h3>
                    <span className={`text-2xl font-bold ${grandTotalBalance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                        ${grandTotalBalance.toFixed(2)}
                    </span>
                </div>
                <div className="flex-grow overflow-y-auto pr-2 space-y-3">
                    {[generalBreakdown, ...projectBreakdowns].map(breakdown => (
                        <div key={breakdown.project.id} className="border border-neutral-200 dark:border-neutral-700 rounded-lg">
                            <button onClick={() => toggleExpand(breakdown.project.id)} className="w-full p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between text-left hover:bg-neutral-50 dark:hover:bg-neutral-700/50 rounded-t-lg">
                                <div className="flex-grow">
                                    <h4 className="font-semibold text-primary">{breakdown.project.name}</h4>
                                    {'status' in breakdown.project && <span className="text-xs text-neutral-500">{breakdown.project.status}</span>}
                                </div>
                                <div className="grid grid-cols-3 gap-x-4 mt-2 sm:mt-0 text-xs sm:text-sm text-center">
                                    <div><span className="block text-neutral-500">Cargos</span><span className="font-medium">${breakdown.charges.toFixed(2)}</span></div>
                                    <div><span className="block text-neutral-500">Abonos</span><span className="font-medium">${breakdown.payments.toFixed(2)}</span></div>
                                    <div><span className="block text-neutral-500">Balance</span><span className={`font-bold ${breakdown.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>${breakdown.balance.toFixed(2)}</span></div>
                                </div>
                                <ChevronDownIcon className={`w-5 h-5 ml-4 flex-shrink-0 transition-transform ${expandedSections[breakdown.project.id] ? 'rotate-180' : ''}`} />
                            </button>
                            {expandedSections[breakdown.project.id] && (
                                <div className="p-2 border-t border-neutral-200 dark:border-neutral-700">
                                    {breakdown.transactions.length > 0 ? (
                                        <table className="w-full">
                                            <thead>
                                                <tr className="text-xs text-left text-neutral-500 dark:text-neutral-400">
                                                    <th className="px-2 py-1 font-medium">Fecha</th>
                                                    <th className="px-2 py-1 font-medium">Descripción</th>
                                                    <th className="px-2 py-1 font-medium text-right">Monto</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {breakdown.transactions.map((tx) => <TransactionRow key={tx.id} transaction={tx} />)}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <p className="text-xs text-center text-neutral-500 py-2">No hay transacciones en este apartado.</p>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </Modal>
    );
};
