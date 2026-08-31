import React, { useState } from 'react';
import { ECommerceSettings } from '../../types';

const SAMPLE = [
    { name: 'Producto de ejemplo 1', price: 24.99, cat: 'Categoría A' },
    { name: 'Producto de ejemplo 2', price: 9.50, cat: 'Categoría B' },
    { name: 'Producto de ejemplo 3', price: 149.00, cat: 'Categoría A' },
    { name: 'Producto de ejemplo 4', price: 5.00, cat: 'Categoría C' },
];

/**
 * Vista previa EN VIVO de la tienda pública mientras se edita el diseño.
 * Refleja plantilla, colores, nombre, logo, banner y los elementos visibles.
 * Con alternador Escritorio / Móvil (sin marco de teléfono).
 */
export const StorePreview: React.FC<{ settings: ECommerceSettings }> = ({ settings }) => {
    const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
    const s: any = settings;
    const primary = s.primaryColor || '#0f766e';
    const secondary = s.secondaryColor || primary;
    const accent = s.accentColor || primary;
    const template = s.template || 'Moderno';
    const showCart = s.showCart !== false;
    const showLogin = s.showLogin !== false;
    const showRegister = s.showRegister !== false;
    const showSearch = s.showSearch !== false;
    const isMobile = device === 'mobile';
    const cats = Array.from(new Set(SAMPLE.map(p => p.cat)));

    const CartBtn = () => showCart ? (
        <div className="relative">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" /></svg>
            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[8px] rounded-full h-3.5 w-3.5 flex items-center justify-center">2</span>
        </div>
    ) : null;

    const header = template === 'Marketplace' || template === 'Ofertas' ? (
        <>
            <div style={{ background: primary }} className="text-white px-3 py-2 flex items-center gap-2 text-xs">
                {s.logoUrl && <img src={s.logoUrl} alt="" className="h-5 rounded" />}
                <span className="font-bold whitespace-nowrap">{s.storeName || 'Mi Tienda'}</span>
                {showSearch && <div className="flex-1 bg-white rounded px-2 py-1 text-neutral-400 text-[10px] min-w-0 truncate">Buscar…</div>}
                <CartBtn />
                {showLogin && <span className="hidden sm:inline">Ingresar</span>}
            </div>
            <div style={{ background: secondary }} className="text-white px-3 py-1 flex gap-3 text-[10px] overflow-x-auto">
                <span className="font-bold whitespace-nowrap">Todos</span>
                {cats.map(c => <span key={c} className="whitespace-nowrap opacity-90">{c}</span>)}
            </div>
        </>
    ) : template === 'Boutique' ? (
        <>
            <div className="bg-white border-b px-3 py-2 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                    {s.logoUrl && <img src={s.logoUrl} alt="" className="h-5 rounded" />}
                    <span className="font-bold" style={{ color: primary }}>{s.storeName || 'Mi Tienda'}</span>
                </div>
                <div className="flex items-center gap-2" style={{ color: primary }}>
                    {showRegister && <span>Registrarse</span>}
                    {showLogin && <span>Ingresar</span>}
                    <CartBtn />
                </div>
            </div>
            <div style={{ background: primary }} className="text-white text-center px-3 py-6">
                <div className="text-lg font-extrabold">{s.storeName || 'Mi Tienda'}</div>
                {s.tagline && <div className="text-[10px] opacity-90 mt-1">{s.tagline}</div>}
                <span className="inline-block mt-2 px-3 py-1 rounded-full text-[10px] font-semibold" style={{ background: accent }}>{s.bannerCtaText || 'Ver productos'}</span>
            </div>
        </>
    ) : (
        <>
            <div style={{ background: primary }} className="text-white px-3 py-2 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                    {s.logoUrl && <img src={s.logoUrl} alt="" className="h-5 rounded" />}
                    <span className="font-bold">{s.storeName || 'Mi Tienda'}</span>
                </div>
                <div className="flex items-center gap-2">
                    {showSearch && <div className="bg-white/20 rounded px-2 py-1 text-white/70 text-[10px]">Buscar…</div>}
                    <CartBtn />
                    {showRegister && <span>Registrarse</span>}
                    {showLogin && <span>Ingresar</span>}
                </div>
            </div>
            {(s.bannerUrl || s.tagline) && (
                <div style={{ background: primary }} className="text-white text-center px-3 py-4">
                    <div className="text-base font-bold">{s.storeName || 'Mi Tienda'}</div>
                    {s.tagline && <div className="text-[10px] opacity-90 mt-1">{s.tagline}</div>}
                </div>
            )}
        </>
    );

    const gridCols = isMobile
        ? 'grid-cols-2'
        : (template === 'Marketplace' || template === 'Ofertas' || template === 'Catalogo') ? 'grid-cols-4' : 'grid-cols-3';

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Vista previa en vivo</span>
                <div className="inline-flex rounded-md border border-neutral-300 dark:border-neutral-600 overflow-hidden text-xs">
                    <button onClick={() => setDevice('desktop')} className={`px-3 py-1 ${!isMobile ? 'bg-primary text-white' : 'text-neutral-600 dark:text-neutral-300'}`}>🖥️ Escritorio</button>
                    <button onClick={() => setDevice('mobile')} className={`px-3 py-1 ${isMobile ? 'bg-primary text-white' : 'text-neutral-600 dark:text-neutral-300'}`}>📱 Móvil</button>
                </div>
            </div>
            <div className="bg-neutral-100 dark:bg-neutral-900 rounded-lg p-3 overflow-hidden">
                <div className={`mx-auto bg-white dark:bg-neutral-800 rounded-lg overflow-hidden shadow-lg border border-neutral-200 dark:border-neutral-700 transition-all ${isMobile ? 'max-w-[300px]' : 'w-full'}`}>
                    {/* Barra de navegador */}
                    <div className="bg-neutral-200 dark:bg-neutral-700 px-2 py-1 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-red-400" /><span className="w-2 h-2 rounded-full bg-yellow-400" /><span className="w-2 h-2 rounded-full bg-green-400" />
                        <span className="ml-2 text-[9px] text-neutral-500 dark:text-neutral-400 truncate">tutienda.ppazi.com</span>
                    </div>
                    <div className="max-h-[520px] overflow-y-auto">
                        {header}
                        {template === 'Ofertas' && (
                            <div className="grid grid-cols-4 gap-1 p-2">
                                {['🔥 Ofertas', '⚡ Envío', '💰 Precios', '⭐ Calidad'].map((b, i) => (
                                    <div key={i} className="rounded p-1.5 text-white text-[8px] font-bold text-center" style={{ background: [primary, secondary, accent, primary][i] }}>{b}</div>
                                ))}
                            </div>
                        )}
                        <div className={`grid ${gridCols} ${template === 'Boutique' || template === 'Minimalista' ? 'gap-x-2 gap-y-4' : 'gap-2'} p-3`}>
                            {SAMPLE.map((p, i) => {
                                // ── Ofertas (Temu) ──
                                if (template === 'Ofertas') {
                                    const off = 20 + (i * 12) % 45;
                                    const orig = p.price / (1 - off / 100);
                                    return (
                                        <div key={i} className="border border-neutral-100 dark:border-neutral-700 rounded-md overflow-hidden">
                                            <div className="relative h-14 bg-neutral-200 dark:bg-neutral-700"><span className="absolute top-0.5 left-0.5 text-[7px] font-extrabold text-white px-1 rounded" style={{ background: '#f43f5e' }}>-{off}%</span></div>
                                            <div className="p-1.5">
                                                <div className="text-[8px] text-neutral-600 dark:text-neutral-300 truncate">{p.name}</div>
                                                <div className="flex items-baseline gap-1 mt-0.5">
                                                    <span className="text-[11px] font-extrabold" style={{ color: '#f43f5e' }}>${p.price.toFixed(2)}</span>
                                                    <span className="text-[7px] text-neutral-400 line-through">${orig.toFixed(2)}</span>
                                                </div>
                                                {showCart && <div className="text-white text-[7px] text-center py-0.5 rounded-full mt-1 font-bold" style={{ background: '#f97316' }}>Agregar</div>}
                                            </div>
                                        </div>
                                    );
                                }
                                // ── Marketplace / Catálogo (Amazon/ML) ──
                                if (template === 'Marketplace' || template === 'Catalogo') {
                                    return (
                                        <div key={i} className="border border-neutral-200 dark:border-neutral-700 rounded overflow-hidden bg-white dark:bg-neutral-800">
                                            <div className="h-14 bg-neutral-100 dark:bg-neutral-700" />
                                            <div className="p-1.5">
                                                <div className="text-[8px] text-neutral-600 dark:text-neutral-300 truncate">{p.name}</div>
                                                <div className="text-amber-400 text-[8px] leading-none">★★★★<span className="text-neutral-300">★</span></div>
                                                <div className="text-[11px] font-bold text-neutral-900 dark:text-neutral-50">${p.price.toFixed(2)}</div>
                                                <div className="text-[7px] font-semibold" style={{ color: '#16a34a' }}>Envío gratis</div>
                                            </div>
                                        </div>
                                    );
                                }
                                // ── Boutique ──
                                if (template === 'Boutique') {
                                    return (
                                        <div key={i} className="text-center">
                                            <div className="h-16 bg-neutral-200 dark:bg-neutral-700" />
                                            <div className="text-[8px] uppercase tracking-wide font-medium text-neutral-700 dark:text-neutral-200 mt-1 truncate px-1">{p.name}</div>
                                            <div className="text-[9px]" style={{ color: primary }}>${p.price.toFixed(2)}</div>
                                            {showCart && <div className="inline-block mt-1 px-2 py-0.5 text-[7px] uppercase tracking-widest border" style={{ borderColor: primary, color: primary }}>Añadir</div>}
                                        </div>
                                    );
                                }
                                // ── Minimalista ──
                                if (template === 'Minimalista') {
                                    return (
                                        <div key={i}>
                                            <div className="h-16 bg-neutral-200 dark:bg-neutral-700 mb-1.5" />
                                            <div className="flex items-start justify-between gap-1">
                                                <div className="min-w-0">
                                                    <div className="text-[8px] text-neutral-700 dark:text-neutral-200 truncate">{p.name}</div>
                                                    <div className="text-[8px] text-neutral-500">${p.price.toFixed(2)}</div>
                                                </div>
                                                {showCart && <span className="text-[7px] underline" style={{ color: primary }}>Añadir</span>}
                                            </div>
                                        </div>
                                    );
                                }
                                // ── Moderno / Clásico (default) ──
                                return (
                                    <div key={i} className="border border-neutral-200 dark:border-neutral-700 rounded-md overflow-hidden shadow-sm">
                                        <div className="h-14 bg-neutral-200 dark:bg-neutral-700" />
                                        <div className="p-1.5">
                                            <div className="text-[9px] font-semibold text-neutral-700 dark:text-neutral-200 truncate">{p.name}</div>
                                            <div className="flex items-center justify-between mt-1">
                                                <span className="text-[10px] font-bold" style={{ color: primary }}>${p.price.toFixed(2)}</span>
                                                {showCart && <span className="text-white text-[8px] px-1.5 py-0.5 rounded" style={{ background: accent }}>+ Añadir</span>}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="text-center text-[8px] text-neutral-400 py-2 border-t border-neutral-100 dark:border-neutral-700">© {s.storeName || 'Mi Tienda'}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};
