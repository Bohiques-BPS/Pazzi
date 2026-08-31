
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom';
import { useECommerceSettings } from '../../contexts/ECommerceSettingsContext';
import { Product, CartItem, ECommerceSettings as StoreSettingsType } from '../../types';
import { ShoppingCartIcon, PlusIcon, TrashIconMini } from '../../components/icons';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES, ECOMMERCE_CLIENT_ID, DEFAULT_ECOMMERCE_SETTINGS, ADMIN_USER_ID } from '../../constants';
import { publicStoreService, type PublicProduct } from '../../services/publicStore';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';
import { usePublicT } from '../../hooks/usePublicTranslation';
import { useAuth } from '../../contexts/AuthContext';

const ProductStoreCard: React.FC<{ product: PublicProduct; onAddToCart: (product: PublicProduct) => void; storePrimaryColor: string; showCart?: boolean; }> = ({ product, onAddToCart, storePrimaryColor, showCart = true }) => {
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
                    {showCart && (
                        <button
                            onClick={() => onAddToCart(product)}
                            className={`${BUTTON_PRIMARY_SM_CLASSES} !bg-opacity-90 hover:!bg-opacity-100`}
                            style={{ backgroundColor: storePrimaryColor }}
                            aria-label={t('store.add_aria', { name: product.name })}
                        >
                            <PlusIcon /> {t('store.add')}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};


export const EcommerceStorePage: React.FC = () => {
    const { storeOwnerId } = useParams<{ storeOwnerId: string }>();
    const { getSettingsForClient } = useECommerceSettings();
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    const [storeSettings, setStoreSettings] = useState<StoreSettingsType | null>(null);
    const [storeProducts, setStoreProducts] = useState<PublicProduct[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(true);
    const t = usePublicT();
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [priceMax, setPriceMax] = useState('');   // filtro de precio máx (plantilla Autopartes)

    // El link "Mi Tienda (Vista Previa)" usa ADMIN_USER_ID como marcador; para la vista previa del
    // dueño usamos SU id real. Un visitante público (sin sesión) usa el id de la URL tal cual.
    const isPlaceholderOwner = !storeOwnerId || storeOwnerId === ADMIN_USER_ID;
    const effectiveStoreOwnerId = (isPlaceholderOwner && currentUser?.id) ? currentUser.id : (storeOwnerId || currentUser?.id || ECOMMERCE_CLIENT_ID);

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
        // Primero el context (datos cacheados) o el default; en paralelo intenta BE público.
        // Siempre dejamos settings NO nulo para que la tienda renderice (no se quede en "Cargando").
        setStoreSettings((getSettingsForClient(effectiveStoreOwnerId) as any) || (DEFAULT_ECOMMERCE_SETTINGS as any));
        publicStoreService.getStoreSettings(effectiveStoreOwnerId)
            .then(s => { if (s) setStoreSettings(s as any); })
            .catch(() => setStoreSettings(prev => prev || (DEFAULT_ECOMMERCE_SETTINGS as any)));
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
    
    const categories = useMemo(
        () => Array.from(new Set(storeProducts.map(p => (p as any).category).filter(Boolean) as string[])).slice(0, 12),
        [storeProducts]
    );
    const filteredProducts = useMemo(() => {
        const q = searchTerm.toLowerCase();
        const max = parseFloat(priceMax);
        return storeProducts.filter(p =>
            p.name.toLowerCase().includes(q) &&
            (!categoryFilter || (p as any).category === categoryFilter) &&
            (!(max > 0) || (Number(p.unitPrice) || 0) <= max)
        );
    }, [storeProducts, searchTerm, categoryFilter, priceMax]);


    if (!storeSettings) {
        return <div className="p-6 text-center">{t('store.loading')}</div>;
    }

    const storePrimaryColor = storeSettings.primaryColor || DEFAULT_ECOMMERCE_SETTINGS.primaryColor;
    const storeAccent = (storeSettings as any).accentColor || storePrimaryColor;
    const storeSecondary = (storeSettings as any).secondaryColor || storePrimaryColor;
    const template = (storeSettings as any).template || 'Moderno';
    // Elementos configurables de la tienda (default: activos).
    const ss: any = storeSettings;
    const showCart = ss.showCart !== false;
    const showLogin = ss.showLogin !== false;
    const showRegister = ss.showRegister !== false;
    const showSearch = ss.showSearch !== false;
    const bannerCtaText = ss.bannerCtaText || t('store.see_products') || 'Ver productos';
    const bannerCtaLink = ss.bannerCtaLink || '#productos';
    const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
    // La grilla se adapta al template.
    const gridClass = (template === 'Catalogo' || template === 'Marketplace' || template === 'Ofertas')
        ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3'
        : (template === 'Minimalista' || template === 'Boutique')
        ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8'
        : 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6';

    return (
        <div className="min-h-screen bg-neutral-100 dark:bg-neutral-900">
            {/* Store Header — varía según la plantilla */}
            {(template === 'Marketplace' || template === 'Ofertas') ? (
                <>
                    {/* Barra estilo marketplace: logo + buscador ancho + carrito */}
                    <header style={{ backgroundColor: storePrimaryColor }} className="text-white shadow-md">
                        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-4">
                            <div className="flex items-center flex-shrink-0">
                                {storeSettings.logoUrl && <img src={storeSettings.logoUrl} alt="" className="h-9 mr-2 rounded" />}
                                <RouterLink to={`/store/${effectiveStoreOwnerId}`} className="text-xl font-bold whitespace-nowrap">{storeSettings.storeName}</RouterLink>
                            </div>
                            {showSearch && <input type="text" placeholder={t('store.search_ph')} value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                className="flex-1 min-w-0 px-4 py-2 rounded-md text-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-white/80" />}
                            {!showSearch && <div className="flex-1" />}
                            {showCart && <button onClick={() => setIsCartOpen(true)} className="relative p-2 hover:bg-white/10 rounded-full flex-shrink-0" aria-label={t('store.view_cart_aria')}>
                                <ShoppingCartIcon className="w-6 h-6" />
                                {cartCount > 0 && <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">{cartCount}</span>}
                            </button>}
                            {showRegister && <RouterLink to="/register" className="text-sm hover:underline hidden sm:inline flex-shrink-0">{t('store.register') || 'Registrarse'}</RouterLink>}
                            {showLogin && <RouterLink to="/login" className="text-sm hover:underline hidden sm:inline flex-shrink-0">{t('store.login')}</RouterLink>}
                        </div>
                    </header>
                    {/* Menú de categorías */}
                    {categories.length > 0 && (
                        <div style={{ backgroundColor: storeSecondary }} className="text-white text-sm">
                            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-2 flex gap-4 overflow-x-auto">
                                <button onClick={() => setCategoryFilter('')} className={`whitespace-nowrap hover:underline ${!categoryFilter ? 'font-bold' : 'opacity-90'}`}>{t('store.all') || 'Todos'}</button>
                                {categories.map(cat => (
                                    <button key={cat} onClick={() => setCategoryFilter(cat)} className={`whitespace-nowrap hover:underline ${categoryFilter === cat ? 'font-bold' : 'opacity-90'}`}>{cat}</button>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            ) : template === 'Boutique' ? (
                <>
                    {/* Encabezado limpio (blanco) + hero grande */}
                    <header className="bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 shadow-sm">
                        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                            <div className="flex items-center">
                                {storeSettings.logoUrl && <img src={storeSettings.logoUrl} alt="" className="h-10 mr-3 rounded" />}
                                <RouterLink to={`/store/${effectiveStoreOwnerId}`} className="text-2xl font-bold" style={{ color: storePrimaryColor }}>{storeSettings.storeName}</RouterLink>
                            </div>
                            <div className="flex items-center gap-4">
                                {showSearch && <input type="text" placeholder={t('store.search_ph')} value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                    className="px-3 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-600 text-sm focus:outline-none focus:ring-2 dark:bg-neutral-900" />}
                                {showRegister && <RouterLink to="/register" className="text-sm hover:underline" style={{ color: storePrimaryColor }}>{t('store.register') || 'Registrarse'}</RouterLink>}
                                {showLogin && <RouterLink to="/login" className="text-sm hover:underline" style={{ color: storePrimaryColor }}>{t('store.login')}</RouterLink>}
                                {showCart && <button onClick={() => setIsCartOpen(true)} className="relative p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700" style={{ color: storePrimaryColor }} aria-label={t('store.view_cart_aria')}>
                                    <ShoppingCartIcon className="w-6 h-6" />
                                    {cartCount > 0 && <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">{cartCount}</span>}
                                </button>}
                            </div>
                        </div>
                    </header>
                    <div className="relative overflow-hidden" style={{ backgroundColor: storePrimaryColor }}>
                        {(storeSettings as any).bannerUrl && <img src={(storeSettings as any).bannerUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50" />}
                        <div className="relative container mx-auto px-4 py-20 sm:py-28 text-center text-white">
                            <h2 className="text-3xl sm:text-5xl font-extrabold drop-shadow">{storeSettings.storeName}</h2>
                            {(storeSettings as any).tagline && <p className="mt-3 text-base sm:text-xl opacity-95 max-w-2xl mx-auto drop-shadow">{(storeSettings as any).tagline}</p>}
                            <a href={bannerCtaLink} className="inline-block mt-6 px-6 py-3 rounded-full font-semibold shadow-lg" style={{ backgroundColor: storeAccent }}>{bannerCtaText}</a>
                        </div>
                    </div>
                </>
            ) : (
                <>
                    {/* Encabezado estándar (Moderno / Catálogo / Clásico / Minimalista) */}
                    <header style={{ backgroundColor: storePrimaryColor }} className="text-white shadow-md">
                        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                            <div className="flex items-center">
                                {storeSettings.logoUrl && <img src={storeSettings.logoUrl} alt={`${storeSettings.storeName} logo`} className="h-10 mr-3 rounded" />}
                                <RouterLink to={`/store/${effectiveStoreOwnerId}`} className="text-2xl font-bold">{storeSettings.storeName}</RouterLink>
                            </div>
                            <div className="flex items-center gap-4">
                                {showSearch && <input type="text" placeholder={t('store.search_ph')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                                    className="px-3 py-1.5 rounded-md border border-transparent focus:outline-none focus:ring-2 focus:ring-white/80 bg-white/20 placeholder-white/70 text-sm text-white" />}
                                {showCart && <button onClick={() => setIsCartOpen(true)} className="relative p-2 hover:bg-white/10 rounded-full" aria-label={t('store.view_cart_aria')}>
                                    <ShoppingCartIcon className="w-6 h-6" />
                                    {cartCount > 0 && <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">{cartCount}</span>}
                                </button>}
                                {showRegister && <RouterLink to="/register" className="text-sm hover:underline">{t('store.register') || 'Registrarse'}</RouterLink>}
                                {showLogin && <RouterLink to="/login" className="text-sm hover:underline">{t('store.login')}</RouterLink>}
                            </div>
                        </div>
                    </header>
                    {((storeSettings as any).bannerUrl || (storeSettings as any).tagline) && (
                        <div className="relative overflow-hidden" style={{ backgroundColor: storePrimaryColor }}>
                            {(storeSettings as any).bannerUrl && <img src={(storeSettings as any).bannerUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />}
                            <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 text-center text-white">
                                <h2 className="text-2xl sm:text-4xl font-bold drop-shadow">{storeSettings.storeName}</h2>
                                {(storeSettings as any).tagline && <p className="mt-2 text-sm sm:text-lg opacity-95 max-w-2xl mx-auto drop-shadow">{(storeSettings as any).tagline}</p>}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Banners promocionales (plantilla Ofertas / Temu) */}
            {template === 'Ofertas' && (
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                            { t: '🔥 Ofertas del día', c: storePrimaryColor },
                            { t: '⚡ Envío rápido', c: storeSecondary },
                            { t: '💰 Mejores precios', c: storeAccent },
                            { t: '⭐ Calidad garantizada', c: storePrimaryColor },
                        ].map((b, i) => (
                            <div key={i} className="rounded-xl p-4 text-white font-bold text-sm shadow-sm" style={{ backgroundColor: b.c }}>{b.t}</div>
                        ))}
                    </div>
                </div>
            )}

            {/* Listado de productos — varía según la plantilla */}
            {template === 'Mayorista' ? (
                <main id="productos" className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-3">
                    {filteredProducts.length === 0 ? (
                        <p className="text-center text-neutral-500 dark:text-neutral-400 py-10">{searchTerm ? t('store.no_products_search') : t('store.no_products')}</p>
                    ) : filteredProducts.map(product => (
                        <div key={product.id} className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 items-start">
                            <img src={product.imageUrl || 'https://via.placeholder.com/120'} alt={product.name} className="w-24 h-24 object-cover rounded-md flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-neutral-800 dark:text-neutral-100">{product.name}</h3>
                                <p className="text-lg font-bold mt-1" style={{ color: storePrimaryColor }}>{t('store.from') || 'Desde'} ${product.unitPrice.toFixed(2)}</p>
                                <p className="text-xs text-neutral-500 mt-1">{t('store.min_order') || 'Pedido mínimo'}: 1 · {t('store.supplier') || 'Proveedor'}: {storeSettings.storeName}</p>
                            </div>
                            <div className="flex flex-col gap-2 flex-shrink-0 w-full sm:w-40">
                                {showCart && <button onClick={() => handleAddToCart(product)} className="px-4 py-2 rounded-md text-white text-sm font-semibold" style={{ backgroundColor: storePrimaryColor }}>{t('store.add')}</button>}
                                <a href={`mailto:${(storeSettings as any).contactEmail || ''}`} className="px-4 py-2 rounded-md text-sm font-semibold text-center border" style={{ borderColor: storeAccent, color: storeAccent }}>{t('store.contact')}</a>
                            </div>
                        </div>
                    ))}
                </main>
            ) : template === 'Autopartes' ? (
                <main id="productos" className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-6">
                    {/* Sidebar de filtros */}
                    <aside className="w-full md:w-56 flex-shrink-0 space-y-4">
                        <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4">
                            <h4 className="text-sm font-bold mb-2 text-neutral-800 dark:text-neutral-100">{t('store.filter_category') || 'Categoría'}</h4>
                            <div className="space-y-1 max-h-56 overflow-y-auto">
                                <button onClick={() => setCategoryFilter('')} className={`block text-sm text-left w-full ${!categoryFilter ? 'font-bold' : 'text-neutral-600 dark:text-neutral-300'}`} style={!categoryFilter ? { color: storePrimaryColor } : undefined}>{t('store.all') || 'Todos'}</button>
                                {categories.map(cat => (
                                    <button key={cat} onClick={() => setCategoryFilter(cat)} className={`block text-sm text-left w-full ${categoryFilter === cat ? 'font-bold' : 'text-neutral-600 dark:text-neutral-300'}`} style={categoryFilter === cat ? { color: storePrimaryColor } : undefined}>{cat}</button>
                                ))}
                            </div>
                        </div>
                        <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4">
                            <h4 className="text-sm font-bold mb-2 text-neutral-800 dark:text-neutral-100">{t('store.filter_price') || 'Precio máximo'}</h4>
                            <input type="number" min="0" value={priceMax} onChange={e => setPriceMax(e.target.value)} placeholder="$ máx." className="w-full px-3 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-600 text-sm dark:bg-neutral-900" />
                        </div>
                    </aside>
                    {/* Grilla */}
                    <div className="flex-1">
                        {filteredProducts.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                {filteredProducts.map(product => (
                                    <ProductStoreCard key={product.id} product={product} onAddToCart={handleAddToCart} storePrimaryColor={storePrimaryColor} showCart={showCart} />
                                ))}
                            </div>
                        ) : <p className="text-center text-neutral-500 dark:text-neutral-400 py-10">{searchTerm ? t('store.no_products_search') : t('store.no_products')}</p>}
                    </div>
                </main>
            ) : (
                <main id="productos" className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {filteredProducts.length > 0 ? (
                        <div className={gridClass}>
                            {filteredProducts.map(product => (
                                <ProductStoreCard key={product.id} product={product} onAddToCart={handleAddToCart} storePrimaryColor={storePrimaryColor} showCart={showCart} />
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-neutral-500 dark:text-neutral-400 py-10">
                            {searchTerm ? t('store.no_products_search') : t('store.no_products')}
                        </p>
                    )}
                </main>
            )}

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
