const a=e=>`$${(Number(e)||0).toFixed(2)}`,t=e=>String(e??"").replace(/[&<>"]/g,o=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[o]);function v(e,o={}){var c;const r=Math.max(0,(e.total||0)-(e.paidTotal||0)),s=e.payment,l=`<!doctype html><html><head><meta charset="utf-8"><title>Recibo abono factura ${t(e.invoiceNumber??"")}</title>
      <style>
        * { font-family: 'Courier New', monospace; }
        body { width: 300px; margin: 0 auto; color:#000; }
        .center { text-align:center; } .b { font-weight:bold; }
        hr { border:none; border-top:1px dashed #000; margin:6px 0; }
        .row { display:flex; justify-content:space-between; font-size:12px; }
        .big { font-size:14px; }
      </style></head><body>
        <div class="center b big">${t(o.businessName||"Recibo de Pago")}</div>
        ${o.address?`<div class="center" style="font-size:11px;">${t(o.address)}</div>`:""}
        ${o.phone?`<div class="center" style="font-size:11px;">Tel: ${t(o.phone)}</div>`:""}
        <hr/>
        <div class="center b">Recibo de Abono</div>
        <div class="center" style="font-size:11px;">Factura ${e.invoiceNumber!=null?`#${t(e.invoiceNumber)}`:""}${e.index?` · Abono ${e.index}`:""}</div>
        <div class="center" style="font-size:11px;">Fecha: ${s.paidAt?new Date(s.paidAt).toLocaleString():new Date().toLocaleString()}</div>
        <div style="font-size:12px;margin-top:4px;">${t(e.clientName||"Cliente")}</div>
        <hr/>
        <div class="row"><span>Método</span><span>${t(s.method||"—")}</span></div>
        ${s.reference?`<div class="row"><span>Ref</span><span>${t(s.reference)}</span></div>`:""}
        <div class="row b big"><span>Abono</span><span>${a(s.amount)}</span></div>
        <hr/>
        <div class="row"><span>Total factura</span><span>${a(e.total)}</span></div>
        <div class="row"><span>Pagado</span><span>${a(e.paidTotal)}</span></div>
        <div class="row b"><span>Saldo</span><span>${a(r)}</span></div>
        <hr/>
        <div class="center" style="font-size:11px;">¡Gracias por su pago!</div>
      </body></html>`,n=document.createElement("iframe");n.style.position="fixed",n.style.right="0",n.style.bottom="0",n.style.width="0",n.style.height="0",n.style.border="0",document.body.appendChild(n);const i=n.contentDocument||((c=n.contentWindow)==null?void 0:c.document);if(!i){document.body.removeChild(n);return}i.open(),i.write(l),i.close();const m=()=>{setTimeout(()=>{try{document.body.removeChild(n)}catch{}},1e3)};n.onload=()=>{var d,p;try{(d=n.contentWindow)==null||d.focus(),(p=n.contentWindow)==null||p.print()}catch{}m()}}export{v as p};
