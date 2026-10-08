interface StoreInfo { businessName?: string; address?: string; phone?: string; }

interface PayoutVoucher {
  amount: number;
  reason?: string;
  receiptCount?: number | string;
  invoiceNumber?: string;
  recordedBy?: string;
  authorizedBy?: string;
  date?: string | number | Date;
  cajaName?: string;
}

const money = (n: number) => `$${(Number(n) || 0).toFixed(2)}`;
const esc = (s: any) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

/**
 * Imprime un comprobante (voucher) de DESEMBOLSO / salida de efectivo de caja.
 * Antes el desembolso no generaba ningún recibo impreso.
 */
export function printPayoutVoucher(v: PayoutVoucher, store: StoreInfo = {}) {
  const when = v.date ? new Date(v.date) : new Date();
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Desembolso</title>
    <style>
      *{font-family:'Courier New',monospace;} body{width:300px;margin:0 auto;color:#000;}
      .center{text-align:center;} .b{font-weight:bold;} hr{border:none;border-top:1px dashed #000;margin:6px 0;}
      .row{display:flex;justify-content:space-between;font-size:12px;margin:2px 0;}
    </style></head><body>
      <div class="center b" style="font-size:14px;">${esc(store.businessName || 'Comprobante')}</div>
      ${store.address ? `<div class="center" style="font-size:11px;">${esc(store.address)}</div>` : ''}
      ${store.phone ? `<div class="center" style="font-size:11px;">Tel: ${esc(store.phone)}</div>` : ''}
      <hr/>
      <div class="center b" style="font-size:13px;">COMPROBANTE DE DESEMBOLSO</div>
      <div class="center" style="font-size:11px;">${when.toLocaleString()}</div>
      ${v.cajaName ? `<div style="font-size:12px;margin-top:4px;">Caja: ${esc(v.cajaName)}</div>` : ''}
      <hr/>
      <div class="row b" style="font-size:16px;"><span>MONTO</span><span>${money(v.amount)}</span></div>
      ${v.reason ? `<div style="font-size:12px;margin-top:4px;">Motivo:<br/>${esc(v.reason)}</div>` : ''}
      ${v.invoiceNumber ? `<div class="row"><span>Factura/Ref</span><span>${esc(v.invoiceNumber)}</span></div>` : ''}
      ${v.receiptCount != null && String(v.receiptCount) !== '' ? `<div class="row"><span>Recibos</span><span>${esc(v.receiptCount)}</span></div>` : ''}
      <hr/>
      ${v.recordedBy ? `<div style="font-size:12px;">Registrado por: ${esc(v.recordedBy)}</div>` : ''}
      ${v.authorizedBy ? `<div style="font-size:12px;">Autorizado por: ${esc(v.authorizedBy)}</div>` : ''}
      <hr/>
      <div style="margin-top:28px;border-top:1px solid #000;padding-top:4px;font-size:11px;" class="center">Firma de quien recibe</div>
      <div class="center" style="font-size:11px;margin-top:8px;">*** Conserve este comprobante ***</div>
    </body></html>`;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed'; iframe.style.right = '0'; iframe.style.bottom = '0';
  iframe.style.width = '0'; iframe.style.height = '0'; iframe.style.border = '0';
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow?.document;
  if (!doc) { document.body.removeChild(iframe); return; }
  doc.open(); doc.write(html); doc.close();
  iframe.contentWindow?.focus();
  setTimeout(() => {
    try { iframe.contentWindow?.print(); } catch { /* noop */ }
    setTimeout(() => { try { document.body.removeChild(iframe); } catch { /* noop */ } }, 1500);
  }, 350);
}
