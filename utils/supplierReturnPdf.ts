import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SR_REASON_LABEL, SR_STATUS_LABEL, type SupplierReturn } from '../services/supplierReturns';

/** Hoja de devolución a suplidor (PDF): datos del negocio y del suplidor, artículos, total y firmas. */
export function printSupplierReturn(r: SupplierReturn, biz: { businessName?: string; address?: string; phone?: string }, supplier?: { contactName?: string | null; phone?: string | null; email?: string | null } | null) {
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const M = 40;
    const W = doc.internal.pageSize.getWidth();
    const money = (n: number) => `$${(Number(n) || 0).toFixed(2)}`;
    let y = M;

    doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
    doc.text('Hoja de devolución a suplidor', M, y);
    doc.setFontSize(11);
    doc.text(`#${r.number ?? ''}`, W - M, y, { align: 'right' });
    y += 16;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    const bizLine = [biz.businessName, biz.address, biz.phone].filter(Boolean).join('  ·  ');
    if (bizLine) { doc.text(bizLine, M, y); y += 14; }
    doc.text(`Fecha: ${new Date(r.createdAt).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}   ·   Estado: ${SR_STATUS_LABEL[r.status]}`, M, y);
    y += 20;

    const info: [string, string][] = [
        ['Suplidor', r.supplierName],
        ...(supplier?.contactName || supplier?.phone || supplier?.email ? [['Contacto', [supplier?.contactName, supplier?.phone, supplier?.email].filter(Boolean).join(' · ')] as [string, string]] : []),
        ...(r.supplierInvoiceNumber ? [['Factura del suplidor', r.supplierInvoiceNumber] as [string, string]] : []),
        ...(r.authorizationNumber ? [['Nº de autorización', r.authorizationNumber] as [string, string]] : []),
        ...(r.creditNoteNumber ? [['Nota de crédito', r.creditNoteNumber] as [string, string]] : []),
    ];
    doc.setFontSize(10);
    for (const [k, v] of info) {
        doc.setFont('helvetica', 'bold'); doc.text(`${k}:`, M, y);
        doc.setFont('helvetica', 'normal'); doc.text(doc.splitTextToSize(v, W - M * 2 - 130), M + 130, y);
        y += 14;
    }
    y += 6;

    autoTable(doc, {
        startY: y,
        head: [['Artículo', 'SKU', 'Motivo', 'Cant.', 'Costo u.', 'Total']],
        body: r.items.map(i => [
            `${i.name}${i.notes ? `\n${i.notes}` : ''}${i.customerReturnRef ? `\nDevolución cliente: ${i.customerReturnRef}` : ''}`,
            i.sku || '', SR_REASON_LABEL[i.reason] || i.reason, String(i.quantity), money(i.unitCost), money(i.quantity * i.unitCost),
        ]),
        foot: [['', '', '', '', 'Total', money(r.totalCost)]],
        styles: { fontSize: 9, cellPadding: 5, valign: 'top' },
        headStyles: { fillColor: [13, 148, 136] },
        footStyles: { fillColor: [240, 240, 240], textColor: 20, fontStyle: 'bold' },
        columnStyles: { 1: { cellWidth: 70 }, 2: { cellWidth: 80 }, 3: { halign: 'right', cellWidth: 40 }, 4: { halign: 'right', cellWidth: 65 }, 5: { halign: 'right', cellWidth: 70 } },
        margin: { left: M, right: M },
    });
    y = (doc as any).lastAutoTable.finalY + 16;
    if (r.creditAmount != null) {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
        doc.text(`Crédito recibido: ${money(r.creditAmount)}`, W - M, y, { align: 'right' });
        y += 16;
    }
    if (r.notes) {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
        const lines = doc.splitTextToSize(`Notas: ${r.notes}`, W - M * 2);
        doc.text(lines, M, y); y += 12 * lines.length + 6;
    }
    y = Math.max(y + 40, y);
    const col = (W - M * 2 - 30) / 2;
    doc.setFontSize(9);
    doc.line(M, y, M + col, y); doc.text('Entregado por (negocio)', M, y + 12);
    doc.line(M + col + 30, y, W - M, y); doc.text('Recibido por (suplidor) · nombre, firma y fecha', M + col + 30, y + 12);

    window.open(doc.output('bloburl'), '_blank');
}
