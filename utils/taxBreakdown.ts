/**
 * Divide un IVU total en Estatal / Municipal según las tasas configuradas.
 * Se usa en documentos que NO guardan el desglose por línea (facturas, estimados): reparte el
 * impuesto proporcionalmente entre estatal y municipal. Para tasa reducida no aplica (esos docs
 * no marcan ítems reducidos), así que 'reduced' queda en 0.
 */
export interface TaxSplit { state: number; municipal: number; reduced: number; }

const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

export function splitTax(tax: number, stateRate?: number | null, municipalRate?: number | null): TaxSplit {
    const s = Number(stateRate) || 0;
    const m = Number(municipalRate) || 0;
    const denom = s + m;
    if (!(tax > 0) || denom <= 0) return { state: r2(tax), municipal: 0, reduced: 0 };
    return { state: r2((tax * s) / denom), municipal: r2((tax * m) / denom), reduced: 0 };
}

// Tasas de la tienda (las registra GlobalSettingsProvider al cargar la configuración). Los
// documentos que solo traen el IVU total las usan para mostrarlo desglosado.
let defaultRates = { state: 0.105, municipal: 0.01 };
export function setDefaultTaxRates(state?: number | null, municipal?: number | null) {
    defaultRates = { state: Number(state) || 0, municipal: Number(municipal) || 0 };
}

/**
 * Líneas de IVU para mostrar en un documento: el desglose guardado (Estatal/Municipal/Reducido) si
 * lo hay; si no, el total repartido con las tasas de la tienda; sin tasas, una sola línea "IVU".
 */
export function taxLines(
    tax: number,
    stored?: { taxState?: number | null; taxMunicipal?: number | null; taxReduced?: number | null },
    rates?: { state?: number | null; municipal?: number | null },
    base = 'IVU',
): { label: string; amount: number }[] {
    const t = Number(tax) || 0;
    if (!(t > 0)) return [];
    const st = Number(stored?.taxState) || 0, mu = Number(stored?.taxMunicipal) || 0, re = Number(stored?.taxReduced) || 0;
    if (st > 0 || mu > 0 || re > 0) {
        return [
            ...(st > 0 ? [{ label: `${base} Estatal`, amount: r2(st) }] : []),
            ...(mu > 0 ? [{ label: `${base} Municipal`, amount: r2(mu) }] : []),
            ...(re > 0 ? [{ label: `${base} Reducido`, amount: r2(re) }] : []),
        ];
    }
    const sRate = rates?.state ?? defaultRates.state;
    const mRate = rates?.municipal ?? defaultRates.municipal;
    if (!((Number(sRate) || 0) + (Number(mRate) || 0) > 0)) return [{ label: base, amount: r2(t) }];
    const sp = splitTax(t, sRate, mRate);
    const municipal = r2(t - sp.state); // el resto, para que Estatal + Municipal = IVU exacto
    return [
        ...(sp.state > 0 ? [{ label: `${base} Estatal`, amount: sp.state }] : []),
        ...(municipal > 0 ? [{ label: `${base} Municipal`, amount: municipal }] : []),
    ];
}
