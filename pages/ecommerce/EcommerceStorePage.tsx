
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom';
import { useECommerceSettings } from '../../contexts/ECommerceSettingsContext';
import { Product, CartItem, ECommerceSettings as StoreSettingsType } from '../../types';
import { ShoppingCartIcon, PlusIcon, TrashIconMini } from '../../components/icons';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES, ECOMMERCE_CLIENT_ID, DEFAULT_ECOMMERCE_SETTINGS } from '../../constants';
import { publicStoreService, type PublicProduct } from '../../services/publicStore';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';
import { usePublicT } from '../../hooks/usePublicTranslation';

const ProductStoreCard: React.FC<{ product: PublicProduct; onAddToCart: (product: PublicProduct) => void; storePrimaryColor: string; }> = ({ product, onAddToCart, storePrimaryColor }) => {
    const t = usePublicT();
    return (
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-md overflow-hidden flex flex-col transition-all duration-300 hover:shadow-xl dark:hover:shadow-primary/20">
            <img 
                src={product.imageUrl || 'https://picsum.photos/seed/defaultprod/400/300'} 
                alt={product.name} 
                className="w-full h-48 object-cover"
            />
            <div className="p-4 flex flex-col flex-grow">
                <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100 mb-1 truncate" title={product.name}>{product.name}</h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-2 line-clamp-2 flex-grow">{product.description || t('store.no_description')}</p>
                <div className="flex justify-between items-center mt-auto">
                    <p className="text-xl font-bold" style={{ color: storePrimaryColor }}>${product.unitPrice.toFixed(2)}</p>
                    <button 
                        onClick={() => onAddToCart(product)}
                        className={`${BUTTON_PRIMARY_SM_CLASSES} !bg-opacity-90 hover:!bg-opacity-100`}
                        style={{ backgroundColor: storePrimaryColor }}
                        aria-label={t('store.add_aria', { name: product.name })}
                    >
                        <PlusIcon /> {t('store.add')}
                    </button>
                </div>
            </div>
        </div>
    );
};


