/**
 * Impresora dedicada de códigos de barras (etiquetas) vía QZ Tray.
 *
 * Reconoce una impresora específica de etiquetas (Zebra, TSC, DYMO, Brother, etc.) y le envía la
 * etiqueta con el código de barras generado (JsBarcode). Si QZ Tray no está configurado, cae a
 * impresión por el navegador (driver del sistema). Configuración POR DISPOSITIVO (localStorage).
 */
import { ensureConnected, listPrinters } from './cashDrawer';

export { listPrinters };

const KEY = 'pazzi_label_printer';

export interface LabelConfig {
    enabled: boolean;
    printerName: string;   // impresora dedicada de etiquetas (QZ Tray); vacío = predeterminada/driver
    widthMm: number;       // ancho de la etiqueta
    heightMm: number;      // alto de la etiqueta
    field: 'barcode13Digits' | 'sku' | 'id' | 'barcode2';  // qué campo del producto codificar
    copies: number;
    showName: boolean;
    showPrice: boolean;
}

const DEFAULTS: LabelConfig = {
    enabled: false, printerName: '', widthMm: 50, heightMm: 25,
    field: 'barcode13Digits', copies: 1, showName: true, showPrice: true,
};

export function getLabelConfig(): LabelConfig {
    try {
        const v = JSON.parse(localStorage.getItem(KEY) || '{}');
        return { ...DEFAULTS, ...v };
    } catch { return { ...DEFAULTS }; }
}

export function setLabelConfig(c: LabelConfig) {
    try { localStorage.setItem(KEY, JSON.stringify(c)); } catch { /* almacenamiento no disponible */ }
}

export function isLabelPrinterEnabled(): boolean {
    return getLabelConfig().enabled;
}

const esc = (s: any) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] || c));

/** Genera el SVG del código de barras con JsBarcode (sin depender del DOM montado). */
async function barcodeSvg(value: string, widthMm: number): Promise<string> {
    const mod: any = await import('jsbarcode');
    const JsBarcode = mod.default || mod;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    // JsBarcode mide el ancho del texto vía el DOM: adjuntamos el SVG oculto y luego lo removemos.
    svg.setAttribute('style', 'position:fixed;left:-9999px;top:-9999px;');
    document.body.appendChild(svg);
    try {
        // EAN-13 si son 12–13 dígitos; si no, CODE128 (acepta letras/números).
        const digits = /^\d{12,13}$/.test(value);
        try {
            JsBarcode(svg, value, { format: digits ? 'EAN13' : 'CODE128', width: 2, height: 40, displayValue: true, fontSize: 12, margin: 4 });
        } catch {
            JsBarcode(svg, value, { format: 'CODE128', width: 2, height: 40, displayValue: true, fontSize: 12, margin: 4 });
        }
        svg.setAttribute('style', `width:${widthMm}mm;height:auto;`);
        return new XMLSerializer().serializeToString(svg);
    } finally {
        try { document.body.removeChild(svg); } catch { /* ya removido */ }
    }
}

/** Construye el HTML de la etiqueta (código + nombre + precio, según config). */
async function buildLabelHtml(product: any, cfg: LabelConfig, value: string): Promise<string> {
    const svg = await barcodeSvg(value, cfg.widthMm - 4);
    const name = cfg.showName && product?.name ? `<div style="font-size:9px;font-weight:bold;line-height:1.1;">${esc(product.name).slice(0, 40)}</div>` : '';
    const price = cfg.showPrice && product?.unitPrice != null ? `<div style="font-size:11px;font-weight:bold;">$${(Number(product.unitPrice) || 0).toFixed(2)}</div>` : '';
    return `<!doctype html><html><head><meta charset="utf-8"><style>
        @page { size: ${cfg.widthMm}mm ${cfg.heightMm}mm; margin: 0; }
        html,body{margin:0;padding:0;}
        .lbl{width:${cfg.widthMm}mm;height:${cfg.heightMm}mm;box-sizing:border-box;padding:1mm;text-align:center;font-family:Arial,Helvetica,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;}
        .lbl svg{max-width:100%;}
      </style></head><body><div class="lbl">${name}${svg}${price}</div></body></html>`;
}

/** Resuelve el valor a codificar según el campo configurado (con respaldos). */
export function resolveBarcodeValue(product: any, field: LabelConfig['field']): string {
    const v = product?.[field];
    if (v) return String(v);
    // Respaldos por si el campo elegido está vacío.
    return String(product?.barcode13Digits || product?.sku || (Array.isArray(product?.skus) ? product.skus[0] : '') || product?.id || '');
}

/** Imprime la etiqueta por QZ Tray (impresora dedicada) o, si no hay, por el navegador. */
export async function printBarcodeLabel(product: any, copiesOverride?: number): Promise<void> {
    const cfg = getLabelConfig();
    const value = resolveBarcodeValue(product, cfg.field);
    if (!value) throw new Error('El producto no tiene un código para imprimir.');
    const copies = Math.max(1, copiesOverride ?? cfg.copies ?? 1);
    const html = await buildLabelHtml(product, cfg, value);

    // Camino QZ Tray: manda la etiqueta a la impresora dedicada (silencioso).
    if (cfg.enabled) {
        const qz = await ensureConnected();
        const printer = cfg.printerName || (await qz.printers.getDefault());
        if (!printer) throw new Error('No hay impresora de etiquetas configurada.');
        const config = qz.configs.create(printer, {
            size: { width: cfg.widthMm, height: cfg.heightMm }, units: 'mm', margins: 0, copies,
        });
        await qz.print(config, [{ type: 'html', format: 'plain', data: html }]);
        return;
    }

    // Respaldo: impresión por el navegador (driver del sistema) vía iframe oculto.
    printViaBrowser(html, copies);
}

function printViaBrowser(html: string, copies: number) {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    document.body.appendChild(iframe);
    const win = iframe.contentWindow;
    if (!win) { document.body.removeChild(iframe); return; }
    // Repite el contenido según las copias (una etiqueta por página).
    const body = Array.from({ length: copies }).map(() => html.replace(/^[\s\S]*<body>|<\/body>[\s\S]*$/g, '')).join('');
    win.document.open();
    win.document.write(html.replace(/<body>[\s\S]*<\/body>/, `<body>${body}</body>`));
    win.document.close();
    const done = () => setTimeout(() => { try { document.body.removeChild(iframe); } catch { /* ya removido */ } }, 1500);
    const go = () => { try { win.focus(); win.print(); } catch { /* cancelado */ } done(); };
    if (win.document.readyState === 'complete') setTimeout(go, 250);
    else win.onload = () => setTimeout(go, 250);
}
