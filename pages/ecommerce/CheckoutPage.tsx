
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link as RouterLink, useParams } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useECommerceSettings } from '../../contexts/ECommerceSettingsContext';
import { CartItem, Order, ECommerceSettings } from '../../types';
import { BUTTON_PRIMARY_CLASSES, inputFormStyle, BUTTON_SECONDARY_CLASSES, PREDEFINED_CLIENT_ID, DEFAULT_ECOMMERCE_SETTINGS } from '../../constants';
import { CreditCardIcon, ArrowUturnLeftIcon } from '../../components/icons'; // Added ArrowUturnLeftIcon

interface CheckoutLocationState {
    cart: CartItem[];
    cartTotal: number;
    storeOwnerId: string;
}

export const CheckoutPage: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { addOrder } = useData();
    const { getSettingsForClient } = useECommerceSettings();

    const { cart, cartTotal, storeOwnerId } = (location.state as CheckoutLocationState || {});
    
    const effectiveStoreOwnerId = storeOwnerId || PREDEFINED_CLIENT_ID; // Fallback
    const storeSettings = getSettingsForClient(effectiveStoreOwnerId);
    const storePrimaryColor = storeSettings.primaryColor || DEFAULT_ECOMMERCE_SETTINGS.primaryColor;


    const [customerDetails, setCustomerDetails] = useState({
        clientName: '',
        clientEmail: '',
        shippingAddress: '',
        city: '',
        postalCode: ''
    });
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'Tarjeta' | 'PayPal' | 'ATH Móvil'>('Tarjeta');
    const [cardDetails, setCardDetails] = useState({ number: '', expiry: '', cvc: '' });
    const [athConfirmationNumber, setAthConfirmationNumber] = useState('');

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);


    useEffect(() => {
        if (!cart || cart.length === 0 || !storeOwnerId) {
            console.warn("Checkout page loaded without cart data or storeOwnerId. Redirecting.");
            navigate(`/store/${effectiveStoreOwnerId}`);
        }
    }, [cart, storeOwnerId, navigate, effectiveStoreOwnerId]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setCustomerDetails(prev => ({ ...prev, [name]: value }));
    };
    
    const handleCardInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setCardDetails(prev => ({ ...prev, [name]: value }));
    };

    const validateForm = (): boolean => {
        for (const key in customerDetails) {
            if (!customerDetails[key as keyof typeof customerDetails]) {
                setError(`El campo "${key.replace(/([A-Z])/g, ' $1').trim()}" es obligatorio.`);
                return false;
            }
        }
        if (selectedPaymentMethod === 'Tarjeta') {
            for (const key in cardDetails) {
                if (!cardDetails[key as keyof typeof cardDetails]) {
                    setError(`El campo de tarjeta "${key}" es obligatorio.`);
                    return false;
                }
            }
        }
        if (selectedPaymentMethod === 'ATH Móvil' && !athConfirmationNumber) {
            setError("El número de confirmación de ATH Móvil es obligatorio.");
            return false;
        }
        setError(null);
        return true;
    };


    const handleSubmitOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        setIsLoading(true);
        
        // Simulate payment processing
        await new Promise(resolve => setTimeout(resolve, 1500));

        try {
            const orderData: Omit<Order, 'id' | 'date' | 'storeOwnerId'> = {
                ...customerDetails,
                totalAmount: cartTotal,
                items: cart,
                status: 'Pendiente',
                paymentMethod: selectedPaymentMethod, // Save the payment method
            };
            
            // The addOrder function in DataContext will generate ID and date
            // addOrder now expects the storeOwnerId as a second argument
            const newOrderId = addOrder(orderData, effectiveStoreOwnerId); 

            setIsLoading(false);
            navigate(`/order-confirmation/${newOrderId}`, { 
                state: { storeOwnerId: effectiveStoreOwnerId, orderId: newOrderId } // Pass orderId for confirmation page
            });

        } catch (err) {
            console.error("Error creating order:", err);
            setError("Hubo un error al procesar tu pedido. Por favor, inténtalo de nuevo.");
            setIsLoading(false);
        }
    };

    if (!cart || cart.length === 0) {
        return (
            <div className="min-h-screen bg-neutral-100 dark:bg-neutral-900 flex flex-col items-center justify-center p-4">
                <p className="text-neutral-600 dark:text-neutral-300 text-lg mb-4">Tu carrito está vacío o la sesión de checkout ha expirado.</p>
                <RouterLink 
                    to={`/store/${effectiveStoreOwnerId}`} 
                    className={`${BUTTON_PRIMARY_CLASSES} flex items-center`}
                >
                    <ArrowUturnLeftIcon /> Volver a la Tienda
                </RouterLink>
            </div>
        );
    }
    

    return (
        <div className="min-h-screen bg-neutral-100 dark:bg-neutral-900 py-8 px-4">
            <header className="mb-8 text-center">
                <RouterLink to={`/store/${effectiveStoreOwnerId}`} className="inline-block mb-4">
                    {storeSettings.logoUrl ? (
                        <img src={storeSettings.logoUrl} alt={`${storeSettings.storeName} logo`} className="h-12 mx-auto" />
                    ) : (
                        <h1 className="text-3xl font-bold" style={{color: storePrimaryColor}}>{storeSettings.storeName}</h1>
                    )}
                </RouterLink>
                <h2 className="text-2xl font-semibold text-neutral-800 dark:text-neutral-100">Finalizar Compra</h2>
            </header>

            <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Order Summary */}
                <section className="lg:col-span-1 bg-white dark:bg-neutral-800 p-6 rounded-lg shadow-md order-last lg:order-first">
                    <h3 className="text-xl font-semibold text-neutral-700 dark:text-neutral-200 mb-4">Resumen del Pedido</h3>
                    <div className="space-y-3 mb-4 max-h-60 overflow-y-auto pr-2">
                        {cart.map(item => (
                            <div key={item.id} className="flex justify-between items-start text-sm">
                                <div className="flex-grow">
                                    <p className="text-neutral-600 dark:text-neutral-300 font-medium">{item.name} (x{item.quantity})</p>
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400">SKU: {item.skus?.[0] || 'N/A'}</p>
                                </div>
                                <p className="text-neutral-700 dark:text-neutral-200 font-medium">${(item.unitPrice * item.quantity).toFixed(2)}</p>
                            </div>
                        ))}
                    </div>
                    <div className="border-t border-neutral-200 dark:border-neutral-700 pt-4">
                        <div className="flex justify-between text-lg font-semibold text-neutral-800 dark:text-neutral-100">
                            <span>Total:</span>
                            <span style={{color: storePrimaryColor}}>${cartTotal.toFixed(2)}</span>
                        </div>
                    </div>
                     <RouterLink 
                        to={`/store/${effectiveStoreOwnerId}`} 
                        className="mt-6 text-sm text-neutral-600 dark:text-neutral-400 hover:underline flex items-center justify-center"
                    >
                        <ArrowUturnLeftIcon /> Volver a la Tienda
                    </RouterLink>
                </section>

                {/* Shipping and Payment Form */}
                <section className="lg:col-span-2 bg-white dark:bg-neutral-800 p-6 rounded-lg shadow-md">
                    <form onSubmit={handleSubmitOrder} className="space-y-6">
                        <div>
                            <h3 className="text-lg font-medium text-neutral-700 dark:text-neutral-200 mb-3">Información de Contacto y Envío</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input type="text" name="clientName" placeholder="Nombre Completo" value={customerDetails.clientName} onChange={handleInputChange} className={inputFormStyle} required />
                                <input type="email" name="clientEmail" placeholder="Email" value={customerDetails.clientEmail} onChange={handleInputChange} className={inputFormStyle} required />
                            </div>
                            <textarea name="shippingAddress" placeholder="Dirección de Envío Completa" value={customerDetails.shippingAddress} onChange={handleInputChange as any} rows={3} className={`${inputFormStyle} mt-4`} required />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                <input type="text" name="city" placeholder="Ciudad" value={customerDetails.city} onChange={handleInputChange} className={inputFormStyle} required />
                                <input type="text" name="postalCode" placeholder="Código Postal" value={customerDetails.postalCode} onChange={handleInputChange} className={inputFormStyle} required />
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-medium text-neutral-700 dark:text-neutral-200 mb-3">Método de Pago</h3>
                            <div className="space-y-3 mb-4">
                                {(['Tarjeta', 'PayPal', 'ATH Móvil'] as const).map(method => (
                                    <label key={method} className={`flex items-center p-3 border rounded-md cursor-pointer transition-all ${selectedPaymentMethod === method ? 'border-primary ring-2 ring-primary bg-primary/5 dark:bg-primary/10' : 'border-neutral-300 dark:border-neutral-600 hover:border-neutral-400 dark:hover:border-neutral-500'}`}>
                                        <input type="radio" name="paymentMethod" value={method} checked={selectedPaymentMethod === method} onChange={() => setSelectedPaymentMethod(method)} className="form-radio h-4 w-4 text-primary focus:ring-primary/50 mr-3"/>
                                        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200">{method}</span>
                                    </label>
                                ))}
                            </div>

                            {selectedPaymentMethod === 'Tarjeta' && (
                                <div className="space-y-3 p-4 border border-neutral-200 dark:border-neutral-700 rounded-md bg-neutral-50 dark:bg-neutral-700/30">
                                    <div className="relative">
                                        <CreditCardIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
                                        <input type="text" name="number" placeholder="Número de Tarjeta (simulado)" value={cardDetails.number} onChange={handleCardInputChange} className={`${inputFormStyle} pl-10`} required />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <input type="text" name="expiry" placeholder="MM/AA (simulado)" value={cardDetails.expiry} onChange={handleCardInputChange} className={inputFormStyle} required />
                                        <input type="text" name="cvc" placeholder="CVC (simulado)" value={cardDetails.cvc} onChange={handleCardInputChange} className={inputFormStyle} required />
                                    </div>
                                </div>
                            )}
                            {selectedPaymentMethod === 'PayPal' && (
                                <div className="p-4 border border-blue-200 dark:border-blue-700 rounded-md bg-blue-50 dark:bg-blue-900/30 text-center">
                                    <p className="text-sm text-blue-700 dark:text-blue-300">Serás redirigido a PayPal para completar tu pago (simulación).</p>
                                </div>
                            )}
                            {selectedPaymentMethod === 'ATH Móvil' && (
                                 <div className="p-4 border border-pink-200 dark:border-pink-700 rounded-md bg-pink-50 dark:bg-pink-900/30">
                                    <p className="text-sm text-pink-700 dark:text-pink-300 mb-2">
                                        Realiza tu pago a <strong className="font-mono">/PazziTiendaOnline</strong> (ejemplo) en ATH Móvil.
                                    </p>
                                    <input 
                                        type="text" 
                                        name="athConfirmationNumber" 
                                        placeholder="Número de Confirmación ATH Móvil" 
                                        value={athConfirmationNumber} 
                                        onChange={(e) => setAthConfirmationNumber(e.target.value)} 
                                        className={inputFormStyle} 
                                        required 
                                    />
                                </div>
                            )}
                        </div>
                        
                        {error && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 p-2 rounded-md">{error}</p>}

                        <button 
                            type="submit" 
                            className={`${BUTTON_PRIMARY_CLASSES} w-full !py-3 text-base`} 
                            style={{backgroundColor: storePrimaryColor}}
                            disabled={isLoading}
                        >
                            {isLoading ? 'Procesando Pago...' : `Pagar $${cartTotal.toFixed(2)} Ahora`}
                        </button>
                    </form>
                </section>
            </div>
        </div>
    );
};
