interface StoreInfo { businessName?: string; address?: string; phone?: string; }

export interface InvoicePaymentReceiptData {
    invoiceNumber?: number | null;
    clientName?: string | null;
    payment: { amount: number; method?: string | null; reference?: string | null; paidAt?: string | null };
    total: number;
    paidTotal: number;   // total pagado acumulado (incluye este abono)
    index?: number;      // nº de abono (1, 2, …)
}

const money = (n: number) => `$${(Number(n) || 0).toFixed(2)}`;
const esc = (s: any) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

/**
 * Imprime (→ guardar como PDF) un recibo de UN abono de factura, en formato ticket. Usa un iframe
 * oculto, sin depender del PDF del servidor.
 */
export function printInvoicePaymentReceipt(data: InvoicePaymentReceiptData, store: StoreInfo = {}) {
    const balance = Math.max(0, (data.total || 0) - (data.paidTotal || 0));
    const p = data.payment;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Recibo abono factura ${esc(data.invoiceNumber ?? '')}</title>
      <style>
        * { font-family: 'Courier New', monospace; }
        body { width: 300px; margin: 0 auto; color:#000; }
        .center { text-align:center; } .b { font-weight:bold; }
        hr { border:none; border-top:1px dashed #000; margin:6px 0; }
        .row { display:flex; justify-content:space-between; font-size:12px; }
        .big { font-size:14px; }
      </style></head><body>
        <div class="center b big">${esc(store.businessName || 'Recibo de Pago')}</div>
        ${store.address ? `<div class="center" style="font-size:11px;">${esc(store.address)}</div>` : ''}
        ${store.phone ? `<div class="center" style="font-size:11px;">Tel: ${esc(store.phone)}</div>` : ''}
        <hr/>
        <div class="center b">Recibo de Abono</div>
        <div class="center" style="font-size:11px;">Factura ${data.invoiceNumber != null ? `#${esc(data.invoiceNumber)}` : ''}${data.index ? ` · Abono ${data.index}` : ''}</div>
        <div class="center" style="font-size:11px;">Fecha: ${p.paidAt ? new Date(p.paidAt).toLocaleString() : new Date().toLocaleString()}</div>
        <div style="font-size:12px;margin-top:4px;">${esc(data.clientName || 'Cliente')}</div>
        <hr/>
        <div class="row"><span>Método</span><span>${esc(p.method || '—')}</span></div>
        ${p.reference ? `<div class="row"><span>Ref</span><span>${esc(p.reference)}</span></div>` : ''}
        <div class="row b big"><span>Abono</span><span>${money(p.amount)}</span></div>
        <hr/>
        <div class="row"><span>Total factura</span><span>${money(data.total)}</span></div>
        <div class="row"><span>Pagado</span><span>${money(data.paidTotal)}</span></div>
        <div class="row b"><span>Saldo</span><span>${money(balance)}</span></div>
        <hr/>
        <div class="center" style="font-size:11px;">¡Gracias por su pago!</div>
      </body></html>`;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed'; iframe.style.right = '0'; iframe.style.bottom = '0';
    iframe.style.width = '0'; iframe.style.height = '0'; iframe.style.border = '0';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) { document.body.removeChild(iframe); return; }
    doc.open(); doc.write(html); doc.close();
    const cleanup = () => { setTimeout(() => { try { document.body.removeChild(iframe); } catch { /* noop */ } }, 1000); };
    iframe.onload = () => { try { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); } catch { /* noop */ } cleanup(); };
}
