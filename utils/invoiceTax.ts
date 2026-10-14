/**
 * Cálculo de IVU por línea para los formularios de factura (Facturas, Pagos recurrentes,
 * factura rápida de cliente/proyecto). Antes esta lógica estaba copiada en cada formulario.
 *
 * Reglas (iguales a las del POS / servidor):
 *  - Producto EXENTO (tasa 0) → 0 en cualquier modo.
 *  - Desglose IVU activo → tasa reducida si el producto está marcado; si no, Estatal + Municipal
 *    (con la exención del cliente ya aplicada).
 *  - Clásico → cliente exento total = 0; si no, tasa del producto o el default del negocio.
 */

/** Tasa de IVU de un producto (el BE la llama ivaRate; el público la renombra a ivuRate). */
export const productTaxRate = (p: any): number | undefined => (p?.ivaRate != null ? p.ivaRate : p?.ivuRate);

/** Acepta fracción (0.115) o porcentaje (11.5) y devuelve fracción. undefined → 0. */
export const normalizeTaxRate = (r?: number | null): number => (r == null ? 0 : (r > 1 ? r / 100 : r));

export interface TaxLine { name: string; taxRate?: number | null }

export function buildInvoiceTaxContext(settings: any, client: any, products: any[] | undefined) {
    const productByName = new Map<string, any>();
    for (const p of (products || [])) productByName.set(String(p.name || '').trim().toLowerCase(), p);

    const bd = !!settings?.taxBreakdownEnabled;
    // Exención de IVU por CLIENTE (ej. dueños de finca): pone estatal/municipal en 0.
    const exemptState = !!client?.taxExemptState;
    const exemptMunicipal = !!client?.taxExemptMunicipal
        || !!(client?.municipalTaxExemptionUntil && new Date(client.municipalTaxExemptionUntil).getTime() > Date.now());
    const clientFullyExempt = exemptState && exemptMunicipal;
    const stateR = exemptState ? 0 : (Number(settings?.taxStateRate) || 0);
    const municipalR = exemptMunicipal ? 0 : (Number(settings?.taxMunicipalRate) || 0);
    const reducedR = exemptState ? 0 : (Number(settings?.taxReducedRate) || 0);

    /** Tasa de IVU efectiva de una línea (puede venir en % o fracción; usar normalizeTaxRate). */
    const lineTaxRate = (l: TaxLine): number | undefined => {
        const prod = productByName.get(l.name.trim().toLowerCase());
        const explicit = l.taxRate != null ? l.taxRate : (prod ? productTaxRate(prod) : undefined);
        if (explicit === 0) return 0;
        if (bd) {
            const reduced = prod ? !!prod.reducedTax : false;
            return reduced ? reducedR : (stateR + municipalR);
        }
        if (clientFullyExempt) return 0;
        // Mismo fallback que aplica el servidor al crear, para que el IVU mostrado coincida.
        return explicit != null ? explicit : (Number(settings?.defaultTaxRate) || 0);
    };

    return { lineTaxRate, productByName, bd, stateR, municipalR, reducedR, clientFullyExempt };
}
