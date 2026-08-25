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
