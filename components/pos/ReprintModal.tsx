import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from '../Modal';
import { INPUT_SM_CLASSES } from '../../constants';
import { salesService } from '../../services/sales';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';
import { LoadingSkeleton } from '../ui/LoadingSkeleton';
import { EmptyState } from '../ui/EmptyState';
import type { ReceiptSale } from './ReceiptModal';
import { useTranslation } from '../../contexts/GlobalSettingsContext';

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
        changeDue: 0,
        clientName: sale.client ? `${sale.client.name} ${sale.client.lastName || ''}`.trim() : undefined,
        cashierName: sale.employee ? `${sale.employee.name} ${sale.employee.lastName || ''}`.trim() : undefined,
    };
}

type TabKey = 'facturas' | 'pagos' | 'devoluciones' | 'desembolsos';
const TABS: { key: TabKey; label: string }[] = [
    { key: 'facturas', label: 'Facturas' },
    { key: 'pagos', label: 'Pagos Recibidos' },
    { key: 'devoluciones', label: 'Devoluciones / Void' },
    { key: 'desembolsos', label: 'Desembolsos' },
];

interface ReprintModalProps {
    isOpen: boolean;
    onClose: () => void;
    employeeId: string;
    /** Se llama con el recibo a reimprimir (el POS lo pasa al ReceiptModal). */
    onSelectReceipt: (receipt: ReceiptSale) => void;
}

export const ReprintModal: React.FC<ReprintModalProps> = ({ isOpen, onClose, employeeId, onSelectReceipt }) => {
    const { t } = useTranslation();
    const [tab, setTab] = useState<TabKey>('facturas');
    const [rows, setRows] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [q, setQ] = useState('');
    const [lastTx, setLastTx] = useState<any | null>(null);

    // Carga la lista según la pestaña (facturas / devoluciones). Las otras son placeholders.
    useEffect(() => {
        if (!isOpen || !employeeId) return;
        setQ('');
        if (tab !== 'facturas' && tab !== 'devoluciones') { setRows([]); return; }
        let cancelled = false;
        setLoading(true);
        salesService.getAll({ employeeId, isReturn: tab === 'devoluciones' })
            .then(data => {
                if (cancelled) return;
                const list = Array.isArray(data) ? data.slice(0, 100) : [];
                setRows(list);
                if (tab === 'facturas' && list.length) setLastTx(list[0]); // la más reciente
            })
            .catch(err => { if (!cancelled && err instanceof ApiError) toast.error(err.message); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [isOpen, employeeId, tab]);

    // Al abrir, arranca en Facturas.
    useEffect(() => { if (isOpen) { setTab('facturas'); setLastTx(null); } }, [isOpen]);

    const filtered = useMemo(() => {
        const t = q.trim().toLowerCase();
        if (!t) return rows;
        return rows.filter(s =>
            String(s.saleNumber ?? '').includes(t) ||
            (s.client && `${s.client.name} ${s.client.lastName || ''}`.toLowerCase().includes(t))
        );
    }, [rows, q]);

    const reprint = (sale: any) => { if (sale) onSelectReceipt(toReceiptSale(sale)); };

    const listable = tab === 'facturas' || tab === 'devoluciones';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('cmpx.reprint.title')} size="2xl">
            {/* Última transacción — re-impresión rápida */}
            <div className="flex items-center justify-between gap-3 border border-neutral-200 dark:border-neutral-700 rounded-md p-3 mb-3 bg-neutral-50 dark:bg-neutral-800/50">
                <div className="min-w-0">
                    <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">{t('cmpx.reprint.last_tx')}</p>
                    {lastTx
                        ? <p className="text-base font-bold text-neutral-800 dark:text-neutral-100 truncate">#{lastTx.saleNumber ?? '—'} · {money(lastTx.totalAmount)}</p>
                        : <p className="text-sm text-neutral-400">{t('cmpx.reprint.no_recent')}</p>}
                </div>
                <button
                    type="button"
                    onClick={() => reprint(lastTx)}
                    disabled={!lastTx}
                    className="flex-shrink-0 bg-yellow-400 hover:bg-yellow-500 disabled:opacity-40 text-neutral-800 font-bold py-2 px-4 rounded-md text-sm"
                >
                    🖨️ {t('cmpx.reprint.reprint_btn')}
                </button>
            </div>

            {/* Categorías (menú) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                {TABS.map(tb => (
                    <button
                        key={tb.key}
                        type="button"
                        onClick={() => setTab(tb.key)}
                        className={`py-2 px-2 rounded-md border text-sm font-medium transition-colors ${tab === tb.key ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary' : 'border-neutral-300 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-700'}`}
                    >
                        {t(`cmpx.reprint.tab_${tb.key}`)}
                    </button>
                ))}
            </div>

            {listable ? (
                <>
                    <input
                        type="text"
                        value={q}
                        onChange={e => setQ(e.target.value)}
                        placeholder={t('cmpx.reprint.search_ph')}
                        className={`${INPUT_SM_CLASSES} w-full mb-3`}
                        autoFocus
                    />
                    {loading ? (
                        <LoadingSkeleton variant="list" rows={5} />
                    ) : filtered.length === 0 ? (
                        <EmptyState title={t('cmpx.reprint.no_results')} description={tab === 'devoluciones' ? t('cmpx.reprint.no_returns') : t('cmpx.reprint.no_invoices')} />
                    ) : (
                        <div className="max-h-[45vh] overflow-y-auto border rounded-md divide-y divide-neutral-100 dark:divide-neutral-700 dark:border-neutral-700">
                            {filtered.map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => reprint(s)}
                                    className="w-full flex items-center justify-between p-3 hover:bg-neutral-50 dark:hover:bg-neutral-700/40 text-left transition-colors"
                                >
                                    <div className="min-w-0">
                                        <p className="font-semibold text-neutral-800 dark:text-neutral-100">
                                            #{s.saleNumber ?? '—'}
                                            <span className="ml-2 text-xs font-normal text-neutral-400">{new Date(s.date).toLocaleString()}</span>
                                        </p>
                                        <p className="text-xs text-neutral-500 truncate">
                                            {s.client ? `${s.client.name} ${s.client.lastName || ''}`.trim() : t('cmpx.reprint.walkin')} · {s.paymentMethod}
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
                </>
            ) : (
                <EmptyState
                    title={tab === 'pagos' ? 'Pagos Recibidos' : 'Desembolsos'}
                    description="Esta sección estará disponible pronto."
                />
            )}
        </Modal>
    );
};
