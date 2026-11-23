import{s as v}from"./shortRef-CiKciNvu.js";const a=e=>`$${(Number(e)||0).toFixed(2)}`,n=e=>String(e??"").replace(/[&<>"]/g,o=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[o]);function h(e,o={}){var c;const p=Math.max(0,(e.total||0)-(e.paidTotal||0)),s=e.payment,l=`<!doctype html><html><head><meta charset="utf-8"><title>Recibo abono factura ${n(e.invoiceNumber??"")}</title>
      <style>
        * { font-family: 'Courier New', monospace; }
        body { width: 300px; margin: 0 auto; color:#000; }
        .center { text-align:center; } .b { font-weight:bold; }
        hr { border:none; border-top:1px dashed #000; margin:6px 0; }
        .row { display:flex; justify-content:space-between; font-size:12px; }
        .big { font-size:14px; }
      </style></head><body>
        <div class="center b big">${n(o.businessName||"Recibo de Pago")}</div>
        ${o.address?`<div class="center" style="font-size:11px;">${n(o.address)}</div>`:""}
        ${o.phone?`<div class="center" style="font-size:11px;">Tel: ${n(o.phone)}</div>`:""}
        <hr/>
        <div class="center b">Recibo de Abono</div>
        <div class="center" style="font-size:11px;">Factura ${e.invoiceNumber!=null?`#${n(e.invoiceNumber)}`:""}${e.index?` · Abono ${e.index}`:""}</div>
        <div class="center" style="font-size:11px;">Fecha: ${s.paidAt?new Date(s.paidAt).toLocaleString():new Date().toLocaleString()}</div>
        <div style="font-size:12px;margin-top:4px;">${n(e.clientName||"Cliente")}</div>
        <hr/>
        <div class="row"><span>Método</span><span>${n(s.method||"—")}</span></div>
        ${s.reference?`<div class="row"><span>Ref</span><span>${n(v(s.reference))}</span></div>`:""}
        <div class="row b big"><span>Abono</span><span>${a(s.amount)}</span></div>
        <hr/>
        <div class="row"><span>Total factura</span><span>${a(e.total)}</span></div>
        <div class="row"><span>Pagado</span><span>${a(e.paidTotal)}</span></div>
        <div class="row b"><span>Saldo</span><span>${a(p)}</span></div>
        <hr/>
        <div class="center" style="font-size:11px;">¡Gracias por su pago!</div>
      </body></html>`,t=document.createElement("iframe");t.style.position="fixed",t.style.right="0",t.style.bottom="0",t.style.width="0",t.style.height="0",t.style.border="0",document.body.appendChild(t);const i=t.contentDocument||((c=t.contentWindow)==null?void 0:c.document);if(!i){document.body.removeChild(t);return}i.open(),i.write(l),i.close();const m=()=>{setTimeout(()=>{try{document.body.removeChild(t)}catch{}},1e3)};t.onload=()=>{var d,r;try{(d=t.contentWindow)==null||d.focus(),(r=t.contentWindow)==null||r.print()}catch{}m()}}export{h as p};
