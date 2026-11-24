/** Tamaño del logo de la factura elegido en Config. Factura, como factor (1 = normal, 0.5–2.5). */
export function logoScaleOf(design?: { logoScale?: number } | null): number {
    const n = Number(design?.logoScale) || 100;
    return Math.min(2.5, Math.max(0.5, n / 100));
}
