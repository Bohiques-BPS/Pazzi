
import React, { useState } from 'react';
import { Product } from '../../types'; // Adjusted path
import { EllipsisVerticalIcon } from '../icons'; // Adjusted path
import { useData } from '../../contexts/DataContext'; // For getting default branch stock (optional display)

interface ProductCardProps {
    product: Product;
    onEdit: (product: Product) => void;
    onRequestDelete: (productId: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onEdit, onRequestDelete }) => {
    const [actionsOpen, setActionsOpen] = useState(false);
    const { getProductStockForBranch, branches } = useData(); // Assuming a default/first branch for display if needed

    // For simplicity in this card, we might show stock of a "primary" branch or total across active branches
    // Or simply state "Stock gestionado por sucursal"
    const displayStockInfo = () => {
        if (product.stockByBranch && product.stockByBranch.length > 0) {
            // Example: show stock of the first branch entry or a specific one
            // const firstBranchId = product.stockByBranch[0].branchId;
            // const firstBranchName = branches.find(b => b.id === firstBranchId)?.name || firstBranchId.substring(0,6);
            // return `${product.stockByBranch[0].quantity} en ${firstBranchName}`;
            return "Gestionado por Sucursal"; // Simpler for now
        }
        return "N/A";
    };


    return (
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-md flex flex-col overflow-hidden hover:shadow-xl dark:hover:shadow-primary/20 transition-shadow duration-200">
            <img src={product.imageUrl || 'https://picsum.photos/seed/defaultprod/300/200'} alt={product.name} className="w-full h-40 object-cover" />
            <div className="p-3 flex flex-col flex-grow">
                <div className="flex justify-between items-start mb-1">
                    <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100 line-clamp-2 flex-grow leading-tight">{product.name}</h3> {/* Increased size */}
                    <div className="relative flex-shrink-0 ml-1">
                        <button onClick={() => setActionsOpen(!actionsOpen)} className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-0.5 rounded-full focus:outline-none" aria-haspopup="true" aria-expanded={actionsOpen} aria-controls={`product-actions-${product.id}`}>
                            <EllipsisVerticalIcon /> {/* Default size from component */}
                        </button>
                        {actionsOpen && (
                            <div id={`product-actions-${product.id}`} className="absolute right-0 mt-1 w-32 bg-white dark:bg-neutral-700 rounded-md shadow-lg py-1 z-10 border border-neutral-200 dark:border-neutral-600">
                                <button onClick={() => { onEdit(product); setActionsOpen(false); }} className="block w-full text-left px-3 py-1.5 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-600">Editar</button> {/* text-sm is fine here */}
                                <button onClick={() => { onRequestDelete(product.id); setActionsOpen(false); }} className="block w-full text-left px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-600/50">Eliminar</button>
                            </div>
                        )}
                    </div>
                </div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1 line-clamp-2 flex-grow">{product.description || 'Sin descripción.'}</p> {/* Increased size */}
                <div className="text-sm text-neutral-600 dark:text-neutral-300 mt-auto pt-2 border-t border-neutral-100 dark:border-neutral-700 space-y-0.5"> {/* Increased size */}
                    <p><strong>Precio:</strong> <span className="text-primary font-medium">${product.unitPrice.toFixed(2)}</span></p>
                    <p><strong>Stock:</strong> {displayStockInfo()}</p>
                    <p><strong>SKUs:</strong> {product.skus?.join(', ') || 'N/A'}</p>
                    <p><strong>Categoría:</strong> {product.category || 'N/A'}</p>
                    <p><strong>IVA:</strong> {product.ivaRate ? `${(product.ivaRate * 100).toFixed(0)}%` : 'N/A'}</p>
                </div>
            </div>
        </div>
    );
};
