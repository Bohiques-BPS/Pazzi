import React, { useMemo, useEffect, useState, useRef } from 'react';
import { Modal } from '../Modal';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import type { ReceiptConfig } from '../../types';
import { barcodeToSvg } from '../../utils/barcode';
import { isReceiptPrinterEnabled, printReceiptViaQz, getPrintFormat } from '../../services/receiptPrinter';
import { isWebUsbEnabled, printReceiptViaWebUsb } from '../../services/webusbPrinter';

export interface ReceiptSale {
    saleNumber: string;
    date: string; // ISO
    items: { name: string; quantity: number; unitPrice: number; note?: string }[];
    subtotal: number;
    tax: number;
    /** Desglose de IVU (PR), opcional: si viene, el recibo muestra Estatal/Municipal/Reducido. */
    taxState?: number;
    taxMunicipal?: number;
    taxReduced?: number;
    discount: number;
    total: number;
    payments: { method: string; amount: number; reference?: string }[];
    changeDue?: number;
    clientName?: string;
    cashierName?: string;
    /** true cuando es una reimpresión (muestra la etiqueta DUPLICADO/REPRINT/COPY en el diseño clásico). */
    isReprint?: boolean;
}

interface ReceiptModalProps {
    isOpen: boolean;
    onClose: () => void;
    sale: ReceiptSale | null;
    config: ReceiptConfig;
}

const esc = (s: any) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] || c));
const money = (n: number) => `$${(Number(n) || 0).toFixed(2)}`;

/** Construye el HTML autocontenido de la factura (para vista previa e impresión).
 *  `barcodeSvg` es opcional: el SVG del código de barras (Code128), generado async por el llamador. */
