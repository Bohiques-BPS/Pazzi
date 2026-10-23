/**
 * Cuadre de caja impreso como RECIBO (térmica 80/58 mm). Misma ruta que los recibos de venta:
 * WebUSB si está activo, si no QZ Tray, y si no hay impresora configurada, el diálogo del
 * navegador con un HTML de 80 mm.
 */
import { escpos, getReceiptPrinterConfig, isReceiptPrinterEnabled, printRawViaQz } from './receiptPrinter';
import { getWebUsbConfig, isWebUsbEnabled, printRawViaWebUsb } from './webusbPrinter';

export interface CuadreRowPrint {
    label: string;
    expected: number;
    /** Contado por el cajero (null = no se cuenta, p. ej. crédito/factura: solo informativo). */
    counted: number | null;
}

export interface CuadrePrintData {
    businessName?: string;
    cajaName?: string;
    date: Date | string;
    cashier?: string;
    sessionId?: string;
    /** true si el turno ya está cerrado (reimpresión desde el historial). */
    closed?: boolean;
    rows: CuadreRowPrint[];
    totalSales: number;
    salesCount: number;
    returnsCount: number;
    cash: { openingFloat: number; cashSales: number; cashIn: number; payouts: number; cashRefunds: number; expectedCash: number };
    denominations?: { label: string; qty: number; subtotal: number }[];
    notes?: string;
}

const money = (n: number) => `$${(Number(n) || 0).toFixed(2)}`;
const signed = (n: number) => `${n >= 0 ? '+' : '-'}${money(Math.abs(n))}`;
const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
const esc = (s: any) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
const fmtDate = (d: Date | string) => new Date(d).toLocaleString();

/** Texto ESC/POS del cuadre. */
export function buildCuadreEscPos(d: CuadrePrintData, width = 48): string {
    const { INIT, ALIGN_C, ALIGN_L, BOLD_ON, BOLD_OFF, TALL_ON, DBL_OFF, CUT, two, center, rule, leftLine } = escpos;
    const w = width || 48;
    const countable = d.rows.filter(r => r.counted != null);
    const totExp = r2(countable.reduce((s, r) => s + r.expected, 0));
    const totCnt = r2(countable.reduce((s, r) => s + (r.counted || 0), 0));

    let o = INIT + ALIGN_C;
    if (d.businessName) o += BOLD_ON + TALL_ON + center(d.businessName, w) + DBL_OFF + BOLD_OFF;
    o += BOLD_ON + center('CUADRE DE CAJA', w) + BOLD_OFF;
    if (d.closed) o += center('(turno cerrado)', w);
    o += ALIGN_L + rule(w);
    if (d.cajaName) o += two('Caja', d.cajaName, w);
    o += two('Fecha', fmtDate(d.date), w);
    if (d.cashier) o += two('Cajero', d.cashier, w);
    if (d.sessionId) o += two('Turno #', d.sessionId.slice(0, 8), w);
    o += rule(w);

    // Por método: esperado / contado / diferencia.
    for (const r of d.rows) {
        o += BOLD_ON + leftLine(r.label) + BOLD_OFF;
        o += two('  Sistema', money(r.expected), w);
        if (r.counted == null) { o += leftLine('  (informativo, no se cuenta)'); continue; }
        o += two('  Contado', money(r.counted), w);
        o += two('  Diferencia', signed(r2(r.counted - r.expected)), w);
    }
    o += rule(w);
    o += two('Total sistema', money(totExp), w);
    o += two('Total contado', money(totCnt), w);
    o += BOLD_ON + two('Diferencia', signed(r2(totCnt - totExp)), w) + BOLD_OFF;
    o += rule(w);

    // Desglose del efectivo esperado en gaveta.
    o += BOLD_ON + leftLine('Efectivo en gaveta') + BOLD_OFF;
    o += two('  Fondo inicial', money(d.cash.openingFloat), w);
    o += two('  + Ventas efectivo', money(d.cash.cashSales), w);
    o += two('  + Entradas', money(d.cash.cashIn), w);
    o += two('  - Payouts', money(d.cash.payouts), w);
    o += two('  - Devoluciones', money(d.cash.cashRefunds), w);
    o += BOLD_ON + two('  = Esperado', money(d.cash.expectedCash), w) + BOLD_OFF;

    if (d.denominations && d.denominations.some(x => x.qty > 0)) {
        o += rule(w) + BOLD_ON + leftLine('Conteo por denominacion') + BOLD_OFF;
        for (const x of d.denominations) if (x.qty > 0) o += two(`  ${x.label} x ${x.qty}`, money(x.subtotal), w);
    }

    o += rule(w);
    o += two('Ventas del turno', money(d.totalSales), w);
    o += two('Transacciones', String(d.salesCount), w);
    o += two('Devoluciones', String(d.returnsCount), w);
    if (d.notes && d.notes.trim()) { o += rule(w) + leftLine('Notas:'); for (const ln of d.notes.split('\n')) o += leftLine(ln); }
    o += '\n\n' + leftLine('Firma: ' + '_'.repeat(Math.max(10, w - 8)));
    o += CUT;
    return o;
}

