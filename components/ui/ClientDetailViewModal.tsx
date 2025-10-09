import React from 'react';
import { Modal } from '../Modal';
import { Client } from '../../types';
import { BUTTON_SECONDARY_SM_CLASSES } from '../../constants';

interface ClientDetailViewModalProps {
    isOpen: boolean;
    onClose: () => void;
    client: Client | null;
}

const DetailItem: React.FC<{ label: string; value?: string | number | null }> = ({ label, value }) => {
    if (!value && value !== 0) return null;
    return (
        <div>
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{label}</p>
            <p className="text-base text-neutral-800 dark:text-neutral-100">{value}</p>
        </div>
    );
};

export const ClientDetailViewModal: React.FC<ClientDetailViewModalProps> = ({ isOpen, onClose, client }) => {
    if (!isOpen || !client) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Detalles de Cliente: ${client.name} ${client.lastName}`} size="2xl">
            <div className="space-y-4">
                {/* General Information */}
                <section>
                    <h3 className="text-lg font-semibold text-primary border-b dark:border-neutral-600 mb-2">Información General</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <DetailItem label="Nombre Completo" value={`${client.name} ${client.lastName}`} />
                        <DetailItem label="Tipo de Cliente" value={client.clientType} />
                        {client.companyName && <DetailItem label="Nombre de la Compañía" value={client.companyName} />}
                        {client.industry && <DetailItem label="Industria" value={client.industry} />}
                        <DetailItem label="Email" value={client.email} />
                        <DetailItem label="Teléfono Principal" value={client.phone} />
                        {client.phone2 && <DetailItem label="Teléfono Secundario" value={client.phone2} />}
                        {client.fax && <DetailItem label="Fax" value={client.fax} />}
                        <DetailItem label="Persona de Contacto" value={client.contactPersonName} />
                        <DetailItem label="Comunicación Preferida" value={client.preferredCommunication} />
                        <DetailItem label="Fuente de Adquisición" value={client.acquisitionSource} />
                    </div>
                </section>

                {/* Address Information */}
                <section>
                    <h3 className="text-lg font-semibold text-primary border-b dark:border-neutral-600 mb-2 mt-4">Direcciones</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Dirección Principal</p>
                            <p className="text-base text-neutral-800 dark:text-neutral-100 whitespace-pre-wrap">{client.address || 'No especificada'}</p>
                        </div>
                         <div>
                            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Dirección de Facturación</p>
                            <p className="text-base text-neutral-800 dark:text-neutral-100 whitespace-pre-wrap">{client.billingAddress || 'Igual a la principal'}</p>
                        </div>
                    </div>
                </section>
                
                {/* Financial Information */}
                <section>
                     <h3 className="text-lg font-semibold text-primary border-b dark:border-neutral-600 mb-2 mt-4">Información Financiera y Fiscal</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                         <DetailItem label="ID Fiscal (Tax ID)" value={client.taxId} />
                         <DetailItem label="Límite de Crédito" value={client.creditLimit ? `$${client.creditLimit.toFixed(2)}` : 'N/A'} />
                         <DetailItem label="Términos de Pago" value={client.paymentTerms} />
                         <DetailItem label="Nivel de Precios" value={client.priceLevel} />
                         <DetailItem label="Balance Actual" value={client.balance ? `$${client.balance.toFixed(2)}` : '$0.00'} />
                    </div>
                </section>

                <div className="flex justify-end pt-4">
                    <button onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>Cerrar</button>
                </div>
            </div>
        </Modal>
    );
};