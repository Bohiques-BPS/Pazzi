import type { Product } from '../types';

type SaleFields = Pick<Product, 'unitPrice' | 'salePrice' | 'saleStartDate' | 'saleEndDate'>;

/**
 * ¿El producto está en OFERTA vigente ahora?
 * Requiere un salePrice > 0 y MENOR que el precio base, dentro del rango de fechas
 * (fechas opcionales: sin inicio = desde ya; sin fin = indefinida).
 */
export function isProductOnSale(p: Partial<SaleFields> | null | undefined, at: Date = new Date()): boolean {
    if (!p) return false;
    const sale = p.salePrice;
    if (sale == null || !Number.isFinite(Number(sale)) || Number(sale) <= 0) return false;
    if (Number(sale) >= Number(p.unitPrice ?? 0)) return false; // solo si abarata
    if (p.saleStartDate) {
        const start = new Date(p.saleStartDate);
        if (!isNaN(start.getTime()) && at < start) return false;
    }
    if (p.saleEndDate) {
        const end = new Date(p.saleEndDate);
        if (!isNaN(end.getTime())) {
            end.setHours(23, 59, 59, 999); // el día de fin es inclusivo
            if (at > end) return false;
        }
    }
    return true;
}

/** Precio a cobrar: el de oferta si está vigente, si no el precio base. */
export function getEffectiveUnitPrice(p: Partial<SaleFields> | null | undefined, at: Date = new Date()): number {
    if (isProductOnSale(p, at)) return Number(p!.salePrice);
    return Number(p?.unitPrice ?? 0);
}
