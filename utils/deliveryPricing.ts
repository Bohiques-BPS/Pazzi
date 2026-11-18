/**
 * Cobro de entregas en la caja (lo decide el gerente en Administración › Cobro de entregas).
 *  - none:   sin cargo.
 *  - flat:   precio fijo automático en cada entrega.
 *  - zone:   precio según la zona (la caja propone la zona por el pueblo/ciudad de la dirección).
 *  - manual: el cajero escribe el precio en cada entrega.
 * Extras: allowManual (el cajero puede cambiar el precio sugerido), freeOver (gratis desde cierto
 * subtotal) y taxable (si la entrega lleva IVU).
 */

export type DeliveryPricingMode = 'none' | 'flat' | 'zone' | 'manual';
export interface DeliveryZone { id: string; name: string; price: number; towns: string }
export interface DeliveryPricing {
    mode: DeliveryPricingMode;
    flatFee: number;
    zones: DeliveryZone[];
    allowManual: boolean;
    freeOver: number | null;
    taxable: boolean;
}

export const DEFAULT_DELIVERY_PRICING: DeliveryPricing = { mode: 'none', flatFee: 0, zones: [], allowManual: true, freeOver: null, taxable: false };

export function readDeliveryPricing(raw: any): DeliveryPricing {
    const r = raw && typeof raw === 'object' ? raw : {};
    return {
        mode: (['none', 'flat', 'zone', 'manual'] as const).includes(r.mode) ? r.mode : 'none',
        flatFee: Number(r.flatFee) || 0,
        zones: Array.isArray(r.zones) ? r.zones.map((z: any, i: number) => ({ id: String(z?.id || `z${i}`), name: String(z?.name || ''), price: Number(z?.price) || 0, towns: String(z?.towns || '') })) : [],
        allowManual: r.allowManual !== false,
        freeOver: r.freeOver != null && Number(r.freeOver) > 0 ? Number(r.freeOver) : null,
        taxable: !!r.taxable,
    };
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

/** Zona cuyo listado de pueblos/zip incluye la ciudad o el zip de la dirección. */
export function matchZone(p: DeliveryPricing, city?: string | null, zip?: string | null): DeliveryZone | null {
    const c = norm(city || ''), z = (zip || '').trim();
    if (!c && !z) return null;
    for (const zone of p.zones) {
        const towns = zone.towns.split(/[,;\n]/).map(t => norm(t)).filter(Boolean);
        if ((c && towns.includes(c)) || (z && towns.includes(z))) return zone;
    }
    return null;
}

/** Cargo sugerido. `free` = aplica el envío gratis por monto. */
export function suggestedFee(p: DeliveryPricing, opts: { zoneId?: string | null; subtotal: number }): { amount: number; label: string; free: boolean } {
    const free = p.freeOver != null && opts.subtotal >= p.freeOver;
    if (p.mode === 'none') return { amount: 0, label: 'Entrega', free: false };
    if (p.mode === 'flat') return { amount: free ? 0 : p.flatFee, label: 'Entrega', free };
    if (p.mode === 'zone') {
        const zone = p.zones.find(z => z.id === opts.zoneId);
        return { amount: free || !zone ? 0 : zone.price, label: zone ? `Entrega · ${zone.name}` : 'Entrega', free };
    }
    return { amount: 0, label: 'Entrega', free };
}
