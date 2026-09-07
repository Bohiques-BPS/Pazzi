/**
 * Símbolo de la moneda seleccionada del negocio (ej. "$", "RD$", "€").
 * La fuente es la configuración de e-commerce (campo `currency`); se refleja en
 * localStorage ('pazzi_currency') para poder usarla en toda la app sin re-fetch.
 * Fallback: "$".
 */
export function currencySymbol(): string {
    try {
        const v = localStorage.getItem('pazzi_currency');
        return (v && v.trim()) || '$';
    } catch {
        return '$';
    }
}

/** Guarda el símbolo de moneda para que quede disponible en toda la app. */
export function setCurrencySymbol(symbol?: string | null): void {
    try {
        if (symbol && symbol.trim()) localStorage.setItem('pazzi_currency', symbol.trim());
    } catch { /* noop */ }
}

/** Hook: devuelve el símbolo de moneda actual. */
export function useCurrency(): string {
    return currencySymbol();
}
