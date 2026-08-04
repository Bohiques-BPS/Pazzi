import React, { useMemo, useEffect } from 'react';
import { Modal } from '../Modal';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import type { ReceiptConfig } from '../../types';

export interface ReceiptSale {
    saleNumber: string;
    date: string; // ISO
    items: { name: string; quantity: number; unitPrice: number }[];
    subtotal: number;
    tax: number;
    discount: number;
    total: number;
    payments: { method: string; amount: number; reference?: string }[];
    changeDue?: number;
    clientName?: string;
    cashierName?: string;
}

interface ReceiptModalProps {
    isOpen: boolean;
    onClose: () => void;
    sale: ReceiptSale | null;
    config: ReceiptConfig;
}

const esc = (s: any) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] || c));
const money = (n: number) => `$${(Number(n) || 0).toFixed(2)}`;

/** Construye el HTML autocontenido de la factura (para vista previa e impresión). */
export function buildReceiptHTML(sale: ReceiptSale, cfg: ReceiptConfig): string {
    const is80 = cfg.paperSize === '80mm';
    const widthCss = is80 ? '72mm' : '210mm';
    const pad = is80 ? '4mm' : '14mm';
    const fs = is80 ? '11px' : '13px';

    const line = (label: string, value: string, bold = false) =>
        `<div style="display:flex;justify-content:space-between;${bold ? 'font-weight:700;' : ''}"><span>${esc(label)}</span><span>${esc(value)}</span></div>`;

    const header = `
        <div style="text-align:center;margin-bottom:8px;">
            ${cfg.showLogo && cfg.logoUrl ? `<img src="${esc(cfg.logoUrl)}" style="max-width:${is80 ? '120px' : '160px'};max-height:80px;object-fit:contain;margin:0 auto 6px;display:block;"/>` : ''}
            ${cfg.businessName ? `<div style="font-size:${is80 ? '14px' : '18px'};font-weight:700;">${esc(cfg.businessName)}</div>` : ''}
            ${cfg.showRnc && cfg.rnc ? `<div>RNC/Reg: ${esc(cfg.rnc)}</div>` : ''}
            ${cfg.showAddress && cfg.address ? `<div>${esc(cfg.address)}</div>` : ''}
            ${cfg.showPhone && cfg.phone ? `<div>Tel: ${esc(cfg.phone)}</div>` : ''}
            ${cfg.showEmail && cfg.email ? `<div>${esc(cfg.email)}</div>` : ''}
        </div>`;

    const meta = `
        <div style="border-top:1px dashed #999;border-bottom:1px dashed #999;padding:6px 0;margin-bottom:6px;">
            ${line('Factura #', sale.saleNumber)}
            ${line('Fecha', new Date(sale.date).toLocaleString())}
            ${cfg.showClient && sale.clientName ? line('Cliente', sale.clientName) : ''}
            ${cfg.showCashier && sale.cashierName ? line('Cajero', sale.cashierName) : ''}
        </div>`;

    const itemsRows = sale.items.map(it => `
        <tr>
            <td style="padding:2px 0;">${esc(it.name)}<br/><span style="color:#666;">${it.quantity} x ${money(it.unitPrice)}</span></td>
            <td style="padding:2px 0;text-align:right;vertical-align:top;">${money(it.quantity * it.unitPrice)}</td>
        </tr>`).join('');

    const totals = `
        <div style="border-top:1px dashed #999;padding-top:6px;margin-top:4px;">
            ${line('Subtotal', money(sale.subtotal))}
            ${sale.discount > 0 ? line('Descuento', `-${money(sale.discount)}`) : ''}
            ${cfg.showTaxBreakdown ? line('IVU', money(sale.tax)) : ''}
            <div style="font-size:${is80 ? '14px' : '16px'};margin-top:4px;">${line('TOTAL', money(sale.total), true)}</div>
        </div>`;

    const pays = `
        <div style="border-top:1px dashed #999;padding-top:6px;margin-top:6px;">
            ${sale.payments.map(p => `
                ${line(p.method, money(p.amount))}
                ${p.reference ? `<div style="color:#555;font-size:${is80 ? '10px' : '11px'};margin-left:8px;">Ref: ${esc(p.reference)}</div>` : ''}
            `).join('')}
            ${sale.changeDue && sale.changeDue > 0 ? line('Cambio', money(sale.changeDue), true) : ''}
        </div>`;

    const footer = cfg.showFooter && cfg.footerNote
        ? `<div style="text-align:center;margin-top:10px;white-space:pre-wrap;color:#333;">${esc(cfg.footerNote)}</div>` : '';
    const headerNote = cfg.headerNote ? `<div style="text-align:center;margin-bottom:6px;white-space:pre-wrap;">${esc(cfg.headerNote)}</div>` : '';

    return `
        <div style="width:${widthCss};margin:0 auto;padding:${pad};font-family:'Courier New',monospace;font-size:${fs};color:#111;box-sizing:border-box;">
            ${header}
            ${headerNote}
            ${meta}
            <table style="width:100%;border-collapse:collapse;">${itemsRows}</table>
            ${totals}
            ${pays}
            ${footer}
        </div>`;
}

