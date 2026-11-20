/**
 * Comprobante de DESEMBOLSO (salida de efectivo de caja), para el soporte de auditoría.
 *
 * Se imprime solo al registrar el desembolso, por la misma ruta que los recibos de venta y el
 * cuadre: WebUSB si está activo, si no QZ Tray (sin diálogo), y si este equipo no tiene
 * impresora térmica configurada, por el navegador a 80 mm. También se reimprime desde
 * Reimprimir › Desembolsos.
 */
import { escpos, getReceiptPrinterConfig, isReceiptPrinterEnabled, printRawViaQz } from '../services/receiptPrinter';
import { getWebUsbConfig, isWebUsbEnabled, printRawViaWebUsb } from '../services/webusbPrinter';

interface StoreInfo { businessName?: string; address?: string; phone?: string; }

export interface PayoutVoucher {
  amount: number;
  reason?: string;
  receiptCount?: number | string;
  invoiceNumber?: string | null;
  recordedBy?: string;
  authorizedBy?: string | null;
  date?: string | number | Date;
  cajaName?: string;
  /** Id del movimiento: el folio impreso son sus últimos 6 caracteres. */
  movementId?: string;
  /** Reimpresión desde el historial (sale "COPIA"). */
  reprint?: boolean;
}

const money = (n: number) => `$${(Number(n) || 0).toFixed(2)}`;
const esc = (s: any) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
export const payoutFolio = (id?: string) => (id ? id.replace(/-/g, '').slice(-6).toUpperCase() : '');
const hasCount = (v: PayoutVoucher) => v.receiptCount != null && String(v.receiptCount) !== '';

/** Texto ESC/POS del comprobante (impresora térmica). */
export function buildPayoutEscPos(v: PayoutVoucher, store: StoreInfo = {}, width = 48): string {
  const { INIT, ALIGN_C, ALIGN_L, BOLD_ON, BOLD_OFF, TALL_ON, DBL_OFF, CUT, two, center, rule, leftLine } = escpos;
  const w = width || 48;
  const when = v.date ? new Date(v.date) : new Date();
  let o = INIT + ALIGN_C;
  if (store.businessName) o += BOLD_ON + TALL_ON + center(store.businessName, w) + DBL_OFF + BOLD_OFF;
  if (store.address) o += center(store.address, w);
  if (store.phone) o += center(`Tel: ${store.phone}`, w);
  o += rule(w);
  o += BOLD_ON + center('COMPROBANTE DE DESEMBOLSO', w) + BOLD_OFF;
  if (v.reprint) o += center('*** COPIA ***', w);
  o += ALIGN_L + rule(w);
  if (v.movementId) o += two('Folio', payoutFolio(v.movementId), w);
  o += two('Fecha', when.toLocaleString(), w);
  if (v.cajaName) o += two('Caja', v.cajaName, w);
  o += rule(w);
  o += BOLD_ON + TALL_ON + two('MONTO', money(v.amount), w) + DBL_OFF + BOLD_OFF;
  if (v.reason) { o += leftLine('Motivo:'); o += leftLine(v.reason); }
  if (v.invoiceNumber) o += two('Factura/Ref', String(v.invoiceNumber), w);
  if (hasCount(v)) o += two('Recibos', String(v.receiptCount), w);
  o += rule(w);
  if (v.recordedBy) o += two('Registrado por', v.recordedBy, w);
  if (v.authorizedBy) o += two('Autorizado por', v.authorizedBy, w);
  o += '\n\n\n' + center('______________________________', w) + center('Firma de quien recibe', w);
  o += '\n\n' + center('______________________________', w) + center('Firma de quien autoriza', w);
  o += '\n' + center('Conserve este comprobante', w) + CUT;
  return o;
}

