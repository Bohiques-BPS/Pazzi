/**
 * Clases de impuesto (IVU): Estándar / Reducida / Cero + las que cree el negocio.
 * Espejo de pazi-be/utils/taxClasses.ts. El BE siempre devuelve settings.taxClasses completo;
 * si faltara (configuración vieja en caché), se derivan de las tasas viejas igual que en el BE.
 */
import type { TaxClass } from '../types';

export const AUTO_TAX_CLASS = 'auto';
export const BUILTIN_TAX_CLASS_IDS = ['estandar', 'reducido', 'cero'];

const num = (v: any) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : 0; };
export const classRate = (c?: TaxClass | null) => (c ? Math.round((num(c.stateRate) + num(c.municipalRate)) * 1e6) / 1e6 : 0);
/** 0.115 → "11.5%" */
export const pct = (r: number) => `${Math.round(num(r) * 100000) / 1000}%`;

export function getTaxClasses(settings: any): TaxClass[] {
    if (Array.isArray(settings?.taxClasses) && settings.taxClasses.length) return settings.taxClasses;
    const s = settings || {};
    const stateR = s.taxStateRate ?? 0.105, munR = s.taxMunicipalRate ?? 0.01, def = s.defaultTaxRate ?? 0.115;
    const std = (!s.taxBreakdownEnabled && Math.abs(num(def) - (num(stateR) + num(munR))) > 1e-6)
        ? { stateRate: num(def), municipalRate: 0 } : { stateRate: num(stateR), municipalRate: num(munR) };
    return [
        { id: 'estandar', name: 'Estándar', ...std, builtin: true },
        { id: 'reducido', name: 'Reducida', stateRate: num(s.taxReducedRate ?? 0.06), municipalRate: 0, reduced: true, builtin: true },
        { id: 'cero', name: 'Cero (exento)', stateRate: 0, municipalRate: 0, builtin: true },
    ];
}

export const findTaxClass = (settings: any, id?: string | null) => (id ? getTaxClasses(settings).find(c => c.id === id) : undefined);

/** Clase heredada por un producto en "según categoría" (para mostrarla en el formulario). */
export function inheritedTaxClass(settings: any, category?: any, department?: any): TaxClass | undefined {
    const id = category?.taxClassId || department?.taxClassId
        || ((category?.reducedTax || department?.reducedTax) ? 'reducido' : 'estandar');
    return findTaxClass(settings, id) || findTaxClass(settings, 'estandar');
}

/**
 * Partes del IVU de una línea con clase (desglose activo). null = el producto no tiene clase
 * (se usa la lógica vieja). Aplica la exención del cliente por parte (estatal / municipal).
 */
export function classTaxParts(settings: any, item: any, exemptState: boolean, exemptMunicipal: boolean): { state: number; municipal: number; reduced: number } | null {
    const c = findTaxClass(settings, item?.effectiveTaxClassId);
    if (!c) return null;
    const st = exemptState ? 0 : num(c.stateRate);
    const mu = exemptMunicipal ? 0 : num(c.municipalRate);
    return c.reduced ? { state: 0, municipal: mu, reduced: st } : { state: st, municipal: mu, reduced: 0 };
}
