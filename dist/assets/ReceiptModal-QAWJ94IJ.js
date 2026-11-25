const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/JsBarcode-J4C5mBcS.js","assets/index-ZFBXUgez.js","assets/index-CHelXfCd.css","assets/jspdf.es.min-Dkb5BWPP.js"])))=>i.map(i=>d[i]);
import{_ as U,c as J,r as _,j as T,ac as K,ad as X,b as Z,B as tt,bh as k}from"./index-ZFBXUgez.js";import{l as et,d as ot,a as it}from"./logoScale-C_cDLbks.js";import{s as Y}from"./shortRef-CiKciNvu.js";import{g as B,i as nt,f as rt,b as at,h as st}from"./webusbPrinter-5jTLsiJQ.js";async function dt(t){if(!t)return"";try{const e=await U(()=>import("./JsBarcode-J4C5mBcS.js").then(u=>u.J),__vite__mapDeps([0,1,2])),n=e.default||e,a=document.createElementNS("http://www.w3.org/2000/svg","svg");a.setAttribute("style","position:fixed;left:-9999px;top:-9999px;"),document.body.appendChild(a);try{n(a,t,{format:"CODE128",width:2,height:50,displayValue:!1,margin:0});const u=parseFloat(a.getAttribute("width")||"0"),o=parseFloat(a.getAttribute("height")||"0");return u>0&&o>0&&a.setAttribute("viewBox",`0 0 ${u} ${o}`),a.setAttribute("preserveAspectRatio","none"),a.setAttribute("style","width:70%;height:50px;"),a.removeAttribute("width"),a.removeAttribute("height"),new XMLSerializer().serializeToString(a)}finally{document.body.removeChild(a)}}catch{return""}}const i=t=>String(t??"").replace(/[&<>"]/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[e]||e),d=t=>`$${(Number(t)||0).toFixed(2)}`;function lt(t,e){const n=e.invoiceDesign||{},a=(v,C)=>n.labels&&n.labels[v]||C,u=n.headerColor||"#4CAF50",o=n.accentColor||"#7E57C2",m=t.docLabel||n.title||"FACTURA",s=n.footerText!=null?n.footerText:"¡Gracias por su preferencia!",r=n.showLogo!==!1,b=n.showBusiness!==!1,h=n.showClient!==!1,N=n.showPaymentMethod!==!1,R=n.showNotes!==!1,z=!!n.showLineDescription,c=n.template||"modern",p=[b&&e.showAddress&&e.address?i(e.address):"",b&&e.showPhone&&e.phone?i(e.phone):"",b&&e.showEmail&&e.email?i(e.email):"",b&&e.showRnc&&e.rnc?`RNC/Reg: ${i(e.rnc)}`:""].filter(Boolean).join("<br/>"),x=it(n),$=r&&e.logoUrl?`<img src="${i(e.logoUrl)}" style="max-width:${Math.round(150*x)}px;max-height:${Math.round(70*x)}px;object-fit:contain;"/>`:"",l=c==="banner"?`<div style="background:${u};color:#fff;margin:-16mm -14mm 14px;padding:14mm 14mm 10px;display:flex;justify-content:space-between;align-items:flex-start;">
                <div>${$?`<img src="${i(e.logoUrl)}" style="max-width:${Math.round(140*x)}px;max-height:${Math.round(60*x)}px;object-fit:contain;"/>`:""}</div>
                <div style="text-align:right;">
                    ${e.businessName?`<div style="font-size:17px;font-weight:800;">${i(e.businessName)}</div>`:""}
                    <div style="font-size:12px;line-height:1.5;opacity:.92;">${p}</div>
                </div>
           </div>
           <div style="font-size:26px;font-weight:800;color:${o};margin:0 0 12px;">${i(m)}</div>`:c==="classic"?`<div style="text-align:center;margin-bottom:6px;">
                ${$}
                ${e.businessName?`<div style="font-size:17px;font-weight:700;margin-top:4px;">${i(e.businessName)}</div>`:""}
                <div style="color:#555;font-size:12px;line-height:1.5;">${p}</div>
           </div>
           <div style="text-align:center;font-size:22px;font-weight:800;letter-spacing:1px;border-bottom:2px solid #111;padding-bottom:6px;margin:8px 0 12px;">${i(m).toUpperCase()}</div>`:`<div style="display:flex;justify-content:space-between;align-items:flex-start;">
                <div>${$}</div>
                <div style="text-align:right;">
                    ${e.businessName?`<div style="font-size:16px;font-weight:700;">${i(e.businessName)}</div>`:""}
                    <div style="color:#555;font-size:12px;line-height:1.5;">${p}</div>
                </div>
           </div>
           <div style="font-size:28px;font-weight:800;color:${o};margin:18px 0 12px;">${i(m)}</div>`,S=c==="classic"?"background:#e5e7eb;color:#111;":`background:${u};color:#fff;`,D=t.items.map(v=>`
        <tr>
            <td style="padding:8px 6px;border-bottom:1px solid #eee;">
                <div style="font-weight:600;">${i(v.name)}</div>
                ${z&&v.description?`<div style="color:#666;font-size:11px;margin-top:2px;">${i(String(v.description))}</div>`:""}
                ${R&&v.note?`<div style="color:#666;font-size:11px;margin-top:2px;">${i(v.note)}</div>`:""}
            </td>
            <td style="padding:8px 6px;border-bottom:1px solid #eee;text-align:center;">${v.quantity}</td>
            <td style="padding:8px 6px;border-bottom:1px solid #eee;text-align:right;">${d(v.unitPrice)}</td>
            <td style="padding:8px 6px;border-bottom:1px solid #eee;text-align:right;font-weight:600;">${d(v.quantity*v.unitPrice)}</td>
        </tr>`).join(""),f=k(t.tax||0,t,void 0,a("tax","IVU")).map(v=>`<tr><td style="text-align:right;padding:2px 8px;color:#555;">${i(v.label)}:</td><td style="text-align:right;padding:2px 0;width:110px;">${d(v.amount)}</td></tr>`).join(""),F=t.changeDue&&t.changeDue>0?`<tr><td style="text-align:right;padding:2px 8px;color:#555;">${i(a("change","Cambio"))}:</td><td style="text-align:right;padding:2px 0;">${d(t.changeDue)}</td></tr>`:"";return`
    <div style="width:210mm;min-height:auto;margin:0 auto;padding:16mm 14mm;font-family:'Segoe UI',Helvetica,Arial,sans-serif;color:#222;box-sizing:border-box;font-size:13px;">
        ${l}
        <!-- Cliente + meta -->
        <div style="display:flex;justify-content:space-between;gap:20px;margin-bottom:14px;">
            <div style="max-width:50%;">
                ${h&&t.clientName?`<div style="font-weight:700;margin-bottom:2px;">${i(a("clientHeading","Datos del Cliente"))}</div><div>${i(t.clientName)}</div>`:""}
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
                <tr style="${S}">
                    <th style="padding:9px 6px;text-align:left;">${i(a("colProduct","Producto"))}</th>
                    <th style="padding:9px 6px;text-align:center;width:60px;">${i(a("colQty","Cant"))}</th>
                    <th style="padding:9px 6px;text-align:right;width:110px;">${i(a("colPrice","Precio Unit."))}</th>
                    <th style="padding:9px 6px;text-align:right;width:110px;">${i(a("colTotal","Total"))}</th>
                </tr>
            </thead>
            <tbody>${D}</tbody>
        </table>
        <!-- Totales -->
        <table style="margin-left:auto;margin-top:14px;border-collapse:collapse;">
            <tr><td style="text-align:right;padding:2px 8px;color:#555;">${i(a("subtotal","Subtotal"))}:</td><td style="text-align:right;padding:2px 0;width:110px;">${d(t.subtotal)}</td></tr>
            ${t.discount>0?`<tr><td style="text-align:right;padding:2px 8px;color:#555;">${i(a("discount","Descuento"))}:</td><td style="text-align:right;padding:2px 0;">-${d(t.discount)}</td></tr>`:""}
            ${f}
            <tr><td style="text-align:right;padding:6px 8px;font-size:18px;font-weight:800;color:${o};">${i(a("total","Total"))}:</td><td style="text-align:right;padding:6px 0;font-size:18px;font-weight:800;color:${o};">${d(t.total)}</td></tr>
            ${F}
        </table>
        ${s?`<div style="text-align:center;color:#999;font-size:11px;margin-top:34px;">${i(s)}</div>`:""}
    </div>`}function q(t,e,n){var p,x,$;const a=e.paperSize==="80mm";if(!a)return lt(t,e);const u=a?"72mm":"210mm",o=a?"4mm":"14mm",m=a?"11px":"13px";if((e.design??"modern")==="classic"){const l=`${e.receiptPrefix||""}${t.saleNumber}`,S=new Date(t.date),D='<div style="border-top:1px solid #000;margin:4px 0;"></div>',f=(y,L,P=!1)=>`<div style="display:flex;justify-content:space-between;${P?"font-weight:700;":""}"><span>${i(y)}</span><span>${i(L)}</span></div>`,F=t.items.reduce((y,L)=>y+L.quantity,0),v=(t.tax||0)>0?t.taxState||t.taxMunicipal||t.taxReduced?`${t.taxState?f("+ Estatal",d(t.taxState)):""}${t.taxReduced?f("+ Reducido",d(t.taxReduced)):""}${t.taxMunicipal?f("+ Municipal",d(t.taxMunicipal)):""}`:e.showTaxBreakdown?f("+ IVU",d(t.tax)):"":"",C=t.isReprint&&e.reprintLabel?`<div style="text-align:center;font-weight:700;">${i(e.reprintLabel)}</div>`:"",w=[e.returnPolicyText,e.thankYouText,e.paymentTermsText].filter(Boolean).map(y=>`<div style="text-align:center;margin-top:6px;">${i(y)}</div>`).join(""),A=e.showBarcode?`<div style="text-align:center;margin-top:10px;">${n?`<div style="height:50px;">${n}</div>`:""}<div style="letter-spacing:2px;">${i(l)}</div></div>`:"";return`
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
                ${C}
                ${D}
                ${t.items.map(y=>`
                    <div>${i(y.name)}</div>
                    <div style="display:flex;justify-content:space-between;"><span style="padding-left:10px;">${y.quantity}@ ${d(y.unitPrice)}</span><span>${d(y.quantity*y.unitPrice)}</span></div>
                    ${y.note?`<div style="font-style:italic;padding-left:10px;">* ${i(y.note)}</div>`:""}
                `).join("")}
                ${D}
                ${t.returnInfo?`${t.returnInfo.originalNumber?f("Factura",`${e.receiptPrefix||""}${t.returnInfo.originalNumber}`):""}${t.returnInfo.originalDate?f("Fecha",new Date(t.returnInfo.originalDate).toLocaleDateString()):""}${t.returnInfo.reason?`<div>Motivo: ${i(t.returnInfo.reason)}</div>`:""}${D}`:""}
                ${f(`${F}  Artículos      SUBTOTAL`,d(t.subtotal),!0)}
                ${t.discount>0?f("Descuento",`-${d(t.discount)}`):""}
                ${v}
                <div style="font-size:${a?"14px":"16px"};margin-top:2px;">${f(t.returnInfo?"TOTAL DEVUELTO":"TOTAL",d(t.total),!0)}</div>
                ${t.payments.map(y=>f(t.returnInfo?`Reembolso ${y.method}`:y.method,d(y.amount))).join("")}
                ${t.changeDue&&t.changeDue>0?f("Cambio",d(t.changeDue),!0):""}
                ${D}
                ${t.returnInfo?'<div style="margin-top:14px;">Firma cliente: ____________________</div>':w}
                ${C}
                ${t.returnInfo?"":A}
            </div>`}const s=(l,S,D=!1)=>`<div style="display:flex;justify-content:space-between;${D?"font-weight:700;":""}"><span>${i(l)}</span><span>${i(S)}</span></div>`,r=`
        <div style="text-align:center;margin-bottom:8px;">
            ${e.showLogo&&e.logoUrl?`<img src="${i(e.logoUrl)}" style="max-width:${a?"120px":"160px"};max-height:80px;object-fit:contain;margin:0 auto 6px;display:block;"/>`:""}
            ${e.businessName?`<div style="font-size:${a?"14px":"18px"};font-weight:700;">${i(e.businessName)}</div>`:""}
            ${e.showRnc&&e.rnc?`<div>RNC/Reg: ${i(e.rnc)}</div>`:""}
            ${e.showAddress&&e.address?`<div>${i(e.address)}</div>`:""}
            ${e.showPhone&&e.phone?`<div>Tel: ${i(e.phone)}</div>`:""}
            ${e.showEmail&&e.email?`<div>${i(e.email)}</div>`:""}
        </div>`,b=`
        <div style="border-top:1px dashed #999;border-bottom:1px dashed #999;padding:6px 0;margin-bottom:6px;">
            ${s(t.returnInfo?"Devolución #":"Factura #",t.saleNumber)}
            ${s("Fecha",new Date(t.date).toLocaleString())}
            ${(p=t.returnInfo)!=null&&p.originalNumber?s("Factura devuelta",`${e.receiptPrefix||""}${t.returnInfo.originalNumber}`):""}
            ${(x=t.returnInfo)!=null&&x.originalDate?s("Fecha factura",new Date(t.returnInfo.originalDate).toLocaleDateString()):""}
            ${($=t.returnInfo)!=null&&$.reason?s("Motivo",t.returnInfo.reason):""}
            ${e.showClient&&t.clientName?s("Cliente",t.clientName):""}
            ${e.showCashier&&t.cashierName?s("Cajero",t.cashierName):""}
        </div>`,h=t.items.map(l=>`
        <tr>
            <td style="padding:2px 0;">${i(l.name)}<br/><span style="color:#666;">${l.quantity} x ${d(l.unitPrice)}</span>${l.note?`<br/><span style="color:#555;font-style:italic;">* ${i(l.note)}</span>`:""}</td>
            <td style="padding:2px 0;text-align:right;vertical-align:top;">${d(l.quantity*l.unitPrice)}</td>
        </tr>`).join(""),N=`
        <div style="border-top:1px dashed #999;padding-top:6px;margin-top:4px;">
            ${s("Subtotal",d(t.subtotal))}
            ${t.discount>0?s("Descuento",`-${d(t.discount)}`):""}
            ${(t.tax||0)>0?t.taxState||t.taxMunicipal||t.taxReduced?`${t.taxState?s("IVU Estatal",d(t.taxState)):""}${t.taxMunicipal?s("IVU Municipal",d(t.taxMunicipal)):""}${t.taxReduced?s("IVU Reducido",d(t.taxReduced)):""}`:e.showTaxBreakdown?s("IVU",d(t.tax)):"":""}
            <div style="font-size:${a?"14px":"16px"};margin-top:4px;">${s(t.returnInfo?"TOTAL DEVUELTO":"TOTAL",d(t.total),!0)}</div>
        </div>`,R=`
        <div style="border-top:1px dashed #999;padding-top:6px;margin-top:6px;">
            ${t.payments.map(l=>`
                ${s(t.returnInfo?`Reembolso ${l.method}`:l.method,d(l.amount))}
                ${l.reference?`<div style="color:#555;font-size:${a?"10px":"11px"};margin-left:8px;">Ref: ${i(Y(l.reference))}</div>`:""}
            `).join("")}
            ${t.changeDue&&t.changeDue>0?s("Cambio",d(t.changeDue),!0):""}
        </div>`,z=e.showFooter&&e.footerNote?`<div style="text-align:center;margin-top:10px;white-space:pre-wrap;color:#333;">${i(e.footerNote)}</div>`:"",c=e.headerNote?`<div style="text-align:center;margin-bottom:6px;white-space:pre-wrap;">${i(e.headerNote)}</div>`:"";return`
        <div style="width:${u};margin:0 auto;padding:${o};font-family:'Courier New',monospace;font-size:${m};color:#111;box-sizing:border-box;">
            ${r}
            ${c}
            ${t.docLabel?`<div style="text-align:center;font-weight:700;margin-bottom:6px;">${i(t.docLabel)}</div>`:""}
            ${b}
            <table style="width:100%;border-collapse:collapse;">${h}</table>
            ${N}
            ${R}
            ${z}
        </div>`}const W=t=>{const e=/^#?([0-9a-f]{6})$/i.exec((t||"").trim());if(!e)return[76,175,80];const n=parseInt(e[1],16);return[n>>16&255,n>>8&255,n&255]};async function O(t,e,n){var N,R,z;const{jsPDF:a}=await U(async()=>{const{jsPDF:c}=await import("./jspdf.es.min-Dkb5BWPP.js").then(p=>p.j);return{jsPDF:c}},__vite__mapDeps([3,1,2])),u=e.paperSize==="letter",o=new a({unit:"mm",format:u?"letter":[80,200]}),m=o.internal.pageSize.getWidth(),s=u?14:4;let r=10;if(u){const{default:c}=await U(async()=>{const{default:g}=await import("./jspdf.plugin.autotable-Cz_YoQo_.js");return{default:g}},[]),p=e.invoiceDesign||{},x=(g,E)=>p.labels&&p.labels[g]||E,$=W(p.headerColor||"#4CAF50"),l=W(p.accentColor||"#7E57C2"),S=p.showLogo!==!1,D=p.showBusiness!==!1,f=p.showClient!==!1,F=p.showPaymentMethod!==!1,v=p.showNotes!==!1,C=m-s;let w=16;if(S&&e.logoUrl){const g=await et(e.logoUrl);if(g)try{o.addImage(g,ot(g),s,w,34,17)}catch{}}o.setFont("helvetica","bold").setFontSize(14).setTextColor(20),e.businessName&&o.text(e.businessName,C,w+4,{align:"right"}),o.setFont("helvetica","normal").setFontSize(9).setTextColor(90);let A=w+9;D&&[e.showAddress&&e.address,e.showPhone&&e.phone,e.showEmail&&e.email,e.showRnc&&e.rnc?`RNC/Reg: ${e.rnc}`:""].filter(Boolean).forEach(g=>{o.text(String(g),C,A,{align:"right"}),A+=4.5}),w=Math.max(w+20,A)+6,o.setFont("helvetica","bold").setFontSize(24).setTextColor(l[0],l[1],l[2]),o.text(p.title||"FACTURA",s,w),w+=8,o.setFontSize(10),o.setTextColor(40);const y=w;f&&t.clientName&&(o.setFont("helvetica","bold").text(x("clientHeading","Datos del Cliente"),s,w),o.setFont("helvetica","normal").text(t.clientName,s,w+5)),o.setFont("helvetica","normal").setFontSize(10).setTextColor(40),o.text(`${x("number","Número")}: ${t.saleNumber?"#"+t.saleNumber:"—"}`,C,y,{align:"right"}),o.text(`${x("date","Fecha")}: ${new Date(t.date).toLocaleDateString()}`,C,y+5,{align:"right"}),F&&((N=t.payments)!=null&&N.length)&&o.text(`${x("paymentMethod","Método de pago")}: ${t.payments.map(g=>g.method).join(", ")}`,C,y+10,{align:"right"}),w=y+18,c(o,{startY:w,head:[[x("colProduct","Producto"),x("colQty","Cant"),x("colPrice","Precio Unit."),x("colTotal","Total")]],body:t.items.map(g=>[g.name+(v&&g.note?`
${g.note}`:""),String(g.quantity),d(g.unitPrice),d(g.quantity*g.unitPrice)]),theme:"grid",headStyles:{fillColor:$,textColor:255,halign:"center"},columnStyles:{0:{halign:"left"},1:{halign:"center"},2:{halign:"right"},3:{halign:"right"}},styles:{fontSize:9,cellPadding:2.5},margin:{left:s,right:s}});let L=o.lastAutoTable.finalY+8;const P=(g,E,I=!1)=>{o.setFont("helvetica",I?"bold":"normal").setFontSize(I?14:10),I?o.setTextColor(l[0],l[1],l[2]):o.setTextColor(70),o.text(g,C-40,L,{align:"right"}),o.text(E,C,L,{align:"right"}),L+=I?8:6};P(`${x("subtotal","Subtotal")}:`,d(t.subtotal)),t.discount>0&&P(`${x("discount","Descuento")}:`,`-${d(t.discount)}`);for(const g of k(t.tax||0,t,void 0,x("tax","IVU")))P(`${g.label}:`,d(g.amount));P(`${x("total","Total")}:`,d(t.total),!0),t.changeDue&&t.changeDue>0&&P(`${x("change","Cambio")}:`,d(t.changeDue));const H=p.footerText!=null?p.footerText:"¡Gracias por su preferencia!";if(H&&(o.setFont("helvetica","normal").setFontSize(9).setTextColor(150),o.text(H,m/2,o.internal.pageSize.getHeight()-20,{align:"center"})),n!=null&&n.returnBlob)return o.output("blob");o.save(`factura-${t.saleNumber}.pdf`);return}const b=(c,p,x=!1)=>{o.setFontSize(p),o.setFont("courier",x?"bold":"normal"),o.text(c,m/2,r,{align:"center"}),r+=p*.5},h=(c,p,x=!1)=>{o.setFontSize(9),o.setFont("courier",x?"bold":"normal"),o.text(c,s,r),o.text(p,m-s,r,{align:"right"}),r+=4.5};if((e.design??"modern")==="classic"){const c=`${e.receiptPrefix||""}${t.saleNumber}`,p=new Date(t.date);if(e.showLogo&&((R=e.logoUrl)!=null&&R.startsWith("data:image")))try{o.addImage(e.logoUrl,"PNG",m/2-15,r,30,15),r+=18}catch{}e.businessName&&b(e.businessName,14,!0),e.showAddress&&e.address&&b(e.address,8),e.showPhone&&e.phone&&b(`Tel: ${e.phone}`,8),e.showRnc&&e.rnc&&b(e.rnc,8),r+=2,h(p.toLocaleDateString(),p.toLocaleTimeString()),b(`Recibo : ${c}`,11,!0),t.isReprint&&e.reprintLabel&&b(e.reprintLabel,9,!0),r+=1,o.line(s,r,m-s,r),r+=4,t.items.forEach($=>{o.setFontSize(9),o.setFont("courier","normal"),o.text($.name.slice(0,u?60:22),s,r),o.text(d($.quantity*$.unitPrice),m-s,r,{align:"right"}),r+=4,o.setTextColor(120),o.text(`  ${$.quantity}@ ${d($.unitPrice)}`,s,r),o.setTextColor(0),r+=4.5}),o.line(s,r,m-s,r),r+=4;const x=t.items.reduce(($,l)=>$+l.quantity,0);if(h(`${x} Articulos  SUBTOTAL`,d(t.subtotal),!0),t.discount>0&&h("Descuento",`-${d(t.discount)}`),(t.tax||0)>0&&(t.taxState||t.taxMunicipal||t.taxReduced?(t.taxState&&h("+ Estatal",d(t.taxState)),t.taxReduced&&h("+ Reducido",d(t.taxReduced)),t.taxMunicipal&&h("+ Municipal",d(t.taxMunicipal))):e.showTaxBreakdown&&h("+ IVU",d(t.tax))),h("TOTAL",d(t.total),!0),t.payments.forEach($=>h($.method,d($.amount))),t.changeDue&&t.changeDue>0&&h("Cambio",d(t.changeDue),!0),r+=3,o.line(s,r,m-s,r),r+=4,[e.returnPolicyText,e.thankYouText,e.paymentTermsText].forEach($=>{$&&b($,8)}),e.showBarcode&&(r+=2,b(c,12,!0)),n!=null&&n.returnBlob)return o.output("blob");o.save(`factura-${c}.pdf`);return}if(e.showLogo&&((z=e.logoUrl)!=null&&z.startsWith("data:image")))try{o.addImage(e.logoUrl,"PNG",m/2-15,r,30,15),r+=18}catch{}if(e.businessName&&b(e.businessName,13,!0),e.showRnc&&e.rnc&&b(`RNC/Reg: ${e.rnc}`,8),e.showAddress&&e.address&&b(e.address,8),e.showPhone&&e.phone&&b(`Tel: ${e.phone}`,8),e.showEmail&&e.email&&b(e.email,8),r+=2,h(`Factura #${t.saleNumber}`,""),h("Fecha",new Date(t.date).toLocaleString()),e.showClient&&t.clientName&&h("Cliente",t.clientName),e.showCashier&&t.cashierName&&h("Cajero",t.cashierName),r+=1,o.line(s,r,m-s,r),r+=4,t.items.forEach(c=>{o.setFontSize(9),o.setFont("courier","normal"),o.text(c.name.slice(0,u?60:22),s,r),o.text(d(c.quantity*c.unitPrice),m-s,r,{align:"right"}),r+=4,o.setTextColor(120),o.text(`  ${c.quantity} x ${d(c.unitPrice)}`,s,r),o.setTextColor(0),r+=4.5}),o.line(s,r,m-s,r),r+=4,h("Subtotal",d(t.subtotal)),t.discount>0&&h("Descuento",`-${d(t.discount)}`),e.showTaxBreakdown)for(const c of k(t.tax||0,t))h(c.label,d(c.amount));if(h("TOTAL",d(t.total),!0),r+=1,o.line(s,r,m-s,r),r+=4,t.payments.forEach(c=>h(c.method+(c.reference?` (${Y(c.reference)})`:""),d(c.amount))),t.changeDue&&t.changeDue>0&&h("Cambio",d(t.changeDue),!0),e.showFooter&&e.footerNote&&(r+=4,b(e.footerNote,8)),n!=null&&n.returnBlob)return o.output("blob");o.save(`factura-${t.saleNumber}.pdf`)}function j(t,e="80mm"){const a=`<!doctype html><html><head><meta charset="utf-8"><title>Factura</title>
<style>
  ${e==="80mm"?"@page { size: 80mm auto; margin: 0; }":"@page { size: letter; margin: 12mm; }"}
  html, body { margin: 0; padding: 0; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
</style></head><body>${t}</body></html>`,u=document.createElement("iframe");u.setAttribute("aria-hidden","true"),u.style.cssText="position:fixed;right:0;bottom:0;width:0;height:0;border:0;",document.body.appendChild(u);const o=u.contentWindow;if(!o)return document.body.removeChild(u),Promise.resolve();o.document.open(),o.document.write(a),o.document.close();const m=()=>{setTimeout(()=>{try{document.body.removeChild(u)}catch{}},1500)};return new Promise(s=>{const r=()=>{try{o.focus(),o.print()}catch{}m(),s()};o.document.readyState==="complete"?setTimeout(r,250):o.onload=()=>setTimeout(r,250)})}function M(t,e,n,a){const u=a||B(),o=u==="factura"?"letter":"80mm",m=q(e,{...n,paperSize:o});if(u!=="factura"&&nt()){rt(e,n).catch(s=>{console.error("Impresión por WebUSB falló, uso el diálogo del navegador:",s),j(m,o)});return}if(at()){st(e,n,u,u==="factura"?m:void 0).catch(s=>{console.error("Impresión por QZ falló, uso el diálogo del navegador:",s),j(m,o)});return}j(m,o)}const V="pazzi_receipt_action";function G(){try{const t=localStorage.getItem(V);return t==="print"||t==="download"?t:"ask"}catch{return"ask"}}function Q(t){try{t==="ask"?localStorage.removeItem(V):localStorage.setItem(V,t)}catch{}}const ct=({isOpen:t,onClose:e,sale:n,config:a,forceChoose:u})=>{const{t:o}=J(),[m,s]=_.useState(""),[r,b]=_.useState(()=>B()==="factura"?"factura":"recibo");_.useEffect(()=>{t&&b(B()==="factura"?"factura":"recibo")},[t]);const h=_.useMemo(()=>({...a,paperSize:r==="factura"?"letter":"80mm"}),[a,r]);_.useEffect(()=>{let l=!0;return n&&(a.design??"modern")==="classic"&&a.showBarcode?dt(`${a.receiptPrefix||""}${n.saleNumber}`).then(S=>{l&&s(S)}):s(""),()=>{l=!1}},[n,a]);const N=_.useMemo(()=>n?q(n,h,m):"",[n,h,m]),[R,z]=_.useState(!1),c=_.useRef(null),p=G();if(_.useEffect(()=>{if(!u&&t&&n&&N&&c.current!==n.saleNumber){if(p==="print"){c.current=n.saleNumber,M(N,n,a),e();return}if(p==="download"){c.current=n.saleNumber,O(n,a),e();return}if(a.autoPrint){c.current=n.saleNumber;const l=setTimeout(()=>M(N,n,a),150);return()=>clearTimeout(l)}}},[t,n,N,u]),_.useEffect(()=>{t||(c.current=null)},[t]),!n||!u&&p!=="ask")return null;const x=l=>{R&&!u&&Q(l),l==="print"?M(N,n,h,r):O(n,h),(R||u)&&e()},$=(l,S)=>T.jsx("button",{type:"button",onClick:()=>b(l),className:`flex-1 py-2 px-3 rounded-md text-sm font-medium border transition-colors ${r===l?"border-primary bg-primary/10 text-primary ring-1 ring-primary":"border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700"}`,children:S});return T.jsx(K,{isOpen:t,onClose:e,title:"Factura / Recibo",size:r==="factura"?"3xl":"md",children:T.jsxs("div",{className:"space-y-4",children:[T.jsxs("div",{children:[T.jsx("p",{className:"text-xs text-neutral-500 dark:text-neutral-400 mb-1",children:o("posx.receipt.format")}),T.jsxs("div",{className:"flex gap-2",children:[$("recibo",o("posx.receipt.format_receipt")),$("factura",o("posx.receipt.format_invoice"))]})]}),T.jsx("div",{className:"bg-neutral-100 dark:bg-neutral-900 rounded-md p-3 max-h-[65vh] overflow-auto",children:T.jsx("div",{className:"pazzi-paper bg-white shadow-sm mx-auto w-max max-w-full",dangerouslySetInnerHTML:{__html:N}})}),!u&&T.jsxs("label",{className:"flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300 select-none",children:[T.jsx("input",{type:"checkbox",checked:R,onChange:l=>z(l.target.checked),className:"h-4 w-4"}),"No volver a preguntar (usar siempre la acción que elija ahora)"]}),T.jsxs("div",{className:"flex justify-end gap-2",children:[T.jsx("button",{onClick:e,className:X,children:"Cerrar"}),T.jsx("button",{onClick:()=>x("download"),className:Z,children:"📄 Descargar PDF"}),T.jsx("button",{onClick:()=>x("print"),className:tt,children:"🖨️ Imprimir"})]})]})})},ht=Object.freeze(Object.defineProperty({__proto__:null,ReceiptModal:ct,buildReceiptHTML:q,generatePDF:O,getReceiptAction:G,printReceipt:j,setReceiptAction:Q},Symbol.toStringTag,{value:"Module"}));export{ct as R,q as a,dt as b,O as c,ht as d,G as g,Q as s};
