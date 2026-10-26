
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Product } from '../../types';
import { MagnifyingGlassIcon } from '../icons';
import logo from '../../assets/logo.png';
import { useTranslation } from '../../contexts/GlobalSettingsContext';

/** Producto cuyo CÓDIGO coincide exacto con lo escaneado/escrito (barras, SKU, proveedor, cadena). */
const exactCodeMatch = (list: Product[], raw: string): Product | null => {
    const code = raw.trim();
    if (!code) return null;
    const lc = code.toLowerCase();
    return list.find((p: any) =>
        p.barcode13Digits === code ||
        p.barcode2 === code ||
        p.supplierProductCode === code ||
        p.chainCode === code ||
        (Array.isArray(p.skus) && p.skus.some((sku: string) => String(sku).toLowerCase() === lc))
    ) || null;
};

interface ProductAutocompleteProps {
    products?: Product[];
    onProductSelect: (product: Product) => void;
    placeholder?: string;
    disabled?: boolean;
    inputRef?: React.RefObject<HTMLInputElement>;
    /** Si se pasa, la búsqueda se hace contra el servidor (nombre, código de barras, SKU, etc.)
     *  en lugar de filtrar el array local `products`. Resuelve datos siempre frescos. */
    onRemoteSearch?: (term: string) => Promise<Product[]>;
    autoFocus?: boolean;
    /** Se llama al presionar ← con el buscador vacío (para mover el foco al input de cantidad). */
    onEmptyArrowLeft?: () => void;
    /** Se llama al presionar Enter con el buscador vacío (POS: abre "Artículo general"). */
    onEmptyEnter?: () => void;
}

