

import React, { useEffect, useState } from 'react';
import { useParams, Link as RouterLink, useLocation } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useECommerceSettings } from '../../contexts/ECommerceSettingsContext';
import { Order as OrderType, ECommerceSettings as StoreSettingsType } from '../../types';
import { BUTTON_PRIMARY_CLASSES, ECOMMERCE_CLIENT_ID, DEFAULT_ECOMMERCE_SETTINGS } from '../../constants';
import { ArrowUturnLeftIcon, CreditCardIcon, BanknotesIcon, AthMovilIcon } from '../../components/icons'; // Added BanknotesIcon for other methods


export const OrderConfirmationPage: React.FC = () => {
    const { orderId } = useParams<{ orderId: string }>();
    const location = useLocation();
    const { state } = location;
    const { getOrderById } = useData(); // Correctly destructure here
    const { getSettingsForClient } = useECommerceSettings();

    const [order, setOrder] = useState<OrderType | null>(null);
    const [storeSettings, setStoreSettings] = useState<StoreSettingsType | null>(null);

    const effectiveStoreOwnerId = state?.storeOwnerId || order?.storeOwnerId || ECOMMERCE_CLIENT_ID;


    useEffect(() => {
        if (orderId) {
            const fetchedOrder = getOrderById(orderId); // Now this function exists
            setOrder(fetchedOrder || null);
            if (fetchedOrder) {
                 setStoreSettings(getSettingsForClient(fetchedOrder.storeOwnerId));
            } else if (state?.storeOwnerId) { // Fallback if order not found yet but state has owner
                setStoreSettings(getSettingsForClient(state.storeOwnerId));
            } else {
                setStoreSettings(getSettingsForClient(ECOMMERCE_CLIENT_ID)); // Ultimate fallback
            }
        }
    }, [orderId, getOrderById, getSettingsForClient, state?.storeOwnerId]);

    const storePrimaryColor = storeSettings?.primaryColor || DEFAULT_ECOMMERCE_SETTINGS.primaryColor;

    const getPaymentMethodIcon = (method: string) => {
        if (method.toLowerCase().includes('tarjeta')) return <CreditCardIcon className="inline mr-1.5"/>;
        if (method.toLowerCase().includes('ath móvil')) return <AthMovilIcon className="inline mr-1.5"/>;
        // Could add more specific icons for PayPal
        return <BanknotesIcon className="inline mr-1.5"/>; // Generic for others
    }


    if (!order) {
        return <div className="min-h-screen bg-neutral-100 dark:bg-neutral-900 flex flex-col items-center justify-center p-4 text-neutral-600 dark:text-neutral-300">Cargando confirmación de pedido...</div>;
    }

    return (
        <div className="min-h-screen bg-neutral-100 dark:bg-neutral-900 py-8 px-4">
             <header className="mb-8 text-center">
                <RouterLink to={`/store/${effectiveStoreOwnerId}`} className="inline-block mb-4">
                    {storeSettings?.logoUrl ? (
                        <img src={storeSettings.logoUrl} alt={`${storeSettings.storeName} logo`} className="h-12 mx-auto" />
                    ) : (
                        <h1 className="text-3xl font-bold" style={{color: storePrimaryColor}}>{storeSettings?.storeName || 'Tienda'}</h1>
                    )}
                </RouterLink>
            </header>
            <div className="max-w-2xl mx-auto bg-white dark:bg-neutral-800 p-6 sm:p-8 rounded-lg shadow-xl">
                <div className="text-center mb-6">
                    <svg className="w-16 h-16 text-green-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    <h2 className="text-2xl sm:text-3xl font-semibold text-neutral-800 dark:text-neutral-100">¡Gracias por tu compra!</h2>
                    <p className="text-neutral-600 dark:text-neutral-300 mt-2">Tu pedido ha sido recibido y está siendo procesado.</p>
                </div>

                <div className="border-t border-b border-neutral-200 dark:border-neutral-700 py-4 my-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-neutral-500 dark:text-neutral-400">Número de Pedido:</span>
                        <span className="font-medium text-neutral-700 dark:text-neutral-200">#{order.id.substring(0, 8).toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-neutral-500 dark:text-neutral-400">Fecha del Pedido:</span>
                        <span className="font-medium text-neutral-700 dark:text-neutral-200">{new Date(order.date).toLocaleDateString('es-ES')}</span>
                    </div>
                     <div className="flex justify-between">
                        <span className="text-neutral-500 dark:text-neutral-400">Método de Pago:</span>
                        <span className="font-medium text-neutral-700 dark:text-neutral-200 flex items-center">
                            {getPaymentMethodIcon(order.paymentMethod)} {order.paymentMethod}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-neutral-500 dark:text-neutral-400">Total del Pedido:</span>
                        <span className="font-bold text-lg" style={{color: storePrimaryColor}}>${order.totalAmount.toFixed(2)}</span>
                    </div>
                </div>
                
                <div className="mb-6 text-sm">
                    <h4 className="font-semibold text-neutral-700 dark:text-neutral-200 mb-1">Enviado a:</h4>
                    <p className="text-neutral-600 dark:text-neutral-300">{order.clientName}</p>
                    <p className="text-neutral-600 dark:text-neutral-300">{order.shippingAddress}</p>
                </div>

                <div className="mb-6">
                    <h4 className="font-semibold text-neutral-700 dark:text-neutral-200 mb-2">Artículos:</h4>
                    <ul className="space-y-2 text-sm max-h-48 overflow-y-auto pr-2">
                        {order.items.map(item => (
                            <li key={item.id} className="flex justify-between items-center p-2 bg-neutral-50 dark:bg-neutral-700/50 rounded-md">
                                <div>
                                    <span className="font-medium text-neutral-600 dark:text-neutral-300">{item.name}</span>
                                    <span className="text-xs text-neutral-500 dark:text-neutral-400 ml-1">(x{item.quantity})</span>
                                </div>
                                <span className="text-neutral-700 dark:text-neutral-200">${(item.unitPrice * item.quantity).toFixed(2)}</span>
                            </li>
                        ))}
                    </ul>
                </div>
                
                <div className="text-center mt-8">
                    <RouterLink 
                        to={`/store/${effectiveStoreOwnerId}`} 
                        className={`${BUTTON_PRIMARY_CLASSES} flex items-center justify-center w-full sm:w-auto sm:inline-flex`}
                        style={{backgroundColor: storePrimaryColor}}
                    >
                        <ArrowUturnLeftIcon /> Seguir Comprando
                    </RouterLink>
                     <p className="mt-4 text-xs text-neutral-500 dark:text-neutral-400">
                        Recibirás un email de confirmación en {order.clientEmail}.
                    </p>
                </div>
            </div>
        </div>
    );
};