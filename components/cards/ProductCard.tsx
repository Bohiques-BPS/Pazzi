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
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onEdit, onRequestDelete, onAdjustStock, onViewHistory }) => {
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

    // Stock total en sucursales activas (para el badge resumen y el color).
    const totalStock = activeBranches.reduce((sum, b) => {
        const entry = (product.stockByBranch || []).find(sb => sb.branchId === b.id);
        return sum + (entry ? entry.quantity : 0);
    }, 0);

    const skuText = (product.skus || [])
        .map(s => (typeof s === 'object' ? (s as any).sku : s))
        .filter(Boolean)
        .join(', ');

    return (
        <div
            onClick={() => onEdit(product)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') onEdit(product); }}
            title={t('cmp.productcard.edit_product')}
            className="group bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm flex flex-col overflow-hidden hover:shadow-lg hover:border-primary/40 dark:hover:shadow-primary/20 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
        >
            {/* Imagen */}
            <div className="relative w-full h-40 bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-800 dark:to-neutral-700/60 flex items-center justify-center overflow-hidden">
                <img
                    src={imgSrc}
                    alt={product.name}
                    className={product.imageUrl
                        ? 'w-full h-full object-contain p-3 transition-transform duration-200 group-hover:scale-[1.03]'
                        : 'h-16 object-contain opacity-40'}
                    onError={(e) => { const t = e.target as HTMLImageElement; if (!t.dataset.fallback) { t.dataset.fallback = '1'; t.src = logo; t.className = 'h-16 object-contain opacity-40'; } }}
                />

                {/* Chip de categoría */}
                {categoryName && (
                    <span className="absolute top-2 left-2 max-w-[60%] truncate px-2 py-0.5 rounded-full text-[11px] font-medium bg-white/90 dark:bg-neutral-900/80 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-600 backdrop-blur-sm">
                        {categoryName}
                    </span>
                )}

                {/* Badge de stock (o variaciones) */}
                {product.hasVariations ? (
                    <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                        {product.variations?.length || 0} {t('cmp.productcard.variations_short') || 'var.'}
                    </span>
                ) : (
                    <span className={`absolute bottom-2 left-2 px-2 py-0.5 rounded-full text-[11px] font-semibold ${totalStock > 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300'}`}>
                        {totalStock > 0 ? `${totalStock} ${t('cmp.productcard.units_short') || 'u.'}` : (t('cmp.productcard.out_of_stock') || 'Sin stock')}
                    </span>
                )}

                {/* Menú de acciones */}
                <div className="absolute top-2 right-2" onClick={(e) => e.stopPropagation()}>
                    <button onClick={(e) => { e.stopPropagation(); setActionsOpen(!actionsOpen); }} className="w-8 h-8 flex items-center justify-center rounded-full bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-100 hover:bg-primary hover:text-white dark:hover:bg-primary border border-neutral-300 dark:border-neutral-600 shadow-md ring-1 ring-black/5 focus:outline-none focus:ring-2 focus:ring-primary transition-colors" aria-haspopup="true" aria-expanded={actionsOpen} aria-controls={`product-actions-${product.id}`} aria-label={t('cmp.productcard.options') || 'Opciones'} title={t('cmp.productcard.options') || 'Opciones'}>
                        <EllipsisVerticalIcon className="w-5 h-5" />
                    </button>
                    {actionsOpen && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setActionsOpen(false)} />
                            <div id={`product-actions-${product.id}`} className="absolute right-0 mt-1 w-48 bg-white dark:bg-neutral-700 rounded-md shadow-lg py-1 z-20 border border-neutral-200 dark:border-neutral-600">
                                <button onClick={() => { onEdit(product); setActionsOpen(false); }} className="flex items-center w-full text-left px-3 py-1.5 text-base text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-600">
                                    <EditIcon className="w-4 h-4 mr-2" /> {t('common.edit')}
                                </button>
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
                <h3 className="text-base font-semibold text-neutral-800 dark:text-neutral-100 line-clamp-2 leading-snug min-h-[2.5rem]">{product.name}</h3>

                <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 mb-3 line-clamp-2 min-h-[2rem]" dangerouslySetInnerHTML={{ __html: product.description || t('cmp.productcard.no_description') }}></div>

                {/* Precio + IVU */}
                <div className="flex items-end justify-between gap-2 mb-3">
                    <div>
                        <p className="text-[11px] uppercase tracking-wide text-neutral-400 dark:text-neutral-500 leading-none mb-0.5">{t('cmp.productcard.base_price_label') || 'Precio base'}</p>
                        <p className="text-xl font-bold text-primary leading-none">${product.unitPrice.toFixed(2)}</p>
                    </div>
                    <span className="text-[11px] text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
                        {t('cmp.productcard.ivu')} {product.ivuRate ? `${(product.ivuRate * 100).toFixed(0)}%` : 'N/A'}
                    </span>
                </div>

                {/* Stock por sucursal (compacto) */}
                {!product.hasVariations && (
                    <div className="mt-auto pt-3 border-t border-neutral-100 dark:border-neutral-700">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500 mb-1">{t('cmp.productcard.stock_by_branch')}</p>
                        <div className="max-h-[4.5rem] overflow-y-auto pr-1 space-y-0.5">
                            {activeBranches.map(branch => {
                                const stockEntry = (product.stockByBranch || []).find(sb => sb.branchId === branch.id);
                                const stockQty = stockEntry ? stockEntry.quantity : 0;
                                return (
                                    <div key={branch.id} className="flex justify-between items-center text-sm text-neutral-600 dark:text-neutral-300">
                                        <span className="truncate mr-2">{branch.name}</span>
                                        <span className="flex items-center gap-1.5 flex-shrink-0">
                                            <span className={`font-semibold tabular-nums ${stockQty > 0 ? 'text-neutral-700 dark:text-neutral-200' : 'text-red-500'}`}>{stockQty}</span>
                                            <button onClick={(e) => { e.stopPropagation(); onAdjustStock(product, branch.id); }} className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 p-0.5" title={t('cmp.productcard.adjust_stock_in', { branch: branch.name })}>
                                                <AdjustIcon className="w-3.5 h-3.5"/>
                                            </button>
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* SKU */}
                {skuText && (
                    <p className="mt-2 text-[11px] text-neutral-400 dark:text-neutral-500 truncate" title={skuText}>
                        <span className="font-medium">{t('cmp.productcard.skus')}</span> {skuText}
                    </p>
                )}
            </div>
        </div>
    );
};
