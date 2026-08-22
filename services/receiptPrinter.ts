/**
 * Impresión de recibos por QZ Tray (ESC/POS, impresora térmica de recibos).
 *
 * A diferencia de la impresión por el navegador (window.print, con diálogo y a veces espacio
 * blanco), esto envía texto ESC/POS crudo a una impresora FIJA configurada, con corte automático
 * y sin hoja en blanco. Config POR DISPOSITIVO (localStorage). Reutiliza la conexión de cashDrawer.
 */
import { ensureConnected, listPrinters } from './cashDrawer';
import type { ReceiptConfig } from '../types';
import type { ReceiptSale } from '../components/pos/ReceiptModal';

export { listPrinters };

const KEY = 'pazzi_receipt_printer';

/** Formato a imprimir: recibo térmico (80mm, ESC/POS) o factura carta (HTML). */
export type PrintFormat = 'recibo' | 'factura';

export interface ReceiptPrinterConfig {
    enabled: boolean;
    reciboPrinter: string;   // impresora del RECIBO térmico (ESC/POS). Vacío = predeterminada.
    facturaPrinter: string;  // impresora de la FACTURA carta (HTML). Vacío = usa la del recibo/predeterminada.
    width: number;           // columnas del recibo térmico: 48 = 80mm; 32 = 58mm
}

const DEFAULTS: ReceiptPrinterConfig = { enabled: false, reciboPrinter: '', facturaPrinter: '', width: 48 };

export function getReceiptPrinterConfig(): ReceiptPrinterConfig {
    try {
        const v = JSON.parse(localStorage.getItem(KEY) || '{}');
        const merged = { ...DEFAULTS, ...v };
        if (!merged.reciboPrinter && v.printerName) merged.reciboPrinter = v.printerName; // migración del campo viejo
        return merged;
    } catch { return { ...DEFAULTS }; }
}
export function setReceiptPrinterConfig(c: ReceiptPrinterConfig) {
    try { localStorage.setItem(KEY, JSON.stringify(c)); } catch { /* almacenamiento no disponible */ }
}
export function isReceiptPrinterEnabled(): boolean {
    return getReceiptPrinterConfig().enabled;
}

// Preferencia POR DISPOSITIVO de qué formato imprimir (recibo/factura). Es "sticky".
const FORMAT_KEY = 'pazzi_print_format';
export function getPrintFormat(): PrintFormat {
    try { return localStorage.getItem(FORMAT_KEY) === 'factura' ? 'factura' : 'recibo'; } catch { return 'recibo'; }
}
export function setPrintFormat(f: PrintFormat) {
    try { localStorage.setItem(FORMAT_KEY, f); } catch { /* almacenamiento no disponible */ }
}

// ── Comandos ESC/POS ──
const ESC = '\x1B', GS = '\x1D';
const INIT = ESC + '@';
const ALIGN_C = ESC + 'a' + '\x01', ALIGN_L = ESC + 'a' + '\x00';
const BOLD_ON = ESC + 'E' + '\x01', BOLD_OFF = ESC + 'E' + '\x00';
const DBL_ON = GS + '!' + '\x11', DBL_OFF = GS + '!' + '\x00';
// Avanza y corta (parcial). Los \n dan margen para no cortar sobre el texto.
const CUT = '\n\n\n' + GS + 'V' + '\x42' + '\x00';

// Quita acentos/diacríticos → ASCII, para no depender del code page de la impresora.
const deburr = (s: any) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '');
const money = (n: number) => `$${(Number(n) || 0).toFixed(2)}`;

function two(l: string, r: string, w: number): string {
    l = deburr(l); r = deburr(r);
    if (l.length + r.length + 1 > w) l = l.slice(0, Math.max(0, w - r.length - 1));
    const space = Math.max(1, w - l.length - r.length);
    return l + ' '.repeat(space) + r + '\n';
}
function center(t: string, w: number): string {
    t = deburr(t);
    const pad = Math.max(0, Math.floor((w - t.length) / 2));
    return ' '.repeat(pad) + t + '\n';
}
const leftLine = (t: string) => deburr(t) + '\n';
const rule = (w: number) => '-'.repeat(w) + '\n';

