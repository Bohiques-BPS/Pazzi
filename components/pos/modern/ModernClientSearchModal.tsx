import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from '../../Modal';
import type { Client } from '../../../types';
import { clientsService } from '../../../services/clients';
import { ClientAccountModal } from '../../ui/ClientAccountModal';
import { EyeIcon, MagnifyingGlassIcon } from '../../icons';

/**
 * Seleccionar cliente (caja MODERNA): filas compactas (el doble de clientes a la vista),
 * tocar la fila = asignar, "Ver" aparte para el perfil, etiqueta de balance solo si debe,
 * pestañas Recientes / Con balance / Con apartado / Todos y teléfonos en un solo formato.
 */

const money = (n: number) => `$${(Number(n) || 0).toFixed(2)}`;
/** (787) 000-0000 para números de 10 dígitos (o 11 con el 1 delante); si no, tal cual. */
export const formatPhone = (p?: string | null) => {
    if (!p) return '';
    const d = p.replace(/\D/g, '');
    const t = d.length === 11 && d.startsWith('1') ? d.slice(1) : d;
    return t.length === 10 ? `(${t.slice(0, 3)}) ${t.slice(3, 6)}-${t.slice(6)}` : p;
};
const displayName = (c: Client) => {
    const person = `${c.name || ''} ${c.lastName || ''}`.trim();
    const company = (c as any).companyName as string | undefined;
    // Evita "24 Seven Stores — 24 Seven Stores".
    if (company && company.trim().toLowerCase() !== person.toLowerCase()) return { main: company, sub: person };
    return { main: person || company || 'Cliente', sub: '' };
};

type Tab = 'recent' | 'balance' | 'layaway' | 'all';

export const ModernClientSearchModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    clients: Client[];
    /** Ids de clientes en orden de su última compra (más reciente primero). */
    recentClientIds: string[];
    onClientSelect: (c: Client) => void;
    onOpenCreateClient: () => void;
    cajaId?: string | null;
}> = ({ isOpen, onClose, clients, recentClientIds, onClientSelect, onOpenCreateClient, cajaId }) => {
    const [q, setQ] = useState('');
    const [tab, setTab] = useState<Tab>('recent');
    const [enriched, setEnriched] = useState<Client[] | null>(null);
    const [viewClient, setViewClient] = useState<Client | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        setQ(''); setTab(recentClientIds.length ? 'recent' : 'all');
        let cancelled = false;
        clientsService.getAll({ includeCredit: true }).then(d => { if (!cancelled) setEnriched(d as unknown as Client[]); }).catch(() => {});
        return () => { cancelled = true; };
    }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

    const source = (enriched && enriched.length ? enriched : clients).filter(c => !(c as any).isDefault);
    const bal = (c: Client) => Number((c as any).outstandingBalance) || 0;
    const lay = (c: Client) => Number((c as any).activeLayaways) || 0;

    const list = useMemo(() => {
        const term = q.trim().toLowerCase();
        const digits = term.replace(/\D/g, '');
        let l = source;
        if (term) {
            l = l.filter(c =>
                `${c.name} ${c.lastName || ''}`.toLowerCase().includes(term) ||
                ((c as any).companyName || '').toLowerCase().includes(term) ||
                (c.email || '').toLowerCase().includes(term) ||
                (digits.length >= 3 && (c.phone || '').replace(/\D/g, '').includes(digits)));
            return l.slice(0, 40);
        }
        if (tab === 'balance') return l.filter(c => bal(c) > 0.001).sort((a, b) => bal(b) - bal(a)).slice(0, 60);
        if (tab === 'layaway') return l.filter(c => lay(c) > 0).slice(0, 60);
        if (tab === 'recent') {
            const byId = new Map(l.map(c => [c.id, c]));
            return recentClientIds.map(id => byId.get(id)).filter(Boolean).slice(0, 30) as Client[];
        }
        return [...l].sort((a, b) => displayName(a).main.localeCompare(displayName(b).main)).slice(0, 60);
    }, [source, q, tab, recentClientIds]);

    const TABS: { key: Tab; label: string }[] = [
        { key: 'recent', label: 'Recientes' }, { key: 'balance', label: 'Con balance' }, { key: 'layaway', label: 'Con apartado' }, { key: 'all', label: 'Todos' },
    ];

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title="Seleccionar cliente" size="lg"
                footer={
                    <div className="flex justify-between gap-2">
                        <button type="button" onClick={onClose} className="h-11 px-5 rounded-lg font-semibold bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-700 dark:hover:bg-neutral-600">Cancelar</button>
                        <button type="button" onClick={onOpenCreateClient} className="h-11 px-5 rounded-lg font-bold bg-primary hover:bg-secondary text-white">+ Crear cliente</button>
                    </div>
                }>
                <p className="text-sm text-neutral-600 dark:text-neutral-300 -mt-2 mb-3">Asigne un cliente a esta venta.</p>
                <div className="flex items-center h-12 rounded-xl ring-1 ring-inset ring-neutral-300 dark:ring-neutral-700 bg-white dark:bg-neutral-900 px-3 focus-within:ring-2 focus-within:ring-primary">
                    <MagnifyingGlassIcon className="w-5 h-5 text-neutral-400 mr-2" />
                    <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Nombre, correo o teléfono" className="flex-1 bg-transparent text-base focus:outline-none" />
                </div>
                {!q.trim() && (
                    <div className="flex gap-1.5 mt-3">
                        {TABS.map(tb => (
                            <button key={tb.key} type="button" onClick={() => setTab(tb.key)}
                                className={`h-9 px-3.5 rounded-full text-sm font-medium ${tab === tb.key ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900' : 'ring-1 ring-inset ring-neutral-200 dark:ring-neutral-700 text-neutral-600 dark:text-neutral-300'}`}>
                                {tb.label}
                            </button>
                        ))}
                    </div>
                )}
                <ul className="mt-3 max-h-[52vh] overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800 rounded-xl ring-1 ring-inset ring-neutral-200 dark:ring-neutral-800">
                    {list.length === 0 && (
                        <li className="p-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
                            {q.trim() ? 'No hay clientes con esa búsqueda.' : tab === 'recent' ? 'Aún no hay compras recientes. Busque por nombre o teléfono.' : 'No hay clientes en esta lista.'}
                        </li>
                    )}
                    {list.map(c => {
                        const n = displayName(c);
                        const b = bal(c), l = lay(c);
                        return (
                            <li key={c.id} className="flex items-center gap-2 hover:bg-primary/5 dark:hover:bg-primary/10">
                                <button type="button" onClick={() => onClientSelect(c)} className="flex-1 min-w-0 text-left px-3.5 py-2.5">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="font-semibold truncate">{n.main}</span>
                                        {b > 0.001 && <span className="flex-shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">Balance {money(b)}</span>}
                                        {l > 0 && <span className="flex-shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">{l} apartado{l === 1 ? '' : 's'}</span>}
                                    </div>
                                    <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                                        {[n.sub, formatPhone(c.phone) || 'sin teléfono'].filter(Boolean).join(' · ')}
                                    </div>
                                </button>
                                <button type="button" onClick={() => setViewClient(c)} title="Ver perfil y estado de cuenta"
                                    className="flex-shrink-0 mr-2 h-10 px-3 rounded-lg text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-1.5">
                                    <EyeIcon className="w-4 h-4" /> Ver
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </Modal>
            <ClientAccountModal isOpen={!!viewClient} onClose={() => setViewClient(null)} client={viewClient} fromPos cajaId={cajaId} />
        </>
    );
};
