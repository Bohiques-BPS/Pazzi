
import React from 'react';
import { Modal } from '../Modal';
import { Client } from '../../types';
import { BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import { useTranslation } from '../../contexts/GlobalSettingsContext';

interface ClientDetailViewModalProps {
    isOpen: boolean;
    onClose: () => void;
    client: Client | null;
}

const DetailItem: React.FC<{ label: string; value?: string | number | null; highlight?: boolean }> = ({ label, value, highlight }) => {
    if (!value && value !== 0) return null;
    return (
        <div>
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{label}</p>
            <p className={`text-base text-neutral-800 dark:text-neutral-100 ${highlight ? 'font-bold text-red-600 dark:text-red-400' : ''}`}>{value}</p>
        </div>
    );
};

export const ClientDetailViewModal: React.FC<ClientDetailViewModalProps> = ({ isOpen, onClose, client }) => {
    const { t } = useTranslation();
    if (!isOpen || !client) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('cmpx.client_detail.title', { name: `${client.name} ${client.lastName}` })} size="2xl">
            <div className="space-y-4">
                {/* General Information */}
                <section>
                    <h3 className="text-lg font-semibold text-primary border-b dark:border-neutral-600 mb-2">{t('cmpx.client_detail.general_info')}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <DetailItem label={t('cmpx.client_detail.full_name')} value={`${client.name} ${client.lastName}`} />
                        <DetailItem label={t('cmpx.client_detail.client_type')} value={client.clientType} />
                        {client.companyName && <DetailItem label={t('cmpx.client_detail.company_name')} value={client.companyName} />}
                        {client.industry && <DetailItem label={t('cmpx.client_detail.industry')} value={client.industry} />}
                        <DetailItem label={t('common.email')} value={client.email} />
                        <DetailItem label={t('cmpx.client_detail.main_phone')} value={client.phone} />
                        {client.phone2 && <DetailItem label={t('cmpx.client_detail.secondary_phone')} value={client.phone2} />}
                        {client.fax && <DetailItem label={t('client.field.fax')} value={client.fax} />}
                        <DetailItem label={t('client.field.contact_person')} value={client.contactPersonName} />
                        <DetailItem label={t('cmpx.client_detail.preferred_comm')} value={client.preferredCommunication} />
                        <DetailItem label={t('cmpx.client_detail.acquisition_source')} value={client.acquisitionSource} />
                    </div>
                </section>

                {/* Address Information */}
                <section>
                    <h3 className="text-lg font-semibold text-primary border-b dark:border-neutral-600 mb-2 mt-4">{t('cmpx.client_detail.addresses')}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{t('cmpx.client_detail.main_address')}</p>
                            <p className="text-base text-neutral-800 dark:text-neutral-100 whitespace-pre-wrap">{client.address || t('cmpx.client_detail.not_specified')}</p>
                        </div>
                         <div>
                            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{t('cmpx.client_detail.billing_address')}</p>
                            <p className="text-base text-neutral-800 dark:text-neutral-100 whitespace-pre-wrap">{client.billingAddress || t('cmpx.client_detail.same_as_main')}</p>
                        </div>
                    </div>
                </section>

                {/* Financial Information */}
                <section>
                     <h3 className="text-lg font-semibold text-primary border-b dark:border-neutral-600 mb-2 mt-4">{t('cmpx.client_detail.financial_info')}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                         <DetailItem label={t('cmpx.client_detail.tax_id')} value={client.taxId} />
                         <DetailItem label={t('cmpx.client_detail.credit_limit')} value={client.creditLimit ? `$${client.creditLimit.toFixed(2)}` : 'N/A'} />
                         <DetailItem label={t('cmpx.client_detail.payment_terms')} value={client.paymentTerms} />
                         <DetailItem label={t('cmpx.client_detail.price_level')} value={client.priceLevel} />
                         <DetailItem label={t('cmpx.client_detail.current_balance')} value={client.balance ? `$${client.balance.toFixed(2)}` : '$0.00'} />
                         {client.isLoss && <DetailItem label={t('cmpx.client_detail.account_status')} value={t('cmpx.client_detail.in_loss')} highlight />}
                    </div>
                </section>

                <div className="flex justify-end pt-4">
                    <button onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>{t('pmx.common.close')}</button>
                </div>
            </div>
        </Modal>
    );
};
