/**
 * Diseños (temas de color) asignables a cada caja. Se guarda el `id` en `Caja.design`.
 * El color se usa como acento visual: indicador en la lista de cajas y en la pantalla del cajero.
 */
export interface CajaDesign {
    id: string;
    /** Clave i18n del nombre (se resuelve con t()). */
    nameKey: string;
    /** Color principal (hex) del acento. */
    color: string;
    /** Fondo suave para insignias/tarjetas. */
    soft: string;
}

export const CAJA_DESIGNS: CajaDesign[] = [
    { id: 'teal', nameKey: 'cajadesign.teal', color: '#0D9488', soft: '#CCFBF1' },
    { id: 'blue', nameKey: 'cajadesign.blue', color: '#2563EB', soft: '#DBEAFE' },
    { id: 'green', nameKey: 'cajadesign.green', color: '#16A34A', soft: '#DCFCE7' },
    { id: 'purple', nameKey: 'cajadesign.purple', color: '#7C3AED', soft: '#EDE9FE' },
    { id: 'orange', nameKey: 'cajadesign.orange', color: '#EA580C', soft: '#FFEDD5' },
    { id: 'red', nameKey: 'cajadesign.red', color: '#DC2626', soft: '#FEE2E2' },
    { id: 'pink', nameKey: 'cajadesign.pink', color: '#DB2777', soft: '#FCE7F3' },
    { id: 'amber', nameKey: 'cajadesign.amber', color: '#D97706', soft: '#FEF3C7' },
    { id: 'indigo', nameKey: 'cajadesign.indigo', color: '#4F46E5', soft: '#E0E7FF' },
    { id: 'slate', nameKey: 'cajadesign.slate', color: '#475569', soft: '#E2E8F0' },
];

/** Devuelve el diseño de una caja (por id); cae al primero (teal) si no hay/no existe. */
export const getCajaDesign = (id?: string | null): CajaDesign =>
    CAJA_DESIGNS.find(d => d.id === id) || CAJA_DESIGNS[0];
