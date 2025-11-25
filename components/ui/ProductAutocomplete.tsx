
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Product } from '../../types';
import { MagnifyingGlassIcon } from '../icons';

interface ProductAutocompleteProps {
    products: Product[];
    onProductSelect: (product: Product) => void;
    placeholder?: string;
    disabled?: boolean;
    inputRef?: React.RefObject<HTMLInputElement>;
}

export const ProductAutocomplete: React.FC<ProductAutocompleteProps> = ({
    products,
    onProductSelect,
    placeholder = "Buscar producto...",
    disabled = false,
    inputRef
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [suggestions, setSuggestions] = useState<Product[]>([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    
    const localInputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLUListElement>(null);

    const effectiveInputRef = inputRef || localInputRef;

    const filterProducts = useCallback(() => {
        if (!searchTerm.trim()) { // Changed condition here
            setSuggestions([]);
            setIsDropdownOpen(false);
            return;
        }

        const lowerSearchTerm = searchTerm.toLowerCase();
        const filtered = products.filter(product =>
            product.name.toLowerCase().includes(lowerSearchTerm) ||
            (product.skus && product.skus.some(sku => sku.toLowerCase().includes(lowerSearchTerm))) ||
            (product.barcode13Digits && product.barcode13Digits.includes(lowerSearchTerm)) ||
            (product.barcode2 && product.barcode2.includes(lowerSearchTerm))
        ).slice(0, 7); // Limit to 7 suggestions for performance and UI

        setSuggestions(filtered);
        setIsDropdownOpen(filtered.length > 0);
        setActiveIndex(-1);
    }, [searchTerm, products]);

    useEffect(() => {
        const debounceTimer = setTimeout(() => {
            filterProducts();
        }, 300); // Debounce API calls or filtering

        return () => clearTimeout(debounceTimer);
    }, [searchTerm, filterProducts]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                effectiveInputRef.current && !effectiveInputRef.current.contains(event.target as Node) &&
                dropdownRef.current && !dropdownRef.current.contains(event.target as Node)
            ) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [effectiveInputRef]);

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value);
    };

    const handleSelectProduct = (product: Product) => {
        onProductSelect(product);
        setSearchTerm('');
        setSuggestions([]);
        setIsDropdownOpen(false);
        effectiveInputRef.current?.focus();
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (disabled) return;

        if (isDropdownOpen) {
            if (event.key === 'ArrowDown') {
                event.preventDefault();
                setActiveIndex(prevIndex => (prevIndex + 1) % suggestions.length);
            } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                setActiveIndex(prevIndex => (prevIndex - 1 + suggestions.length) % suggestions.length);
            } else if (event.key === 'Enter') {
                event.preventDefault();
                if (activeIndex >= 0 && suggestions[activeIndex]) {
                    handleSelectProduct(suggestions[activeIndex]);
                } else if (suggestions.length > 0) { // If user presses enter without navigating, select first
                    handleSelectProduct(suggestions[0]);
                }
            } else if (event.key === 'Escape') {
                setIsDropdownOpen(false);
                setSearchTerm(''); // Optionally clear search on Esc
            }
        } else if (event.key === 'Enter' && searchTerm.trim() !== '') {
             // If dropdown is not open but there's text, try to find a direct match (or first partial)
            const directMatch = products.find(p => 
                p.name.toLowerCase() === searchTerm.toLowerCase() ||
                (p.skus && p.skus.some(sku => sku.toLowerCase() === searchTerm.toLowerCase())) ||
                p.barcode13Digits === searchTerm ||
                p.barcode2 === searchTerm
            );
            if(directMatch) {
                handleSelectProduct(directMatch);
            } else if (suggestions.length > 0) { // Fallback to first suggestion if any was filtered but not shown
                 handleSelectProduct(suggestions[0]);
            }
        }
    };
    
    useEffect(() => { // Scroll active item into view
        if (activeIndex >= 0 && dropdownRef.current) {
            const activeItemElement = dropdownRef.current.children[activeIndex] as HTMLLIElement;
            if (activeItemElement) {
                activeItemElement.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [activeIndex]);

    return (
        <div className="relative w-full">
            <div className="relative">
                 <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <MagnifyingGlassIcon className="w-5 h-5 text-neutral-400" />
                </span>
                <input
                    ref={effectiveInputRef}
                    type="text"
                    value={searchTerm}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    disabled={disabled}
                    className="w-full px-3 py-2 pl-10 text-base border-neutral-400 border bg-white focus:ring-blue-500 focus:border-blue-500 rounded-md shadow-sm text-neutral-900 dark:bg-neutral-700 dark:border-neutral-600 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 h-12"
                    aria-autocomplete="list"
                    aria-expanded={isDropdownOpen}
                    aria-controls="product-suggestions-list"
                    aria-activedescendant={activeIndex >= 0 ? `suggestion-item-${activeIndex}` : undefined}
                />
            </div>
            {isDropdownOpen && (
                <ul
                    id="product-suggestions-list"
                    ref={dropdownRef}
                    className="absolute z-20 w-full mt-1 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md shadow-lg max-h-80 overflow-y-auto"
                    role="listbox"
                >
                    {suggestions.length > 0 ? (
                        suggestions.map((product, index) => (
                            <li
                                key={product.id}
                                id={`suggestion-item-${index}`}
                                onClick={() => handleSelectProduct(product)}
                                onMouseEnter={() => setActiveIndex(index)}
                                className={`p-3 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-600 flex items-center space-x-3
                                    ${activeIndex === index ? 'bg-neutral-100 dark:bg-neutral-600' : ''}
                                `}
                                role="option"
                                aria-selected={activeIndex === index}
                            >
                                <img 
                                    src={product.imageUrl || 'https://picsum.photos/seed/defaultprod/50/50'} 
                                    alt={product.name} 
                                    className="w-10 h-10 object-cover rounded flex-shrink-0"
                                />
                                <div className="flex-grow overflow-hidden">
                                    <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate">{product.name}</p>
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                        SKU: {product.skus?.[0] || 'N/A'}
                                    </p>
                                </div>
                                <p className="text-sm font-semibold text-primary dark:text-accent flex-shrink-0">${product.unitPrice.toFixed(2)}</p>
                            </li>
                        ))
                    ) : (
                        <li className="p-3 text-sm text-neutral-500 dark:text-neutral-400 text-center">
                            No se encontraron productos.
                        </li>
                    )}
                </ul>
            )}
        </div>
    );
};
