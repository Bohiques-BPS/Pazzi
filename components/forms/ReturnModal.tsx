import React, { useState, useMemo, useEffect } from 'react';
import { Modal } from '../Modal';
import { Sale, CartItem, UserRole, Client } from '../../types';
import { useData } from '../../contexts/DataContext';
import { inputFormStyle, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import { MagnifyingGlassIcon, TrashIconMini } from '../icons';
import { RichTextEditor } from '../ui/RichTextEditor';
import { authService } from '../../services/auth';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';
import { PasswordInput } from '../ui/PasswordInput';
import { useTranslation } from '../../contexts/GlobalSettingsContext';

type ReturnItemPayload = CartItem & { customRefundAmount?: number; returnToStock: boolean };

interface ReturnItemDetails {
    quantity: number;
    customRefundAmount?: number;
    returnToStock: boolean;
};

interface ReturnModalProps {
    isOpen: boolean;
    onClose: () => void;
    onProcessReturn: (originalSaleId: string, itemsToReturn: (CartItem & { customRefundAmount?: number; returnToStock: boolean })[], reason: string, adminPassword: string) => void;
}

export const ReturnModal: React.FC<ReturnModalProps> = ({ isOpen, onClose, onProcessReturn }) => {
    const { t } = useTranslation();
    const { sales, getClientById, clients } = useData();
    const [saleIdInput, setSaleIdInput] = useState('');
    const [foundSale, setFoundSale] = useState<Sale | null>(null);
    const [foundSales, setFoundSales] = useState<Sale[]>([]); // For client name search results
    const [itemsToReturnDetails, setItemsToReturnDetails] = useState<Map<string, ReturnItemDetails>>(new Map());
    const [reason, setReason] = useState('');
    const [adminPassword, setAdminPassword] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isOpen) {
            setSaleIdInput('');
            setFoundSale(null);
            setFoundSales([]);
            setItemsToReturnDetails(new Map());
            setReason('');
            setAdminPassword('');
            setError('');
        }
    }, [isOpen]);

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
    
        // Attempt to find by ID first (more specific)
        const saleById = sales.find(s => s.id.toLowerCase() === searchTerm.toLowerCase() || s.id.slice(-6).toUpperCase() === searchTerm.toUpperCase());
    
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
            `${c.name} ${c.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
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

    const totalRefundAmount = useMemo(() => {
        let total = 0;
        itemsToReturnDetails.forEach((details, itemId) => {
            const originalItem = foundSale?.items.find(i => i.id === itemId);
            if (!originalItem) return;

            if (details.customRefundAmount !== undefined) {
                total += details.customRefundAmount;
            } else {
                total += calculateRefundForItem(originalItem, details.quantity);
            }
        });
        return total;
    }, [itemsToReturnDetails, foundSale]);

    const [authorizing, setAuthorizing] = useState(false);

    const handleSubmit = async () => {
        if (!foundSale || itemsToReturnDetails.size === 0 || !adminPassword) {
            setError(t('cmpx.return.err_incomplete'));
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
        onProcessReturn(foundSale.id, itemsForProcessing, reason, adminPassword);
    };

    const client = foundSale ? getClientById(foundSale.clientId || '') : null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('cmpx.return.title')} size="3xl">
            <div className="space-y-4">
                <div className="flex items-end gap-2">
                    <div className="flex-grow">
                        <label className="text-sm font-medium">{t('cmpx.return.search_label')}</label>
                        <input type="text" value={saleIdInput} onChange={e => setSaleIdInput(e.target.value)} placeholder={t('cmpx.return.search_ph')} className={inputFormStyle} />
                    </div>
                    <button onClick={handleFindSale} className={BUTTON_SECONDARY_SM_CLASSES}>
                        <MagnifyingGlassIcon className="w-4 h-4 mr-1.5"/> {t('common.search')}
                    </button>
                </div>
                {error && <p className="text-sm text-center text-red-500">{error}</p>}
                
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

                        <div className="text-right text-xl font-bold text-red-600 dark:text-red-400">
                            {t('cmpx.return.total_refund', { amount: totalRefundAmount.toFixed(2) })}
                        </div>

                        <div>
                            <label className="text-sm font-medium">{t('cmpx.return.reason_label')}</label>
                            <RichTextEditor value={reason} onChange={setReason} />
                        </div>

                        <div>
                            <label className="text-sm font-medium">{t('cmpx.return.pin_label')}</label>
                            <PasswordInput
                                value={adminPassword}
                                onChange={e => setAdminPassword(e.target.value)}
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