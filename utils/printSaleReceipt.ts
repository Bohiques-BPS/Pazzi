interface StoreInfo { businessName?: string; address?: string; phone?: string; }

const money = (n: number) => `$${(Number(n) || 0).toFixed(2)}`;
const esc = (s: any) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

/**
 * Imprime el recibo/factura de una venta (ticket). Reutiliza los datos de la venta obtenida del
 * backend (items con nombre, pagos, totales). Sirve como comprobante/reimpresión y como "factura".
 */
export function printSaleReceipt(sale: any, store: StoreInfo = {}) {
  const items = (sale.items || []).map((it: any) => ({
    name: it.name || it.product?.name || 'Artículo',
    qty: Number(it.quantity) || 0,
    price: Number(it.unitPrice) || 0,
  }));
  const payments = (sale.payments || []).map((p: any) => ({ method: p.paymentMethodUsed || 'Pago', amount: Number(p.amountPaid) || 0 }));
  const total = Number(sale.totalAmount) || 0;
  const tax = Number(sale.taxAmount) || 0;
  const subtotal = sale.subtotal != null ? Number(sale.subtotal) : (total - tax);
  const paid = payments.reduce((a: number, p: any) => a + p.amount, 0);
  const balance = Math.round((total - paid) * 100) / 100;
  const folio = sale.saleNumber != null ? `#${sale.saleNumber}` : `#${String(sale.id).slice(-6).toUpperCase()}`;
  const clientName = sale.client ? `${sale.client.name || ''} ${sale.client.lastName || ''}`.trim() : '';

  const rows = items.map((it: any) => `
    <tr>
      <td style="padding:2px 4px;">${esc(it.name)}</td>
      <td style="padding:2px 4px;text-align:center;">${it.qty}</td>
      <td style="padding:2px 4px;text-align:right;">${money(it.price)}</td>
      <td style="padding:2px 4px;text-align:right;">${money(it.qty * it.price)}</td>
    </tr>`).join('');
  const payRows = payments.map((p: any) => `<div class="row"><span>${esc(p.method)}</span><span>${money(p.amount)}</span></div>`).join('');

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Recibo ${esc(folio)}</title>
    <style>
      *{font-family:'Courier New',monospace;} body{width:300px;margin:0 auto;color:#000;}
      .center{text-align:center;} .b{font-weight:bold;} hr{border:none;border-top:1px dashed #000;margin:6px 0;}
      table{width:100%;border-collapse:collapse;font-size:12px;} .row{display:flex;justify-content:space-between;font-size:12px;}
    </style></head><body>
      <div class="center b" style="font-size:14px;">${esc(store.businessName || 'Recibo')}</div>
      ${store.address ? `<div class="center" style="font-size:11px;">${esc(store.address)}</div>` : ''}
      ${store.phone ? `<div class="center" style="font-size:11px;">Tel: ${esc(store.phone)}</div>` : ''}
      <hr/>
      <div class="center b">Factura/Recibo ${esc(folio)}</div>
      <div class="center" style="font-size:11px;">${sale.date ? new Date(sale.date).toLocaleString() : ''}</div>
      ${clientName ? `<div style="font-size:12px;margin-top:4px;">Cliente: ${esc(clientName)}</div>` : ''}
      <hr/>
      <table>
        <thead><tr>
          <td class="b" style="padding:2px 4px;">Artículo</td>
          <td class="b" style="padding:2px 4px;text-align:center;">Cant</td>
          <td class="b" style="padding:2px 4px;text-align:right;">Precio</td>
          <td class="b" style="padding:2px 4px;text-align:right;">Total</td>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <hr/>
      <div class="row"><span>Subtotal</span><span>${money(subtotal)}</span></div>
      ${tax ? `<div class="row"><span>IVU/Impuesto</span><span>${money(tax)}</span></div>` : ''}
      <div class="row b" style="font-size:14px;"><span>TOTAL</span><span>${money(total)}</span></div>
      ${payRows ? `<hr/><div class="b">Pagos</div>${payRows}` : ''}
      <div class="row b"><span>Pagado</span><span>${money(paid)}</span></div>
      ${balance > 0.001 ? `<div class="row b"><span>Balance por pagar</span><span>${money(balance)}</span></div>` : ''}
      <hr/>
      <div class="center" style="font-size:11px;">*** Gracias por su patrocinio ***</div>
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