export function buildReceiptHTML(sale: ReceiptSale, cfg: ReceiptConfig, barcodeSvg?: string): string {
    const is80 = cfg.paperSize === '80mm';
    const widthCss = is80 ? '72mm' : '210mm';
    const pad = is80 ? '4mm' : '14mm';
    const fs = is80 ? '11px' : '13px';

    // ── Diseño CLÁSICO (estilo térmico ferretería) ──────────────────────────────
    if ((cfg.design ?? 'modern') === 'classic') {
        const num = `${cfg.receiptPrefix || ''}${sale.saleNumber}`;
        const d = new Date(sale.date);
        const dash = `<div style="border-top:1px solid #000;margin:4px 0;"></div>`;
        const row = (l: string, r: string, bold = false) =>
            `<div style="display:flex;justify-content:space-between;${bold ? 'font-weight:700;' : ''}"><span>${esc(l)}</span><span>${esc(r)}</span></div>`;
        const itemCount = sale.items.reduce((s, it) => s + it.quantity, 0);
        const taxRows = (sale.taxState || sale.taxMunicipal || sale.taxReduced)
            ? `${row('+ Estatal', money(sale.taxState || 0))}${row('+ Reducido', money(sale.taxReduced || 0))}${row('+ Municipal', money(sale.taxMunicipal || 0))}`
            : (cfg.showTaxBreakdown ? row('+ IVU', money(sale.tax)) : '');
        const reprint = sale.isReprint && cfg.reprintLabel ? `<div style="text-align:center;font-weight:700;">${esc(cfg.reprintLabel)}</div>` : '';
        const legal = [cfg.returnPolicyText, cfg.thankYouText, cfg.paymentTermsText]
            .filter(Boolean).map(txt => `<div style="text-align:center;margin-top:6px;">${esc(txt)}</div>`).join('');
        const barcode = cfg.showBarcode
            ? `<div style="text-align:center;margin-top:10px;">${barcodeSvg
                ? `<div style="height:50px;">${barcodeSvg}</div>`
                : ''}<div style="letter-spacing:2px;">${esc(num)}</div></div>`
            : '';
        return `
            <div style="width:${widthCss};margin:0 auto;padding:${pad};font-family:'Courier New',monospace;font-size:${fs};color:#000;box-sizing:border-box;">
                <div style="text-align:center;">
                    ${cfg.showLogo && cfg.logoUrl ? `<img src="${esc(cfg.logoUrl)}" style="max-width:${is80 ? '120px' : '160px'};max-height:70px;object-fit:contain;margin:0 auto 4px;display:block;"/>` : ''}
                    ${cfg.businessName ? `<div style="font-weight:700;font-size:${is80 ? '15px' : '20px'};letter-spacing:1px;">${esc(cfg.businessName)}</div>` : ''}
                    ${cfg.showAddress && cfg.address ? `<div>${esc(cfg.address)}</div>` : ''}
                    ${cfg.showPhone && cfg.phone ? `<div>Tel: ${esc(cfg.phone)}</div>` : ''}
                    ${cfg.showRnc && cfg.rnc ? `<div>${esc(cfg.rnc)}</div>` : ''}
                </div>
                <div style="display:flex;justify-content:space-between;margin-top:6px;"><span>${esc(d.toLocaleDateString())}</span><span>${esc(d.toLocaleTimeString())}</span></div>
                <div style="text-align:center;font-weight:700;margin:4px 0;font-size:${is80 ? '13px' : '15px'};">Recibo : ${esc(num)}</div>
                ${reprint}
                ${dash}
                ${sale.items.map(it => `
                    <div>${esc(it.name)}</div>
                    <div style="display:flex;justify-content:space-between;"><span style="padding-left:10px;">${it.quantity}@ ${money(it.unitPrice)}</span><span>${money(it.quantity * it.unitPrice)}</span></div>
                    ${it.note ? `<div style="font-style:italic;padding-left:10px;">* ${esc(it.note)}</div>` : ''}
                `).join('')}
                ${dash}
                ${row(`${itemCount}  Artículos      SUBTOTAL`, money(sale.subtotal), true)}
                ${sale.discount > 0 ? row('Descuento', `-${money(sale.discount)}`) : ''}
                ${taxRows}
                <div style="font-size:${is80 ? '14px' : '16px'};margin-top:2px;">${row('TOTAL', money(sale.total), true)}</div>
                ${sale.payments.map(p => row(p.method, money(p.amount))).join('')}
                ${sale.changeDue && sale.changeDue > 0 ? row('Cambio', money(sale.changeDue), true) : ''}
                ${dash}
                ${legal}
                ${reprint}
                ${barcode}
            </div>`;
    }

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
            <td style="padding:2px 0;">${esc(it.name)}<br/><span style="color:#666;">${it.quantity} x ${money(it.unitPrice)}</span>${it.note ? `<br/><span style="color:#555;font-style:italic;">* ${esc(it.note)}</span>` : ''}</td>
            <td style="padding:2px 0;text-align:right;vertical-align:top;">${money(it.quantity * it.unitPrice)}</td>
        </tr>`).join('');

    const totals = `
        <div style="border-top:1px dashed #999;padding-top:6px;margin-top:4px;">
            ${line('Subtotal', money(sale.subtotal))}
            ${sale.discount > 0 ? line('Descuento', `-${money(sale.discount)}`) : ''}
            ${(sale.taxState || sale.taxMunicipal || sale.taxReduced)
                ? `${sale.taxState ? line('IVU Estatal', money(sale.taxState)) : ''}${sale.taxMunicipal ? line('IVU Municipal', money(sale.taxMunicipal)) : ''}${sale.taxReduced ? line('IVU Reducido', money(sale.taxReduced)) : ''}`
                : (cfg.showTaxBreakdown ? line('IVU', money(sale.tax)) : '')}
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
    // ── Diseño CLÁSICO (mismo estilo que el recibo térmico) ──
    if ((cfg.design ?? 'modern') === 'classic') {
        const num = `${cfg.receiptPrefix || ''}${sale.saleNumber}`;
        const d = new Date(sale.date);
        if (cfg.showLogo && cfg.logoUrl?.startsWith('data:image')) { try { doc.addImage(cfg.logoUrl, 'PNG', W / 2 - 15, y, 30, 15); y += 18; } catch { /* ignore */ } }
        if (cfg.businessName) center(cfg.businessName, 14, true);
        if (cfg.showAddress && cfg.address) center(cfg.address, 8);
        if (cfg.showPhone && cfg.phone) center(`Tel: ${cfg.phone}`, 8);
        if (cfg.showRnc && cfg.rnc) center(cfg.rnc, 8);
        y += 2;
        row(d.toLocaleDateString(), d.toLocaleTimeString());
        center(`Recibo : ${num}`, 11, true);
        if (sale.isReprint && cfg.reprintLabel) center(cfg.reprintLabel, 9, true);
        y += 1; doc.line(M, y, W - M, y); y += 4;
        sale.items.forEach(it => {
            doc.setFontSize(9); doc.setFont('courier', 'normal');
            doc.text(it.name.slice(0, isLetter ? 60 : 22), M, y);
            doc.text(money(it.quantity * it.unitPrice), W - M, y, { align: 'right' }); y += 4;
            doc.setTextColor(120); doc.text(`  ${it.quantity}@ ${money(it.unitPrice)}`, M, y); doc.setTextColor(0); y += 4.5;
        });
        doc.line(M, y, W - M, y); y += 4;
        const count = sale.items.reduce((s, i) => s + i.quantity, 0);
        row(`${count} Articulos  SUBTOTAL`, money(sale.subtotal), true);
        if (sale.discount > 0) row('Descuento', `-${money(sale.discount)}`);
        if (sale.taxState || sale.taxMunicipal || sale.taxReduced) {
            row('+ Estatal', money(sale.taxState || 0)); row('+ Reducido', money(sale.taxReduced || 0)); row('+ Municipal', money(sale.taxMunicipal || 0));
        } else if (cfg.showTaxBreakdown) row('+ IVU', money(sale.tax));
        row('TOTAL', money(sale.total), true);
        sale.payments.forEach(p => row(p.method, money(p.amount)));
        if (sale.changeDue && sale.changeDue > 0) row('Cambio', money(sale.changeDue), true);
        y += 3; doc.line(M, y, W - M, y); y += 4;
        [cfg.returnPolicyText, cfg.thankYouText, cfg.paymentTermsText].forEach(txt => { if (txt) center(txt, 8); });
        if (cfg.showBarcode) { y += 2; center(num, 12, true); }
        doc.save(`factura-${num}.pdf`);
        return;
    }

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

/**
 * Imprime el recibo por el driver del sistema (device-agnostic: cualquier impresora térmica
 * instalada en Windows, sea USB o de red). Para 80mm declara `@page size: 80mm auto; margin:0`
 * para que el driver imprima el rollo continuo con el ancho correcto (no como carta con márgenes).
 * Usa un iframe oculto (más confiable que window.open; no lo bloquea el popup blocker).
 */
function printReceipt(html: string, paperSize: '80mm' | 'letter' = '80mm') {
    const pageCss = paperSize === '80mm'
        ? '@page { size: 80mm auto; margin: 0; }'
        : '@page { size: letter; margin: 12mm; }';
    const doc = `<!doctype html><html><head><meta charset="utf-8"><title>Factura</title>
<style>
  ${pageCss}
  html, body { margin: 0; padding: 0; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
</style></head><body>${html}</body></html>`;

    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    document.body.appendChild(iframe);

    const win = iframe.contentWindow;
    if (!win) { document.body.removeChild(iframe); return; }

    win.document.open();
    win.document.write(doc);
    win.document.close();

    const cleanup = () => { setTimeout(() => { try { document.body.removeChild(iframe); } catch { /* ya removido */ } }, 1500); };
    const doPrint = () => {
        try { win.focus(); win.print(); } catch { /* impresión cancelada */ }
        cleanup();
    };
    // Esperar a que carguen recursos (logo, etc.) antes de imprimir.
    if (win.document.readyState === 'complete') setTimeout(doPrint, 250);
    else win.onload = () => setTimeout(doPrint, 250);
}

/**
 * Imprime el recibo por la mejor vía disponible: si hay una impresora de recibos configurada
 * por QZ Tray, imprime ahí (silencioso, con corte, sin espacio blanco); si no, o si QZ falla,
 * cae al diálogo del navegador.
 */
function printReceiptSmart(_html: string, sale: ReceiptSale, cfg: ReceiptConfig) {
    // Formato elegido en la venta (recibo térmico 80mm vs factura carta), sticky por dispositivo.
    const format = getPrintFormat();
    const paper: '80mm' | 'letter' = format === 'factura' ? 'letter' : '80mm';
    const useHtml = buildReceiptHTML(sale, { ...cfg, paperSize: paper });

    // WebUSB (sin QZ Tray): solo para el recibo térmico (la factura carta es HTML → navegador/QZ).
    if (format !== 'factura' && isWebUsbEnabled()) {
        printReceiptViaWebUsb(sale, cfg).catch((e) => {
            console.error('Impresión por WebUSB falló, uso el diálogo del navegador:', e);
            printReceipt(useHtml, paper);
        });
        return;
    }

    if (isReceiptPrinterEnabled()) {
        // recibo → ESC/POS (no usa html); factura → html carta a su impresora.
        printReceiptViaQz(sale, cfg, format, format === 'factura' ? useHtml : undefined).catch((e) => {
            console.error('Impresión por QZ falló, uso el diálogo del navegador:', e);
            printReceipt(useHtml, paper);
        });
        return;
    }
    printReceipt(useHtml, paper);
}

// Preferencia POR DISPOSITIVO (la impresora es local a cada caja) de qué hacer al finalizar la venta.
export type ReceiptAction = 'ask' | 'print' | 'download';
const RECEIPT_ACTION_KEY = 'pazzi_receipt_action';
export function getReceiptAction(): ReceiptAction {
    try { const v = localStorage.getItem(RECEIPT_ACTION_KEY); return v === 'print' || v === 'download' ? v : 'ask'; } catch { return 'ask'; }
}
export function setReceiptAction(v: ReceiptAction) {
    try { if (v === 'ask') localStorage.removeItem(RECEIPT_ACTION_KEY); else localStorage.setItem(RECEIPT_ACTION_KEY, v); } catch { /* almacenamiento no disponible */ }
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ isOpen, onClose, sale, config }) => {
    const [barcode, setBarcode] = useState('');
    useEffect(() => {
        let alive = true;
        if (sale && (config.design ?? 'modern') === 'classic' && config.showBarcode) {
            barcodeToSvg(`${config.receiptPrefix || ''}${sale.saleNumber}`).then(svg => { if (alive) setBarcode(svg); });
        } else setBarcode('');
        return () => { alive = false; };
    }, [sale, config]);
    const html = useMemo(() => (sale ? buildReceiptHTML(sale, config, barcode) : ''), [sale, config, barcode]);
    const [dontAsk, setDontAsk] = useState(false);
    // Evita ejecutar la acción dos veces para el mismo recibo (re-render / StrictMode).
    const handledRef = useRef<string | null>(null);
    const pref = getReceiptAction();

    // Al abrir un recibo nuevo: si hay preferencia guardada, ejecuta la acción y cierra sin preguntar.
    // Si no, respeta la impresión automática del config.
    useEffect(() => {
        if (!(isOpen && sale && html)) return;
        if (handledRef.current === sale.saleNumber) return; // ya procesado este recibo
        if (pref === 'print') { handledRef.current = sale.saleNumber; printReceiptSmart(html, sale, config); onClose(); return; }
        if (pref === 'download') { handledRef.current = sale.saleNumber; generatePDF(sale, config); onClose(); return; }
        if (config.autoPrint) { handledRef.current = sale.saleNumber; const t = setTimeout(() => printReceiptSmart(html, sale, config), 150); return () => clearTimeout(t); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, sale, html]);

    // Al cerrar, olvidar el recibo procesado para permitir reimprimir la MISMA factura otra vez.
    useEffect(() => { if (!isOpen) handledRef.current = null; }, [isOpen]);

    if (!sale) return null;
    // Con preferencia activa no mostramos el modal (el efecto ya ejecutó la acción).
    if (pref !== 'ask') return null;

    // Ejecuta la acción elegida; si marcó "no volver a preguntar", la guarda y cierra.
    const doAction = (action: 'print' | 'download') => {
        if (dontAsk) setReceiptAction(action);
        if (action === 'print') printReceiptSmart(html, sale, config);
        else generatePDF(sale, config);
        if (dontAsk) onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Factura / Recibo" size="md">
            <div className="space-y-4">
                <div className="flex justify-center bg-neutral-100 dark:bg-neutral-900 rounded-md p-3 max-h-[55vh] overflow-y-auto">
                    <div className="bg-white shadow-sm" dangerouslySetInnerHTML={{ __html: html }} />
                </div>
                <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300 select-none">
                    <input type="checkbox" checked={dontAsk} onChange={e => setDontAsk(e.target.checked)} className="h-4 w-4" />
                    No volver a preguntar (usar siempre la acción que elija ahora)
                </label>
                <div className="flex justify-end gap-2">
                    <button onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>Cerrar</button>
                    <button onClick={() => doAction('download')} className={BUTTON_SECONDARY_SM_CLASSES}>📄 Descargar PDF</button>
                    <button onClick={() => doAction('print')} className={BUTTON_PRIMARY_SM_CLASSES}>🖨️ Imprimir</button>
                </div>
            </div>
        </Modal>
    );
};
