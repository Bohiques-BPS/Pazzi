/**
 * Totales de una factura con descuentos (por línea y a toda la factura). Misma lógica que el
 * backend (pazi-be/utils/invoiceTotals.ts).
 *
 * - Descuento por línea: `discount` + `discountType` ('percent' | 'amount').
 * - Descuento de la factura: sobre la suma de las líneas ya descontadas.
 * - El IVU se calcula sobre lo que queda después de los descuentos (por línea, respetando exentos).
 * - `subtotal` = base después de descuentos (subtotal + tax = total).
 */
export type DiscountType = 'percent' | 'amount';

export interface TotalsItem {
    quantity: number;
    unitPrice: number;
    taxRate?: number | null;
    discount?: number | null;
    discountType?: DiscountType | null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const normRate = (r: number) => (r > 1 ? r / 100 : r);

export function lineGross(it: TotalsItem): number {
    return (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0);
}

/** Monto descontado en una línea (nunca más que la línea). */
export function lineDiscount(it: TotalsItem): number {
    const gross = lineGross(it);
    const v = Math.max(0, Number(it.discount) || 0);
    if (!v || gross <= 0) return 0;
    return it.discountType === 'amount' ? Math.min(gross, v) : gross * Math.min(100, v) / 100;
}

export function computeInvoiceTotals(
    items: TotalsItem[],
    fallbackRate: number,
    invoiceDiscount?: { type?: DiscountType | null; value?: number | null } | null,
) {
    const gross = items.reduce((s, it) => s + lineGross(it), 0);
    const lineDisc = items.reduce((s, it) => s + lineDiscount(it), 0);
    const netLines = gross - lineDisc;
    const v = Math.max(0, Number(invoiceDiscount?.value) || 0);
    const invDisc = !v || netLines <= 0 ? 0
        : invoiceDiscount?.type === 'amount' ? Math.min(netLines, v) : netLines * Math.min(100, v) / 100;
    const factor = netLines > 0 ? (netLines - invDisc) / netLines : 0;
    const tax = items.reduce((s, it) => {
        const r = normRate(it.taxRate == null ? fallbackRate : Number(it.taxRate));
        return s + (lineGross(it) - lineDiscount(it)) * r;
    }, 0) * factor;
    const subtotal = round2(netLines - invDisc);
    const taxR = round2(tax);
    return {
        grossSubtotal: round2(gross),
        linesSubtotal: round2(netLines),
        lineDiscount: round2(lineDisc),
        invoiceDiscount: round2(invDisc),
        discountAmount: round2(lineDisc + invDisc),
        subtotal,
        tax: taxR,
        total: round2(subtotal + taxR),
    };
}

/**
 * Para mostrar una factura guardada: las líneas salen con su descuento ya aplicado, así que el
 * "Subtotal" visible es la suma de las líneas y el renglón "Descuento" es solo el de la factura.
 */
export function invoiceDisplayTotals(inv: { items?: any[]; subtotal: number; discountAmount?: number | null }) {
    const items = Array.isArray(inv.items) ? inv.items : [];
    const lineDisc = round2(items.reduce((s, it) => s + lineDiscount(it), 0));
    const invDisc = Math.max(0, round2((Number(inv.discountAmount) || 0) - lineDisc));
    return { linesSubtotal: round2((Number(inv.subtotal) || 0) + invDisc), invoiceDiscount: invDisc, lineDiscount: lineDisc };
}

/** Texto corto del descuento de una línea: "10%" o "$5.00". */
export function discountLabel(value?: number | null, type?: DiscountType | null): string {
    const v = Number(value) || 0;
    return type === 'amount' ? `$${v.toFixed(2)}` : `${v}%`;
}
