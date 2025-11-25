import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link as RouterLink, useParams } from 'react-router-dom'; // Added useNavigate
import { useData } from '../../contexts/DataContext';
import { useECommerceSettings } from '../../contexts/ECommerceSettingsContext';
import { CartItem, Order, ECommerceSettings as StoreSettingsType } from '../../types'; // Added Order type
import { BUTTON_PRIMARY_CLASSES, inputFormStyle, BUTTON_SECONDARY_CLASSES, ECOMMERCE_CLIENT_ID, DEFAULT_ECOMMERCE_SETTINGS } from '../../constants'; // Changed PREDEFINED_CLIENT_ID
import { CreditCardIcon, ArrowUturnLeftIcon } from '../../components/icons'; 
import { RichTextEditor } from '../../components/ui/RichTextEditor';

interface CheckoutLocationState {
    cart: CartItem[];
    cartTotal: number;
    storeOwnerId: string;
}

const PaymentMethodSelector: React.FC<{
    selectedMethod: 'Tarjeta' | 'PayPal' | 'ATH Móvil';
    onSelectMethod: (method: 'Tarjeta' | 'PayPal' | 'ATH Móvil') => void;
    primaryColor: string;
}> = ({ selectedMethod, onSelectMethod, primaryColor }) => {
    const paymentOptions = [
        { id: 'Tarjeta', label: 'Tarjeta de Crédito/Débito' },
        { id: 'PayPal', label: 'PayPal' },
        { id: 'ATH Móvil', label: 'ATH Móvil' },
    ] as const;

    return (
        <div className="space-y-3">
            {paymentOptions.map(option => (
                <button
                    key={option.id}
                    type="button"
                    onClick={() => onSelectMethod(option.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all duration-200 focus:outline-none
                        ${selectedMethod === option.id
                            ? `border-transparent ring-2 ring-offset-1 dark:ring-offset-neutral-800 shadow-md ring-[${primaryColor}]`
                            : 'border-neutral-300 dark:border-neutral-600 hover:border-neutral-400 dark:hover:border-neutral-500 hover:shadow-sm'
                        }`}
                    style={selectedMethod === option.id ? { borderColor: primaryColor } : {}}
                >
                    <span className={`font-medium text-sm ${selectedMethod === option.id ? '' : 'text-neutral-700 dark:text-neutral-200'}`}
                          style={selectedMethod === option.id ? { color: primaryColor } : {}}
                    >
                        {option.label}
                    </span>
                    {selectedMethod === option.id && (
                        <span className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                        </span>
                    )}
                </button>
            ))}
        </div>
    );
};


export const CheckoutPage: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { addOrder } = useData();
    const { getSettingsForClient } = useECommerceSettings();

    const { cart, cartTotal, storeOwnerId } = (location.state as CheckoutLocationState || {});
    
    const effectiveStoreOwnerId = storeOwnerId || ECOMMERCE_CLIENT_ID; // Fallback
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
                            <div className="mt-4">
                                <RichTextEditor
                                    value={customerDetails.shippingAddress}
                                    onChange={(value) => setCustomerDetails(prev => ({ ...prev, shippingAddress: value }))}
                                    placeholder="Dirección de Envío Completa"
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                <input type="text" name="city" placeholder="Ciudad" value={customerDetails.city} onChange={handleInputChange} className={inputFormStyle} required />
                                <input type="text" name="postalCode" placeholder="Código Postal" value={customerDetails.postalCode} onChange={handleInputChange} className={inputFormStyle} required />
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-medium text-neutral-700 dark:text-neutral-200 mb-3">Método de Pago</h3>
                            <PaymentMethodSelector 
                                selectedMethod={selectedPaymentMethod}
                                onSelectMethod={setSelectedPaymentMethod}
                                primaryColor={storePrimaryColor}
                            />

                            {selectedPaymentMethod === 'Tarjeta' && (
                                <div className="mt-4 space-y-3 p-4 border border-neutral-200 dark:border-neutral-700 rounded-md">
                                     <h4 className="text-sm font-medium text-neutral-600 dark:text-neutral-300 flex items-center">
                                        <CreditCardIcon className="mr-2" /> Detalles de la Tarjeta
                                    </h4>
                                    <input type="text" name="number" placeholder="Número de Tarjeta" value={cardDetails.number} onChange={handleCardInputChange} className={inputFormStyle} required />
                                    <div className="grid grid-cols-2 gap-3">
                                        <input type="text" name="expiry" placeholder="MM/AA (Expiración)" value={cardDetails.expiry} onChange={handleCardInputChange} className={inputFormStyle} required />
                                        <input type="text" name="cvc" placeholder="CVC" value={cardDetails.cvc} onChange={handleCardInputChange} className={inputFormStyle} required />
                                    </div>
                                </div>
                            )}
                             {selectedPaymentMethod === 'ATH Móvil' && (
                                <div className="mt-4 space-y-3 p-4 border border-neutral-200 dark:border-neutral-700 rounded-md">
                                     <h4 className="text-sm font-medium text-neutral-600 dark:text-neutral-300">Confirmación ATH Móvil</h4>
                                    <input type="text" name="athConfirmation" placeholder="Número de Confirmación de Pago" value={athConfirmationNumber} onChange={(e) => setAthConfirmationNumber(e.target.value)} className={inputFormStyle} required />
                                     <p className="text-xs text-neutral-500 dark:text-neutral-400">Realiza el pago a: <span className="font-semibold">/PazziTienda</span> e ingresa el número de confirmación.</p>
                                </div>
                            )}
                            {selectedPaymentMethod === 'PayPal' && (
                                <div className="mt-4 p-4 border border-neutral-200 dark:border-neutral-700 rounded-md text-center">
                                    <p className="text-sm text-neutral-600 dark:text-neutral-300">Serás redirigido a PayPal para completar tu pago.</p>
                                    {/* Actual PayPal button would go here */}
                                </div>
                            )}
                        </div>
                        
                        {error && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 p-2 rounded-md">{error}</p>}

                        <button 
                            type="submit" 
                            className={`${BUTTON_PRIMARY_CLASSES} w-full text-lg py-3 mt-2`} 
                            style={{backgroundColor: storePrimaryColor}}
                            disabled={isLoading}
                        >
                            {isLoading ? 'Procesando Pedido...' : `Pagar $${cartTotal.toFixed(2)}`}
                        </button>
                    </form>
                </section>
            </div>
        </div>
    );
};