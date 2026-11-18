import React, { useState, useMemo, useEffect } from 'react';
import { Modal } from '../Modal';
import { Sale, CartItem, UserRole, Client } from '../../types';
import { useData } from '../../contexts/DataContext';
import { inputFormStyle, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import { MagnifyingGlassIcon, TrashIconMini } from '../icons';
import { authService } from '../../services/auth';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';
import { PasswordInput } from '../ui/PasswordInput';
import { useTranslation } from '../../contexts/GlobalSettingsContext';

type ReturnItemPayload = CartItem & { customRefundAmount?: number; returnToStock: boolean };
export type RefundPart = { method: string; amount: number };
const CASH_DENOMINATIONS = [100, 50, 20, 10, 5, 1];
const r2 = (n: number) => Math.round(n * 100) / 100;
const isCashName = (m: string) => /efectivo|cash/i.test(m || '');

interface ReturnItemDetails {
    quantity: number;
    customRefundAmount?: number;
    returnToStock: boolean;
};

interface ReturnModalProps {
    isOpen: boolean;
    onClose: () => void;
    onProcessReturn: (originalSaleId: string, itemsToReturn: (CartItem & { customRefundAmount?: number; returnToStock: boolean })[], reason: string, adminPassword: string, refundMethod: string, refunds: RefundPart[]) => void;
    /** Métodos de pago activos en esta caja (para reembolsar). */
    methods?: string[];
    /** Caja moderna: muestra las ventas recientes de esta caja para devolver con un toque. */
    modern?: boolean;
    /** Caja actual (para listar sus ventas recientes en la caja moderna). */
    cajaId?: string | null;
    /** Prefijo del nº de recibo (Config. Factura): el código de barras del recibo es prefijo + nº de venta. */
    receiptPrefix?: string;
}

export const ReturnModal: React.FC<ReturnModalProps> = ({ isOpen, onClose, onProcessReturn, modern = false, cajaId, receiptPrefix = '', methods = [] }) => {
    const { t } = useTranslation();
    const { sales, getClientById, clients } = useData();
    const [saleIdInput, setSaleIdInput] = useState('');
    const [foundSale, setFoundSale] = useState<Sale | null>(null);
    const [foundSales, setFoundSales] = useState<Sale[]>([]); // For client name search results
    const [itemsToReturnDetails, setItemsToReturnDetails] = useState<Map<string, ReturnItemDetails>>(new Map());
    const [reason, setReason] = useState('');
    const [adminPassword, setAdminPassword] = useState('');
    const [refundMethod, setRefundMethod] = useState('Efectivo'); // Caja 4: reembolso según pago original
    // Reembolso como el cobro: se escoge método y monto y se agrega; se puede dividir entre métodos.
    const [refunds, setRefunds] = useState<RefundPart[]>([]);
    const [amountInput, setAmountInput] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isOpen) {
            setSaleIdInput('');
            setFoundSale(null);
            setFoundSales([]);
            setItemsToReturnDetails(new Map());
            setReason('');
            setAdminPassword('');
            setRefundMethod('Efectivo');
            setRefunds([]);
            setAmountInput('');
            setError('');
        }
    }, [isOpen]);

    // Caja 4: al encontrar la venta, sugiere el método de reembolso según cómo se PAGÓ la factura
    // (si se pagó con tarjeta, se reembolsa a tarjeta; si fue efectivo, a efectivo).
    useEffect(() => {
        if (foundSale?.paymentMethod) setRefundMethod(foundSale.paymentMethod);
    }, [foundSale]);

    // Opciones de reembolso: todos los métodos activos de la caja (si no llegan, Efectivo/Tarjeta).
    // El método original va primero si sigue activo. Una venta "Mixto" no es un método.
    const refundOptions = useMemo(() => {
        const base = methods.length ? methods : ['Efectivo', 'Tarjeta'];
        const orig = foundSale?.paymentMethod && base.includes(foundSale.paymentMethod) ? [foundSale.paymentMethod] : [];
        return Array.from(new Set([...orig, ...base]));
    }, [foundSale, methods]);
    useEffect(() => {
        if (refundOptions.length && !refundOptions.includes(refundMethod)) setRefundMethod(refundOptions[0]);
    }, [refundOptions]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleFindSale = () => {
        setError('');
        setFoundSale(null);
        setFoundSales([]);
        setItemsToReturnDetails(new Map());
    
        const searchTerm = saleIdInput.trim();
        if (!searchTerm) {
            setError(t('cmpx.return.err_search_empty'));
            return;
        }
    
        // Buscar por número de venta o por ID (lo más específico). El usuario normalmente escribe
        // el número de venta (ej. "85" o "#85"), no el UUID.
        let numTerm = searchTerm.replace(/^#/, '');
        if (modern) {
            const pre = (receiptPrefix || '').trim();
            if (pre && numTerm.toUpperCase().startsWith(pre.toUpperCase())) numTerm = numTerm.slice(pre.length);
            const scanned = /^[A-Za-z-]*0*(\d+)$/.exec(numTerm); // ej. "R-00485" o "PZ485" → 485
            if (scanned) numTerm = scanned[1];
        }
        const saleById = sales.find(s =>
            String((s as any).saleNumber ?? '') === numTerm ||
            s.id.toLowerCase() === searchTerm.toLowerCase() ||
            s.id.slice(-6).toUpperCase() === searchTerm.toUpperCase()
        );
    
        if (saleById) {
            if (saleById.isReturn) {
                setError(t('cmpx.return.err_return_of_return'));
                return;
            }
            if (saleById.paymentStatus === 'Devolución Completa') {
                setError(t('cmpx.return.err_already_returned'));
                return;
            }
            setFoundSale(saleById);
            return; // Exit after finding by ID
        }
    
        // If not found by ID, search by client name
        const matchingClients = clients.filter(c =>
            `${c.name} ${c.lastName} ${c.companyName || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
        );
    
        if (matchingClients.length > 0) {
            const clientIds = matchingClients.map(c => c.id);
            const clientSales = sales.filter(s =>
                s.clientId && clientIds.includes(s.clientId) &&
                !s.isReturn && s.paymentStatus !== 'Devolución Completa'
            ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
            if (clientSales.length === 0) {
                setError(t('cmpx.return.err_no_client_sales'));
            } else if (clientSales.length === 1) {
                setFoundSale(clientSales[0]);
            } else {
                setFoundSales(clientSales);
            }
        } else {
            setError(t('cmpx.return.err_not_found'));
        }
    };
    
    const handleSelectSale = (sale: Sale) => {
        setFoundSale(sale);
        setFoundSales([]); // Hide the list
    };

    const calculateRefundForItem = (item: CartItem, quantity: number) => {
        let itemPrice = item.unitPrice;
        if (item.discount) {
            if (item.discount.type === 'percentage') {
                itemPrice *= (1 - item.discount.value / 100);
            } else {
                itemPrice = Math.max(0, itemPrice - item.discount.value);
            }
        }
        return itemPrice * quantity;
    };

    const handleToggleItem = (item: CartItem) => {
        setItemsToReturnDetails(prevItems => {
            const newItems = new Map(prevItems);
            if (newItems.has(item.id)) {
                newItems.delete(item.id);
            } else {
                newItems.set(item.id, {
                    quantity: item.quantity,
                    returnToStock: true,
                });
            }
            return newItems;
        });
    };

    const handleQuantityChange = (itemId: string, newQuantityStr: string) => {
        // FIX: Explicitly type `prevItems` to help TypeScript inference inside the callback.
        setItemsToReturnDetails((prevItems: Map<string, ReturnItemDetails>) => {
            const newItems = new Map(prevItems);
            const details = newItems.get(itemId);
            const originalItem = foundSale?.items.find(i => i.id === itemId);
            if (!details || !originalItem) {
                return prevItems;
            }

            const newQuantity = parseInt(newQuantityStr, 10);
            if (!isNaN(newQuantity) && newQuantity > 0 && newQuantity <= originalItem.quantity) {
                const newDetails: ReturnItemDetails = { ...details, quantity: newQuantity };
                newItems.set(itemId, newDetails);
            } else if (newQuantityStr === '') {
                 const newDetails: ReturnItemDetails = { ...details, quantity: 0 };
                 newItems.set(itemId, newDetails);
            }
            return newItems;
        });
    };

    const handleAmountChange = (itemId: string, newAmountStr: string) => {
        // FIX: Explicitly type `prevItems` to help TypeScript inference inside the callback.
        setItemsToReturnDetails((prevItems: Map<string, ReturnItemDetails>) => {
            const newItems = new Map(prevItems);
            const details = newItems.get(itemId);
            const originalItem = foundSale?.items.find(i => i.id === itemId);
            if (!details || !originalItem) {
                return prevItems;
            }
    
            const newAmount = parseFloat(newAmountStr);
            const calculatedAmount = calculateRefundForItem(originalItem, details.quantity);
            const newDetails: ReturnItemDetails = { ...details };
    
            if (isNaN(newAmount) || newAmountStr === '' || Math.abs(newAmount - calculatedAmount) < 0.001) {
                delete newDetails.customRefundAmount;
                newDetails.returnToStock = true;
            } else {
                newDetails.customRefundAmount = newAmount;
                newDetails.returnToStock = newAmount >= calculatedAmount; 
            }
            newItems.set(itemId, newDetails);
            return newItems;
        });
    };

    const handleReturnToStockChange = (itemId: string, shouldReturn: boolean) => {
        // FIX: Explicitly type `prevItems` to help TypeScript inference inside the callback.
        setItemsToReturnDetails((prevItems: Map<string, ReturnItemDetails>) => {
            const newItems = new Map(prevItems);
            const details = newItems.get(itemId);
            if (!details) {
                return prevItems;
            }
            const newDetails: ReturnItemDetails = { ...details, returnToStock: shouldReturn };
            newItems.set(itemId, newDetails);
            return newItems;
        });
    };

    const handleSelectAll = () => {
        if (!foundSale) return;
        const newItems = new Map<string, ReturnItemDetails>();
        foundSale.items.forEach(item => {
            newItems.set(item.id, { quantity: item.quantity, returnToStock: true });
        });
        setItemsToReturnDetails(newItems);
    };

    // Igual que el servidor: lo devuelto = lo que el cliente PAGÓ (descuento de línea + su parte del
    // descuento general) + su parte proporcional del IVU. Antes se mostraba/devolvía sin IVU.
    const saleFactors = useMemo(() => {
        if (!foundSale) return { gd: 1, tax: 0 };
        const sumNet = foundSale.items.reduce((acc, it) => acc + calculateRefundForItem(it, it.quantity), 0);
        const disc = Number((foundSale as any).discountAmount) || 0;
        const gd = sumNet > 0 ? Math.max(0, sumNet - disc) / sumNet : 1;
        const net = sumNet * gd;
        const taxAmt = (foundSale as any).taxAmount != null ? Number((foundSale as any).taxAmount) : Math.max(0, (Number(foundSale.totalAmount) || 0) - net);
        return { gd, tax: net > 0 ? taxAmt / net : 0 };
    }, [foundSale]);

    const refundPreTax = useMemo(() => {
        let total = 0;
        itemsToReturnDetails.forEach((details, itemId) => {
            const originalItem = foundSale?.items.find(i => i.id === itemId);
            if (!originalItem) return;
            // El monto editado a mano es antes de IVU (se le suma su IVU abajo).
            total += details.customRefundAmount !== undefined
                ? details.customRefundAmount
                : calculateRefundForItem(originalItem, details.quantity) * saleFactors.gd;
        });
        return Math.round(total * 100) / 100;
    }, [itemsToReturnDetails, foundSale, saleFactors]);
    const refundTax = Math.round(refundPreTax * saleFactors.tax * 100) / 100;
    const totalRefundAmount = Math.round((refundPreTax + refundTax) * 100) / 100;

    const [authorizing, setAuthorizing] = useState(false);

    // Reembolso por métodos: lo agregado + lo que falta.
    const refunded = r2(refunds.reduce((a, r) => a + r.amount, 0));
    const pending = r2(Math.max(0, totalRefundAmount - refunded));
    const typed = parseFloat(amountInput.replace(/[^0-9.]/g, '')) || 0;
    const isCashSel = isCashName(refundMethod);
    // En efectivo se pueden contar billetes de más: el cliente devuelve la diferencia.
    const customerChange = isCashSel && typed > pending + 0.004 ? r2(typed - pending) : 0;
    // Si cambian los artículos y lo agregado se pasa del total, se reinicia el desglose.
    useEffect(() => { if (refunded > totalRefundAmount + 0.004) setRefunds([]); }, [totalRefundAmount]); // eslint-disable-line react-hooks/exhaustive-deps
    const addRefund = () => {
        const amt = r2(Math.min(typed, pending));
        if (!(amt > 0)) return;
        setRefunds(prev => {
            const i = prev.findIndex(r => r.method === refundMethod);
            if (i >= 0) { const n = [...prev]; n[i] = { ...n[i], amount: r2(n[i].amount + amt) }; return n; }
            return [...prev, { method: refundMethod, amount: amt }];
        });
        setAmountInput('');
    };
    /** Desglose final: lo agregado + lo tecleado sin agregar; si no se agregó nada, todo al método escogido. */
    const finalRefunds = (): RefundPart[] => {
        let list = [...refunds];
        const extra = r2(Math.min(typed, pending));
        if (extra > 0) {
            const i = list.findIndex(r => r.method === refundMethod);
            if (i >= 0) list[i] = { ...list[i], amount: r2(list[i].amount + extra) }; else list.push({ method: refundMethod, amount: extra });
        }
        if (!list.length) list = [{ method: refundMethod, amount: totalRefundAmount }];
        return list;
    };

    const handleSubmit = async () => {
        if (!foundSale || itemsToReturnDetails.size === 0 || !adminPassword) {
            setError(t('cmpx.return.err_incomplete'));
            return;
        }
        const parts = finalRefunds();
        const partsSum = r2(parts.reduce((a, r) => a + r.amount, 0));
        if (Math.abs(partsSum - totalRefundAmount) > 0.01) {
            setError(`Falta asignar $${r2(totalRefundAmount - partsSum).toFixed(2)} del reembolso a un método.`);
            return;
        }

        setAuthorizing(true);
        setError('');
        try {
            // Verifica el PIN contra cualquier MANAGER del sistema.
            await authService.verifySupervisorPin(adminPassword);
        } catch (err) {
            setAuthorizing(false);
            if (err instanceof ApiError && err.status === 401) {
                setError(t('cmpx.return.err_pin_incorrect'));
            } else {
                setError(err instanceof ApiError ? err.message : t('cmpx.common.err_pin_verify'));
            }
            return;
        }

        const itemsForProcessing = Array.from(itemsToReturnDetails.entries()).map(([itemId, details]) => {
            const originalItem = foundSale.items.find(i => i.id === itemId);
            if (!originalItem) return null;
            return {
                ...originalItem,
                quantity: details.quantity,
                customRefundAmount: details.customRefundAmount,
                returnToStock: details.returnToStock,
            };
        }).filter((item): item is NonNullable<typeof item> => item !== null);

        setAuthorizing(false);
        // Pasamos el PIN ya verificado al callback (que llamará al endpoint /sales/:id/return)
        onProcessReturn(foundSale.id, itemsForProcessing, reason, adminPassword, parts.length === 1 ? parts[0].method : parts.map(p => p.method).join(' + '), parts);
    };

    const client = foundSale ? getClientById(foundSale.clientId || '') : null;

    // Caja moderna: últimas ventas de ESTA caja (no devoluciones ni devueltas por completo).
    const recentSales = useMemo(() => {
        if (!modern) return [];
        return sales
            .filter(s => !s.isReturn && s.paymentStatus !== 'Devolución Completa' && !(s as any).deletedAt && (!cajaId || (s as any).cajaId === cajaId))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 8);
    }, [modern, sales, cajaId]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={modern ? 'Devolución' : t('cmpx.return.title')} size="3xl">
            <div className="space-y-4">
                {modern && <p className="text-sm text-neutral-600 dark:text-neutral-300 -mt-2">Busque la venta (o escanee el recibo) y escoja qué artículos devolver.</p>}
                <div className="flex items-end gap-2">
                    <div className="flex-grow">
                        <label className="text-sm font-medium">{t('cmpx.return.search_label')}</label>
                        <input type="text" value={saleIdInput} onChange={e => setSaleIdInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleFindSale(); } }} placeholder={t('cmpx.return.search_ph')} className={inputFormStyle} />
                    </div>
                    <button onClick={handleFindSale} className={BUTTON_SECONDARY_SM_CLASSES}>
                        <MagnifyingGlassIcon className="w-4 h-4 mr-1.5"/> {t('common.search')}
                    </button>
                </div>
                {error && <p className="text-sm text-center text-red-500">{error}</p>}

                {modern && !foundSale && foundSales.length === 0 && recentSales.length > 0 && (
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-2">Ventas recientes de esta caja</p>
                        <ul className="divide-y divide-neutral-100 dark:divide-neutral-800 rounded-xl ring-1 ring-inset ring-neutral-200 dark:ring-neutral-800">
                            {recentSales.map(sale => {
                                const c = getClientById(sale.clientId || '');
                                const who = c && !(c as any).isDefault ? `${c.name} ${c.lastName || ''}`.trim() : 'Visitante';
                                return (
                                    <li key={sale.id} className="flex items-center gap-3 px-3.5 py-2.5">
                                        <div className="flex-1 min-w-0">
                                            <div className="font-semibold">#{(sale as any).saleNumber ?? sale.id.slice(-6).toUpperCase()}</div>
                                            <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{who} · {new Date(sale.date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} · {sale.items.reduce((a, it) => a + it.quantity, 0)} art.</div>
                                        </div>
                                        <span className="font-bold tabular-nums">${sale.totalAmount.toFixed(2)}</span>
                                        <button type="button" onClick={() => { setError(''); handleSelectSale(sale); }} className="h-10 px-3.5 rounded-lg text-sm font-semibold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:opacity-90">Seleccionar</button>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}
                
                {foundSales.length > 0 && (
                    <div className="mt-4 border-t pt-4 dark:border-neutral-600">
                        <h3 className="font-semibold mb-2">{t('cmpx.return.found_multiple', { count: foundSales.length })}</h3>
                        <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                            {foundSales.map(sale => {
                                const saleClient = getClientById(sale.clientId || '');
                                return (
                                    <button
                                        key={sale.id}
                                        onClick={() => handleSelectSale(sale)}
                                        className="w-full text-left p-3 bg-neutral-100 dark:bg-neutral-700/50 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors"
                                    >
                                        <p className="font-medium text-sm">{t('cmpx.return.sale_num_prefix')}{sale.id.slice(-6).toUpperCase()}</p>
                                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                            {new Date(sale.date).toLocaleString()} - ${sale.totalAmount.toFixed(2)}
                                            {saleClient && ` - ${saleClient.name} ${saleClient.lastName}`}
                                        </p>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                )}
                
                {foundSale && (
                    <div className="space-y-4 pt-4 border-t dark:border-neutral-600">
                        <div className="p-2 bg-neutral-100 dark:bg-neutral-700/50 rounded-md text-sm">
                            <p><strong>{t('cmpx.return.sale_found')}</strong> {foundSale.id}</p>
                            <p><strong>{t('cmpx.return.date_label')}</strong> {new Date(foundSale.date).toLocaleString()}</p>
                            <p><strong>{t('cmpx.return.client_label')}</strong> {client ? `${client.name} ${client.lastName}` : t('cmpx.return.walkin_client')}</p>
                            <p><strong>{t('cmpx.return.original_total')}</strong> ${foundSale.totalAmount.toFixed(2)}</p>
                        </div>
                        
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="font-semibold">{t('cmpx.return.select_items')}</h3>
                                <button onClick={handleSelectAll} className={BUTTON_SECONDARY_SM_CLASSES}>{t('cmpx.return.select_all')}</button>
                            </div>
                            <div className="max-h-60 overflow-y-auto space-y-2 border dark:border-neutral-600 p-2 rounded-md">
                                {foundSale.items.map(item => {
                                    const details = itemsToReturnDetails.get(item.id);
                                    const isSelected = !!details;
                                    const calculatedAmount = details ? calculateRefundForItem(item, details.quantity) : 0;
                                    const amountValue = details ? (details.customRefundAmount !== undefined ? details.customRefundAmount.toString() : calculatedAmount.toFixed(2)) : '0';

                                    return (
                                        <div key={item.id} className="p-2 bg-white dark:bg-neutral-700 rounded shadow-sm">
                                            <div className="flex items-start gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => handleToggleItem(item)}
                                                    className="form-checkbox h-5 w-5 text-primary rounded border-neutral-300 dark:border-neutral-600 dark:bg-neutral-900 focus:ring-primary mt-1"
                                                />
                                                <div className="flex-grow">
                                                    <p className="font-medium text-sm">{item.name}</p>
                                                    <p className="text-xs text-neutral-500">{t('cmpx.return.purchased', { qty: item.quantity, price: item.unitPrice.toFixed(2) })}</p>
                                                </div>
                                            </div>
                                            {isSelected && details && (
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2 pl-8 items-end">
                                                    <div>
                                                        <label className="block text-xs font-medium">{t('cmpx.common.quantity')}</label>
                                                        <input type="number" value={details.quantity} onChange={e => handleQuantityChange(item.id, e.target.value)} max={item.quantity} min="1" className={`${inputFormStyle} !text-sm`} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium">{t('cmpx.return.refund_amount')}</label>
                                                        <input type="number" value={amountValue} onChange={e => handleAmountChange(item.id, e.target.value)} step="0.01" min="0" className={`${inputFormStyle} !text-sm`} />
                                                    </div>
                                                    <label className="flex items-center text-xs self-center pt-5">
                                                        <input type="checkbox" checked={details.returnToStock} onChange={e => handleReturnToStockChange(item.id, e.target.checked)} className="form-checkbox h-4 w-4 text-primary rounded" />
                                                        <span className="ml-2">{t('cmpx.return.return_to_stock')}</span>
                                                    </label>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex flex-wrap items-end justify-end gap-3">
                            <div className="text-right">
                                {refundTax > 0 && (
                                    <div className="text-sm text-neutral-500 dark:text-neutral-400 tabular-nums">
                                        Subtotal ${refundPreTax.toFixed(2)} · IVU ${refundTax.toFixed(2)}
                                    </div>
                                )}
                                <div className="text-xl font-bold text-red-600 dark:text-red-400">
                                    {t('cmpx.return.total_refund', { amount: totalRefundAmount.toFixed(2) })}
                                </div>
                            </div>
                        </div>

                        {/* Reembolso: igual que el cobro (método + monto + agregar; billetes en efectivo) */}
                        <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-3 space-y-3">
                            <div className="flex items-center justify-between gap-2">
                                <div className="text-sm font-semibold">{t('cmpx.return.refund_method')}</div>
                                {foundSale?.paymentMethod && <div className="text-xs text-neutral-500">Pagada con: <span className="font-medium">{foundSale.paymentMethod}</span></div>}
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                                {refundOptions.map(m => (
                                    <button key={m} type="button" onClick={() => setRefundMethod(m)}
                                        className={`h-11 px-2 rounded-md border text-sm font-semibold truncate ${refundMethod === m ? 'border-teal-400 ring-2 ring-teal-400/40 bg-teal-50 dark:bg-teal-900/30 text-teal-800 dark:text-teal-200' : 'border-neutral-300 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-700'}`}>
                                        {m}
                                    </button>
                                ))}
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Monto a devolver en {refundMethod}</label>
                                <div className="flex items-stretch gap-2">
                                    <input type="text" inputMode="decimal" value={amountInput} onChange={e => setAmountInput(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addRefund(); } }}
                                        placeholder={pending.toFixed(2)}
                                        className="w-full text-3xl font-bold px-4 py-3 border-2 border-teal-400 rounded-md focus:ring-teal-500 focus:border-teal-500 dark:bg-neutral-900 placeholder:text-neutral-300 dark:placeholder:text-neutral-600 tabular-nums" autoComplete="off" />
                                    <button type="button" onClick={addRefund} disabled={!(typed > 0) || pending <= 0}
                                        className="px-5 whitespace-nowrap bg-neutral-200 dark:bg-neutral-600 rounded-md font-semibold hover:bg-neutral-300 dark:hover:bg-neutral-500 disabled:opacity-50">
                                        Agregar
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    <button type="button" onClick={() => setAmountInput(pending.toFixed(2))}
                                        className="px-3 py-1.5 text-sm font-semibold rounded-md border border-teal-400 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-900/40">Exacto</button>
                                    {isCashSel && CASH_DENOMINATIONS.map(amt => (
                                        <button key={amt} type="button" onClick={() => setAmountInput(prev => r2((parseFloat(prev) || 0) + amt).toFixed(2))}
                                            className="px-3 py-1.5 text-sm font-semibold rounded-md border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-700">+${amt}</button>
                                    ))}
                                    <button type="button" onClick={() => setAmountInput('')}
                                        className="px-3 py-1.5 text-sm font-semibold rounded-md border border-red-300 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30">Limpiar</button>
                                </div>
                                {customerChange > 0 && (
                                    <p className="text-sm font-medium text-amber-700 dark:text-amber-400 mt-2">Entrega ${typed.toFixed(2)} en billetes: el cliente le devuelve ${customerChange.toFixed(2)} de cambio.</p>
                                )}
                            </div>
                            {refunds.length > 0 && (
                                <ul className="divide-y divide-neutral-200 dark:divide-neutral-700 text-sm">
                                    {refunds.map(r => (
                                        <li key={r.method} className="flex items-center justify-between py-1.5">
                                            <span className="font-medium">{r.method}</span>
                                            <span className="flex items-center gap-3 tabular-nums">${r.amount.toFixed(2)}
                                                <button type="button" onClick={() => setRefunds(prev => prev.filter(x => x.method !== r.method))} className="text-red-500 hover:text-red-700" aria-label={`Quitar ${r.method}`}><TrashIconMini className="w-4 h-4" /></button>
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="rounded-md bg-neutral-50 dark:bg-neutral-900 px-3 py-2 flex justify-between"><span>Asignado</span><span className="font-bold tabular-nums">${refunded.toFixed(2)}</span></div>
                                <div className={`rounded-md px-3 py-2 flex justify-between ${pending > 0 ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'}`}><span>Por asignar</span><span className="font-bold tabular-nums">${pending.toFixed(2)}</span></div>
                            </div>
                            {refunds.length === 0 && <p className="text-xs text-neutral-500">Si no agrega nada, todo el reembolso va a {refundMethod}. Para dividirlo, escriba el monto de cada método y pulse Agregar.</p>}
                        </div>

                        <div>
                            <label className="text-sm font-medium">{t('cmpx.return.reason_label')}</label>
                            {/* Textarea plano: el editor enriquecido (contentEditable) interfería con la
                                composición de teclas muertas (p.ej. la "ñ") en algunos teclados. */}
                            <textarea
                                value={reason}
                                onChange={e => setReason(e.target.value)}
                                rows={3}
                                placeholder={t('cmpx.return.reason_ph') || 'Motivo de la devolución…'}
                                className={inputFormStyle + ' resize-y'}
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium">{t('cmpx.return.pin_label')}</label>
                            <PasswordInput
                                value={adminPassword}
                                onChange={e => setAdminPassword(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (!authorizing) handleSubmit(); } }}
                                className={inputFormStyle}
                                placeholder="****"
                                inputMode="numeric"
                                pattern="\d*"
                                maxLength={6}
                                required
                            />
                            <p className="text-xs text-neutral-500 mt-1">
                                {t('cmpx.return.pin_hint')}
                            </p>
                        </div>

                        <div className="flex justify-end space-x-2 pt-4 border-t dark:border-neutral-600">
                            <button onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES} disabled={authorizing}>{t('common.cancel')}</button>
                            <button onClick={handleSubmit} className={BUTTON_PRIMARY_SM_CLASSES} disabled={authorizing}>
                                {authorizing ? t('cmpx.common.authorizing') : t('cmpx.return.submit')}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};