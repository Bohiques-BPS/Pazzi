const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/JsBarcode-B8G0Km4J.js","assets/index-DiDHUwWw.js","assets/index-yiVu5m2b.css","assets/jspdf.es.min-DKcA3vEl.js"])))=>i.map(i=>d[i]);
import{_ as k,c as Q,r as S,j as f,ab as J,ac as K,b as X,B as Z,bh as B}from"./index-DiDHUwWw.js";import{l as tt,d as et}from"./imageData-Bp7_AP_b.js";import{g as I,i as ot,p as it,a as nt,b as at}from"./webusbPrinter-fOfTOmRl.js";async function rt(t){if(!t)return"";try{const e=await k(()=>import("./JsBarcode-B8G0Km4J.js").then(p=>p.J),__vite__mapDeps([0,1,2])),a=e.default||e,r=document.createElementNS("http://www.w3.org/2000/svg","svg");r.setAttribute("style","position:fixed;left:-9999px;top:-9999px;"),document.body.appendChild(r);try{a(r,t,{format:"CODE128",width:2,height:50,displayValue:!1,margin:0});const p=parseFloat(r.getAttribute("width")||"0"),o=parseFloat(r.getAttribute("height")||"0");return p>0&&o>0&&r.setAttribute("viewBox",`0 0 ${p} ${o}`),r.setAttribute("preserveAspectRatio","none"),r.setAttribute("style","width:70%;height:50px;"),r.removeAttribute("width"),r.removeAttribute("height"),new XMLSerializer().serializeToString(r)}finally{document.body.removeChild(r)}}catch{return""}}const i=t=>String(t??"").replace(/[&<>"]/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[e]||e),s=t=>`$${(Number(t)||0).toFixed(2)}`;function st(t,e){const a=e.invoiceDesign||{},r=(v,D)=>a.labels&&a.labels[v]||D,p=a.headerColor||"#4CAF50",o=a.accentColor||"#7E57C2",m=t.docLabel||a.title||"FACTURA",d=a.footerText!=null?a.footerText:"¡Gracias por su preferencia!",n=a.showLogo!==!1,b=a.showBusiness!==!1,h=a.showClient!==!1,T=a.showPaymentMethod!==!1,N=a.showNotes!==!1,R=!!a.showLineDescription,c=a.template||"modern",l=[b&&e.showAddress&&e.address?i(e.address):"",b&&e.showPhone&&e.phone?i(e.phone):"",b&&e.showEmail&&e.email?i(e.email):"",b&&e.showRnc&&e.rnc?`RNC/Reg: ${i(e.rnc)}`:""].filter(Boolean).join("<br/>"),x=n&&e.logoUrl?`<img src="${i(e.logoUrl)}" style="max-width:150px;max-height:70px;object-fit:contain;"/>`:"",$=c==="banner"?`<div style="background:${p};color:#fff;margin:-16mm -14mm 14px;padding:14mm 14mm 10px;display:flex;justify-content:space-between;align-items:flex-start;">
                <div>${x?`<img src="${i(e.logoUrl)}" style="max-width:140px;max-height:60px;object-fit:contain;"/>`:""}</div>
                <div style="text-align:right;">
                    ${e.businessName?`<div style="font-size:17px;font-weight:800;">${i(e.businessName)}</div>`:""}
                    <div style="font-size:12px;line-height:1.5;opacity:.92;">${l}</div>
                </div>
           </div>
           <div style="font-size:26px;font-weight:800;color:${o};margin:0 0 12px;">${i(m)}</div>`:c==="classic"?`<div style="text-align:center;margin-bottom:6px;">
                ${x}
                ${e.businessName?`<div style="font-size:17px;font-weight:700;margin-top:4px;">${i(e.businessName)}</div>`:""}
                <div style="color:#555;font-size:12px;line-height:1.5;">${l}</div>
           </div>
           <div style="text-align:center;font-size:22px;font-weight:800;letter-spacing:1px;border-bottom:2px solid #111;padding-bottom:6px;margin:8px 0 12px;">${i(m).toUpperCase()}</div>`:`<div style="display:flex;justify-content:space-between;align-items:flex-start;">
                <div>${x}</div>
                <div style="text-align:right;">
                    ${e.businessName?`<div style="font-size:16px;font-weight:700;">${i(e.businessName)}</div>`:""}
                    <div style="color:#555;font-size:12px;line-height:1.5;">${l}</div>
                </div>
           </div>
           <div style="font-size:28px;font-weight:800;color:${o};margin:18px 0 12px;">${i(m)}</div>`,u=c==="classic"?"background:#e5e7eb;color:#111;":`background:${p};color:#fff;`,C=t.items.map(v=>`
        <tr>
            <td style="padding:8px 6px;border-bottom:1px solid #eee;">
                <div style="font-weight:600;">${i(v.name)}</div>
                ${R&&v.description?`<div style="color:#666;font-size:11px;margin-top:2px;">${i(String(v.description))}</div>`:""}
                ${N&&v.note?`<div style="color:#666;font-size:11px;margin-top:2px;">${i(v.note)}</div>`:""}
            </td>
            <td style="padding:8px 6px;border-bottom:1px solid #eee;text-align:center;">${v.quantity}</td>
            <td style="padding:8px 6px;border-bottom:1px solid #eee;text-align:right;">${s(v.unitPrice)}</td>
            <td style="padding:8px 6px;border-bottom:1px solid #eee;text-align:right;font-weight:600;">${s(v.quantity*v.unitPrice)}</td>
        </tr>`).join(""),P=B(t.tax||0,t,void 0,r("tax","IVU")).map(v=>`<tr><td style="text-align:right;padding:2px 8px;color:#555;">${i(v.label)}:</td><td style="text-align:right;padding:2px 0;width:110px;">${s(v.amount)}</td></tr>`).join(""),z=t.changeDue&&t.changeDue>0?`<tr><td style="text-align:right;padding:2px 8px;color:#555;">${i(r("change","Cambio"))}:</td><td style="text-align:right;padding:2px 0;">${s(t.changeDue)}</td></tr>`:"";return`
    <div style="width:210mm;min-height:auto;margin:0 auto;padding:16mm 14mm;font-family:'Segoe UI',Helvetica,Arial,sans-serif;color:#222;box-sizing:border-box;font-size:13px;">
        ${$}
        <!-- Cliente + meta -->
        <div style="display:flex;justify-content:space-between;gap:20px;margin-bottom:14px;">
            <div style="max-width:50%;">
                ${h&&t.clientName?`<div style="font-weight:700;margin-bottom:2px;">${i(r("clientHeading","Datos del Cliente"))}</div><div>${i(t.clientName)}</div>`:""}
            </div>
            <div style="text-align:right;font-size:13px;">
                <div><strong>${i(r("number","Número"))}:</strong> ${t.saleNumber?"#"+i(String(t.saleNumber)):"—"}</div>
                <div><strong>${i(r("date","Fecha"))}:</strong> ${i(new Date(t.date).toLocaleDateString())}</div>
                ${T&&t.payments&&t.payments.length?`<div><strong>${i(r("paymentMethod","Método de pago"))}:</strong> ${i(t.payments.map(v=>v.method).join(", "))}</div>`:""}
            </div>
        </div>
        <!-- Tabla -->
        <table style="width:100%;border-collapse:collapse;margin-top:4px;">
            <thead>
                <tr style="${u}">
                    <th style="padding:9px 6px;text-align:left;">${i(r("colProduct","Producto"))}</th>
                    <th style="padding:9px 6px;text-align:center;width:60px;">${i(r("colQty","Cant"))}</th>
                    <th style="padding:9px 6px;text-align:right;width:110px;">${i(r("colPrice","Precio Unit."))}</th>
                    <th style="padding:9px 6px;text-align:right;width:110px;">${i(r("colTotal","Total"))}</th>
                </tr>
            </thead>
            <tbody>${C}</tbody>
        </table>
        <!-- Totales -->
        <table style="margin-left:auto;margin-top:14px;border-collapse:collapse;">
            <tr><td style="text-align:right;padding:2px 8px;color:#555;">${i(r("subtotal","Subtotal"))}:</td><td style="text-align:right;padding:2px 0;width:110px;">${s(t.subtotal)}</td></tr>
            ${t.discount>0?`<tr><td style="text-align:right;padding:2px 8px;color:#555;">${i(r("discount","Descuento"))}:</td><td style="text-align:right;padding:2px 0;">-${s(t.discount)}</td></tr>`:""}
            ${P}
            <tr><td style="text-align:right;padding:6px 8px;font-size:18px;font-weight:800;color:${o};">${i(r("total","Total"))}:</td><td style="text-align:right;padding:6px 0;font-size:18px;font-weight:800;color:${o};">${s(t.total)}</td></tr>
            ${z}
        </table>
        ${d?`<div style="text-align:center;color:#999;font-size:11px;margin-top:34px;">${i(d)}</div>`:""}
    </div>`}function O(t,e,a){const r=e.paperSize==="80mm";if(!r)return st(t,e);const p=r?"72mm":"210mm",o=r?"4mm":"14mm",m=r?"11px":"13px";if((e.design??"modern")==="classic"){const l=`${e.receiptPrefix||""}${t.saleNumber}`,x=new Date(t.date),$='<div style="border-top:1px solid #000;margin:4px 0;"></div>',u=(g,w,L=!1)=>`<div style="display:flex;justify-content:space-between;${L?"font-weight:700;":""}"><span>${i(g)}</span><span>${i(w)}</span></div>`,C=t.items.reduce((g,w)=>g+w.quantity,0),P=(t.tax||0)>0?t.taxState||t.taxMunicipal||t.taxReduced?`${t.taxState?u("+ Estatal",s(t.taxState)):""}${t.taxReduced?u("+ Reducido",s(t.taxReduced)):""}${t.taxMunicipal?u("+ Municipal",s(t.taxMunicipal)):""}`:e.showTaxBreakdown?u("+ IVU",s(t.tax)):"":"",z=t.isReprint&&e.reprintLabel?`<div style="text-align:center;font-weight:700;">${i(e.reprintLabel)}</div>`:"",v=[e.returnPolicyText,e.thankYouText,e.paymentTermsText].filter(Boolean).map(g=>`<div style="text-align:center;margin-top:6px;">${i(g)}</div>`).join(""),D=e.showBarcode?`<div style="text-align:center;margin-top:10px;">${a?`<div style="height:50px;">${a}</div>`:""}<div style="letter-spacing:2px;">${i(l)}</div></div>`:"";return`
            <div style="width:${p};margin:0 auto;padding:${o};font-family:'Courier New',monospace;font-size:${m};color:#000;box-sizing:border-box;">
                <div style="text-align:center;">
                    ${e.showLogo&&e.logoUrl?`<img src="${i(e.logoUrl)}" style="max-width:${r?"120px":"160px"};max-height:70px;object-fit:contain;margin:0 auto 4px;display:block;"/>`:""}
                    ${e.businessName?`<div style="font-weight:700;font-size:${r?"15px":"20px"};letter-spacing:1px;">${i(e.businessName)}</div>`:""}
                    ${e.showAddress&&e.address?`<div>${i(e.address)}</div>`:""}
                    ${e.showPhone&&e.phone?`<div>Tel: ${i(e.phone)}</div>`:""}
                    ${e.showRnc&&e.rnc?`<div>${i(e.rnc)}</div>`:""}
                </div>
                <div style="display:flex;justify-content:space-between;margin-top:6px;"><span>${i(x.toLocaleDateString())}</span><span>${i(x.toLocaleTimeString())}</span></div>
                <div style="text-align:center;font-weight:700;margin:4px 0;font-size:${r?"13px":"15px"};">Recibo : ${i(l)}</div>
                ${t.docLabel?`<div style="text-align:center;font-weight:700;">${i(t.docLabel)}</div>`:""}
                ${z}
                ${$}
                ${t.items.map(g=>`
                    <div>${i(g.name)}</div>
                    <div style="display:flex;justify-content:space-between;"><span style="padding-left:10px;">${g.quantity}@ ${s(g.unitPrice)}</span><span>${s(g.quantity*g.unitPrice)}</span></div>
                    ${g.note?`<div style="font-style:italic;padding-left:10px;">* ${i(g.note)}</div>`:""}
                `).join("")}
                ${$}
                ${u(`${C}  Artículos      SUBTOTAL`,s(t.subtotal),!0)}
                ${t.discount>0?u("Descuento",`-${s(t.discount)}`):""}
                ${P}
                <div style="font-size:${r?"14px":"16px"};margin-top:2px;">${u("TOTAL",s(t.total),!0)}</div>
                ${t.payments.map(g=>u(g.method,s(g.amount))).join("")}
                ${t.changeDue&&t.changeDue>0?u("Cambio",s(t.changeDue),!0):""}
                ${$}
                ${v}
                ${z}
                ${D}
            </div>`}const d=(l,x,$=!1)=>`<div style="display:flex;justify-content:space-between;${$?"font-weight:700;":""}"><span>${i(l)}</span><span>${i(x)}</span></div>`,n=`
        <div style="text-align:center;margin-bottom:8px;">
            ${e.showLogo&&e.logoUrl?`<img src="${i(e.logoUrl)}" style="max-width:${r?"120px":"160px"};max-height:80px;object-fit:contain;margin:0 auto 6px;display:block;"/>`:""}
            ${e.businessName?`<div style="font-size:${r?"14px":"18px"};font-weight:700;">${i(e.businessName)}</div>`:""}
            ${e.showRnc&&e.rnc?`<div>RNC/Reg: ${i(e.rnc)}</div>`:""}
            ${e.showAddress&&e.address?`<div>${i(e.address)}</div>`:""}
            ${e.showPhone&&e.phone?`<div>Tel: ${i(e.phone)}</div>`:""}
            ${e.showEmail&&e.email?`<div>${i(e.email)}</div>`:""}
        </div>`,b=`
        <div style="border-top:1px dashed #999;border-bottom:1px dashed #999;padding:6px 0;margin-bottom:6px;">
            ${d("Factura #",t.saleNumber)}
            ${d("Fecha",new Date(t.date).toLocaleString())}
            ${e.showClient&&t.clientName?d("Cliente",t.clientName):""}
            ${e.showCashier&&t.cashierName?d("Cajero",t.cashierName):""}
        </div>`,h=t.items.map(l=>`
        <tr>
            <td style="padding:2px 0;">${i(l.name)}<br/><span style="color:#666;">${l.quantity} x ${s(l.unitPrice)}</span>${l.note?`<br/><span style="color:#555;font-style:italic;">* ${i(l.note)}</span>`:""}</td>
            <td style="padding:2px 0;text-align:right;vertical-align:top;">${s(l.quantity*l.unitPrice)}</td>
        </tr>`).join(""),T=`
        <div style="border-top:1px dashed #999;padding-top:6px;margin-top:4px;">
            ${d("Subtotal",s(t.subtotal))}
            ${t.discount>0?d("Descuento",`-${s(t.discount)}`):""}
            ${(t.tax||0)>0?t.taxState||t.taxMunicipal||t.taxReduced?`${t.taxState?d("IVU Estatal",s(t.taxState)):""}${t.taxMunicipal?d("IVU Municipal",s(t.taxMunicipal)):""}${t.taxReduced?d("IVU Reducido",s(t.taxReduced)):""}`:e.showTaxBreakdown?d("IVU",s(t.tax)):"":""}
            <div style="font-size:${r?"14px":"16px"};margin-top:4px;">${d("TOTAL",s(t.total),!0)}</div>
        </div>`,N=`
        <div style="border-top:1px dashed #999;padding-top:6px;margin-top:6px;">
            ${t.payments.map(l=>`
                ${d(l.method,s(l.amount))}
                ${l.reference?`<div style="color:#555;font-size:${r?"10px":"11px"};margin-left:8px;">Ref: ${i(l.reference)}</div>`:""}
            `).join("")}
            ${t.changeDue&&t.changeDue>0?d("Cambio",s(t.changeDue),!0):""}
        </div>`,R=e.showFooter&&e.footerNote?`<div style="text-align:center;margin-top:10px;white-space:pre-wrap;color:#333;">${i(e.footerNote)}</div>`:"",c=e.headerNote?`<div style="text-align:center;margin-bottom:6px;white-space:pre-wrap;">${i(e.headerNote)}</div>`:"";return`
        <div style="width:${p};margin:0 auto;padding:${o};font-family:'Courier New',monospace;font-size:${m};color:#111;box-sizing:border-box;">
            ${n}
            ${c}
            ${t.docLabel?`<div style="text-align:center;font-weight:700;margin-bottom:6px;">${i(t.docLabel)}</div>`:""}
            ${b}
            <table style="width:100%;border-collapse:collapse;">${h}</table>
            ${T}
            ${N}
            ${R}
        </div>`}const W=t=>{const e=/^#?([0-9a-f]{6})$/i.exec((t||"").trim());if(!e)return[76,175,80];const a=parseInt(e[1],16);return[a>>16&255,a>>8&255,a&255]};async function q(t,e,a){var T,N,R;const{jsPDF:r}=await k(async()=>{const{jsPDF:c}=await import("./jspdf.es.min-DKcA3vEl.js").then(l=>l.j);return{jsPDF:c}},__vite__mapDeps([3,1,2])),p=e.paperSize==="letter",o=new r({unit:"mm",format:p?"letter":[80,200]}),m=o.internal.pageSize.getWidth(),d=p?14:4;let n=10;if(p){const{default:c}=await k(async()=>{const{default:y}=await import("./jspdf.plugin.autotable-Cz_YoQo_.js");return{default:y}},[]),l=e.invoiceDesign||{},x=(y,U)=>l.labels&&l.labels[y]||U,$=W(l.headerColor||"#4CAF50"),u=W(l.accentColor||"#7E57C2"),C=l.showLogo!==!1,P=l.showBusiness!==!1,z=l.showClient!==!1,v=l.showPaymentMethod!==!1,D=l.showNotes!==!1,g=m-d;let w=16;if(C&&e.logoUrl){const y=await tt(e.logoUrl);if(y)try{o.addImage(y,et(y),d,w,34,17)}catch{}}o.setFont("helvetica","bold").setFontSize(14).setTextColor(20),e.businessName&&o.text(e.businessName,g,w+4,{align:"right"}),o.setFont("helvetica","normal").setFontSize(9).setTextColor(90);let L=w+9;P&&[e.showAddress&&e.address,e.showPhone&&e.phone,e.showEmail&&e.email,e.showRnc&&e.rnc?`RNC/Reg: ${e.rnc}`:""].filter(Boolean).forEach(y=>{o.text(String(y),g,L,{align:"right"}),L+=4.5}),w=Math.max(w+20,L)+6,o.setFont("helvetica","bold").setFontSize(24).setTextColor(u[0],u[1],u[2]),o.text(l.title||"FACTURA",d,w),w+=8,o.setFontSize(10),o.setTextColor(40);const A=w;z&&t.clientName&&(o.setFont("helvetica","bold").text(x("clientHeading","Datos del Cliente"),d,w),o.setFont("helvetica","normal").text(t.clientName,d,w+5)),o.setFont("helvetica","normal").setFontSize(10).setTextColor(40),o.text(`${x("number","Número")}: ${t.saleNumber?"#"+t.saleNumber:"—"}`,g,A,{align:"right"}),o.text(`${x("date","Fecha")}: ${new Date(t.date).toLocaleDateString()}`,g,A+5,{align:"right"}),v&&((T=t.payments)!=null&&T.length)&&o.text(`${x("paymentMethod","Método de pago")}: ${t.payments.map(y=>y.method).join(", ")}`,g,A+10,{align:"right"}),w=A+18,c(o,{startY:w,head:[[x("colProduct","Producto"),x("colQty","Cant"),x("colPrice","Precio Unit."),x("colTotal","Total")]],body:t.items.map(y=>[y.name+(D&&y.note?`
${y.note}`:""),String(y.quantity),s(y.unitPrice),s(y.quantity*y.unitPrice)]),theme:"grid",headStyles:{fillColor:$,textColor:255,halign:"center"},columnStyles:{0:{halign:"left"},1:{halign:"center"},2:{halign:"right"},3:{halign:"right"}},styles:{fontSize:9,cellPadding:2.5},margin:{left:d,right:d}});let _=o.lastAutoTable.finalY+8;const j=(y,U,F=!1)=>{o.setFont("helvetica",F?"bold":"normal").setFontSize(F?14:10),F?o.setTextColor(u[0],u[1],u[2]):o.setTextColor(70),o.text(y,g-40,_,{align:"right"}),o.text(U,g,_,{align:"right"}),_+=F?8:6};j(`${x("subtotal","Subtotal")}:`,s(t.subtotal)),t.discount>0&&j(`${x("discount","Descuento")}:`,`-${s(t.discount)}`);for(const y of B(t.tax||0,t,void 0,x("tax","IVU")))j(`${y.label}:`,s(y.amount));j(`${x("total","Total")}:`,s(t.total),!0),t.changeDue&&t.changeDue>0&&j(`${x("change","Cambio")}:`,s(t.changeDue));const H=l.footerText!=null?l.footerText:"¡Gracias por su preferencia!";if(H&&(o.setFont("helvetica","normal").setFontSize(9).setTextColor(150),o.text(H,m/2,o.internal.pageSize.getHeight()-20,{align:"center"})),a!=null&&a.returnBlob)return o.output("blob");o.save(`factura-${t.saleNumber}.pdf`);return}const b=(c,l,x=!1)=>{o.setFontSize(l),o.setFont("courier",x?"bold":"normal"),o.text(c,m/2,n,{align:"center"}),n+=l*.5},h=(c,l,x=!1)=>{o.setFontSize(9),o.setFont("courier",x?"bold":"normal"),o.text(c,d,n),o.text(l,m-d,n,{align:"right"}),n+=4.5};if((e.design??"modern")==="classic"){const c=`${e.receiptPrefix||""}${t.saleNumber}`,l=new Date(t.date);if(e.showLogo&&((N=e.logoUrl)!=null&&N.startsWith("data:image")))try{o.addImage(e.logoUrl,"PNG",m/2-15,n,30,15),n+=18}catch{}e.businessName&&b(e.businessName,14,!0),e.showAddress&&e.address&&b(e.address,8),e.showPhone&&e.phone&&b(`Tel: ${e.phone}`,8),e.showRnc&&e.rnc&&b(e.rnc,8),n+=2,h(l.toLocaleDateString(),l.toLocaleTimeString()),b(`Recibo : ${c}`,11,!0),t.isReprint&&e.reprintLabel&&b(e.reprintLabel,9,!0),n+=1,o.line(d,n,m-d,n),n+=4,t.items.forEach($=>{o.setFontSize(9),o.setFont("courier","normal"),o.text($.name.slice(0,p?60:22),d,n),o.text(s($.quantity*$.unitPrice),m-d,n,{align:"right"}),n+=4,o.setTextColor(120),o.text(`  ${$.quantity}@ ${s($.unitPrice)}`,d,n),o.setTextColor(0),n+=4.5}),o.line(d,n,m-d,n),n+=4;const x=t.items.reduce(($,u)=>$+u.quantity,0);if(h(`${x} Articulos  SUBTOTAL`,s(t.subtotal),!0),t.discount>0&&h("Descuento",`-${s(t.discount)}`),(t.tax||0)>0&&(t.taxState||t.taxMunicipal||t.taxReduced?(t.taxState&&h("+ Estatal",s(t.taxState)),t.taxReduced&&h("+ Reducido",s(t.taxReduced)),t.taxMunicipal&&h("+ Municipal",s(t.taxMunicipal))):e.showTaxBreakdown&&h("+ IVU",s(t.tax))),h("TOTAL",s(t.total),!0),t.payments.forEach($=>h($.method,s($.amount))),t.changeDue&&t.changeDue>0&&h("Cambio",s(t.changeDue),!0),n+=3,o.line(d,n,m-d,n),n+=4,[e.returnPolicyText,e.thankYouText,e.paymentTermsText].forEach($=>{$&&b($,8)}),e.showBarcode&&(n+=2,b(c,12,!0)),a!=null&&a.returnBlob)return o.output("blob");o.save(`factura-${c}.pdf`);return}if(e.showLogo&&((R=e.logoUrl)!=null&&R.startsWith("data:image")))try{o.addImage(e.logoUrl,"PNG",m/2-15,n,30,15),n+=18}catch{}if(e.businessName&&b(e.businessName,13,!0),e.showRnc&&e.rnc&&b(`RNC/Reg: ${e.rnc}`,8),e.showAddress&&e.address&&b(e.address,8),e.showPhone&&e.phone&&b(`Tel: ${e.phone}`,8),e.showEmail&&e.email&&b(e.email,8),n+=2,h(`Factura #${t.saleNumber}`,""),h("Fecha",new Date(t.date).toLocaleString()),e.showClient&&t.clientName&&h("Cliente",t.clientName),e.showCashier&&t.cashierName&&h("Cajero",t.cashierName),n+=1,o.line(d,n,m-d,n),n+=4,t.items.forEach(c=>{o.setFontSize(9),o.setFont("courier","normal"),o.text(c.name.slice(0,p?60:22),d,n),o.text(s(c.quantity*c.unitPrice),m-d,n,{align:"right"}),n+=4,o.setTextColor(120),o.text(`  ${c.quantity} x ${s(c.unitPrice)}`,d,n),o.setTextColor(0),n+=4.5}),o.line(d,n,m-d,n),n+=4,h("Subtotal",s(t.subtotal)),t.discount>0&&h("Descuento",`-${s(t.discount)}`),e.showTaxBreakdown)for(const c of B(t.tax||0,t))h(c.label,s(c.amount));if(h("TOTAL",s(t.total),!0),n+=1,o.line(d,n,m-d,n),n+=4,t.payments.forEach(c=>h(c.method+(c.reference?` (${c.reference})`:""),s(c.amount))),t.changeDue&&t.changeDue>0&&h("Cambio",s(t.changeDue),!0),e.showFooter&&e.footerNote&&(n+=4,b(e.footerNote,8)),a!=null&&a.returnBlob)return o.output("blob");o.save(`factura-${t.saleNumber}.pdf`)}function E(t,e="80mm"){const r=`<!doctype html><html><head><meta charset="utf-8"><title>Factura</title>
<style>
  ${e==="80mm"?"@page { size: 80mm auto; margin: 0; }":"@page { size: letter; margin: 12mm; }"}
  html, body { margin: 0; padding: 0; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
</style></head><body>${t}</body></html>`,p=document.createElement("iframe");p.setAttribute("aria-hidden","true"),p.style.cssText="position:fixed;right:0;bottom:0;width:0;height:0;border:0;",document.body.appendChild(p);const o=p.contentWindow;if(!o)return document.body.removeChild(p),Promise.resolve();o.document.open(),o.document.write(r),o.document.close();const m=()=>{setTimeout(()=>{try{document.body.removeChild(p)}catch{}},1500)};return new Promise(d=>{const n=()=>{try{o.focus(),o.print()}catch{}m(),d()};o.document.readyState==="complete"?setTimeout(n,250):o.onload=()=>setTimeout(n,250)})}function M(t,e,a,r){const p=r||I(),o=p==="factura"?"letter":"80mm",m=O(e,{...a,paperSize:o});if(p!=="factura"&&ot()){it(e,a).catch(d=>{console.error("Impresión por WebUSB falló, uso el diálogo del navegador:",d),E(m,o)});return}if(nt()){at(e,a,p,p==="factura"?m:void 0).catch(d=>{console.error("Impresión por QZ falló, uso el diálogo del navegador:",d),E(m,o)});return}E(m,o)}const V="pazzi_receipt_action";function Y(){try{const t=localStorage.getItem(V);return t==="print"||t==="download"?t:"ask"}catch{return"ask"}}function G(t){try{t==="ask"?localStorage.removeItem(V):localStorage.setItem(V,t)}catch{}}const dt=({isOpen:t,onClose:e,sale:a,config:r,forceChoose:p})=>{const{t:o}=Q(),[m,d]=S.useState(""),[n,b]=S.useState(()=>I()==="factura"?"factura":"recibo");S.useEffect(()=>{t&&b(I()==="factura"?"factura":"recibo")},[t]);const h=S.useMemo(()=>({...r,paperSize:n==="factura"?"letter":"80mm"}),[r,n]);S.useEffect(()=>{let u=!0;return a&&(r.design??"modern")==="classic"&&r.showBarcode?rt(`${r.receiptPrefix||""}${a.saleNumber}`).then(C=>{u&&d(C)}):d(""),()=>{u=!1}},[a,r]);const T=S.useMemo(()=>a?O(a,h,m):"",[a,h,m]),[N,R]=S.useState(!1),c=S.useRef(null),l=Y();if(S.useEffect(()=>{if(!p&&t&&a&&T&&c.current!==a.saleNumber){if(l==="print"){c.current=a.saleNumber,M(T,a,r),e();return}if(l==="download"){c.current=a.saleNumber,q(a,r),e();return}if(r.autoPrint){c.current=a.saleNumber;const u=setTimeout(()=>M(T,a,r),150);return()=>clearTimeout(u)}}},[t,a,T,p]),S.useEffect(()=>{t||(c.current=null)},[t]),!a||!p&&l!=="ask")return null;const x=u=>{N&&!p&&G(u),u==="print"?M(T,a,h,n):q(a,h),(N||p)&&e()},$=(u,C)=>f.jsx("button",{type:"button",onClick:()=>b(u),className:`flex-1 py-2 px-3 rounded-md text-sm font-medium border transition-colors ${n===u?"border-primary bg-primary/10 text-primary ring-1 ring-primary":"border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700"}`,children:C});return f.jsx(J,{isOpen:t,onClose:e,title:"Factura / Recibo",size:n==="factura"?"3xl":"md",children:f.jsxs("div",{className:"space-y-4",children:[f.jsxs("div",{children:[f.jsx("p",{className:"text-xs text-neutral-500 dark:text-neutral-400 mb-1",children:o("posx.receipt.format")}),f.jsxs("div",{className:"flex gap-2",children:[$("recibo",o("posx.receipt.format_receipt")),$("factura",o("posx.receipt.format_invoice"))]})]}),f.jsx("div",{className:"bg-neutral-100 dark:bg-neutral-900 rounded-md p-3 max-h-[65vh] overflow-auto",children:f.jsx("div",{className:"pazzi-paper bg-white shadow-sm mx-auto w-max max-w-full",dangerouslySetInnerHTML:{__html:T}})}),!p&&f.jsxs("label",{className:"flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300 select-none",children:[f.jsx("input",{type:"checkbox",checked:N,onChange:u=>R(u.target.checked),className:"h-4 w-4"}),"No volver a preguntar (usar siempre la acción que elija ahora)"]}),f.jsxs("div",{className:"flex justify-end gap-2",children:[f.jsx("button",{onClick:e,className:K,children:"Cerrar"}),f.jsx("button",{onClick:()=>x("download"),className:X,children:"📄 Descargar PDF"}),f.jsx("button",{onClick:()=>x("print"),className:Z,children:"🖨️ Imprimir"})]})]})})},ut=Object.freeze(Object.defineProperty({__proto__:null,ReceiptModal:dt,buildReceiptHTML:O,generatePDF:q,getReceiptAction:Y,printReceipt:E,setReceiptAction:G},Symbol.toStringTag,{value:"Module"}));export{dt as R,O as a,rt as b,q as c,ut as d,Y as g,G as s};