/** HTML de 80 mm del cuadre (para imprimir por el navegador si no hay impresora térmica). */
export function buildCuadreHtml(d: CuadrePrintData): string {
    const row = (l: string, v: string, b = false) => `<div style="display:flex;justify-content:space-between;${b ? 'font-weight:700;' : ''}"><span>${esc(l)}</span><span>${esc(v)}</span></div>`;
    const hr = '<div style="border-top:1px dashed #999;margin:6px 0;"></div>';
    const countable = d.rows.filter(r => r.counted != null);
    const totExp = r2(countable.reduce((s, r) => s + r.expected, 0));
    const totCnt = r2(countable.reduce((s, r) => s + (r.counted || 0), 0));
    const methods = d.rows.map(r => `
        <div style="font-weight:700;margin-top:4px;">${esc(r.label)}</div>
        ${row('  Sistema', money(r.expected))}
        ${r.counted == null ? '<div style="color:#666;">(informativo, no se cuenta)</div>' : `${row('  Contado', money(r.counted))}${row('  Diferencia', signed(r2(r.counted - r.expected)))}`}`).join('');
    const denoms = d.denominations && d.denominations.some(x => x.qty > 0)
        ? `${hr}<div style="font-weight:700;">Conteo por denominación</div>${d.denominations.filter(x => x.qty > 0).map(x => row(`${x.label} × ${x.qty}`, money(x.subtotal))).join('')}` : '';
    return `
        <div style="width:72mm;margin:0 auto;padding:4mm;font-family:'Courier New',monospace;font-size:11px;color:#111;box-sizing:border-box;">
            <div style="text-align:center;">
                ${d.businessName ? `<div style="font-size:14px;font-weight:700;">${esc(d.businessName)}</div>` : ''}
                <div style="font-weight:700;">CUADRE DE CAJA</div>
                ${d.closed ? '<div>(turno cerrado)</div>' : ''}
            </div>
            ${hr}
            ${d.cajaName ? row('Caja', d.cajaName) : ''}
            ${row('Fecha', fmtDate(d.date))}
            ${d.cashier ? row('Cajero', d.cashier) : ''}
            ${d.sessionId ? row('Turno #', d.sessionId.slice(0, 8)) : ''}
            ${hr}${methods}${hr}
            ${row('Total sistema', money(totExp))}
            ${row('Total contado', money(totCnt))}
            ${row('Diferencia', signed(r2(totCnt - totExp)), true)}
            ${hr}
            <div style="font-weight:700;">Efectivo en gaveta</div>
            ${row('Fondo inicial', money(d.cash.openingFloat))}
            ${row('+ Ventas efectivo', money(d.cash.cashSales))}
            ${row('+ Entradas', money(d.cash.cashIn))}
            ${row('- Payouts', money(d.cash.payouts))}
            ${row('- Devoluciones', money(d.cash.cashRefunds))}
            ${row('= Esperado', money(d.cash.expectedCash), true)}
            ${denoms}
            ${hr}
            ${row('Ventas del turno', money(d.totalSales))}
            ${row('Transacciones', String(d.salesCount))}
            ${row('Devoluciones', String(d.returnsCount))}
            ${d.notes && d.notes.trim() ? `${hr}<div>Notas:</div><div style="white-space:pre-wrap;">${esc(d.notes)}</div>` : ''}
            <div style="margin-top:24px;">Firma: ____________________</div>
        </div>`;
}

/** Imprime el cuadre en la impresora de recibos (o por el navegador a 80 mm si no hay). */
export async function printCuadre(d: CuadrePrintData): Promise<void> {
    if (isWebUsbEnabled()) {
        try { await printRawViaWebUsb(buildCuadreEscPos(d, getWebUsbConfig().width || 48)); return; }
        catch (e) { console.error('Cuadre por WebUSB falló, uso el navegador:', e); }
    } else if (isReceiptPrinterEnabled()) {
        try { await printRawViaQz(buildCuadreEscPos(d, getReceiptPrinterConfig().width || 48)); return; }
        catch (e) { console.error('Cuadre por QZ falló, uso el navegador:', e); }
    }
    // Carga diferida: el componente del recibo trae medio POS; solo hace falta en este respaldo.
    const { printReceipt } = await import('../components/pos/ReceiptModal');
    printReceipt(buildCuadreHtml(d), '80mm');
}