/** Código de barras Code128 nativo ESC/POS (alto 80, HRI debajo). */
function barcode128(value: string): string {
    const data = '{B' + deburr(value);
    return GS + 'h' + '\x50' + GS + 'w' + '\x02' + GS + 'H' + '\x02'
        + GS + 'k' + '\x49' + String.fromCharCode(data.length) + data + '\n';
}

/** Construye el recibo como texto ESC/POS. */
export function buildReceiptEscPos(sale: ReceiptSale, cfg: ReceiptConfig, width = 48): string {
    const w = width || 48;

    // ── Diseño CLÁSICO (térmico estilo ferretería) ──
    if ((cfg.design ?? 'modern') === 'classic') {
        const num = `${cfg.receiptPrefix || ''}${sale.saleNumber}`;
        const d = new Date(sale.date);
        let c = INIT + ALIGN_C;
        if (cfg.businessName) c += BOLD_ON + DBL_ON + center(cfg.businessName, Math.floor(w / 2)) + DBL_OFF + BOLD_OFF;
        if (cfg.showAddress && cfg.address) c += center(cfg.address, w);
        if (cfg.showPhone && cfg.phone) c += center(`Tel: ${cfg.phone}`, w);
        if (cfg.showRnc && cfg.rnc) c += center(cfg.rnc, w);
        c += ALIGN_L + two(d.toLocaleDateString(), d.toLocaleTimeString(), w);
        c += ALIGN_C + BOLD_ON + center(`Recibo : ${num}`, w) + BOLD_OFF;
        if (sale.isReprint && cfg.reprintLabel) c += center(cfg.reprintLabel, w);
        c += ALIGN_L + rule(w);
        for (const it of sale.items) {
            c += leftLine(it.name.slice(0, w));
            c += two(`  ${it.quantity}@ ${money(it.unitPrice)}`, money(it.quantity * it.unitPrice), w);
            if (it.note) c += leftLine(`  * ${it.note}`.slice(0, w));
        }
        c += rule(w);
        const count = sale.items.reduce((s, i) => s + i.quantity, 0);
        c += BOLD_ON + two(`${count} Articulos   SUBTOTAL`, money(sale.subtotal), w) + BOLD_OFF;
        if (sale.discount > 0) c += two('Descuento', `-${money(sale.discount)}`, w);
        if (sale.taxState || sale.taxMunicipal || sale.taxReduced) {
            c += two('+ Estatal', money(sale.taxState || 0), w);
            c += two('+ Reducido', money(sale.taxReduced || 0), w);
            c += two('+ Municipal', money(sale.taxMunicipal || 0), w);
        } else if (cfg.showTaxBreakdown) c += two('+ IVU', money(sale.tax), w);
        c += BOLD_ON + two('TOTAL', money(sale.total), w) + BOLD_OFF;
        for (const p of sale.payments) c += two(p.method, money(p.amount), w);
        if (sale.changeDue && sale.changeDue > 0) c += two('Cambio', money(sale.changeDue), w);
        c += rule(w) + ALIGN_C;
        for (const txt of [cfg.returnPolicyText, cfg.thankYouText, cfg.paymentTermsText]) if (txt) c += center(txt, w);
        if (cfg.showBarcode) c += '\n' + barcode128(num);
        c += ALIGN_L + CUT;
        return c;
    }

    let o = INIT + ALIGN_C;
    // Nombre del negocio en doble tamaño (ocupa el doble → centrar sobre w/2).
    if (cfg.businessName) o += BOLD_ON + DBL_ON + center(cfg.businessName, Math.floor(w / 2)) + DBL_OFF + BOLD_OFF;
    if (cfg.showRnc && cfg.rnc) o += center(`RNC/Reg: ${cfg.rnc}`, w);
    if (cfg.showAddress && cfg.address) o += center(cfg.address, w);
    if (cfg.showPhone && cfg.phone) o += center(`Tel: ${cfg.phone}`, w);
    o += ALIGN_L + rule(w);
    o += two('Factura #', String(sale.saleNumber), w);
    o += two('Fecha', new Date(sale.date).toLocaleString(), w);
    if (cfg.showClient && sale.clientName) o += two('Cliente', sale.clientName, w);
    if (cfg.showCashier && sale.cashierName) o += two('Cajero', sale.cashierName, w);
    o += rule(w);
    for (const it of sale.items) {
        o += leftLine(it.name.slice(0, w));
        o += two(`  ${it.quantity} x ${money(it.unitPrice)}`, money(it.quantity * it.unitPrice), w);
        if (it.note) o += leftLine(`  * ${it.note}`.slice(0, w));
    }
    o += rule(w);
    o += two('Subtotal', money(sale.subtotal), w);
    if (sale.discount > 0) o += two('Descuento', `-${money(sale.discount)}`, w);
    if (sale.taxState || sale.taxMunicipal || sale.taxReduced) {
        if (sale.taxState) o += two('IVU Estatal', money(sale.taxState), w);
        if (sale.taxMunicipal) o += two('IVU Municipal', money(sale.taxMunicipal), w);
        if (sale.taxReduced) o += two('IVU Reducido', money(sale.taxReduced), w);
    } else if (cfg.showTaxBreakdown) {
        o += two('IVU', money(sale.tax), w);
    }
    o += BOLD_ON + two('TOTAL', money(sale.total), w) + BOLD_OFF;
    o += rule(w);
    for (const p of sale.payments) {
        o += two(p.method, money(p.amount), w);
        if (p.reference) o += leftLine(`  Ref: ${p.reference}`);
    }
    if (sale.changeDue && sale.changeDue > 0) o += BOLD_ON + two('Cambio', money(sale.changeDue), w) + BOLD_OFF;
    if (cfg.showFooter && cfg.footerNote) {
        o += ALIGN_C + '\n';
        for (const ln of String(cfg.footerNote).split('\n')) o += center(ln, w);
        o += ALIGN_L;
    }
    o += CUT;
    return o;
}

