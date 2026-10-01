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

    // Logo (data URL ya resuelto: data URI directo o URL http descargada por el llamador).
    let logoBottom = y;
    if (logoDataUrl) {
        try {
            doc.addImage(logoDataUrl, dataUrlFormat(logoDataUrl), M, y, 120, 60, undefined, 'FAST');
            logoBottom = y + 66;
        } catch { /* logo inválido: se ignora */ }
    }

    // Nombre del negocio + líneas a la derecha.
    doc.setFont('helvetica', 'bold').setFontSize(14).setTextColor(17, 17, 17);
    doc.text(biz.businessName || '', pageW - M, y + 6, { align: 'right' });
    let by = y + 22;
    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(85, 85, 85);
    [biz.address, biz.phone, biz.email, biz.rnc ? `RNC/Reg: ${biz.rnc}` : '']
        .filter(Boolean)
        .forEach(l => { doc.text(String(l), pageW - M, by, { align: 'right' }); by += 12; });
    y = Math.max(logoBottom, by) + 18;

    // Título.
    doc.setFont('helvetica', 'bold').setFontSize(24).setTextColor(accent[0], accent[1], accent[2]);
    doc.text('FACTURA', M, y + 10);
    y += 34;

    // Cliente (izq) + meta (der).
    const blockTop = y;
    doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(17, 17, 17);
    doc.text('Datos del Cliente', M, y);
    doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(51, 51, 51);
    if (inv.clientName) doc.text(String(inv.clientName), M, y + 16);
    if (inv.clientEmail) { doc.setFontSize(9).setTextColor(102, 102, 102); doc.text(String(inv.clientEmail), M, y + 30); }

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
    totRow('Subtotal:', money(inv.subtotal));
    if ((inv.tax || 0) > 0) totRow('IVU:', money(inv.tax));
    if (amountPaid > 0 && !paid) totRow('Pagado:', money(amountPaid));
    totRow('Total:', money(inv.total), true, accent);
    if (amountPaid > 0 && !paid) totRow('Saldo:', money((inv.total || 0) - amountPaid), true, [192, 57, 43]);

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
