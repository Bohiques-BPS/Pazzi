import type { PaymentReceipt } from '../services/clients';

interface StoreInfo { businessName?: string; address?: string; phone?: string; }

const money = (n: number) => `$${(Number(n) || 0).toFixed(2)}`;
const esc = (s: any) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

/**
 * Imprime un Recibo de Pago (abono a cuentas por cobrar) en formato ticket, similar al legacy:
 * encabezado del negocio, folio, cliente, facturas pagadas y balance por pagar. Usa un iframe
 * oculto para no depender de popups.
 */
export function printPaymentReceipt(receipt: PaymentReceipt, store: StoreInfo = {}) {
    const rows = (receipt.allocations || []).map(a => `
        <tr>
          <td style="padding:2px 6px;">${a.saleNumber != null ? `#${esc(a.saleNumber)}` : esc(a.saleId).slice(-6)}</td>
          <td style="padding:2px 6px;">${esc(receipt.method)}</td>
          <td style="padding:2px 6px;text-align:right;">${money(a.amount)}</td>
        </tr>`).join('');

    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Recibo ${esc(receipt.receiptNumber)}</title>
      <style>
        * { font-family: 'Courier New', monospace; }
        body { width: 300px; margin: 0 auto; color:#000; }
        .center { text-align:center; }
        .b { font-weight:bold; }
        hr { border:none; border-top:1px dashed #000; margin:6px 0; }
        table { width:100%; border-collapse:collapse; font-size:12px; }
        .row { display:flex; justify-content:space-between; font-size:12px; }
        .big { font-size:14px; }
      </style></head><body>
        <div class="center b big">${esc(store.businessName || 'Recibo de Pago')}</div>
        ${store.address ? `<div class="center" style="font-size:11px;">${esc(store.address)}</div>` : ''}
        ${store.phone ? `<div class="center" style="font-size:11px;">Tel: ${esc(store.phone)}</div>` : ''}
        <hr/>
        <div class="center b">Recibo de Pago: ${esc(receipt.receiptNumber)}</div>
        <div class="center" style="font-size:11px;">Fecha: ${new Date(receipt.date).toLocaleString()}</div>
        <div style="font-size:12px;margin-top:4px;">${esc(receipt.clientName || 'Cliente')}</div>
        ${receipt.reference ? `<div style="font-size:11px;">Ref: ${esc(receipt.reference)}</div>` : ''}
        <hr/>
        <div class="b center">Facturas Pagadas</div>
        <table>
          <thead><tr>
            <td class="b" style="padding:2px 6px;">Número</td>
            <td class="b" style="padding:2px 6px;">Forma de Pago</td>
            <td class="b" style="padding:2px 6px;text-align:right;">Cantidad</td>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <hr/>
        <div class="row b"><span>Total Pagado:</span><span>${money(receipt.totalPaid)}</span></div>
        <div class="row b"><span>Balance por pagar:</span><span>${money(receipt.balanceAfter)}</span></div>
        <hr/>
        <div class="center" style="font-size:11px;">*** Gracias por su patrocinio ***</div>
        ${receipt.cashierName ? `<div class="center" style="font-size:10px;margin-top:4px;">Cajero: ${esc(receipt.cashierName)}</div>` : ''}
      </body></html>`;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
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
