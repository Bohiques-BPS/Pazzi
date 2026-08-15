import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from '../Modal';
import { INPUT_SM_CLASSES } from '../../constants';
import { salesService } from '../../services/sales';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';
import { LoadingSkeleton } from '../ui/LoadingSkeleton';
import { EmptyState } from '../ui/EmptyState';
import type { ReceiptSale } from './ReceiptModal';

const money = (n: number) => `$${(Number(n) || 0).toFixed(2)}`;

/** Convierte una venta del backend al formato de recibo para reimprimir. */
function toReceiptSale(sale: any): ReceiptSale {
    const payments = Array.isArray(sale.payments) && sale.payments.length
        ? sale.payments.map((p: any) => ({ method: p.paymentMethodUsed, amount: p.amountPaid, reference: p.notes || undefined }))
        : [{ method: sale.paymentMethod || 'Pago', amount: sale.totalAmount }];
    return {
        saleNumber: sale.saleNumber != null ? String(sale.saleNumber) : String(sale.id).slice(0, 8),
        date: sale.date,
        items: (sale.items || []).map((it: any) => ({ name: it.name, quantity: it.quantity, unitPrice: it.unitPrice })),
        subtotal: sale.subtotal ?? (sale.totalAmount - (sale.taxAmount || 0)),
        tax: sale.taxAmount ?? 0,
        discount: sale.discountAmount ?? 0,
        total: sale.totalAmount,
        payments,
        changeDue: 0, // el vuelto no se persiste; no aplica al reimprimir
        clientName: sale.client ? `${sale.client.name} ${sale.client.lastName || ''}`.trim() : undefined,
        cashierName: sale.employee ? `${sale.employee.name} ${sale.employee.lastName || ''}`.trim() : undefined,
    };
}

interface ReprintModalProps {
    isOpen: boolean;
    onClose: () => void;
    employeeId: string;
    /** Se llama con el recibo a reimprimir (el POS lo pasa al ReceiptModal). */
    onSelectReceipt: (receipt: ReceiptSale) => void;
}

export const ReprintModal: React.FC<ReprintModalProps> = ({ isOpen, onClose, employeeId, onSelectReceipt }) => {
    const [rows, setRows] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [q, setQ] = useState('');

    useEffect(() => {
        if (!isOpen || !employeeId) return;
        let cancelled = false;
        setLoading(true);
        setQ('');
        // Solo ventas del cajero actual, sin devoluciones, las más recientes.
        salesService.getAll({ employeeId, isReturn: false })
            .then(data => { if (!cancelled) setRows(Array.isArray(data) ? data.slice(0, 100) : []); })
            .catch(err => { if (!cancelled && err instanceof ApiError) toast.error(err.message); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [isOpen, employeeId]);

    const filtered = useMemo(() => {
        const t = q.trim().toLowerCase();
        if (!t) return rows;
        return rows.filter(s =>
            String(s.saleNumber ?? '').includes(t) ||
            (s.client && `${s.client.name} ${s.client.lastName || ''}`.toLowerCase().includes(t))
        );
    }, [rows, q]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Reimprimir factura" size="2xl">
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-3">
                Tus facturas (cajero actual). Toca una para reimprimir su recibo.
            </p>
            <input
                type="text"
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Buscar por # de factura o cliente…"
                className={`${INPUT_SM_CLASSES} w-full mb-3`}
                autoFocus
            />
            {loading ? (
                <LoadingSkeleton variant="list" rows={5} />
            ) : filtered.length === 0 ? (
                <EmptyState title="Sin facturas" description="No hay ventas tuyas para reimprimir." />
            ) : (
                <div className="max-h-[55vh] overflow-y-auto border rounded-md divide-y divide-neutral-100 dark:divide-neutral-700 dark:border-neutral-700">
                    {filtered.map(s => (
                        <button
                            key={s.id}
                            onClick={() => onSelectReceipt(toReceiptSale(s))}
                            className="w-full flex items-center justify-between p-3 hover:bg-neutral-50 dark:hover:bg-neutral-700/40 text-left transition-colors"
                        >
                            <div className="min-w-0">
                                <p className="font-semibold text-neutral-800 dark:text-neutral-100">
                                    Factura #{s.saleNumber ?? '—'}
                                    <span className="ml-2 text-xs font-normal text-neutral-400">{new Date(s.date).toLocaleString()}</span>
                                </p>
                                <p className="text-xs text-neutral-500 truncate">
                                    {s.client ? `${s.client.name} ${s.client.lastName || ''}`.trim() : 'Público General'} · {s.paymentMethod}
                                </p>
                            </div>
                            <div className="text-right flex-shrink-0 ml-3">
                                <p className="font-bold text-neutral-800 dark:text-neutral-100">{money(s.totalAmount)}</p>
                                <span className="text-xs text-primary">🖨️ Reimprimir</span>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </Modal>
    );
};