export const EcommerceStorePage: React.FC = () => {
    const { storeOwnerId } = useParams<{ storeOwnerId: string }>();
    const { getSettingsForClient } = useECommerceSettings();
    const navigate = useNavigate();

    const [storeSettings, setStoreSettings] = useState<StoreSettingsType | null>(null);
    const [storeProducts, setStoreProducts] = useState<PublicProduct[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(true);
    const t = usePublicT();
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const effectiveStoreOwnerId = storeOwnerId || ECOMMERCE_CLIENT_ID;

    // Cargar productos públicos desde el BE (sin auth)
    useEffect(() => {
        let cancelled = false;
        setLoadingProducts(true);
        publicStoreService.getProducts({ storeOwnerId: effectiveStoreOwnerId, limit: 100 })
            .then(data => { if (!cancelled) setStoreProducts(data); })
            .catch(err => {
                if (cancelled) return;
                if (err instanceof ApiError) toast.error(err.message);
            })
            .finally(() => { if (!cancelled) setLoadingProducts(false); });
        return () => { cancelled = true; };
    }, [effectiveStoreOwnerId]);

    // Cargar settings de la tienda (puede ser desde context legacy o BE)
    useEffect(() => {
        if (!effectiveStoreOwnerId) return;
        // Primero el context (datos cacheados); en paralelo intenta BE público
        setStoreSettings(getSettingsForClient(effectiveStoreOwnerId));
        publicStoreService.getStoreSettings(effectiveStoreOwnerId)
            .then(s => setStoreSettings(s as any))
            .catch(() => { /* mantener fallback */ });
    }, [effectiveStoreOwnerId, getSettingsForClient]);

    const handleAddToCart = (product: PublicProduct) => {
        setCart(prevCart => {
            const existingItem = prevCart.find(item => item.id === product.id);
            if (existingItem) {
                if (existingItem.quantity >= product.totalStock) {
                    toast.warning(t('store.max_stock', { max: product.totalStock }));
                    return prevCart;
                }
                return prevCart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
            }
            if (product.totalStock <= 0) {
                toast.error(t('store.out_of_stock'));
                return prevCart;
            }
            return [...prevCart, { ...(product as unknown as Product), quantity: 1 }];
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
            toast.error(t('store.cart_empty'));
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
        return <div className="p-6 text-center">{t('store.loading')}</div>;
    }

    const storePrimaryColor = storeSettings.primaryColor || DEFAULT_ECOMMERCE_SETTINGS.primaryColor;
    const storeAccent = (storeSettings as any).accentColor || storePrimaryColor;
    const template = (storeSettings as any).template || 'Moderno';
    // La grilla se adapta al template: Catálogo = más denso; Minimalista = más aire.
    const gridClass = template === 'Catalogo'
        ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3'
        : template === 'Minimalista'
        ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8'
        : 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6';

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
                            placeholder={t('store.search_ph')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="px-3 py-1.5 rounded-md border border-transparent focus:outline-none focus:ring-2 focus:ring-white/80 bg-white/20 placeholder-white/70 text-sm text-white"
                        />
                        <button onClick={() => setIsCartOpen(true)} className="relative p-2 hover:bg-white/10 rounded-full" aria-label={t('store.view_cart_aria')}>
                            <ShoppingCartIcon className="w-6 h-6" />
                            {cart.length > 0 && (
                                <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                    {cart.reduce((sum, item) => sum + item.quantity, 0)}
                                </span>
                            )}
                        </button>
                        <RouterLink to="/login" className="text-sm hover:underline">{t('store.login')}</RouterLink>
                    </div>
                </div>
            </header>

            {/* Hero / banner */}
            {((storeSettings as any).bannerUrl || (storeSettings as any).tagline) && (
                <div className="relative overflow-hidden" style={{ backgroundColor: storePrimaryColor }}>
                    {(storeSettings as any).bannerUrl && (
                        <img src={(storeSettings as any).bannerUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />
                    )}
                    <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 text-center text-white">
                        <h2 className="text-2xl sm:text-4xl font-bold drop-shadow">{storeSettings.storeName}</h2>
                        {(storeSettings as any).tagline && (
                            <p className="mt-2 text-sm sm:text-lg opacity-95 max-w-2xl mx-auto drop-shadow">{(storeSettings as any).tagline}</p>
                        )}
                    </div>
                </div>
            )}

            {/* Product Listing */}
            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {filteredProducts.length > 0 ? (
                    <div className={gridClass}>
                        {filteredProducts.map(product => (
                            <ProductStoreCard key={product.id} product={product} onAddToCart={handleAddToCart} storePrimaryColor={storePrimaryColor} />
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-neutral-500 dark:text-neutral-400 py-10">
                        {searchTerm ? t('store.no_products_search') : t('store.no_products')}
                    </p>
                )}
            </main>

            {/* Cart Modal/Sidebar */}
            {isCartOpen && (
                <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setIsCartOpen(false)}></div>
            )}
            <aside className={`fixed top-0 right-0 h-full w-full max-w-sm bg-white dark:bg-neutral-800 shadow-xl transform transition-transform duration-300 ease-in-out z-50 flex flex-col ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="flex justify-between items-center p-4 border-b border-neutral-200 dark:border-neutral-700">
                    <h2 className="text-xl font-semibold text-neutral-800 dark:text-neutral-100">{t('store.your_cart')}</h2>
                    <button onClick={() => setIsCartOpen(false)} className="text-neutral-500 dark:text-neutral-400 hover:text-red-500 dark:hover:text-red-400">&times;</button>
                </div>
                {cart.length === 0 ? (
                    <p className="p-6 text-center text-neutral-500 dark:text-neutral-400">{t('store.cart_empty')}</p>
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
                                    <button onClick={() => handleRemoveFromCart(item.id)} className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1" aria-label={t('store.remove_aria')}>
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
                            <p className="text-lg font-semibold text-neutral-700 dark:text-neutral-200">{t('store.total')}:</p>
                            <p className="text-xl font-bold" style={{color: storePrimaryColor}}>${cartTotal.toFixed(2)}</p>
                        </div>
                        <button 
                            onClick={handleCheckout} 
                            className="w-full text-white font-semibold py-2.5 px-4 rounded-md transition-colors"
                            style={{ backgroundColor: storePrimaryColor }}
                        >
                            {t('store.checkout_btn')}
                        </button>
                    </div>
                )}
            </aside>
            
            {/* Store Footer - Simple for now */}
            <footer className="py-8 text-center border-t border-neutral-200 dark:border-neutral-700 mt-12">
                <p className="text-sm text-neutral-500 dark:text-neutral-400">&copy; {new Date().getFullYear()} {storeSettings.storeName}. {t('store.powered_by')}</p>
            </footer>
        </div>
    );
};
