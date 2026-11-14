import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { type Delivery, deliveryAddress } from '../services/deliveries';

/**
 * Conduce de entrega: hoja que lleva el repartidor y firma el cliente al recibir (la firma es en papel).
 * Lista lo PENDIENTE de entregar, con una columna en blanco para anotar lo que se entrega.
 */
export function printDeliveryNote(d: Delivery, biz: { businessName?: string; address?: string; phone?: string }) {
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const M = 40;
    const W = doc.internal.pageSize.getWidth();
    let y = M;

    doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
    doc.text('Conduce de entrega', M, y);
    doc.setFontSize(11);
    doc.text(`Entrega #${d.number ?? ''}${d.saleNumber ? `  ·  Factura #${d.saleNumber}` : ''}`, W - M, y, { align: 'right' });
    y += 16;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    const bizLine = [biz.businessName, biz.address, biz.phone].filter(Boolean).join('  ·  ');
    if (bizLine) { doc.text(bizLine, M, y); y += 14; }
    y += 6;

    const sched = d.scheduledDate
        ? new Date(`${d.scheduledDate}T12:00:00Z`).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
        : 'Sin programar';
    const info: [string, string][] = [
        ['Cliente', d.clientName],
        ['Recibe / contacto', [d.contactName, d.contactPhone].filter(Boolean).join(' · ') || '—'],
        ['Dirección', deliveryAddress(d) || '—'],
        ['Fecha programada', `${sched}${d.timeWindow ? ` · ${d.timeWindow}` : ''}`],
        ['Repartidor', d.assignedName || '—'],
    ];
    if (d.notes) info.push(['Notas', d.notes]);
    doc.setFontSize(10);
    for (const [k, v] of info) {
        doc.setFont('helvetica', 'bold'); doc.text(`${k}:`, M, y);
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(v, W - M * 2 - 110);
        doc.text(lines, M + 110, y);
        y += 14 * Math.max(1, lines.length);
    }
    y += 6;

    const rows = d.items.filter(i => i.pending > 1e-9).map(i => [i.name, fmt(i.pending), '']);
    autoTable(doc, {
        startY: y,
        head: [['Artículo', 'Cantidad a entregar', 'Cantidad entregada']],
        body: rows.length ? rows : [['(Nada pendiente)', '', '']],
        styles: { fontSize: 10, cellPadding: 6 },
        headStyles: { fillColor: [13, 148, 136] },
        columnStyles: { 1: { halign: 'right', cellWidth: 110 }, 2: { halign: 'right', cellWidth: 120 } },
        margin: { left: M, right: M },
    });
    y = (doc as any).lastAutoTable.finalY + 50;

    // Firma del cliente al recibir.
    const col = (W - M * 2 - 30) / 3;
    const sign = (x: number, label: string) => { doc.line(x, y, x + col, y); doc.setFontSize(9); doc.text(label, x, y + 12); };
    sign(M, 'Recibido por (nombre)');
    sign(M + col + 15, 'Firma');
    sign(M + (col + 15) * 2, 'Fecha y hora');
    y += 40;
    doc.setFontSize(8); doc.setTextColor(120);
    doc.text('Al firmar, el cliente confirma que recibió la mercancía indicada en buen estado.', M, y);

    window.open(doc.output('bloburl'), '_blank');
}

const fmt = (n: number) => String(Math.round(n * 100) / 100);

/** Hoja de ruta: lista de entregas (p. ej. las de hoy de un repartidor) con dirección, teléfono y artículos. */
export function printRouteSheet(rows: Delivery[], title: string, businessName?: string) {
    const doc = new jsPDF({ unit: 'pt', format: 'letter', orientation: 'landscape' });
    const M = 32;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(15);
    doc.text(title, M, M);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    doc.text([businessName, `${rows.length} entrega(s) · impreso ${new Date().toLocaleString('es')}`].filter(Boolean).join('  ·  '), M, M + 14);
    autoTable(doc, {
        startY: M + 26,
        head: [['#', 'Factura', 'Fecha', 'Cliente / recibe', 'Teléfono', 'Dirección', 'Pendiente de entregar', 'Firma']],
        body: rows.map(d => [
            String(d.number ?? ''),
            d.saleNumber ? `#${d.saleNumber}` : '',
            d.scheduledDate ? `${d.scheduledDate}${d.timeWindow ? `\n${d.timeWindow}` : ''}` : 'Sin fecha',
            `${d.clientName}${d.contactName && d.contactName !== d.clientName ? `\n${d.contactName}` : ''}`,
            d.contactPhone || '',
            `${deliveryAddress(d)}${d.notes ? `\n${d.notes}` : ''}`,
            d.items.filter(i => i.pending > 1e-9).map(i => `${i.name} ×${fmt(i.pending)}`).join('\n'),
            '',
        ]),
        styles: { fontSize: 8, cellPadding: 4, valign: 'top' },
        headStyles: { fillColor: [13, 148, 136] },
        columnStyles: { 0: { cellWidth: 26 }, 1: { cellWidth: 44 }, 2: { cellWidth: 60 }, 4: { cellWidth: 70 }, 7: { cellWidth: 80 } },
        margin: { left: M, right: M },
    });
    window.open(doc.output('bloburl'), '_blank');
}
