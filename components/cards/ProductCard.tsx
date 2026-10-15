import React, { useState } from 'react';
import { Product } from '../../types'; // Adjusted path
import { EllipsisVerticalIcon, ListBulletIcon as HistoryIcon, Cog6ToothIcon as AdjustIcon, EditIcon, DeleteIcon } from '../icons'; // Adjusted path
import { useData } from '../../contexts/DataContext'; // For getting default branch stock (optional display)
import { useTranslation } from '../../contexts/GlobalSettingsContext';
import { API_URL } from '../../services/api';
import logo from '../../assets/logo.png';

interface ProductCardProps {
    product: Product;
    onEdit: (product: Product) => void;
    onRequestDelete: (productId: string) => void;
    onAdjustStock: (product: Product, branchId: string) => void;
    onViewHistory?: (product: Product) => void;
    /** Selección múltiple (checkbox). Si no se pasan, no se muestra el checkbox. */
    selected?: boolean;
    onToggleSelect?: (productId: string) => void;
}

const PinIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
        <path d="M12 21s-6-5.686-6-10a6 6 0 1 1 12 0c0 4.314-6 10-6 10z" />
        <circle cx="12" cy="11" r="2.2" />
    </svg>
);

export const ProductCard: React.FC<ProductCardProps> = ({ product, onEdit, onRequestDelete, onAdjustStock, onViewHistory, selected, onToggleSelect }) => {
    const [actionsOpen, setActionsOpen] = useState(false);
    const { t } = useTranslation();
    const { branches } = useData();
    const activeBranches = branches.filter(b => b.isActive);

    const categoryName = (typeof product.category === 'object'
        ? (product.category as any)?.name
        : product.category) || null;

    const imgSrc = product.imageUrl
        ? (product.imageUrl.startsWith('http')
            ? product.imageUrl
            : `${API_URL.replace('/api', '')}${product.imageUrl.startsWith('/') ? '' : '/'}${product.imageUrl}`)
        : logo;

    const totalStock = activeBranches.reduce((sum, b) => {
        const entry = (product.stockByBranch || []).find(sb => sb.branchId === b.id);
        return sum + (entry ? entry.quantity : 0);
    }, 0);

    const firstSku = (product.skus || [])
        .map(s => (typeof s === 'object' ? (s as any).sku : s))
        .filter(Boolean)[0] || '';

    // Ubicación mostrada: una sola sucursal → su nombre; varias → "N sucursales".
    const locationLabel = activeBranches.length === 0
        ? '—'
        : activeBranches.length === 1
            ? activeBranches[0].name
            : t('cmp.productcard.n_branches', { n: activeBranches.length });

    // Píldora de stock: verde (en stock), ámbar (pocas), rojo (sin stock) o morado (variaciones).
    const stockPill = product.hasVariations
        ? { text: `${product.variations?.length || 0} ${t('cmp.productcard.variations_short') || 'var.'}`, dot: 'bg-indigo-500', cls: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300' }
        : totalStock <= 0
            ? { text: t('cmp.productcard.out_of_stock') || 'Sin stock', dot: 'bg-red-500', cls: 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300' }
            : totalStock <= 5
                ? { text: t('cmp.productcard.available_count', { n: totalStock }), dot: 'bg-amber-500', cls: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' }
                : { text: t('cmp.productcard.in_stock_count', { n: totalStock }), dot: 'bg-emerald-500', cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' };

    return (
        <div
            onClick={() => onEdit(product)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') onEdit(product); }}
            title={t('cmp.productcard.edit_product')}
            className={`group bg-white dark:bg-neutral-800 rounded-xl border overflow-hidden transition-all duration-200 cursor-pointer flex flex-col hover:shadow-lg hover:-translate-y-0.5 ${selected ? 'border-primary ring-2 ring-primary/60' : 'border-neutral-200 dark:border-neutral-700 hover:border-primary/40'}`}
        >
            {/* Imagen */}
            <div className="relative w-full h-44 bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center overflow-hidden">
                <img
                    src={imgSrc}
                    alt={product.name}
                    className={product.imageUrl
                        ? 'w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.03]'
                        : 'h-16 object-contain opacity-40'}
                    onError={(e) => { const t = e.target as HTMLImageElement; if (!t.dataset.fallback) { t.dataset.fallback = '1'; t.src = logo; t.className = 'h-16 object-contain opacity-40'; } }}
                />

                {/* Checkbox de selección */}
                {onToggleSelect && (
                    <label className="absolute top-3 left-3 flex items-center justify-center bg-white dark:bg-neutral-900 rounded-md p-1 shadow-sm border border-neutral-200 dark:border-neutral-600 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                        <input
                            type="checkbox"
                            checked={!!selected}
                            onChange={() => onToggleSelect(product.id)}
                            className="w-4 h-4 rounded border-neutral-300 text-primary focus:ring-primary cursor-pointer"
                            aria-label={t('cmp.productcard.select') || 'Seleccionar'}
                        />
                    </label>
                )}

                {/* Menú de acciones */}
                <div className="absolute top-3 right-3" onClick={(e) => e.stopPropagation()}>
                    <button onClick={(e) => { e.stopPropagation(); setActionsOpen(!actionsOpen); }} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/95 dark:bg-neutral-900/90 text-neutral-600 dark:text-neutral-200 hover:bg-primary hover:text-white dark:hover:bg-primary border border-neutral-200 dark:border-neutral-600 shadow-sm backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary transition-colors" aria-haspopup="true" aria-expanded={actionsOpen} aria-controls={`product-actions-${product.id}`} aria-label={t('cmp.productcard.options') || 'Opciones'} title={t('cmp.productcard.options') || 'Opciones'}>
                        <EllipsisVerticalIcon className="w-5 h-5" />
                    </button>
                    {actionsOpen && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setActionsOpen(false)} />
                            <div id={`product-actions-${product.id}`} className="absolute right-0 mt-1 w-52 bg-white dark:bg-neutral-700 rounded-md shadow-lg py-1 z-20 border border-neutral-200 dark:border-neutral-600">
                                <button onClick={() => { onEdit(product); setActionsOpen(false); }} className="flex items-center w-full text-left px-3 py-1.5 text-base text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-600">
                                    <EditIcon className="w-4 h-4 mr-2" /> {t('common.edit')}
                                </button>
                                {!product.hasVariations && activeBranches.map(branch => (
                                    <button key={branch.id} onClick={() => { onAdjustStock(product, branch.id); setActionsOpen(false); }} className="flex items-center w-full text-left px-3 py-1.5 text-base text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-600">
                                        <AdjustIcon className="w-4 h-4 mr-2" /> {t('cmp.productcard.adjust_in', { branch: branch.name }) || `Ajustar: ${branch.name}`}
                                    </button>
                                ))}
                                {onViewHistory && (
                                    <button onClick={() => { onViewHistory(product); setActionsOpen(false); }} className="flex items-center w-full text-left px-3 py-1.5 text-base text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-600">
                                        <HistoryIcon className="w-4 h-4 mr-2" /> {t('cmp.productcard.view_movements')}
                                    </button>
                                )}
                                <button onClick={() => { onRequestDelete(product.id); setActionsOpen(false); }} className="flex items-center w-full text-left px-3 py-1.5 text-base text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-600/50">
                                    <DeleteIcon className="w-4 h-4 mr-2" /> {t('common.delete')}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Cuerpo */}
            <div className="p-4 flex flex-col flex-grow">
                {/* Categoría con punto */}
                {categoryName && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" aria-hidden="true" />
                        <span className="truncate">{categoryName}</span>
                    </span>
                )}

                <h3 className="text-base font-semibold text-neutral-800 dark:text-neutral-100 line-clamp-2 leading-snug">{product.name}</h3>

                <div className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2 min-h-[2.4rem]" dangerouslySetInnerHTML={{ __html: product.description || t('cmp.productcard.no_description') }}></div>

                {/* Precio + píldora de stock */}
                <div className="flex items-end justify-between gap-2 mt-3">
                    <div>
                        <p className="text-[11px] uppercase tracking-wide text-neutral-400 dark:text-neutral-500 leading-none mb-1">{t('cmp.productcard.base_price_label') || 'Precio base'}</p>
                        <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-50 leading-none">${product.unitPrice.toFixed(2)}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${stockPill.cls}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${stockPill.dot}`} aria-hidden="true" />
                        {stockPill.text}
                    </span>
                </div>

                {/* Pie: ubicación + SKU */}
                <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-700 text-xs text-neutral-400 dark:text-neutral-500">
                    <span className="inline-flex items-center gap-1 min-w-0">
                        <PinIcon className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{locationLabel}</span>
                    </span>
                    {firstSku && <span className="truncate max-w-[45%] text-right" title={firstSku}>{firstSku}</span>}
                </div>
            </div>
        </div>
    );
};
