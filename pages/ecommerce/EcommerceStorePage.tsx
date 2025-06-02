
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom'; // Added useNavigate
import { useData } from '../../contexts/DataContext';
import { useECommerceSettings } from '../../contexts/ECommerceSettingsContext';
import { Product, CartItem, ECommerceSettings as StoreSettingsType, Order } from '../../types'; // Added Order type
import { ShoppingCartIcon, PlusIcon, TrashIconMini } from '../../components/icons';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES, PREDEFINED_CLIENT_ID, DEFAULT_ECOMMERCE_SETTINGS } from '../../constants'; 

const ProductStoreCard: React.FC<{ product: Product; onAddToCart: (product: Product) => void; storePrimaryColor: string; }> = ({ product, onAddToCart, storePrimaryColor }) => {
    return (
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-md overflow-hidden flex flex-col transition-all duration-300 hover:shadow-xl dark:hover:shadow-primary/20">
            <img 
                src={product.imageUrl || 'https://picsum.photos/seed/defaultprod/400/300'} 
                alt={product.name} 
                className="w-full h-48 object-cover"
            />
            <div className="p-4 flex flex-col flex-grow">
                <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100 mb-1 truncate" title={product.name}>{product.name}</h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-2 line-clamp-2 flex-grow">{product.description || "Descripción no disponible."}</p>
                <div className="flex justify-between items-center mt-auto">
                    <p className="text-xl font-bold" style={{ color: storePrimaryColor }}>${product.unitPrice.toFixed(2)}</p>
                    <button 
                        onClick={() => onAddToCart(product)}
                        className={`${BUTTON_PRIMARY_SM_CLASSES} !bg-opacity-90 hover:!bg-opacity-100`}
                        style={{ backgroundColor: storePrimaryColor }}
                        aria-label={`Añadir ${product.name} al carrito`}
                    >
                        <PlusIcon /> Añadir
                    </button>
                </div>
            </div>
        </div>
    );
};


