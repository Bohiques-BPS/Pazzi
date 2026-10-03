import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Invoice } from '../services/invoices';
import { loadImageAsDataUrl, dataUrlFormat } from './imageData';

/** Datos del negocio para el encabezado (de settings.receiptConfig). */
export interface InvoicePdfBusiness {
    businessName?: string;
    rnc?: string;
    address?: string;
    phone?: string;
    email?: string;
    logoUrl?: string;
    /** Qué mostrar en la factura (de Config. Factura). Por defecto todo visible. */
    design?: {
        showLogo?: boolean;
        showBusiness?: boolean;   // nombre del negocio
        showAddress?: boolean;
        showPhone?: boolean;
        showEmail?: boolean;
        showRnc?: boolean;
        showClient?: boolean;
    };
}

const money = (n: number) => `$${(Number(n) || 0).toFixed(2)}`;

/**
 * Construye el PDF de una factura 100% en el navegador (jsPDF). No depende del backend, por lo que
 * sirve de respaldo cuando el PDF del servidor falla (p. ej. 502 por límite de RAM en Render).
 */
function buildInvoiceDoc(inv: Invoice, biz: InvoicePdfBusiness, logoDataUrl: string | null): jsPDF {
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const M = 50;
    const accent: [number, number, number] = [126, 87, 194]; // #7E57C2
    const header: [number, number, number] = [76, 175, 80];   // #4CAF50
    let y = M;

    const d = biz.design || {};
    // Logo (data URL ya resuelto). Se ajusta a una caja máxima SIN deformar (conserva proporción).
    let logoBottom = y;
    if (logoDataUrl && d.showLogo !== false) {
        try {
            const maxW = 120, maxH = 60;
            const props = doc.getImageProperties(logoDataUrl);
            const ratio = (props.width && props.height) ? props.width / props.height : maxW / maxH;
            let w = maxW, h = maxW / ratio;
            if (h > maxH) { h = maxH; w = maxH * ratio; }
            doc.addImage(logoDataUrl, dataUrlFormat(logoDataUrl), M, y, w, h, undefined, 'FAST');
            logoBottom = y + h + 6;
        } catch { /* logo inválido: se ignora */ }
    }

    // Nombre del negocio + líneas a la derecha (cada dato se puede ocultar desde Config. Factura).
    let by = y + 6;
    if (d.showBusiness !== false && biz.businessName) {
        doc.setFont('helvetica', 'bold').setFontSize(14).setTextColor(17, 17, 17);
        doc.text(biz.businessName, pageW - M, by, { align: 'right' });
        by += 16;
    }
    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(85, 85, 85);
    [
        d.showAddress !== false ? biz.address : '',
        d.showPhone !== false ? biz.phone : '',
        d.showEmail !== false ? biz.email : '',
        (d.showRnc !== false && biz.rnc) ? `RNC/Reg: ${biz.rnc}` : '',
    ].filter(Boolean).forEach(l => { doc.text(String(l), pageW - M, by, { align: 'right' }); by += 12; });
    y = Math.max(logoBottom, by) + 18;

    // Título.
    doc.setFont('helvetica', 'bold').setFontSize(24).setTextColor(accent[0], accent[1], accent[2]);
    doc.text('FACTURA', M, y + 10);
    y += 34;

    // Cliente (izq) + meta (der). El bloque de cliente se puede ocultar desde Config. Factura.
    const blockTop = y;
    if (d.showClient !== false) {
        doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(17, 17, 17);
        doc.text('Datos del Cliente', M, y);
        doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(51, 51, 51);
        if (inv.clientName) doc.text(String(inv.clientName), M, y + 16);
        if (inv.clientEmail) { doc.setFontSize(9).setTextColor(102, 102, 102); doc.text(String(inv.clientEmail), M, y + 30); }
    }

    const paid = inv.status === 'paid';
    const metaX = pageW / 2 + 20;
    let my = blockTop;
    const metaRow = (l: string, v: string) => {
        doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(17, 17, 17);
        doc.text(l, metaX, my);
        doc.setFont('helvetica', 'normal').setTextColor(51, 51, 51);
        doc.text(String(v), pageW - M, my, { align: 'right' });
        my += 15;
    };
    metaRow('Número', inv.number ? `#${inv.number}` : '—');
    metaRow('Fecha', new Date(inv.createdAt || Date.now()).toLocaleDateString('es-PR'));
    if (inv.dueDate) metaRow('Vence', new Date(`${String(inv.dueDate).slice(0, 10)}T12:00:00`).toLocaleDateString('es-PR'));
    if (inv.type) metaRow('Tipo', String(inv.type));
    metaRow('Estado', paid ? 'PAGADA' : 'PENDIENTE');

    y = Math.max(blockTop + 44, my) + 12;

    // Tabla de artículos.
    const items = Array.isArray(inv.items) ? inv.items : [];
    autoTable(doc, {
        startY: y,
        head: [['Producto', 'Cant', 'Precio Unit.', 'Total']],
        body: items.map((it: any) => {
            const q = Number(it.quantity) || 0, u = Number(it.unitPrice) || 0;
            return [String(it.name || ''), String(q), money(u), money(q * u)];
        }),
        styles: { fontSize: 9, cellPadding: 5 },
        headStyles: { fillColor: header, textColor: 255, fontStyle: 'bold' },
        columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
        margin: { left: M, right: M },
    });
    y = ((doc as any).lastAutoTable?.finalY || y) + 16;

    // Totales.
    const amountPaid = Number(inv.amountPaid || 0);
    const labelX = pageW - M - 190, valX = pageW - M;
    const totRow = (l: string, v: string, bold = false, color: [number, number, number] = [51, 51, 51]) => {
        doc.setFont('helvetica', bold ? 'bold' : 'normal').setFontSize(bold ? 12 : 10).setTextColor(color[0], color[1], color[2]);
        doc.text(l, labelX, y);
        doc.text(v, valX, y, { align: 'right' });
        y += bold ? 20 : 15;
    };
    // Pagado efectivo: amountPaid, o la suma de abonos, o el total si está marcada como pagada.
    const paysArr = Array.isArray(inv.payments) ? inv.payments : [];
    const paysSum = paysArr.reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0);
    const paidEff = amountPaid > 0 ? amountPaid : (paid ? (inv.total || 0) : paysSum);
    const balance = Math.max(0, (inv.total || 0) - paidEff);

    totRow('Subtotal:', money(inv.subtotal));
    if ((inv.tax || 0) > 0) totRow('IVU:', money(inv.tax));
    totRow('Total:', money(inv.total), true, accent);
    // Siempre mostramos Pagado y Saldo cuando hubo algún pago (o está pagada).
    if (paidEff > 0 || paid) {
        totRow('Pagado:', money(paidEff), false, [39, 110, 60]);
        totRow('Saldo:', money(balance), true, balance > 0 ? [192, 57, 43] : [39, 110, 60]);
    }

    // Detalle de pago(s): cómo se pagó, fecha, referencia y abonos. Solo si hubo pago.
    const fmtDate = (v: any) => v ? new Date(v).toLocaleDateString('es-PR') : '';
    const payRows = paysArr.length > 0
        ? paysArr.map((p: any) => ({ date: fmtDate(p.paidAt), method: p.method || inv.paidMethod || '—', reference: p.reference || '', amount: Number(p.amount) || 0 }))
        : (paid || paidEff > 0 ? [{ date: fmtDate(inv.paidAt || inv.createdAt), method: inv.paidMethod || '—', reference: inv.paidReference || '', amount: paidEff }] : []);
    if (payRows.length > 0) {
        y += 16;
        doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(17, 17, 17);
        doc.text('Pago', M, y);
        y += 4;
        autoTable(doc, {
            startY: y,
            head: [['Fecha', 'Método', 'Referencia', 'Monto']],
            body: payRows.map(p => [p.date || '—', String(p.method), String(p.reference), money(p.amount)]),
            styles: { fontSize: 9, cellPadding: 4 },
            headStyles: { fillColor: [120, 120, 120], textColor: 255, fontStyle: 'bold' },
            columnStyles: { 3: { halign: 'right' } },
            margin: { left: M, right: M },
        });
        y = ((doc as any).lastAutoTable?.finalY || y) + 6;
    }

    // Descripción / nota de la factura (texto libre que escribe el negocio).
    if (inv.description && String(inv.description).trim()) {
        y += 12;
        doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(17, 17, 17);
        doc.text('Nota:', M, y);
        y += 14;
        doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(51, 51, 51);
        const lines = doc.splitTextToSize(String(inv.description).trim(), pageW - 2 * M);
        doc.text(lines, M, y);
    }

    // Pie.
    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(153, 153, 153);
    doc.text('¡Gracias por su preferencia!', pageW / 2, pageH - 50, { align: 'center' });

    return doc;
}

/** URL blob para previsualizar en un <iframe>. Recuerda revocarla con URL.revokeObjectURL. */
export async function invoicePdfBlobUrl(inv: Invoice, biz: InvoicePdfBusiness): Promise<string> {
    const logo = await loadImageAsDataUrl(biz.logoUrl);
    return buildInvoiceDoc(inv, biz, logo).output('bloburl') as unknown as string;
}

/** Abre el PDF en una pestaña nueva. */
export async function openInvoicePdf(inv: Invoice, biz: InvoicePdfBusiness) {
    const logo = await loadImageAsDataUrl(biz.logoUrl);
    window.open(buildInvoiceDoc(inv, biz, logo).output('bloburl') as unknown as string, '_blank', 'noopener');
}

/** Descarga el PDF al disco. */
export async function downloadInvoicePdf(inv: Invoice, biz: InvoicePdfBusiness) {
    const logo = await loadImageAsDataUrl(biz.logoUrl);
    buildInvoiceDoc(inv, biz, logo).save(`factura-${inv.number ?? (inv.id || '').slice(0, 6)}.pdf`);
}
