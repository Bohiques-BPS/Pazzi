/**
 * Impresión de recibos por WebUSB (sin QZ Tray).
 *
 * Envía ESC/POS crudo directo a una impresora térmica USB desde el navegador (Chrome/Edge).
 * Ventaja: NO requiere instalar QZ Tray en cada máquina. Limitaciones:
 *  - Solo Chrome/Edge de escritorio (no Firefox/Safari; requiere HTTPS o localhost).
 *  - Solo impresoras USB (no de red). No sirve para la "factura" carta (eso es HTML → navegador/QZ).
 *  - En Windows la impresora debe usar el driver WinUSB (ej. con Zadig) para que el navegador la vea;
 *    si tiene el driver del fabricante, WebUSB no la reconoce.
 *
 * Config POR DISPOSITIVO (localStorage): guarda vendorId/productId para reconectar sin volver a pedir.
 */
import { buildReceiptEscPos } from './receiptPrinter';
import type { ReceiptConfig } from '../types';
import type { ReceiptSale } from '../components/pos/ReceiptModal';

const KEY = 'pazzi_webusb_printer';

export interface WebUsbPrinterConfig {
    enabled: boolean;
    vendorId: number | null;
    productId: number | null;
    productName: string;
    width: number; // columnas del recibo: 48 = 80mm; 32 = 58mm
}

const DEFAULTS: WebUsbPrinterConfig = { enabled: false, vendorId: null, productId: null, productName: '', width: 48 };

export function isWebUsbSupported(): boolean {
    return typeof navigator !== 'undefined' && !!(navigator as any).usb;
}

export function getWebUsbConfig(): WebUsbPrinterConfig {
    try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
    catch { return { ...DEFAULTS }; }
}
export function setWebUsbConfig(c: WebUsbPrinterConfig) {
    try { localStorage.setItem(KEY, JSON.stringify(c)); } catch { /* almacenamiento no disponible */ }
}
export function isWebUsbEnabled(): boolean {
    const c = getWebUsbConfig();
    return c.enabled && c.vendorId != null && isWebUsbSupported();
}

/** Pide al usuario elegir la impresora USB (una vez); guarda vendor/product para reconectar. */
export async function requestWebUsbPrinter(): Promise<WebUsbPrinterConfig> {
    if (!isWebUsbSupported()) throw new Error('Este navegador no soporta WebUSB (usa Chrome o Edge de escritorio).');
    // filters: [] muestra todos los dispositivos USB para que el usuario elija su impresora.
    const device: any = await (navigator as any).usb.requestDevice({ filters: [] });
    if (!device) throw new Error('No se seleccionó ninguna impresora.');
    const cfg: WebUsbPrinterConfig = {
        ...getWebUsbConfig(),
        enabled: true,
        vendorId: device.vendorId,
        productId: device.productId,
        productName: [device.manufacturerName, device.productName].filter(Boolean).join(' ') || `USB ${device.vendorId}:${device.productId}`,
    };
    setWebUsbConfig(cfg);
    return cfg;
}

/** Recupera el dispositivo ya autorizado (sin volver a pedir permiso). */
async function getAuthorizedDevice(): Promise<any> {
    const cfg = getWebUsbConfig();
    if (cfg.vendorId == null) throw new Error('No hay impresora USB seleccionada. Elige una en Configuración de recibos.');
    const devices: any[] = await (navigator as any).usb.getDevices();
    const dev = devices.find(d => d.vendorId === cfg.vendorId && (cfg.productId == null || d.productId === cfg.productId)) || devices[0];
    if (!dev) throw new Error('No se encontró la impresora USB autorizada. Vuelve a seleccionarla.');
    return dev;
}

/** Abre el dispositivo, reclama la interfaz con endpoint bulk OUT y devuelve {device, endpoint}. */
async function openForWrite(device: any): Promise<{ device: any; endpoint: number; iface: number }> {
    await device.open();
    if (device.configuration === null) await device.selectConfiguration(1);
    for (const iface of device.configuration.interfaces) {
        const alt = iface.alternates[0];
        const ep = alt.endpoints.find((e: any) => e.direction === 'out' && e.type === 'bulk');
        if (ep) {
            try { await device.claimInterface(iface.interfaceNumber); }
            catch (e) {
                // En algunos SO hay que desprender el driver del kernel primero (no soportado en Windows).
                throw new Error('No se pudo reclamar la interfaz USB. En Windows instala el driver WinUSB (Zadig) para esta impresora.');
            }
            return { device, endpoint: ep.endpointNumber, iface: iface.interfaceNumber };
        }
    }
    throw new Error('La impresora no expone un endpoint de escritura USB compatible.');
}

/** Convierte el texto ESC/POS a bytes (Latin-1/CP437: el recibo ya viene sin acentos). */
function toBytes(s: string): Uint8Array {
    const out = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff;
    return out;
}

async function sendRaw(data: string): Promise<void> {
    const device = await getAuthorizedDevice();
    const { endpoint, iface } = await openForWrite(device);
    try {
        // Enviar en bloques por si el buffer del endpoint es pequeño.
        const bytes = toBytes(data);
        const CHUNK = 4096;
        for (let i = 0; i < bytes.length; i += CHUNK) {
            await device.transferOut(endpoint, bytes.slice(i, i + CHUNK));
        }
    } finally {
        try { await device.releaseInterface(iface); } catch { /* ignore */ }
        try { await device.close(); } catch { /* ignore */ }
    }
}

/** Imprime un recibo (ESC/POS) por WebUSB. Lanza si falla. */
export async function printReceiptViaWebUsb(sale: ReceiptSale, cfg: ReceiptConfig): Promise<void> {
    const wc = getWebUsbConfig();
    const data = buildReceiptEscPos(sale, cfg, wc.width || 48);
    await sendRaw(data);
}

/** Imprime un recibo de PRUEBA por WebUSB. */
export async function printWebUsbTest(cfg: ReceiptConfig): Promise<void> {
    const sample: ReceiptSale = {
        saleNumber: 'PRUEBA-USB',
        date: new Date().toISOString(),
        items: [
            { name: 'Articulo de prueba A', quantity: 2, unitPrice: 1.5 },
            { name: 'Articulo de prueba B', quantity: 1, unitPrice: 3.0 },
        ],
        subtotal: 6.0, tax: 0.69, discount: 0, total: 6.69,
        payments: [{ method: 'Efectivo', amount: 6.69 }],
        changeDue: 0, clientName: 'Cliente de prueba', cashierName: 'Cajero',
    };
    await printReceiptViaWebUsb(sample, cfg);
}