export const EcommerceStorePage: React.FC = () => {
    const { storeOwnerId } = useParams<{ storeOwnerId: string }>();
    const { getProductsByStoreOwner, addOrder } = useData();
    const { getSettingsForClient } = useECommerceSettings();
    const navigate = useNavigate(); // Added useNavigate hook
    
    const [storeSettings, setStoreSettings] = useState<StoreSettingsType | null>(null);
    const [storeProducts, setStoreProducts] = useState<Product[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    const effectiveStoreOwnerId = storeOwnerId || PREDEFINED_CLIENT_ID; // Fallback to demo client if no ID in URL

    useEffect(() => {
        if (effectiveStoreOwnerId) {
            setStoreSettings(getSettingsForClient(effectiveStoreOwnerId));
            setStoreProducts(getProductsByStoreOwner(effectiveStoreOwnerId));
        }
    }, [effectiveStoreOwnerId, getSettingsForClient, getProductsByStoreOwner]);

    const handleAddToCart = (product: Product) => {
        setCart(prevCart => {
            const existingItem = prevCart.find(item => item.id === product.id);
            if (existingItem) {
                return prevCart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prevCart, { ...product, quantity: 1 }];
        });
    };

    const handleRemoveFromCart = (productId: string) => {
        setCart(prevCart => prevCart.filter(item => item.id !== productId));
    };

    const handleUpdateQuantity = (productId: string, quantity: number) => {
        if (quantity <= 0) {
            handleRemoveFromCart(productId);
        } else {
            setCart(prevCart => prevCart.map(item => item.id === productId ? { ...item, quantity } : item));
        }
    };

    const cartTotal = useMemo(() => {
        return cart.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
    }, [cart]);

    const handleCheckout = () => {
        if (cart.length === 0) {
            alert("Tu carrito está vacío.");
            return;
        }
        // Navigate to the checkout page with cart data
        navigate('/checkout', { state: { cart, cartTotal, storeOwnerId: effectiveStoreOwnerId } });
        setIsCartOpen(false);
    };
    
    const filteredProducts = useMemo(() => {
        return storeProducts.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [storeProducts, searchTerm]);


    if (!storeSettings) {
        return <div className="p-6 text-center">Cargando tienda...</div>;
    }

    const storePrimaryColor = storeSettings.primaryColor || DEFAULT_ECOMMERCE_SETTINGS.primaryColor;

    return (
        <div className="min-h-screen bg-neutral-100 dark:bg-neutral-900">
            {/* Store Header */}
            <header style={{ backgroundColor: storePrimaryColor }} className="text-white shadow-md">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <div className="flex items-center">
                        {storeSettings.logoUrl && <img src={storeSettings.logoUrl} alt={`${storeSettings.storeName} logo`} className="h-10 mr-3 rounded" />}
                        <RouterLink to={`/store/${effectiveStoreOwnerId}`} className="text-2xl font-bold">{storeSettings.storeName}</RouterLink>
                    </div>
                    <div className="flex items-center gap-4">
                         <input 
                            type="text"
                            placeholder="Buscar productos..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="px-3 py-1.5 rounded-md border border-transparent focus:outline-none focus:ring-2 focus:ring-white/80 bg-white/20 placeholder-white/70 text-sm text-white"
                        />
                        <button onClick={() => setIsCartOpen(true)} className="relative p-2 hover:bg-white/10 rounded-full" aria-label="Ver carrito">
                            <ShoppingCartIcon className="w-6 h-6" />
                            {cart.length > 0 && (
                                <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                    {cart.reduce((sum, item) => sum + item.quantity, 0)}
                                </span>
                            )}
                        </button>
                        <RouterLink to="/login" className="text-sm hover:underline">Ingresar</RouterLink>
                    </div>
                </div>
            </header>

            {/* Product Listing */}
            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {filteredProducts.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {filteredProducts.map(product => (
                            <ProductStoreCard key={product.id} product={product} onAddToCart={handleAddToCart} storePrimaryColor={storePrimaryColor} />
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-neutral-500 dark:text-neutral-400 py-10">
                        {searchTerm ? 'No se encontraron productos con tu búsqueda.' : 'Esta tienda aún no tiene productos listados.'}
                    </p>
                )}
            </main>

            {/* Cart Modal/Sidebar */}
            {isCartOpen && (
                <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setIsCartOpen(false)}></div>
            )}
            <aside className={`fixed top-0 right-0 h-full w-full max-w-sm bg-white dark:bg-neutral-800 shadow-xl transform transition-transform duration-300 ease-in-out z-50 flex flex-col ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="flex justify-between items-center p-4 border-b border-neutral-200 dark:border-neutral-700">
                    <h2 className="text-xl font-semibold text-neutral-800 dark:text-neutral-100">Tu Carrito</h2>
                    <button onClick={() => setIsCartOpen(false)} className="text-neutral-500 dark:text-neutral-400 hover:text-red-500 dark:hover:text-red-400">&times;</button>
                </div>
                {cart.length === 0 ? (
                    <p className="p-6 text-center text-neutral-500 dark:text-neutral-400">Tu carrito está vacío.</p>
                ) : (
                    <div className="flex-grow overflow-y-auto p-4 space-y-3">
                        {cart.map(item => (
                            <div key={item.id} className="flex items-center justify-between p-2 bg-neutral-50 dark:bg-neutral-700/50 rounded-md">
                                <img src={item.imageUrl || 'https://picsum.photos/seed/cartitem/50/50'} alt={item.name} className="w-12 h-12 object-cover rounded mr-3"/>
                                <div className="flex-grow">
                                    <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200 truncate">{item.name}</p>
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400">${item.unitPrice.toFixed(2)} x {item.quantity}</p>
                                </div>
                                <div className="flex items-center">
                                     <input 
                                        type="number" 
                                        value={item.quantity} 
                                        onChange={(e) => handleUpdateQuantity(item.id, parseInt(e.target.value))}
                                        className="w-12 text-center text-sm border border-neutral-300 dark:border-neutral-600 rounded-md p-0.5 bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 mx-2"
                                        min="1"
                                    />
                                    <button onClick={() => handleRemoveFromCart(item.id)} className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1" aria-label="Quitar del carrito">
                                        <TrashIconMini className="w-4 h-4"/>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                {cart.length > 0 && (
                    <div className="p-4 border-t border-neutral-200 dark:border-neutral-700">
                        <div className="flex justify-between items-center mb-3">
                            <p className="text-lg font-semibold text-neutral-700 dark:text-neutral-200">Total:</p>
                            <p className="text-xl font-bold" style={{color: storePrimaryColor}}>${cartTotal.toFixed(2)}</p>
                        </div>
                        <button 
                            onClick={handleCheckout} 
                            className="w-full text-white font-semibold py-2.5 px-4 rounded-md transition-colors"
                            style={{ backgroundColor: storePrimaryColor }}
                        >
                            Proceder al Pago
                        </button>
                    </div>
                )}
            </aside>
            
            {/* Store Footer - Simple for now */}
            <footer className="py-8 text-center border-t border-neutral-200 dark:border-neutral-700 mt-12">
                <p className="text-sm text-neutral-500 dark:text-neutral-400">&copy; {new Date().getFullYear()} {storeSettings.storeName}. Potenciado por Pazzi.</p>
            </footer>
        </div>
    );
};
