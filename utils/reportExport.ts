import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export interface ExportColumn {
  header: string;
  /** Clave del campo en cada fila. */
  key: string;
}

const slug = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const formatCell = (v: any): string | number => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return v;
  // Fechas ISO → local
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) {
    const d = new Date(v);
    if (!isNaN(d.getTime())) return d.toLocaleString();
  }
  if (v instanceof Date) return v.toLocaleString();
  return String(v);
};

/** Exporta filas a PDF con tabla (jspdf + autotable). */
export function exportToPDF(title: string, columns: ExportColumn[], rows: Record<string, any>[]) {
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text(title, 14, 16);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Generado: ${new Date().toLocaleString()}`, 14, 22);
  autoTable(doc, {
    startY: 26,
    head: [columns.map(c => c.header)],
    body: rows.map(r => columns.map(c => formatCell(r[c.key]))),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [13, 148, 136], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });
  doc.save(`${slug(title)}.pdf`);
}

/** Exporta filas a Excel (.xlsx). */
export function exportToExcel(sheetName: string, columns: ExportColumn[], rows: Record<string, any>[]) {
  const data = rows.map(r => {
    const o: Record<string, any> = {};
    for (const c of columns) o[c.header] = formatCell(r[c.key]);
    return o;
  });
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31) || 'Reporte');
  XLSX.writeFile(wb, `${slug(sheetName)}.xlsx`);
}
