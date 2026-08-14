/**
 * Gaveta de efectivo (cash drawer) vía QZ Tray.
 *
 * QZ Tray es un agente local (se instala en la PC de la caja) que expone un WebSocket seguro.
 * Desde el navegador enviamos el comando ESC/POS de apertura ("drawer kick") al dispositivo
 * configurado — funciona tanto si la gaveta va conectada a la IMPRESORA (RJ11) como si es una
 * gaveta/impresora USB: en ambos casos se manda el kick a ese dispositivo.
 *
 * La configuración es POR DISPOSITIVO (localStorage), porque la impresora/gaveta es local a cada caja.
 * Descargar QZ Tray: https://qz.io/download/
 */

const KEY = 'pazzi_cashdrawer';
// Comando estándar de apertura de gaveta ESC/POS: ESC p m t1 t2 → 1B 70 00 19 FA (pin 2).
const DEFAULT_KICK_HEX = '1B700019FA';

export interface DrawerConfig {
    enabled: boolean;
    printerName: string; // nombre EXACTO de la impresora/dispositivo en QZ Tray (vacío = predeterminada)
    kickHex: string;     // comando de apertura en hex
}

export function getDrawerConfig(): DrawerConfig {
    try {
        const v = JSON.parse(localStorage.getItem(KEY) || '{}');
        return { enabled: !!v.enabled, printerName: v.printerName || '', kickHex: v.kickHex || DEFAULT_KICK_HEX };
    } catch {
        return { enabled: false, printerName: '', kickHex: DEFAULT_KICK_HEX };
    }
}

export function setDrawerConfig(c: DrawerConfig) {
    try { localStorage.setItem(KEY, JSON.stringify(c)); } catch { /* almacenamiento no disponible */ }
}

export function isCashDrawerEnabled(): boolean {
    return getDrawerConfig().enabled;
}

// Carga perezosa de la librería qz-tray (solo cuando se usa la gaveta; no infla el bundle inicial).
let qzPromise: Promise<any> | null = null;
async function getQz(): Promise<any> {
    if (!qzPromise) qzPromise = import('qz-tray').then((m: any) => m?.default || m);
    return qzPromise;
}

// Mensaje de ayuda cuando el WebSocket de QZ no conecta (causa típica en HTTPS/Render:
// el certificado autofirmado de QZ no está aceptado en el navegador).
const QZ_HELP =
    'No se pudo conectar a QZ Tray. Verifica: (1) que QZ Tray esté instalado y ABIERTO en esta PC; ' +
    '(2) que aceptaste su certificado — abre https://localhost:8181 una vez y elige "Continuar". ' +
    'Descarga QZ Tray: https://qz.io/download/';

export async function ensureConnected(): Promise<any> {
    let qz: any;
    try {
        qz = await getQz();
    } catch {
        throw new Error('No se pudo cargar el módulo de impresión (QZ Tray).');
    }
    // Modo sin firma (uso local): QZ pedirá permiso la primera vez; el cajero marca "Recordar".
    if (qz.security && !(qz as any).__pazziSec) {
        qz.security.setCertificatePromise((resolve: any) => resolve());
        qz.security.setSignaturePromise(() => (resolve: any) => resolve());
        (qz as any).__pazziSec = true;
    }
    if (qz.websocket.isActive()) return qz;
    try {
        // Reintenta la conexión: QZ Tray puede tardar en levantar el WebSocket seguro.
        await qz.websocket.connect({ retries: 2, delay: 1 });
    } catch (err: any) {
        // El error nativo de QZ suele ser un evento de socket sin mensaje útil → damos guía accionable.
        console.error('QZ Tray connect error:', err);
        throw new Error(QZ_HELP);
    }
    return qz;
}

/** Lista las impresoras/dispositivos visibles por QZ Tray (para el selector de configuración). */
export async function listPrinters(): Promise<string[]> {
    const qz = await ensureConnected();
    const found = await qz.printers.find();
    return Array.isArray(found) ? found : [found].filter(Boolean);
}

/** Abre la gaveta enviando el comando ESC/POS al dispositivo configurado. Lanza si falla. */
export async function openCashDrawer(): Promise<void> {
    const cfg = getDrawerConfig();
    const qz = await ensureConnected();
    const printer = cfg.printerName || (await qz.printers.getDefault());
    if (!printer) throw new Error('No hay impresora/dispositivo configurado para la gaveta.');
    const config = qz.configs.create(printer, { encoding: 'UTF-8' });
    await qz.print(config, [{ type: 'raw', format: 'hex', data: cfg.kickHex || DEFAULT_KICK_HEX }]);
}