export async function generatePDF(sale: ReceiptSale, cfg: ReceiptConfig) {
    const { jsPDF } = await import('jspdf');
    const isLetter = cfg.paperSize === 'letter';
    const doc = new jsPDF({ unit: 'mm', format: isLetter ? 'letter' : [80, 200] });
    const W = doc.internal.pageSize.getWidth();
    const M = isLetter ? 14 : 4;
    let y = 10;
    const center = (txt: string, size: number, bold = false) => {
        doc.setFontSize(size); doc.setFont('courier', bold ? 'bold' : 'normal');
        doc.text(txt, W / 2, y, { align: 'center' }); y += size * 0.5;
    };
    const row = (l: string, r: string, bold = false) => {
        doc.setFontSize(9); doc.setFont('courier', bold ? 'bold' : 'normal');
        doc.text(l, M, y); doc.text(r, W - M, y, { align: 'right' }); y += 4.5;
    };
    if (cfg.showLogo && cfg.logoUrl?.startsWith('data:image')) {
        try { doc.addImage(cfg.logoUrl, 'PNG', W / 2 - 15, y, 30, 15); y += 18; } catch { /* ignore */ }
    }
    if (cfg.businessName) center(cfg.businessName, 13, true);
    if (cfg.showRnc && cfg.rnc) center(`RNC/Reg: ${cfg.rnc}`, 8);
    if (cfg.showAddress && cfg.address) center(cfg.address, 8);
    if (cfg.showPhone && cfg.phone) center(`Tel: ${cfg.phone}`, 8);
    if (cfg.showEmail && cfg.email) center(cfg.email, 8);
    y += 2;
    row(`Factura #${sale.saleNumber}`, '');
    row('Fecha', new Date(sale.date).toLocaleString());
    if (cfg.showClient && sale.clientName) row('Cliente', sale.clientName);
    if (cfg.showCashier && sale.cashierName) row('Cajero', sale.cashierName);
    y += 1; doc.line(M, y, W - M, y); y += 4;
    sale.items.forEach(it => {
        doc.setFontSize(9); doc.setFont('courier', 'normal');
        doc.text(it.name.slice(0, isLetter ? 60 : 22), M, y);
        doc.text(money(it.quantity * it.unitPrice), W - M, y, { align: 'right' }); y += 4;
        doc.setTextColor(120); doc.text(`  ${it.quantity} x ${money(it.unitPrice)}`, M, y); doc.setTextColor(0); y += 4.5;
    });
    doc.line(M, y, W - M, y); y += 4;
    row('Subtotal', money(sale.subtotal));
    if (sale.discount > 0) row('Descuento', `-${money(sale.discount)}`);
    if (cfg.showTaxBreakdown) row('IVU', money(sale.tax));
    row('TOTAL', money(sale.total), true);
    y += 1; doc.line(M, y, W - M, y); y += 4;
    sale.payments.forEach(p => row(p.method + (p.reference ? ` (${p.reference})` : ''), money(p.amount)));
    if (sale.changeDue && sale.changeDue > 0) row('Cambio', money(sale.changeDue), true);
    if (cfg.showFooter && cfg.footerNote) { y += 4; center(cfg.footerNote, 8); }
    doc.save(`factura-${sale.saleNumber}.pdf`);
}

function printReceipt(html: string) {
    const w = window.open('', '_blank', 'width=380,height=600');
    if (!w) return;
    w.document.write(`<html><head><title>Factura</title></head><body onload="window.print();window.close();">${html}</body></html>`);
    w.document.close();
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ isOpen, onClose, sale, config }) => {
    const html = useMemo(() => (sale ? buildReceiptHTML(sale, config) : ''), [sale, config]);

    // Impresión automática al abrir, si está configurada.
    useEffect(() => {
        if (isOpen && sale && config.autoPrint && html) {
            const timer = setTimeout(() => printReceipt(html), 150);
            return () => clearTimeout(timer);
        }
    }, [isOpen, sale, config.autoPrint, html]);

    if (!sale) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Factura / Recibo" size="md">
            <div className="space-y-4">
                <div className="flex justify-center bg-neutral-100 dark:bg-neutral-900 rounded-md p-3 max-h-[55vh] overflow-y-auto">
                    <div className="bg-white shadow-sm" dangerouslySetInnerHTML={{ __html: html }} />
                </div>
                <div className="flex justify-end gap-2">
                    <button onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>Cerrar</button>
                    <button onClick={() => generatePDF(sale, config)} className={BUTTON_SECONDARY_SM_CLASSES}>📄 Descargar PDF</button>
                    <button onClick={() => printReceipt(html)} className={BUTTON_PRIMARY_SM_CLASSES}>🖨️ Imprimir</button>
                </div>
            </div>
        </Modal>
    );
};
