import React, { useEffect, useState } from 'react';
import { Modal } from '../Modal';
import { clientsService, type ClientSummary } from '../../services/clients';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';
import { LoadingSkeleton } from './LoadingSkeleton';
import { EmptyState } from './EmptyState';
import { BUTTON_SECONDARY_SM_CLASSES, INPUT_SM_CLASSES } from '../../constants';
import { useTranslation } from '../../contexts/GlobalSettingsContext';

interface ClientPOSReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    clientId: string;
    clientName?: string;
}

export const ClientPOSReportModal: React.FC<ClientPOSReportModalProps> = ({
    isOpen,
    onClose,
    clientId,
    clientName,
}) => {
    const { t } = useTranslation();
    const [data, setData] = useState<ClientSummary | null>(null);
    const [loading, setLoading] = useState(false);
    const [period, setPeriod] = useState('30');

    useEffect(() => {
        if (!isOpen || !clientId) return;
        let cancelled = false;
        setLoading(true);
        const periodNum = Math.max(1, parseInt(period, 10) || 30);
        clientsService.getSummary(clientId, { period: periodNum })
            .then(res => { if (!cancelled) setData(res); })
            .catch(err => {
                if (cancelled) return;
                if (err instanceof ApiError) toast.error(err.message);
            })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [isOpen, clientId, period]);

    if (!isOpen) return null;

    const sales = data?.recentSales || [];
    const totalAmount = sales.filter(s => !s.isReturn).reduce((sum, s) => sum + s.totalAmount, 0);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`${t('cmpx.posreport.title')} — ${clientName || data?.client?.name || t('common.client')}`} size="xl">
            <div className="flex justify-between items-center mb-3 gap-2 flex-wrap">
                <div className="text-sm">
                    <span className="text-neutral-500">{t('cmpx.posreport.period')}</span>{' '}
                    <select value={period} onChange={(e) => setPeriod(e.target.value)} className={INPUT_SM_CLASSES + ' inline-block ml-1'}>
                        <option value="7">{t('cmpx.posreport.days', { n: 7 })}</option>
                        <option value="30">{t('cmpx.posreport.days', { n: 30 })}</option>
                        <option value="60">{t('cmpx.posreport.days', { n: 60 })}</option>
                        <option value="90">{t('cmpx.posreport.days', { n: 90 })}</option>
                        <option value="180">{t('cmpx.posreport.days', { n: 180 })}</option>
                        <option value="365">{t('cmpx.posreport.one_year')}</option>
                    </select>
                </div>
                {data && !loading && (
                    <div className="text-sm">
                        <span className="text-neutral-500">{t('cmpx.posreport.total_period')}</span>{' '}
                        <span className="font-bold text-primary">${totalAmount.toFixed(2)}</span>{' '}
                        <span className="text-neutral-400">({t('cmpx.posreport.sales_count', { count: sales.length })})</span>
                    </div>
                )}
            </div>

            {loading && <LoadingSkeleton variant="list" rows={5} />}

            {!loading && sales.length === 0 && (
                <EmptyState
                    title={t('cmpx.posreport.no_sales_title')}
                    description={t('cmpx.posreport.no_sales_desc', { period })}
                />
            )}

            {!loading && sales.length > 0 && (
                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                    {sales.map(sale => (
                        <div key={sale.id} className="p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-md shadow-sm">
                            <div className="flex justify-between items-center mb-1">
                                <h4 className="font-semibold text-primary">
                                    {t('cmpx.posreport.sale_hash')}{sale.id.slice(-6).toUpperCase()}
                                    {sale.isReturn && <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">{t('cmpx.posreport.return_badge')}</span>}
                                </h4>
                                <span className="text-xs text-neutral-500 dark:text-neutral-400">{new Date(sale.date).toLocaleString()}</span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                                <div>
                                    <span className="text-neutral-500 text-xs block">{t('common.total')}</span>
                                    <span className="font-medium">${sale.totalAmount.toFixed(2)}</span>
                                </div>
                                <div>
                                    <span className="text-neutral-500 text-xs block">{t('cmpx.posreport.method')}</span>
                                    <span>{sale.paymentMethod}</span>
                                </div>
                                <div>
                                    <span className="text-neutral-500 text-xs block">{t('cmpx.posreport.branch')}</span>
                                    <span>{sale.branch?.name || '—'}</span>
                                </div>
                                <div>
                                    <span className="text-neutral-500 text-xs block">{t('common.status')}</span>
                                    <span>{sale.paymentStatus}</span>
                                </div>
                            </div>
                            <details className="mt-2 text-xs">
                                <summary className="cursor-pointer text-primary hover:underline">{t('cmpx.posreport.view_items', { count: sale.items.length })}</summary>
                                <ul className="list-disc list-inside pl-4 mt-1 space-y-0.5 text-neutral-500 dark:text-neutral-400">
                                    {sale.items.map(item => (
                                        <li key={item.id}>
                                            {item.product?.name || t('cmpx.common.product')} — {t('cmpx.posreport.qty')}: {item.quantity} — {t('cmpx.posreport.unit_price')}: ${item.unitPrice.toFixed(2)}
                                        </li>
                                    ))}
                                </ul>
                            </details>
                        </div>
                    ))}
                </div>
            )}

            <div className="mt-4 flex justify-end">
                <button onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>{t('pmx.common.close')}</button>
            </div>
        </Modal>
    );
};