/** HTML de 80 mm (respaldo por el navegador). */
export function buildPayoutHtml(v: PayoutVoucher, store: StoreInfo = {}): string {
  const when = v.date ? new Date(v.date) : new Date();
  const row = (l: string, val: string, b = false) => `<div style="display:flex;justify-content:space-between;gap:8px;${b ? 'font-weight:700;' : ''}"><span>${esc(l)}</span><span style="text-align:right;">${esc(val)}</span></div>`;
  const hr = '<div style="border-top:1px dashed #000;margin:6px 0;"></div>';
  const sign = (label: string) => `<div style="margin-top:30px;border-top:1px solid #000;padding-top:3px;text-align:center;">${label}</div>`;
  return `
    <div style="width:72mm;margin:0 auto;padding:4mm;font-family:'Courier New',monospace;font-size:11px;color:#000;box-sizing:border-box;">
      <div style="text-align:center;">
        ${store.businessName ? `<div style="font-size:14px;font-weight:700;">${esc(store.businessName)}</div>` : ''}
        ${store.address ? `<div>${esc(store.address)}</div>` : ''}
        ${store.phone ? `<div>Tel: ${esc(store.phone)}</div>` : ''}
      </div>
      ${hr}
      <div style="text-align:center;font-weight:700;font-size:13px;">COMPROBANTE DE DESEMBOLSO</div>
      ${v.reprint ? '<div style="text-align:center;">*** COPIA ***</div>' : ''}
      ${hr}
      ${v.movementId ? row('Folio', payoutFolio(v.movementId)) : ''}
      ${row('Fecha', when.toLocaleString())}
      ${v.cajaName ? row('Caja', v.cajaName) : ''}
      ${hr}
      <div style="font-size:15px;">${row('MONTO', money(v.amount), true)}</div>
      ${v.reason ? `<div style="margin-top:4px;">Motivo:<br/>${esc(v.reason)}</div>` : ''}
      ${v.invoiceNumber ? row('Factura/Ref', String(v.invoiceNumber)) : ''}
      ${hasCount(v) ? row('Recibos', String(v.receiptCount)) : ''}
      ${hr}
      ${v.recordedBy ? row('Registrado por', v.recordedBy) : ''}
      ${v.authorizedBy ? row('Autorizado por', v.authorizedBy) : ''}
      ${sign('Firma de quien recibe')}
      ${sign('Firma de quien autoriza')}
      <div style="text-align:center;margin-top:8px;">Conserve este comprobante</div>
    </div>`;
}

/** Imprime el comprobante en la impresora de recibos (o por el navegador a 80 mm si no hay). */
export async function printPayoutVoucher(v: PayoutVoucher, store: StoreInfo = {}): Promise<void> {
  if (isWebUsbEnabled()) {
    try { await printRawViaWebUsb(buildPayoutEscPos(v, store, getWebUsbConfig().width || 48)); return; }
    catch (e) { console.error('Desembolso por WebUSB falló, uso el navegador:', e); }
  } else if (isReceiptPrinterEnabled()) {
    try { await printRawViaQz(buildPayoutEscPos(v, store, getReceiptPrinterConfig().width || 48)); return; }
    catch (e) { console.error('Desembolso por QZ falló, uso el navegador:', e); }
  }
  const { printReceipt } = await import('../components/pos/ReceiptModal');
  await printReceipt(buildPayoutHtml(v, store), '80mm');
}

/**
 * Impresión al registrar: el desembolso ya quedó guardado, así que un fallo solo se avisa
 * (se puede reimprimir) y una impresora que no responde no deja al cajero esperando.
 */
export function printPayoutOnRecord(v: PayoutVoucher, store: StoreInfo, onError: (message: string) => void): void {
  const timeout = new Promise<void>(resolve => { setTimeout(resolve, 8000); });
  Promise.race([printPayoutVoucher(v, store), timeout]).catch((e) => {
    console.error('No se pudo imprimir el comprobante de desembolso:', e);
    onError('El desembolso se registró, pero no se pudo imprimir el comprobante. Puede reimprimirlo en Reimprimir › Desembolsos.');
  });
}
