const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/JsBarcode-BZ0XwVRY.js","assets/index-Chu2nY_N.js","assets/index-Cxm1hiMU.css","assets/jspdf.es.min-CX0bMAed.js"])))=>i.map(i=>d[i]);
import{_ as M,c as J,r as _,j as T,ac as K,ad as X,b as Z,B as tt,bh as k}from"./index-Chu2nY_N.js";import{s as Y}from"./shortRef-CiKciNvu.js";import{l as et,d as ot}from"./imageData-Bp7_AP_b.js";import{g as B,i as it,f as nt,b as rt,h as at}from"./webusbPrinter-DxcqeWVj.js";async function st(t){if(!t)return"";try{const e=await M(()=>import("./JsBarcode-BZ0XwVRY.js").then(u=>u.J),__vite__mapDeps([0,1,2])),r=e.default||e,a=document.createElementNS("http://www.w3.org/2000/svg","svg");a.setAttribute("style","position:fixed;left:-9999px;top:-9999px;"),document.body.appendChild(a);try{r(a,t,{format:"CODE128",width:2,height:50,displayValue:!1,margin:0});const u=parseFloat(a.getAttribute("width")||"0"),o=parseFloat(a.getAttribute("height")||"0");return u>0&&o>0&&a.setAttribute("viewBox",`0 0 ${u} ${o}`),a.setAttribute("preserveAspectRatio","none"),a.setAttribute("style","width:70%;height:50px;"),a.removeAttribute("width"),a.removeAttribute("height"),new XMLSerializer().serializeToString(a)}finally{document.body.removeChild(a)}}catch{return""}}const i=t=>String(t??"").replace(/[&<>"]/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[e]||e),d=t=>`$${(Number(t)||0).toFixed(2)}`;function dt(t,e){const r=e.invoiceDesign||{},a=(v,F)=>r.labels&&r.labels[v]||F,u=r.headerColor||"#4CAF50",o=r.accentColor||"#7E57C2",m=t.docLabel||r.title||"FACTURA",s=r.footerText!=null?r.footerText:"¡Gracias por su preferencia!",n=r.showLogo!==!1,$=r.showBusiness!==!1,x=r.showClient!==!1,N=r.showPaymentMethod!==!1,C=r.showNotes!==!1,z=!!r.showLineDescription,c=r.template||"modern",p=[$&&e.showAddress&&e.address?i(e.address):"",$&&e.showPhone&&e.phone?i(e.phone):"",$&&e.showEmail&&e.email?i(e.email):"",$&&e.showRnc&&e.rnc?`RNC/Reg: ${i(e.rnc)}`:""].filter(Boolean).join("<br/>"),h=n&&e.logoUrl?`<img src="${i(e.logoUrl)}" style="max-width:150px;max-height:70px;object-fit:contain;"/>`:"",g=c==="banner"?`<div style="background:${u};color:#fff;margin:-16mm -14mm 14px;padding:14mm 14mm 10px;display:flex;justify-content:space-between;align-items:flex-start;">
                <div>${h?`<img src="${i(e.logoUrl)}" style="max-width:140px;max-height:60px;object-fit:contain;"/>`:""}</div>
                <div style="text-align:right;">
                    ${e.businessName?`<div style="font-size:17px;font-weight:800;">${i(e.businessName)}</div>`:""}
                    <div style="font-size:12px;line-height:1.5;opacity:.92;">${p}</div>
                </div>
           </div>
           <div style="font-size:26px;font-weight:800;color:${o};margin:0 0 12px;">${i(m)}</div>`:c==="classic"?`<div style="text-align:center;margin-bottom:6px;">
                ${h}
                ${e.businessName?`<div style="font-size:17px;font-weight:700;margin-top:4px;">${i(e.businessName)}</div>`:""}
                <div style="color:#555;font-size:12px;line-height:1.5;">${p}</div>
           </div>
           <div style="text-align:center;font-size:22px;font-weight:800;letter-spacing:1px;border-bottom:2px solid #111;padding-bottom:6px;margin:8px 0 12px;">${i(m).toUpperCase()}</div>`:`<div style="display:flex;justify-content:space-between;align-items:flex-start;">
                <div>${h}</div>
                <div style="text-align:right;">
                    ${e.businessName?`<div style="font-size:16px;font-weight:700;">${i(e.businessName)}</div>`:""}
                    <div style="color:#555;font-size:12px;line-height:1.5;">${p}</div>
                </div>
           </div>
           <div style="font-size:28px;font-weight:800;color:${o};margin:18px 0 12px;">${i(m)}</div>`,l=c==="classic"?"background:#e5e7eb;color:#111;":`background:${u};color:#fff;`,S=t.items.map(v=>`
        <tr>
            <td style="padding:8px 6px;border-bottom:1px solid #eee;">
                <div style="font-weight:600;">${i(v.name)}</div>
                ${z&&v.description?`<div style="color:#666;font-size:11px;margin-top:2px;">${i(String(v.description))}</div>`:""}
                ${C&&v.note?`<div style="color:#666;font-size:11px;margin-top:2px;">${i(v.note)}</div>`:""}
            </td>
            <td style="padding:8px 6px;border-bottom:1px solid #eee;text-align:center;">${v.quantity}</td>
            <td style="padding:8px 6px;border-bottom:1px solid #eee;text-align:right;">${d(v.unitPrice)}</td>
            <td style="padding:8px 6px;border-bottom:1px solid #eee;text-align:right;font-weight:600;">${d(v.quantity*v.unitPrice)}</td>
        </tr>`).join(""),R=k(t.tax||0,t,void 0,a("tax","IVU")).map(v=>`<tr><td style="text-align:right;padding:2px 8px;color:#555;">${i(v.label)}:</td><td style="text-align:right;padding:2px 0;width:110px;">${d(v.amount)}</td></tr>`).join(""),f=t.changeDue&&t.changeDue>0?`<tr><td style="text-align:right;padding:2px 8px;color:#555;">${i(a("change","Cambio"))}:</td><td style="text-align:right;padding:2px 0;">${d(t.changeDue)}</td></tr>`:"";return`
    <div style="width:210mm;min-height:auto;margin:0 auto;padding:16mm 14mm;font-family:'Segoe UI',Helvetica,Arial,sans-serif;color:#222;box-sizing:border-box;font-size:13px;">
        ${g}
        <!-- Cliente + meta -->
        <div style="display:flex;justify-content:space-between;gap:20px;margin-bottom:14px;">
            <div style="max-width:50%;">
                ${x&&t.clientName?`<div style="font-weight:700;margin-bottom:2px;">${i(a("clientHeading","Datos del Cliente"))}</div><div>${i(t.clientName)}</div>`:""}
            </div>
            <div style="text-align:right;font-size:13px;">
                <div><strong>${i(a("number","Número"))}:</strong> ${t.saleNumber?"#"+i(String(t.saleNumber)):"—"}</div>
                <div><strong>${i(a("date","Fecha"))}:</strong> ${i(new Date(t.date).toLocaleDateString())}</div>
                ${N&&t.payments&&t.payments.length?`<div><strong>${i(a("paymentMethod","Método de pago"))}:</strong> ${i(t.payments.map(v=>v.method).join(", "))}</div>`:""}
            </div>
        </div>
        <!-- Tabla -->
        <table style="width:100%;border-collapse:collapse;margin-top:4px;">
            <thead>
                <tr style="${l}">
                    <th style="padding:9px 6px;text-align:left;">${i(a("colProduct","Producto"))}</th>
                    <th style="padding:9px 6px;text-align:center;width:60px;">${i(a("colQty","Cant"))}</th>
                    <th style="padding:9px 6px;text-align:right;width:110px;">${i(a("colPrice","Precio Unit."))}</th>
                    <th style="padding:9px 6px;text-align:right;width:110px;">${i(a("colTotal","Total"))}</th>
                </tr>
            </thead>
            <tbody>${S}</tbody>
        </table>
        <!-- Totales -->
        <table style="margin-left:auto;margin-top:14px;border-collapse:collapse;">
            <tr><td style="text-align:right;padding:2px 8px;color:#555;">${i(a("subtotal","Subtotal"))}:</td><td style="text-align:right;padding:2px 0;width:110px;">${d(t.subtotal)}</td></tr>
            ${t.discount>0?`<tr><td style="text-align:right;padding:2px 8px;color:#555;">${i(a("discount","Descuento"))}:</td><td style="text-align:right;padding:2px 0;">-${d(t.discount)}</td></tr>`:""}
            ${R}
            <tr><td style="text-align:right;padding:6px 8px;font-size:18px;font-weight:800;color:${o};">${i(a("total","Total"))}:</td><td style="text-align:right;padding:6px 0;font-size:18px;font-weight:800;color:${o};">${d(t.total)}</td></tr>
            ${f}
        </table>
        ${s?`<div style="text-align:center;color:#999;font-size:11px;margin-top:34px;">${i(s)}</div>`:""}
    </div>`}function q(t,e,r){var p,h,g;const a=e.paperSize==="80mm";if(!a)return dt(t,e);const u=a?"72mm":"210mm",o=a?"4mm":"14mm",m=a?"11px":"13px";if((e.design??"modern")==="classic"){const l=`${e.receiptPrefix||""}${t.saleNumber}`,S=new Date(t.date),R='<div style="border-top:1px solid #000;margin:4px 0;"></div>',f=(y,L,P=!1)=>`<div style="display:flex;justify-content:space-between;${P?"font-weight:700;":""}"><span>${i(y)}</span><span>${i(L)}</span></div>`,v=t.items.reduce((y,L)=>y+L.quantity,0),F=(t.tax||0)>0?t.taxState||t.taxMunicipal||t.taxReduced?`${t.taxState?f("+ Estatal",d(t.taxState)):""}${t.taxReduced?f("+ Reducido",d(t.taxReduced)):""}${t.taxMunicipal?f("+ Municipal",d(t.taxMunicipal)):""}`:e.showTaxBreakdown?f("+ IVU",d(t.tax)):"":"",D=t.isReprint&&e.reprintLabel?`<div style="text-align:center;font-weight:700;">${i(e.reprintLabel)}</div>`:"",w=[e.returnPolicyText,e.thankYouText,e.paymentTermsText].filter(Boolean).map(y=>`<div style="text-align:center;margin-top:6px;">${i(y)}</div>`).join(""),A=e.showBarcode?`<div style="text-align:center;margin-top:10px;">${r?`<div style="height:50px;">${r}</div>`:""}<div style="letter-spacing:2px;">${i(l)}</div></div>`:"";return`
            <div style="width:${u};margin:0 auto;padding:${o};font-family:'Courier New',monospace;font-size:${m};color:#000;box-sizing:border-box;">
                <div style="text-align:center;">
                    ${e.showLogo&&e.logoUrl?`<img src="${i(e.logoUrl)}" style="max-width:${a?"120px":"160px"};max-height:70px;object-fit:contain;margin:0 auto 4px;display:block;"/>`:""}
                    ${e.businessName?`<div style="font-weight:700;font-size:${a?"15px":"20px"};letter-spacing:1px;">${i(e.businessName)}</div>`:""}
                    ${e.showAddress&&e.address?`<div>${i(e.address)}</div>`:""}
                    ${e.showPhone&&e.phone?`<div>Tel: ${i(e.phone)}</div>`:""}
                    ${e.showRnc&&e.rnc?`<div>${i(e.rnc)}</div>`:""}
                </div>
                <div style="display:flex;justify-content:space-between;margin-top:6px;"><span>${i(S.toLocaleDateString())}</span><span>${i(S.toLocaleTimeString())}</span></div>
                ${t.returnInfo?`<div style="text-align:center;font-weight:700;margin:4px 0;font-size:${a?"14px":"16px"};">Devolución - Void</div><div style="text-align:center;">Recibo : ${i(l)}</div>${t.cashierName?`<div>CAJERO: ${i(t.cashierName)}</div>`:""}`:`<div style="text-align:center;font-weight:700;margin:4px 0;font-size:${a?"13px":"15px"};">Recibo : ${i(l)}</div>
                ${t.docLabel?`<div style="text-align:center;font-weight:700;">${i(t.docLabel)}</div>`:""}`}
                ${D}
                ${R}
                ${t.items.map(y=>`
                    <div>${i(y.name)}</div>
                    <div style="display:flex;justify-content:space-between;"><span style="padding-left:10px;">${y.quantity}@ ${d(y.unitPrice)}</span><span>${d(y.quantity*y.unitPrice)}</span></div>
                    ${y.note?`<div style="font-style:italic;padding-left:10px;">* ${i(y.note)}</div>`:""}
                `).join("")}
                ${R}
                ${t.returnInfo?`${t.returnInfo.originalNumber?f("Factura",`${e.receiptPrefix||""}${t.returnInfo.originalNumber}`):""}${t.returnInfo.originalDate?f("Fecha",new Date(t.returnInfo.originalDate).toLocaleDateString()):""}${t.returnInfo.reason?`<div>Motivo: ${i(t.returnInfo.reason)}</div>`:""}${R}`:""}
                ${f(`${v}  Artículos      SUBTOTAL`,d(t.subtotal),!0)}
                ${t.discount>0?f("Descuento",`-${d(t.discount)}`):""}
                ${F}
                <div style="font-size:${a?"14px":"16px"};margin-top:2px;">${f(t.returnInfo?"TOTAL DEVUELTO":"TOTAL",d(t.total),!0)}</div>
                ${t.payments.map(y=>f(t.returnInfo?`Reembolso ${y.method}`:y.method,d(y.amount))).join("")}
                ${t.changeDue&&t.changeDue>0?f("Cambio",d(t.changeDue),!0):""}
                ${R}
                ${t.returnInfo?'<div style="margin-top:14px;">Firma cliente: ____________________</div>':w}
                ${D}
                ${t.returnInfo?"":A}
            </div>`}const s=(l,S,R=!1)=>`<div style="display:flex;justify-content:space-between;${R?"font-weight:700;":""}"><span>${i(l)}</span><span>${i(S)}</span></div>`,n=`
        <div style="text-align:center;margin-bottom:8px;">
            ${e.showLogo&&e.logoUrl?`<img src="${i(e.logoUrl)}" style="max-width:${a?"120px":"160px"};max-height:80px;object-fit:contain;margin:0 auto 6px;display:block;"/>`:""}
            ${e.businessName?`<div style="font-size:${a?"14px":"18px"};font-weight:700;">${i(e.businessName)}</div>`:""}
            ${e.showRnc&&e.rnc?`<div>RNC/Reg: ${i(e.rnc)}</div>`:""}
            ${e.showAddress&&e.address?`<div>${i(e.address)}</div>`:""}
            ${e.showPhone&&e.phone?`<div>Tel: ${i(e.phone)}</div>`:""}
            ${e.showEmail&&e.email?`<div>${i(e.email)}</div>`:""}
        </div>`,$=`
        <div style="border-top:1px dashed #999;border-bottom:1px dashed #999;padding:6px 0;margin-bottom:6px;">
            ${s(t.returnInfo?"Devolución #":"Factura #",t.saleNumber)}
            ${s("Fecha",new Date(t.date).toLocaleString())}
            ${(p=t.returnInfo)!=null&&p.originalNumber?s("Factura devuelta",`${e.receiptPrefix||""}${t.returnInfo.originalNumber}`):""}
            ${(h=t.returnInfo)!=null&&h.originalDate?s("Fecha factura",new Date(t.returnInfo.originalDate).toLocaleDateString()):""}
            ${(g=t.returnInfo)!=null&&g.reason?s("Motivo",t.returnInfo.reason):""}
            ${e.showClient&&t.clientName?s("Cliente",t.clientName):""}
            ${e.showCashier&&t.cashierName?s("Cajero",t.cashierName):""}
        </div>`,x=t.items.map(l=>`
        <tr>
            <td style="padding:2px 0;">${i(l.name)}<br/><span style="color:#666;">${l.quantity} x ${d(l.unitPrice)}</span>${l.note?`<br/><span style="color:#555;font-style:italic;">* ${i(l.note)}</span>`:""}</td>
            <td style="padding:2px 0;text-align:right;vertical-align:top;">${d(l.quantity*l.unitPrice)}</td>
        </tr>`).join(""),N=`
        <div style="border-top:1px dashed #999;padding-top:6px;margin-top:4px;">
            ${s("Subtotal",d(t.subtotal))}
            ${t.discount>0?s("Descuento",`-${d(t.discount)}`):""}
            ${(t.tax||0)>0?t.taxState||t.taxMunicipal||t.taxReduced?`${t.taxState?s("IVU Estatal",d(t.taxState)):""}${t.taxMunicipal?s("IVU Municipal",d(t.taxMunicipal)):""}${t.taxReduced?s("IVU Reducido",d(t.taxReduced)):""}`:e.showTaxBreakdown?s("IVU",d(t.tax)):"":""}
            <div style="font-size:${a?"14px":"16px"};margin-top:4px;">${s(t.returnInfo?"TOTAL DEVUELTO":"TOTAL",d(t.total),!0)}</div>
        </div>`,C=`
        <div style="border-top:1px dashed #999;padding-top:6px;margin-top:6px;">
            ${t.payments.map(l=>`
                ${s(t.returnInfo?`Reembolso ${l.method}`:l.method,d(l.amount))}
                ${l.reference?`<div style="color:#555;font-size:${a?"10px":"11px"};margin-left:8px;">Ref: ${i(Y(l.reference))}</div>`:""}
            `).join("")}
            ${t.changeDue&&t.changeDue>0?s("Cambio",d(t.changeDue),!0):""}
        </div>`,z=e.showFooter&&e.footerNote?`<div style="text-align:center;margin-top:10px;white-space:pre-wrap;color:#333;">${i(e.footerNote)}</div>`:"",c=e.headerNote?`<div style="text-align:center;margin-bottom:6px;white-space:pre-wrap;">${i(e.headerNote)}</div>`:"";return`
        <div style="width:${u};margin:0 auto;padding:${o};font-family:'Courier New',monospace;font-size:${m};color:#111;box-sizing:border-box;">
            ${n}
            ${c}
            ${t.docLabel?`<div style="text-align:center;font-weight:700;margin-bottom:6px;">${i(t.docLabel)}</div>`:""}
            ${$}
            <table style="width:100%;border-collapse:collapse;">${x}</table>
            ${N}
            ${C}
            ${z}
        </div>`}const W=t=>{const e=/^#?([0-9a-f]{6})$/i.exec((t||"").trim());if(!e)return[76,175,80];const r=parseInt(e[1],16);return[r>>16&255,r>>8&255,r&255]};async function O(t,e,r){var N,C,z;const{jsPDF:a}=await M(async()=>{const{jsPDF:c}=await import("./jspdf.es.min-CX0bMAed.js").then(p=>p.j);return{jsPDF:c}},__vite__mapDeps([3,1,2])),u=e.paperSize==="letter",o=new a({unit:"mm",format:u?"letter":[80,200]}),m=o.internal.pageSize.getWidth(),s=u?14:4;let n=10;if(u){const{default:c}=await M(async()=>{const{default:b}=await import("./jspdf.plugin.autotable-Cz_YoQo_.js");return{default:b}},[]),p=e.invoiceDesign||{},h=(b,E)=>p.labels&&p.labels[b]||E,g=W(p.headerColor||"#4CAF50"),l=W(p.accentColor||"#7E57C2"),S=p.showLogo!==!1,R=p.showBusiness!==!1,f=p.showClient!==!1,v=p.showPaymentMethod!==!1,F=p.showNotes!==!1,D=m-s;let w=16;if(S&&e.logoUrl){const b=await et(e.logoUrl);if(b)try{o.addImage(b,ot(b),s,w,34,17)}catch{}}o.setFont("helvetica","bold").setFontSize(14).setTextColor(20),e.businessName&&o.text(e.businessName,D,w+4,{align:"right"}),o.setFont("helvetica","normal").setFontSize(9).setTextColor(90);let A=w+9;R&&[e.showAddress&&e.address,e.showPhone&&e.phone,e.showEmail&&e.email,e.showRnc&&e.rnc?`RNC/Reg: ${e.rnc}`:""].filter(Boolean).forEach(b=>{o.text(String(b),D,A,{align:"right"}),A+=4.5}),w=Math.max(w+20,A)+6,o.setFont("helvetica","bold").setFontSize(24).setTextColor(l[0],l[1],l[2]),o.text(p.title||"FACTURA",s,w),w+=8,o.setFontSize(10),o.setTextColor(40);const y=w;f&&t.clientName&&(o.setFont("helvetica","bold").text(h("clientHeading","Datos del Cliente"),s,w),o.setFont("helvetica","normal").text(t.clientName,s,w+5)),o.setFont("helvetica","normal").setFontSize(10).setTextColor(40),o.text(`${h("number","Número")}: ${t.saleNumber?"#"+t.saleNumber:"—"}`,D,y,{align:"right"}),o.text(`${h("date","Fecha")}: ${new Date(t.date).toLocaleDateString()}`,D,y+5,{align:"right"}),v&&((N=t.payments)!=null&&N.length)&&o.text(`${h("paymentMethod","Método de pago")}: ${t.payments.map(b=>b.method).join(", ")}`,D,y+10,{align:"right"}),w=y+18,c(o,{startY:w,head:[[h("colProduct","Producto"),h("colQty","Cant"),h("colPrice","Precio Unit."),h("colTotal","Total")]],body:t.items.map(b=>[b.name+(F&&b.note?`
${b.note}`:""),String(b.quantity),d(b.unitPrice),d(b.quantity*b.unitPrice)]),theme:"grid",headStyles:{fillColor:g,textColor:255,halign:"center"},columnStyles:{0:{halign:"left"},1:{halign:"center"},2:{halign:"right"},3:{halign:"right"}},styles:{fontSize:9,cellPadding:2.5},margin:{left:s,right:s}});let L=o.lastAutoTable.finalY+8;const P=(b,E,I=!1)=>{o.setFont("helvetica",I?"bold":"normal").setFontSize(I?14:10),I?o.setTextColor(l[0],l[1],l[2]):o.setTextColor(70),o.text(b,D-40,L,{align:"right"}),o.text(E,D,L,{align:"right"}),L+=I?8:6};P(`${h("subtotal","Subtotal")}:`,d(t.subtotal)),t.discount>0&&P(`${h("discount","Descuento")}:`,`-${d(t.discount)}`);for(const b of k(t.tax||0,t,void 0,h("tax","IVU")))P(`${b.label}:`,d(b.amount));P(`${h("total","Total")}:`,d(t.total),!0),t.changeDue&&t.changeDue>0&&P(`${h("change","Cambio")}:`,d(t.changeDue));const H=p.footerText!=null?p.footerText:"¡Gracias por su preferencia!";if(H&&(o.setFont("helvetica","normal").setFontSize(9).setTextColor(150),o.text(H,m/2,o.internal.pageSize.getHeight()-20,{align:"center"})),r!=null&&r.returnBlob)return o.output("blob");o.save(`factura-${t.saleNumber}.pdf`);return}const $=(c,p,h=!1)=>{o.setFontSize(p),o.setFont("courier",h?"bold":"normal"),o.text(c,m/2,n,{align:"center"}),n+=p*.5},x=(c,p,h=!1)=>{o.setFontSize(9),o.setFont("courier",h?"bold":"normal"),o.text(c,s,n),o.text(p,m-s,n,{align:"right"}),n+=4.5};if((e.design??"modern")==="classic"){const c=`${e.receiptPrefix||""}${t.saleNumber}`,p=new Date(t.date);if(e.showLogo&&((C=e.logoUrl)!=null&&C.startsWith("data:image")))try{o.addImage(e.logoUrl,"PNG",m/2-15,n,30,15),n+=18}catch{}e.businessName&&$(e.businessName,14,!0),e.showAddress&&e.address&&$(e.address,8),e.showPhone&&e.phone&&$(`Tel: ${e.phone}`,8),e.showRnc&&e.rnc&&$(e.rnc,8),n+=2,x(p.toLocaleDateString(),p.toLocaleTimeString()),$(`Recibo : ${c}`,11,!0),t.isReprint&&e.reprintLabel&&$(e.reprintLabel,9,!0),n+=1,o.line(s,n,m-s,n),n+=4,t.items.forEach(g=>{o.setFontSize(9),o.setFont("courier","normal"),o.text(g.name.slice(0,u?60:22),s,n),o.text(d(g.quantity*g.unitPrice),m-s,n,{align:"right"}),n+=4,o.setTextColor(120),o.text(`  ${g.quantity}@ ${d(g.unitPrice)}`,s,n),o.setTextColor(0),n+=4.5}),o.line(s,n,m-s,n),n+=4;const h=t.items.reduce((g,l)=>g+l.quantity,0);if(x(`${h} Articulos  SUBTOTAL`,d(t.subtotal),!0),t.discount>0&&x("Descuento",`-${d(t.discount)}`),(t.tax||0)>0&&(t.taxState||t.taxMunicipal||t.taxReduced?(t.taxState&&x("+ Estatal",d(t.taxState)),t.taxReduced&&x("+ Reducido",d(t.taxReduced)),t.taxMunicipal&&x("+ Municipal",d(t.taxMunicipal))):e.showTaxBreakdown&&x("+ IVU",d(t.tax))),x("TOTAL",d(t.total),!0),t.payments.forEach(g=>x(g.method,d(g.amount))),t.changeDue&&t.changeDue>0&&x("Cambio",d(t.changeDue),!0),n+=3,o.line(s,n,m-s,n),n+=4,[e.returnPolicyText,e.thankYouText,e.paymentTermsText].forEach(g=>{g&&$(g,8)}),e.showBarcode&&(n+=2,$(c,12,!0)),r!=null&&r.returnBlob)return o.output("blob");o.save(`factura-${c}.pdf`);return}if(e.showLogo&&((z=e.logoUrl)!=null&&z.startsWith("data:image")))try{o.addImage(e.logoUrl,"PNG",m/2-15,n,30,15),n+=18}catch{}if(e.businessName&&$(e.businessName,13,!0),e.showRnc&&e.rnc&&$(`RNC/Reg: ${e.rnc}`,8),e.showAddress&&e.address&&$(e.address,8),e.showPhone&&e.phone&&$(`Tel: ${e.phone}`,8),e.showEmail&&e.email&&$(e.email,8),n+=2,x(`Factura #${t.saleNumber}`,""),x("Fecha",new Date(t.date).toLocaleString()),e.showClient&&t.clientName&&x("Cliente",t.clientName),e.showCashier&&t.cashierName&&x("Cajero",t.cashierName),n+=1,o.line(s,n,m-s,n),n+=4,t.items.forEach(c=>{o.setFontSize(9),o.setFont("courier","normal"),o.text(c.name.slice(0,u?60:22),s,n),o.text(d(c.quantity*c.unitPrice),m-s,n,{align:"right"}),n+=4,o.setTextColor(120),o.text(`  ${c.quantity} x ${d(c.unitPrice)}`,s,n),o.setTextColor(0),n+=4.5}),o.line(s,n,m-s,n),n+=4,x("Subtotal",d(t.subtotal)),t.discount>0&&x("Descuento",`-${d(t.discount)}`),e.showTaxBreakdown)for(const c of k(t.tax||0,t))x(c.label,d(c.amount));if(x("TOTAL",d(t.total),!0),n+=1,o.line(s,n,m-s,n),n+=4,t.payments.forEach(c=>x(c.method+(c.reference?` (${Y(c.reference)})`:""),d(c.amount))),t.changeDue&&t.changeDue>0&&x("Cambio",d(t.changeDue),!0),e.showFooter&&e.footerNote&&(n+=4,$(e.footerNote,8)),r!=null&&r.returnBlob)return o.output("blob");o.save(`factura-${t.saleNumber}.pdf`)}function j(t,e="80mm"){const a=`<!doctype html><html><head><meta charset="utf-8"><title>Factura</title>
<style>
  ${e==="80mm"?"@page { size: 80mm auto; margin: 0; }":"@page { size: letter; margin: 12mm; }"}
  html, body { margin: 0; padding: 0; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
</style></head><body>${t}</body></html>`,u=document.createElement("iframe");u.setAttribute("aria-hidden","true"),u.style.cssText="position:fixed;right:0;bottom:0;width:0;height:0;border:0;",document.body.appendChild(u);const o=u.contentWindow;if(!o)return document.body.removeChild(u),Promise.resolve();o.document.open(),o.document.write(a),o.document.close();const m=()=>{setTimeout(()=>{try{document.body.removeChild(u)}catch{}},1500)};return new Promise(s=>{const n=()=>{try{o.focus(),o.print()}catch{}m(),s()};o.document.readyState==="complete"?setTimeout(n,250):o.onload=()=>setTimeout(n,250)})}function U(t,e,r,a){const u=a||B(),o=u==="factura"?"letter":"80mm",m=q(e,{...r,paperSize:o});if(u!=="factura"&&it()){nt(e,r).catch(s=>{console.error("Impresión por WebUSB falló, uso el diálogo del navegador:",s),j(m,o)});return}if(rt()){at(e,r,u,u==="factura"?m:void 0).catch(s=>{console.error("Impresión por QZ falló, uso el diálogo del navegador:",s),j(m,o)});return}j(m,o)}const V="pazzi_receipt_action";function G(){try{const t=localStorage.getItem(V);return t==="print"||t==="download"?t:"ask"}catch{return"ask"}}function Q(t){try{t==="ask"?localStorage.removeItem(V):localStorage.setItem(V,t)}catch{}}const lt=({isOpen:t,onClose:e,sale:r,config:a,forceChoose:u})=>{const{t:o}=J(),[m,s]=_.useState(""),[n,$]=_.useState(()=>B()==="factura"?"factura":"recibo");_.useEffect(()=>{t&&$(B()==="factura"?"factura":"recibo")},[t]);const x=_.useMemo(()=>({...a,paperSize:n==="factura"?"letter":"80mm"}),[a,n]);_.useEffect(()=>{let l=!0;return r&&(a.design??"modern")==="classic"&&a.showBarcode?st(`${a.receiptPrefix||""}${r.saleNumber}`).then(S=>{l&&s(S)}):s(""),()=>{l=!1}},[r,a]);const N=_.useMemo(()=>r?q(r,x,m):"",[r,x,m]),[C,z]=_.useState(!1),c=_.useRef(null),p=G();if(_.useEffect(()=>{if(!u&&t&&r&&N&&c.current!==r.saleNumber){if(p==="print"){c.current=r.saleNumber,U(N,r,a),e();return}if(p==="download"){c.current=r.saleNumber,O(r,a),e();return}if(a.autoPrint){c.current=r.saleNumber;const l=setTimeout(()=>U(N,r,a),150);return()=>clearTimeout(l)}}},[t,r,N,u]),_.useEffect(()=>{t||(c.current=null)},[t]),!r||!u&&p!=="ask")return null;const h=l=>{C&&!u&&Q(l),l==="print"?U(N,r,x,n):O(r,x),(C||u)&&e()},g=(l,S)=>T.jsx("button",{type:"button",onClick:()=>$(l),className:`flex-1 py-2 px-3 rounded-md text-sm font-medium border transition-colors ${n===l?"border-primary bg-primary/10 text-primary ring-1 ring-primary":"border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700"}`,children:S});return T.jsx(K,{isOpen:t,onClose:e,title:"Factura / Recibo",size:n==="factura"?"3xl":"md",children:T.jsxs("div",{className:"space-y-4",children:[T.jsxs("div",{children:[T.jsx("p",{className:"text-xs text-neutral-500 dark:text-neutral-400 mb-1",children:o("posx.receipt.format")}),T.jsxs("div",{className:"flex gap-2",children:[g("recibo",o("posx.receipt.format_receipt")),g("factura",o("posx.receipt.format_invoice"))]})]}),T.jsx("div",{className:"bg-neutral-100 dark:bg-neutral-900 rounded-md p-3 max-h-[65vh] overflow-auto",children:T.jsx("div",{className:"pazzi-paper bg-white shadow-sm mx-auto w-max max-w-full",dangerouslySetInnerHTML:{__html:N}})}),!u&&T.jsxs("label",{className:"flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300 select-none",children:[T.jsx("input",{type:"checkbox",checked:C,onChange:l=>z(l.target.checked),className:"h-4 w-4"}),"No volver a preguntar (usar siempre la acción que elija ahora)"]}),T.jsxs("div",{className:"flex justify-end gap-2",children:[T.jsx("button",{onClick:e,className:X,children:"Cerrar"}),T.jsx("button",{onClick:()=>h("download"),className:Z,children:"📄 Descargar PDF"}),T.jsx("button",{onClick:()=>h("print"),className:tt,children:"🖨️ Imprimir"})]})]})})},xt=Object.freeze(Object.defineProperty({__proto__:null,ReceiptModal:lt,buildReceiptHTML:q,generatePDF:O,getReceiptAction:G,printReceipt:j,setReceiptAction:Q},Symbol.toStringTag,{value:"Module"}));export{lt as R,q as a,st as b,O as c,xt as d,G as g,Q as s};