/**
 * Imprime por QZ enrutando según el formato:
 *  - 'recibo'  → ESC/POS crudo a la impresora de recibo (térmica, con corte).
 *  - 'factura' → HTML (carta) a la impresora de factura. El HTML lo arma el llamador
 *                (para no crear dependencia circular con buildReceiptHTML).
 * Lanza si falla.
 */
export async function printReceiptViaQz(
    sale: ReceiptSale, cfg: ReceiptConfig, format: PrintFormat = 'recibo', letterHtml?: string,
): Promise<void> {
    const rc = getReceiptPrinterConfig();
    const qz = await ensureConnected();

    if (format === 'factura') {
        const printer = rc.facturaPrinter || rc.reciboPrinter || (await qz.printers.getDefault());
        if (!printer) throw new Error('No hay impresora de factura configurada.');
        const config = qz.configs.create(printer, {});
        await qz.print(config, [{ type: 'html', format: 'plain', data: letterHtml || '' }]);
        return;
    }

    const printer = rc.reciboPrinter || (await qz.printers.getDefault());
    if (!printer) throw new Error('No hay impresora de recibos configurada.');
    const config = qz.configs.create(printer, { encoding: 'CP437' });
    const data = buildReceiptEscPos(sale, cfg, rc.width);
    await qz.print(config, [{ type: 'raw', format: 'plain', data }]);
}

/** Imprime un documento de PRUEBA (para "Probar"). Para factura, el llamador pasa el HTML carta. */
export async function printTestReceipt(cfg: ReceiptConfig, format: PrintFormat = 'recibo', letterHtml?: string): Promise<void> {
    const sample: ReceiptSale = {
        saleNumber: 'PRUEBA-001',
        date: new Date().toISOString(),
        items: [
            { name: 'Articulo de prueba A', quantity: 2, unitPrice: 1.5 },
            { name: 'Articulo de prueba B', quantity: 1, unitPrice: 3.0 },
        ],
        subtotal: 6.0, tax: 0.69, discount: 0, total: 6.69,
        payments: [{ method: 'Efectivo', amount: 6.69 }],
        changeDue: 0, clientName: 'Cliente de prueba', cashierName: 'Cajero',
    };
    await printReceiptViaQz(sample, cfg, format, letterHtml);
}