export const ProductAutocomplete: React.FC<ProductAutocompleteProps> = ({
    products = [],
    onProductSelect,
    placeholder,
    disabled = false,
    inputRef,
    onRemoteSearch,
    autoFocus = false,
    onEmptyArrowLeft,
    onEmptyEnter,
}) => {
    const { t } = useTranslation();
    const resolvedPlaceholder = placeholder ?? t('cmpx.product_ac.search_ph');
    const [searchTerm, setSearchTerm] = useState('');
    const [suggestions, setSuggestions] = useState<Product[]>([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [loading, setLoading] = useState(false);
    // true cuando la búsqueda alcanzó el tope (hay más coincidencias que las mostradas).
    const [capped, setCapped] = useState(false);

    const localInputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLUListElement>(null);
    const searchIdRef = useRef(0); // evita condiciones de carrera entre respuestas remotas
    // Último término efectivamente buscado (para saber si los resultados están al día al dar Enter).
    const lastSearchedRef = useRef('');
    // Detección de lector de código: un lector "teclea" varios caracteres en ráfaga (<40 ms c/u).
    const lastKeyAtRef = useRef(0);
    const fastKeysRef = useRef(0);
    const scannedRef = useRef(false);
    // Término que se está buscando "ya" por un Enter (la búsqueda con debounce no debe pisarla).
    const pendingNowTermRef = useRef<string | null>(null);

    const effectiveInputRef = inputRef || localInputRef;

    const runSearch = useCallback(async () => {
        const term = searchTerm.trim();
        if (!term) {
            setSuggestions([]);
            setIsDropdownOpen(false);
            setLoading(false);
            return;
        }

        if (onRemoteSearch) {
            if (pendingNowTermRef.current === term) return; // ya lo está resolviendo el Enter
            const requestId = ++searchIdRef.current;
            setLoading(true);
            setIsDropdownOpen(true);
            try {
                const results = await onRemoteSearch(term);
                if (requestId !== searchIdRef.current) return; // llegó una respuesta más nueva
                lastSearchedRef.current = term;
                // Lector sin Enter: si fue un escaneo y hay código exacto, se agrega solo.
                if (scannedRef.current) {
                    const hit = exactCodeMatch(results, term);
                    if (hit) { handleSelectProductRef.current(hit); return; }
                }
                const MAX = 100;
                setSuggestions(results.slice(0, MAX));
                setCapped(results.length >= MAX); // pudo haber más coincidencias
                setActiveIndex(-1);
            } catch {
                if (requestId !== searchIdRef.current) return;
                setSuggestions([]);
            } finally {
                if (requestId === searchIdRef.current) setLoading(false);
            }
            return;
        }

        const lowerSearchTerm = term.toLowerCase();
        // Puntaje de relevancia: nombre que EMPIEZA con el término > nombre que lo contiene > SKU/código.
        // Los productos sin precio ($0) bajan al final (suelen ser pruebas o sin configurar).
        const score = (p: any): number => {
            const n = (p.name || '').toLowerCase();
            let s = 0;
            if (n.startsWith(lowerSearchTerm)) s = 100;
            else if (n.includes(lowerSearchTerm)) s = 60;
            else if (p.skus && p.skus.some((sku: string) => sku.toLowerCase().includes(lowerSearchTerm))) s = 30;
            else s = 10; // match por código de barras
            if (!(Number(p.unitPrice) > 0)) s -= 50; // sin precio → al final
            return s;
        };
        const filtered = products.filter(product =>
            product.name.toLowerCase().includes(lowerSearchTerm) ||
            (product.skus && product.skus.some(sku => sku.toLowerCase().includes(lowerSearchTerm))) ||
            (product.barcode13Digits && product.barcode13Digits.includes(lowerSearchTerm)) ||
            (product.barcode2 && product.barcode2.includes(lowerSearchTerm))
        ).sort((a, b) => score(b) - score(a)).slice(0, 7); // Orden por relevancia, 7 sugerencias

        setSuggestions(filtered);
        setCapped(false);
        setIsDropdownOpen(filtered.length > 0);
        setActiveIndex(-1);
    }, [searchTerm, products, onRemoteSearch]);

    // El debounce depende SOLO de searchTerm y usa un ref a la última runSearch. Así los
    // re-renders (que cambian identidades de props/callbacks) NO re-disparan la búsqueda,
    // evitando el loop de "busca → muestra → re-render → busca" que hacía parpadear resultados.
    const runSearchRef = useRef(runSearch);
    runSearchRef.current = runSearch;
    useEffect(() => {
        const debounceTimer = setTimeout(() => {
            runSearchRef.current();
        }, 300); // Debounce API calls or filtering

        return () => clearTimeout(debounceTimer);
    }, [searchTerm]);

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
        const value = event.target.value;
        const now = Date.now();
        if (value.length <= 1) { fastKeysRef.current = 0; scannedRef.current = false; }
        else if (now - lastKeyAtRef.current < 40) fastKeysRef.current += 1;
        else { fastKeysRef.current = 0; scannedRef.current = false; }
        lastKeyAtRef.current = now;
        if (fastKeysRef.current >= 3) scannedRef.current = true;
        setSearchTerm(value);
    };

    const handleSelectProduct = (product: Product) => {
        searchIdRef.current++; // descarta respuestas pendientes del término anterior
        scannedRef.current = false;
        fastKeysRef.current = 0;
        lastSearchedRef.current = '';
        onProductSelect(product);
        setSearchTerm('');
        setSuggestions([]);
        setIsDropdownOpen(false);
        setLoading(false);
        effectiveInputRef.current?.focus();
    };
    const handleSelectProductRef = useRef(handleSelectProduct);
    handleSelectProductRef.current = handleSelectProduct;

    /**
     * Enter con resultados desactualizados (típico del lector: escribe el código + Enter antes de
     * que termine la búsqueda): busca YA en el servidor y agrega la coincidencia exacta de código,
     * o el único resultado. Si hay varios, solo muestra la lista.
     */
    const searchNowAndPick = async (term: string) => {
        if (!onRemoteSearch) return;
        const requestId = ++searchIdRef.current;
        pendingNowTermRef.current = term;
        setLoading(true);
        setIsDropdownOpen(true);
        try {
            const results = await onRemoteSearch(term);
            if (requestId !== searchIdRef.current) return;
            lastSearchedRef.current = term;
            const pick = exactCodeMatch(results, term) || (results.length === 1 ? results[0] : null);
            if (pick) { handleSelectProduct(pick); return; }
            setSuggestions(results.slice(0, 100));
            setCapped(results.length >= 100);
            setActiveIndex(-1);
        } catch {
            if (requestId === searchIdRef.current) setSuggestions([]);
        } finally {
            if (pendingNowTermRef.current === term) pendingNowTermRef.current = null;
            if (requestId === searchIdRef.current) setLoading(false);
        }
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (disabled) return;

        // Atajo: con el buscador vacío, ← mueve el foco al input de cantidad.
        if (event.key === 'Enter' && searchTerm.trim() === '' && onEmptyEnter) {
            event.preventDefault();
            onEmptyEnter();
            return;
        }
        if (event.key === 'ArrowLeft' && searchTerm === '' && onEmptyArrowLeft) {
            event.preventDefault();
            onEmptyArrowLeft();
            return;
        }

        const term = searchTerm.trim();
        if (event.key === 'Enter' && term && onRemoteSearch && (loading || lastSearchedRef.current !== term)) {
            event.preventDefault();
            void searchNowAndPick(term);
            return;
        }

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
                } else if (suggestions.length > 0) {
                    // Sin navegar: primero la coincidencia exacta de código; si no, la primera.
                    handleSelectProduct(exactCodeMatch(suggestions, term) || suggestions[0]);
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
                    placeholder={resolvedPlaceholder}
                    disabled={disabled}
                    autoFocus={autoFocus}
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
                    {loading ? (
                        <li className="p-3 text-sm text-neutral-500 dark:text-neutral-400 text-center">
                            {t('cmpx.common.searching')}
                        </li>
                    ) : suggestions.length > 0 ? (
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
                                    src={product.imageUrl || logo} 
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
                            {t('cmpx.product_ac.none')}
                        </li>
                    )}
                    {capped && suggestions.length > 0 && (
                        <li className="px-3 py-2 text-xs text-neutral-500 dark:text-neutral-400 text-center border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60">
                            {t('cmpx.product_ac.capped', { count: suggestions.length })}
                        </li>
                    )}
                </ul>
            )}
        </div>
    );
};
