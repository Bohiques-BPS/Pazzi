/**
 * Genera el SVG (Code128) de un valor, para el código de barras del recibo clásico.
 * Async porque jsbarcode se importa dinámicamente y dibuja en un <svg> del DOM.
 * Devuelve '' si algo falla (el recibo cae al número en texto).
 */
export async function barcodeToSvg(value: string): Promise<string> {
    if (!value) return '';
    try {
        const mod: any = await import('jsbarcode');
        const JsBarcode = mod.default || mod;
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('style', 'position:fixed;left:-9999px;top:-9999px;');
        document.body.appendChild(svg);
        try {
            JsBarcode(svg, value, { format: 'CODE128', width: 2, height: 50, displayValue: false, margin: 0 });
            const w = parseFloat(svg.getAttribute('width') || '0');
            const h = parseFloat(svg.getAttribute('height') || '0');
            if (w > 0 && h > 0) svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
            svg.setAttribute('preserveAspectRatio', 'none');
            svg.setAttribute('style', 'width:70%;height:50px;');
            svg.removeAttribute('width');
            svg.removeAttribute('height');
            return new XMLSerializer().serializeToString(svg);
        } finally {
            document.body.removeChild(svg);
        }
    } catch {
        return '';
    }
}
