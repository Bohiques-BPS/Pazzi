import React, { useState } from 'react';
import { Product } from '../../types'; // Adjusted path
import { EllipsisVerticalIcon, ListBulletIcon as HistoryIcon, Cog6ToothIcon as AdjustIcon, EditIcon, DeleteIcon } from '../icons'; // Adjusted path
import { useData } from '../../contexts/DataContext'; // For getting default branch stock (optional display)
import { ADMIN_USER_ID } from '../../constants';

interface ProductCardProps {
    product: Product;
    onEdit: (product: Product) => void;
    onRequestDelete: (productId: string) => void;
    onAdjustStock: (product: Product, branchId: string) => void;
    onViewHistory?: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onEdit, onRequestDelete, onAdjustStock, onViewHistory }) => {
    const [actionsOpen, setActionsOpen] = useState(false);
    const { branches } = useData();
    const activeBranches = branches.filter(b => b.isActive);
    const isClientProduct = product.storeOwnerId !== ADMIN_USER_ID;

    return (
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-md flex flex-col overflow-hidden hover:shadow-xl dark:hover:shadow-primary/20 transition-shadow duration-200">
            <img src={product.imageUrl || 'https://picsum.photos/seed/defaultprod/300/200'} alt={product.name} className="w-full h-40 object-cover" />
            <div className="p-3 flex flex-col flex-grow">
                <div className="flex justify-between items-start mb-1">
                    <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100 line-clamp-2 flex-grow leading-tight">{product.name}</h3>
                    <div className="relative flex-shrink-0 ml-1">
                        <button onClick={() => setActionsOpen(!actionsOpen)} className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-0.5 rounded-full focus:outline-none" aria-haspopup="true" aria-expanded={actionsOpen} aria-controls={`product-actions-${product.id}`}>
                            <EllipsisVerticalIcon />
                        </button>
                        {actionsOpen && (
                            <div id={`product-actions-${product.id}`} className="absolute right-0 mt-1 w-48 bg-white dark:bg-neutral-700 rounded-md shadow-lg py-1 z-10 border border-neutral-200 dark:border-neutral-600">
                                <button onClick={() => { onEdit(product); setActionsOpen(false); }} className="flex items-center w-full text-left px-3 py-1.5 text-base text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-600">
                                    <EditIcon className="w-4 h-4 mr-2" /> Editar
                                </button>
                                {onViewHistory && (
                                    <button onClick={() => { onViewHistory(product); setActionsOpen(false); }} className="flex items-center w-full text-left px-3 py-1.5 text-base text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-600">
                                        <HistoryIcon className="w-4 h-4 mr-2" /> Ver Movimientos
                                    </button>
                                )}
                                <button onClick={() => { onRequestDelete(product.id); setActionsOpen(false); }} className="flex items-center w-full text-left px-3 py-1.5 text-base text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-600/50">
                                    <DeleteIcon className="w-4 h-4 mr-2" /> Eliminar
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                <div className="text-sm prose dark:prose-invert max-w-none text-neutral-500 dark:text-neutral-400 mb-2 line-clamp-2 flex-grow" dangerouslySetInnerHTML={{ __html: product.description || 'Sin descripción.' }}></div>
                <div className="text-sm text-neutral-600 dark:text-neutral-300 mt-auto pt-2 border-t border-neutral-100 dark:border-neutral-700 space-y-1">
                    <p><strong>Precio Base:</strong> <span className="text-primary font-medium">${product.unitPrice.toFixed(2)}</span></p>
                    
                    {product.hasVariations ? (
                        <p><strong>Variaciones:</strong> {product.variations?.length || 0}</p>
                    ) : isClientProduct ? (
                         <div className="space-y-0.5">
                            <p className="font-semibold">Stock en Tienda:</p>
                            {product.stockByBranch.map(stockItem => (
                                <div key={stockItem.branchId} className="flex justify-between items-center">
                                    <span>{stockItem.quantity}</span>
                                    <button onClick={() => onAdjustStock(product, stockItem.branchId)} className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 p-0.5" title={`Ajustar stock`}>
                                        <AdjustIcon className="w-3 h-3"/>
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                         <div className="space-y-0.5">
                            <p className="font-semibold">Stock por Sucursal:</p>
                            <div className="max-h-16 overflow-y-auto pr-1">
                                {activeBranches.map(branch => {
                                    const stockEntry = product.stockByBranch.find(sb => sb.branchId === branch.id);
                                    const stockQty = stockEntry ? stockEntry.quantity : 0;
                                    return (
                                        <div key={branch.id} className="flex justify-between items-center">
                                            <span>{branch.name}: {stockQty}</span>
                                            <button onClick={() => onAdjustStock(product, branch.id)} className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 p-0.5" title={`Ajustar stock en ${branch.name}`}>
                                                <AdjustIcon className="w-3 h-3"/>
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <p><strong>SKUs:</strong> {product.skus?.join(', ') || 'N/A'}</p>
                    <p><strong>Categoría:</strong> {product.category || 'N/A'}</p>
                    {product.material && <p><strong>Material:</strong> {product.material}</p>}
                    <p><strong>IVA:</strong> {product.ivaRate ? `${(product.ivaRate * 100).toFixed(0)}%` : 'N/A'}</p>
                </div>
            </div>
        </div>
    );
};