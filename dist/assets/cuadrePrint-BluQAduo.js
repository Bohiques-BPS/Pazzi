const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/ReceiptModal-D_Yp-lzi.js","assets/index-Cfxsw8Ww.js","assets/index-DyP91jMm.css","assets/imageData-Bp7_AP_b.js","assets/webusbPrinter-CCIzjeVo.js","assets/cashDrawer-BBV4TFkz.js"])))=>i.map(i=>d[i]);
import{aj as E}from"./index-Cfxsw8Ww.js";import{i as F,c as S,d as j,a as T,e as I,f as L,h as R}from"./webusbPrinter-CCIzjeVo.js";const a=e=>`$${(Number(e)||0).toFixed(2)}`,_=e=>`${e>=0?"+":"-"}${a(Math.abs(e))}`,p=e=>Math.round((Number(e)||0)*100)/100,h=e=>String(e??"").replace(/[&<>"]/g,n=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[n]),N=e=>new Date(e).toLocaleString();function D(e,n=48){const{INIT:r,ALIGN_C:$,ALIGN_L:v,BOLD_ON:l,BOLD_OFF:u,TALL_ON:g,DBL_OFF:s,CUT:d,two:i,center:b,rule:f,leftLine:m}=R,o=n||48,C=e.rows.filter(c=>c.counted!=null),w=p(C.reduce((c,y)=>c+y.expected,0)),x=p(C.reduce((c,y)=>c+(y.counted||0),0));let t=r+$;e.businessName&&(t+=l+g+b(e.businessName,o)+s+u),t+=l+b("CUADRE DE CAJA",o)+u,e.closed&&(t+=b("(turno cerrado)",o)),t+=v+f(o),e.cajaName&&(t+=i("Caja",e.cajaName,o)),t+=i("Fecha",N(e.date),o),e.cashier&&(t+=i("Cajero",e.cashier,o)),e.sessionId&&(t+=i("Turno #",e.sessionId.slice(0,8),o)),t+=f(o);for(const c of e.rows){if(t+=l+m(c.label)+u,t+=i("  Sistema",a(c.expected),o),c.counted==null){t+=m("  (informativo, no se cuenta)");continue}t+=i("  Contado",a(c.counted),o),t+=i("  Diferencia",_(p(c.counted-c.expected)),o)}if(t+=f(o),t+=i("Total sistema",a(w),o),t+=i("Total contado",a(x),o),t+=l+i("Diferencia",_(p(x-w)),o)+u,t+=f(o),t+=l+m("Efectivo en gaveta")+u,t+=i("  Fondo inicial",a(e.cash.openingFloat),o),t+=i("  + Ventas efectivo",a(e.cash.cashSales),o),t+=i("  + Entradas",a(e.cash.cashIn),o),t+=i("  - Payouts",a(e.cash.payouts),o),t+=i("  - Devoluciones",a(e.cash.cashRefunds),o),t+=l+i("  = Esperado",a(e.cash.expectedCash),o)+u,e.denominations&&e.denominations.some(c=>c.qty>0)){t+=f(o)+l+m("Conteo por denominacion")+u;for(const c of e.denominations)c.qty>0&&(t+=i(`  ${c.label} x ${c.qty}`,a(c.subtotal),o))}if(t+=f(o),t+=i("Ventas del turno",a(e.totalSales),o),t+=i("Transacciones",String(e.salesCount),o),t+=i("Devoluciones",String(e.returnsCount),o),e.notes&&e.notes.trim()){t+=f(o)+m("Notas:");for(const c of e.notes.split(`
`))t+=m(c)}return t+=`

`+m("Firma: "+"_".repeat(Math.max(10,o-8))),t+=d,t}function A(e){const n=(s,d,i=!1)=>`<div style="display:flex;justify-content:space-between;${i?"font-weight:700;":""}"><span>${h(s)}</span><span>${h(d)}</span></div>`,r='<div style="border-top:1px dashed #999;margin:6px 0;"></div>',$=e.rows.filter(s=>s.counted!=null),v=p($.reduce((s,d)=>s+d.expected,0)),l=p($.reduce((s,d)=>s+(d.counted||0),0)),u=e.rows.map(s=>`
        <div style="font-weight:700;margin-top:4px;">${h(s.label)}</div>
        ${n("  Sistema",a(s.expected))}
        ${s.counted==null?'<div style="color:#666;">(informativo, no se cuenta)</div>':`${n("  Contado",a(s.counted))}${n("  Diferencia",_(p(s.counted-s.expected)))}`}`).join(""),g=e.denominations&&e.denominations.some(s=>s.qty>0)?`${r}<div style="font-weight:700;">Conteo por denominación</div>${e.denominations.filter(s=>s.qty>0).map(s=>n(`${s.label} × ${s.qty}`,a(s.subtotal))).join("")}`:"";return`
        <div style="width:72mm;margin:0 auto;padding:4mm;font-family:'Courier New',monospace;font-size:11px;color:#111;box-sizing:border-box;">
            <div style="text-align:center;">
                ${e.businessName?`<div style="font-size:14px;font-weight:700;">${h(e.businessName)}</div>`:""}
                <div style="font-weight:700;">CUADRE DE CAJA</div>
                ${e.closed?"<div>(turno cerrado)</div>":""}
            </div>
            ${r}
            ${e.cajaName?n("Caja",e.cajaName):""}
            ${n("Fecha",N(e.date))}
            ${e.cashier?n("Cajero",e.cashier):""}
            ${e.sessionId?n("Turno #",e.sessionId.slice(0,8)):""}
            ${r}${u}${r}
            ${n("Total sistema",a(v))}
            ${n("Total contado",a(l))}
            ${n("Diferencia",_(p(l-v)),!0)}
            ${r}
            <div style="font-weight:700;">Efectivo en gaveta</div>
            ${n("Fondo inicial",a(e.cash.openingFloat))}
            ${n("+ Ventas efectivo",a(e.cash.cashSales))}
            ${n("+ Entradas",a(e.cash.cashIn))}
            ${n("- Payouts",a(e.cash.payouts))}
            ${n("- Devoluciones",a(e.cash.cashRefunds))}
            ${n("= Esperado",a(e.cash.expectedCash),!0)}
            ${g}
            ${r}
            ${n("Ventas del turno",a(e.totalSales))}
            ${n("Transacciones",String(e.salesCount))}
            ${n("Devoluciones",String(e.returnsCount))}
            ${e.notes&&e.notes.trim()?`${r}<div>Notas:</div><div style="white-space:pre-wrap;">${h(e.notes)}</div>`:""}
            <div style="margin-top:24px;">Firma: ____________________</div>
        </div>`}async function P(e){if(F())try{await S(D(e,j().width||48));return}catch(r){console.error("Cuadre por WebUSB falló, uso el navegador:",r)}else if(T())try{await I(D(e,L().width||48));return}catch(r){console.error("Cuadre por QZ falló, uso el navegador:",r)}const{printReceipt:n}=await E(async()=>{const{printReceipt:r}=await import("./ReceiptModal-D_Yp-lzi.js").then($=>$.d);return{printReceipt:r}},__vite__mapDeps([0,1,2,3,4,5]));n(A(e),"80mm")}export{P as p};
