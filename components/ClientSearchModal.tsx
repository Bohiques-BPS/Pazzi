import React, { useState, useMemo, useEffect } from 'react';
import { Client } from '../types';
import { Modal } from './Modal';
import { MagnifyingGlassIcon, UserPlusIcon } from './icons';
import { inputFormStyle, BUTTON_PRIMARY_SM_CLASSES } from '../constants';
import { clientsService } from '../services/clients';
import { useTranslation } from '../contexts/GlobalSettingsContext';

interface ClientSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    clients: Client[];
    onClientSelect: (client: Client) => void;
    onOpenCreateClient: () => void;
}

const money = (n: number) => `$${(Number(n) || 0).toFixed(2)}`;

export const ClientSearchModal: React.FC<ClientSearchModalProps> = ({
    isOpen,
    onClose,
    clients,
    onClientSelect,
    onOpenCreateClient
}) => {
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');
    const [onlyBalance, setOnlyBalance] = useState(false);
    const [onlyLayaway, setOnlyLayaway] = useState(false);
    // Lista enriquecida con balance/layaway por cliente (se pide al abrir).
    const [enriched, setEnriched] = useState<Client[] | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        setSearchTerm(''); setOnlyBalance(false); setOnlyLayaway(false);
        let cancelled = false;
        clientsService.getAll({ includeCredit: true })
            .then(data => { if (!cancelled) setEnriched(data as unknown as Client[]); })
            .catch(() => { /* usa la lista del prop como respaldo */ });
        return () => { cancelled = true; };
    }, [isOpen]);

    const source = (enriched && enriched.length ? enriched : clients);

    const filteredClients = useMemo(() => {
        let list = source;
        const t = searchTerm.trim().toLowerCase();
        if (t) {
            list = list.filter(c =>
                c.name.toLowerCase().includes(t) ||
                (c.lastName || '').toLowerCase().includes(t) ||
                (c.email || '').toLowerCase().includes(t) ||
                (c.phone && c.phone.includes(t)) ||
                ((c as any).taxId && String((c as any).taxId).toLowerCase().includes(t)) ||
                (c.companyName && c.companyName.toLowerCase().includes(t))
            );
        }
        if (onlyBalance) list = list.filter(c => ((c as any).outstandingBalance || 0) > 0.001);
        if (onlyLayaway) list = list.filter(c => ((c as any).activeLayaways || 0) > 0);
        return list.slice(0, t ? 20 : 15);
    }, [source, searchTerm, onlyBalance, onlyLayaway]);

    const handleSelect = (client: Client) => {
        onClientSelect(client);
        setSearchTerm('');
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('cmp.clientsearch.title')} size="lg">
            <div className="space-y-4">
                <div className="flex items-stretch space-x-2">
                    <div className="relative flex-grow">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <MagnifyingGlassIcon className="w-5 h-5 text-neutral-400" />
                        </span>
                        <input
                            type="text"
                            placeholder={t('cmp.clientsearch.search_placeholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={inputFormStyle + " pl-10 !text-lg"}
                            autoFocus
                        />
                    </div>
                    <button
                        type="button"
                        onClick={onOpenCreateClient}
                        className={`${BUTTON_PRIMARY_SM_CLASSES} flex-shrink-0 flex items-center justify-center whitespace-nowrap self-stretch`}
                    >
                        <UserPlusIcon className="mr-1.5" /> {t('cmp.clientsearch.create_new')}
                    </button>
                </div>

                {/* Filtros: con balance / con layaway (como el POS legacy) */}
                <div className="flex items-center gap-5 text-sm text-neutral-600 dark:text-neutral-300">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={onlyBalance} onChange={e => setOnlyBalance(e.target.checked)} className="h-4 w-4" />
                        {t('cmp.clientsearch.with_balance')}
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={onlyLayaway} onChange={e => setOnlyLayaway(e.target.checked)} className="h-4 w-4" />
                        {t('cmp.clientsearch.with_layaway')}
                    </label>
                </div>

                {filteredClients.length > 0 ? (
                    <ul className="max-h-[55vh] overflow-y-auto space-y-2 pr-2">
                        {filteredClients.map(client => {
                            const bal = (client as any).outstandingBalance || 0;
                            const lay = (client as any).activeLayaways || 0;
                            return (
                                <li
                                    key={client.id}
                                    onClick={() => handleSelect(client)}
                                    className="p-4 bg-white dark:bg-neutral-700/60 rounded-md border border-neutral-200 dark:border-neutral-600 hover:bg-primary/5 dark:hover:bg-primary/20 hover:border-primary/50 cursor-pointer transition-colors"
                                >
                                    <div className="flex justify-between items-start gap-2">
                                        <div className="min-w-0">
                                            <p className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">
                                                {client.name} {client.lastName} {client.companyName && <span className="text-base font-normal text-neutral-500">- {client.companyName}</span>}
                                            </p>
                                            <p className="text-base text-neutral-600 dark:text-neutral-300">
                                                {client.email} {client.phone && `| ${client.phone}`}
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                            {bal > 0.001 && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 whitespace-nowrap">{t('cmp.clientsearch.balance', { amount: money(bal) })}</span>}
                                            {lay > 0 && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 whitespace-nowrap">{t('cmp.clientsearch.layaway_count', { count: lay })}</span>}
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <p className="text-lg text-center text-neutral-500 dark:text-neutral-400 py-8">
                        {onlyBalance || onlyLayaway ? t('cmp.clientsearch.empty_filter') : searchTerm ? t('cmp.clientsearch.empty_search') : t('cmp.clientsearch.empty_start')}
                    </p>
                )}
            </div>
        </Modal>
    );
};
