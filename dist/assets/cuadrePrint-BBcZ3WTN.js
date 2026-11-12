const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/ReceiptModal-CH58Bhmq.js","assets/index-DU-vP1uw.js","assets/index-DyN1peeB.css","assets/imageData-Bp7_AP_b.js","assets/webusbPrinter-DpFI2J_R.js","assets/cashDrawer-CO3MJgql.js"])))=>i.map(i=>d[i]);
import{_ as E}from"./index-DU-vP1uw.js";import{i as F,c as S,d as T,a as j,e as I,f as L,h as R}from"./webusbPrinter-DpFI2J_R.js";const a=e=>`$${(Number(e)||0).toFixed(2)}`,_=e=>`${e>=0?"+":"-"}${a(Math.abs(e))}`,p=e=>Math.round((Number(e)||0)*100)/100,$=e=>String(e??"").replace(/[&<>"]/g,n=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[n]),D=e=>new Date(e).toLocaleString();function N(e,n=48){const{INIT:c,ALIGN_C:l,ALIGN_L:v,BOLD_ON:u,BOLD_OFF:d,TALL_ON:g,DBL_OFF:s,CUT:m,two:i,center:y,rule:f,leftLine:h}=R,o=n||48,b=e.rows.filter(r=>r.counted!=null),w=p(b.reduce((r,C)=>r+C.expected,0)),x=p(b.reduce((r,C)=>r+(C.counted||0),0));let t=c+l;e.businessName&&(t+=u+g+y(e.businessName,o)+s+d),t+=u+y("CUADRE DE CAJA",o)+d,e.closed&&(t+=y("(turno cerrado)",o)),t+=v+f(o),e.cajaName&&(t+=i("Caja",e.cajaName,o)),t+=i("Fecha",D(e.date),o),e.cashier&&(t+=i("Cajero",e.cashier,o)),e.sessionId&&(t+=i("Turno #",e.sessionId.slice(0,8),o)),t+=f(o);for(const r of e.rows){if(t+=u+h(r.label)+d,t+=i("  Sistema",a(r.expected),o),r.counted==null){t+=h("  (informativo, no se cuenta)");continue}t+=i("  Contado",a(r.counted),o),t+=i("  Diferencia",_(p(r.counted-r.expected)),o)}if(t+=f(o),t+=i("Total sistema",a(w),o),t+=i("Total contado",a(x),o),t+=u+i("Diferencia",_(p(x-w)),o)+d,t+=f(o),t+=u+h("Efectivo en gaveta")+d,t+=i("  Fondo inicial",a(e.cash.openingFloat),o),t+=i("  + Ventas efectivo",a(e.cash.cashSales),o),t+=i("  + Entradas",a(e.cash.cashIn),o),t+=i("  - Payouts",a(e.cash.payouts),o),t+=i("  - Devoluciones",a(e.cash.cashRefunds),o),t+=u+i("  = Esperado",a(e.cash.expectedCash),o)+d,e.denominations&&e.denominations.some(r=>r.qty>0)){t+=f(o)+u+h("Conteo por denominacion")+d;for(const r of e.denominations)r.qty>0&&(t+=i(`  ${r.label} x ${r.qty}`,a(r.subtotal),o))}if(t+=f(o),t+=i("Ventas del turno",a(e.totalSales),o),t+=i("Transacciones",String(e.salesCount),o),t+=i("Devoluciones",String(e.returnsCount),o),e.notes&&e.notes.trim()){t+=f(o)+h("Notas:");for(const r of e.notes.split(`
`))t+=h(r)}return t+=`

`+h("Firma: "+"_".repeat(Math.max(10,o-8))),t+=m,t}function A(e){const n=(s,m,i=!1)=>`<div style="display:flex;justify-content:space-between;${i?"font-weight:700;":""}"><span>${$(s)}</span><span>${$(m)}</span></div>`,c='<div style="border-top:1px dashed #999;margin:6px 0;"></div>',l=e.rows.filter(s=>s.counted!=null),v=p(l.reduce((s,m)=>s+m.expected,0)),u=p(l.reduce((s,m)=>s+(m.counted||0),0)),d=e.rows.map(s=>`
        <div style="font-weight:700;margin-top:4px;">${$(s.label)}</div>
        ${n("  Sistema",a(s.expected))}
        ${s.counted==null?'<div style="color:#666;">(informativo, no se cuenta)</div>':`${n("  Contado",a(s.counted))}${n("  Diferencia",_(p(s.counted-s.expected)))}`}`).join(""),g=e.denominations&&e.denominations.some(s=>s.qty>0)?`${c}<div style="font-weight:700;">Conteo por denominación</div>${e.denominations.filter(s=>s.qty>0).map(s=>n(`${s.label} × ${s.qty}`,a(s.subtotal))).join("")}`:"";return`
        <div style="width:72mm;margin:0 auto;padding:4mm;font-family:'Courier New',monospace;font-size:11px;color:#111;box-sizing:border-box;">
            <div style="text-align:center;">
                ${e.businessName?`<div style="font-size:14px;font-weight:700;">${$(e.businessName)}</div>`:""}
                <div style="font-weight:700;">CUADRE DE CAJA</div>
                ${e.closed?"<div>(turno cerrado)</div>":""}
            </div>
            ${c}
            ${e.cajaName?n("Caja",e.cajaName):""}
            ${n("Fecha",D(e.date))}
            ${e.cashier?n("Cajero",e.cashier):""}
            ${e.sessionId?n("Turno #",e.sessionId.slice(0,8)):""}
            ${c}${d}${c}
            ${n("Total sistema",a(v))}
            ${n("Total contado",a(u))}
            ${n("Diferencia",_(p(u-v)),!0)}
            ${c}
            <div style="font-weight:700;">Efectivo en gaveta</div>
            ${n("Fondo inicial",a(e.cash.openingFloat))}
            ${n("+ Ventas efectivo",a(e.cash.cashSales))}
            ${n("+ Entradas",a(e.cash.cashIn))}
            ${n("- Payouts",a(e.cash.payouts))}
            ${n("- Devoluciones",a(e.cash.cashRefunds))}
            ${n("= Esperado",a(e.cash.expectedCash),!0)}
            ${g}
            ${c}
            ${n("Ventas del turno",a(e.totalSales))}
            ${n("Transacciones",String(e.salesCount))}
            ${n("Devoluciones",String(e.returnsCount))}
            ${e.notes&&e.notes.trim()?`${c}<div>Notas:</div><div style="white-space:pre-wrap;">${$(e.notes)}</div>`:""}
            <div style="margin-top:24px;">Firma: ____________________</div>
        </div>`}async function P(e){if(F())try{await S(N(e,T().width||48));return}catch(c){console.error("Cuadre por WebUSB falló, uso el navegador:",c)}else if(j())try{await I(N(e,L().width||48));return}catch(c){console.error("Cuadre por QZ falló, uso el navegador:",c)}const{printReceipt:n}=await E(async()=>{const{printReceipt:c}=await import("./ReceiptModal-CH58Bhmq.js").then(l=>l.d);return{printReceipt:c}},__vite__mapDeps([0,1,2,3,4,5]));await n(A(e),"80mm")}async function U(e,n){const c=new Promise(l=>{setTimeout(l,8e3)});try{await Promise.race([P({...e,closed:!0}),c])}catch(l){console.error("No se pudo imprimir el cuadre al cerrar:",l),n("El turno se cerró, pero no se pudo imprimir el cuadre. Puedes reimprimirlo desde el historial de la caja.")}}export{U as a,P as p};
