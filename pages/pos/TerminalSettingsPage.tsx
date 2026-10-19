import React, { useState, useMemo } from 'react';
import { useGlobalSettings, useTranslation } from '../../contexts/GlobalSettingsContext';
import { useData } from '../../contexts/DataContext';
import { DEFAULT_RECEIPT_CONFIG, type ReceiptConfig } from '../../types';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES, INPUT_SM_CLASSES } from '../../constants';
import { buildReceiptHTML, getReceiptAction, setReceiptAction, type ReceiptSale, type ReceiptAction } from '../../components/pos/ReceiptModal';
import { getDrawerConfig, setDrawerConfig, listPrinters, openCashDrawer, type DrawerConfig } from '../../services/cashDrawer';
import { getLabelConfig, setLabelConfig, printBarcodeLabel, type LabelConfig } from '../../services/labelPrinter';
import { getReceiptPrinterConfig, setReceiptPrinterConfig, printTestReceipt, type ReceiptPrinterConfig } from '../../services/receiptPrinter';
import { getWebUsbConfig, setWebUsbConfig, isWebUsbSupported, requestWebUsbPrinter, printWebUsbTest, type WebUsbPrinterConfig } from '../../services/webusbPrinter';
import { getQzCert, hasQzSignature, generateQzSignature, setQzSignature } from '../../services/qzSign';
import { getDeviceId } from '../../utils/device';
import { toast } from '../../hooks/useToast';

// Venta de ejemplo para las impresiones de prueba.
const SAMPLE: ReceiptSale = {
    saleNumber: 'AB12CD34',
    date: new Date().toISOString(),
    items: [
        { name: 'CABLE PULLER', quantity: 1, unitPrice: 24.99, description: 'Jalacables de acero, 30m' },
        { name: 'TORNILLO 1/4" (caja)', quantity: 2, unitPrice: 5.50, description: 'Cabeza hexagonal, caja de 100' },
    ],
    subtotal: 35.99, tax: 4.14, discount: 0, total: 40.13,
    payments: [{ method: 'Efectivo', amount: 50 }],
    changeDue: 9.87,
    clientName: 'Público General',
    cashierName: 'Roberto',
};

/**
 * Configuración de ESTA terminal (PC): impresora de recibos/facturas, gaveta, etiquetas y qué
 * hacer al finalizar la venta. Todo se guarda EN ESTE DISPOSITIVO (localStorage), así cada
 * terminal elige con qué imprime aunque el negocio tenga muchas cajas y PCs.
 */
export const TerminalSettingsPage: React.FC = () => {
    const { t } = useTranslation();
    const { settings } = useGlobalSettings();
    const { cajas } = useData();
    // El diseño del recibo es del negocio (Config. Factura); aquí solo se usa para las pruebas.
    const cfg: ReceiptConfig = { ...DEFAULT_RECEIPT_CONFIG, ...settings.receiptConfig };

    // ¿Qué terminal es esta y a qué caja pertenece? (una terminal pertenece a una sola caja).
    const thisDeviceId = getDeviceId();
    const terminal = useMemo(() => {
        for (const c of cajas as any[]) {
            const d = (c.devices || []).find((x: any) => x.deviceId === thisDeviceId);
            if (d) return { cajaName: c.name as string, deviceName: d.deviceName as string, secured: !!d.secured };
        }
        return null;
    }, [cajas, thisDeviceId]);

    // Preferencia POR DISPOSITIVO de qué hacer al finalizar (preguntar / imprimir / descargar).
    const [receiptAction, setReceiptActionState] = useState<ReceiptAction>(getReceiptAction());
    const changeReceiptAction = (v: ReceiptAction) => { setReceiptAction(v); setReceiptActionState(v); toast.success(t('posx.receipt.toast.prefUpdated')); };
    // Gaveta de efectivo (QZ Tray) — configuración POR DISPOSITIVO.
    const [drawer, setDrawer] = useState<DrawerConfig>(getDrawerConfig());
    const [printers, setPrinters] = useState<string[]>([]);
    const updateDrawer = (patch: Partial<DrawerConfig>) => { const next = { ...drawer, ...patch }; setDrawer(next); setDrawerConfig(next); };
    const detectPrinters = () => listPrinters().then(setPrinters).catch(err => toast.error(`QZ Tray: ${err?.message || t('posx.receipt.toast.qzUnavailable')}`));
    const testDrawer = () => openCashDrawer().then(() => toast.success(t('posx.receipt.toast.drawerOpened'))).catch(err => toast.error(`${t('posx.receipt.drawer.short')}: ${err?.message || t('posx.receipt.toast.drawerFailed')}`));
    // Impresora de códigos de barras (etiquetas) — POR DISPOSITIVO.
    const [label, setLabel] = useState<LabelConfig>(getLabelConfig());
    const updateLabel = (patch: Partial<LabelConfig>) => { const next = { ...label, ...patch }; setLabel(next); setLabelConfig(next); };
    const testLabel = () => printBarcodeLabel({ name: t('posx.receipt.testProductName'), unitPrice: 9.99, barcode13Digits: '0123456789012' })
        .then(() => toast.success(t('posx.receipt.toast.labelSent'))).catch(err => toast.error(`${t('posx.receipt.label.short')}: ${err?.message || t('posx.receipt.toast.printFailed')}`));
    // Impresora de recibos (QZ Tray, ESC/POS) — POR DISPOSITIVO.
    const [receiptPrinter, setReceiptPrinter] = useState<ReceiptPrinterConfig>(getReceiptPrinterConfig());
    const updateReceiptPrinter = (patch: Partial<ReceiptPrinterConfig>) => { const next = { ...receiptPrinter, ...patch }; setReceiptPrinter(next); setReceiptPrinterConfig(next); };
    const testRecibo = () => printTestReceipt(cfg, 'recibo')
        .then(() => toast.success(t('posx.receipt.toast.testReceiptSent'))).catch(err => toast.error(`${t('posx.receipt.receipt.short')}: ${err?.message || t('posx.receipt.toast.printFailed')}`));
    const testFactura = () => printTestReceipt(cfg, 'factura', buildReceiptHTML(SAMPLE, { ...cfg, paperSize: 'letter' }))
        .then(() => toast.success(t('posx.receipt.toast.testInvoiceSent'))).catch(err => toast.error(`${t('posx.receipt.invoice.short')}: ${err?.message || t('posx.receipt.toast.printFailed')}`));
    // Impresora de recibos por WebUSB (sin QZ Tray) — POR DISPOSITIVO.
    const [webusb, setWebusb] = useState<WebUsbPrinterConfig>(getWebUsbConfig());
    const webUsbOk = isWebUsbSupported();
    const updateWebusb = (patch: Partial<WebUsbPrinterConfig>) => { const next = { ...webusb, ...patch }; setWebusb(next); setWebUsbConfig(next); };
    // Modo de impresión efectivo (3 vías, mutuamente excluyentes).
    const printMode: 'browser' | 'qz' | 'webusb' = webusb.enabled ? 'webusb' : (receiptPrinter.enabled ? 'qz' : 'browser');
    const setPrintMode = (m: 'browser' | 'qz' | 'webusb') => {
        updateReceiptPrinter({ enabled: m === 'qz' });
        updateWebusb({ enabled: m === 'webusb' });
    };
    const selectUsbPrinter = () => requestWebUsbPrinter()
        .then(c => { setWebusb(c); toast.success(t('posx.receipt.toast.usbSelected', { name: c.productName || '' })); })
        .catch(err => toast.error(err?.message || t('posx.receipt.toast.usbSelectFailed')));
    const testUsb = () => printWebUsbTest(cfg)
        .then(() => toast.success(t('posx.receipt.toast.testReceiptSentUsb')))
        .catch(err => {
            const msg = String(err?.message || '');
            // En Windows el driver de la impresora tiene el dispositivo tomado → "Access denied".
            if (/access denied|acceso denegado|denied|unable to claim|claim interface/i.test(msg)) {
                toast.error('Windows tiene la impresora ocupada por su driver. Usa el modo "QZ Tray" (recomendado), o instala el driver WinUSB con Zadig para poder usar WebUSB.');
            } else {
                toast.error(`USB: ${msg || t('posx.receipt.toast.printFailed')}`);
            }
        });

    // Firma de QZ (impresión sin avisos) — par certificado/llave POR DISPOSITIVO (localStorage).
    const [qzSigned, setQzSigned] = useState<boolean>(hasQzSignature());
    const [qzCertText, setQzCertText] = useState<string>(getQzCert() || '');
    const generateSignature = () => {
        try {
            const cert = generateQzSignature();
            setQzCertText(cert);
            setQzSigned(true);
            toast.success('Certificado de firma generado. Cópialo a QZ Tray (pasos abajo).');
        } catch (err: any) {
            toast.error(`No se pudo generar la firma: ${err?.message || 'error'}`);
        }
    };
    const copyQzCert = () => {
        navigator.clipboard?.writeText(qzCertText)
            .then(() => toast.success('Certificado copiado al portapapeles.'))
            .catch(() => toast.error('No se pudo copiar. Selecciónalo y copia manualmente.'));
    };
    const clearSignature = () => {
        setQzSignature('', '');
        setQzCertText('');
        setQzSigned(false);
        toast.success('Firma eliminada. QZ volverá a pedir permiso en cada impresión.');
    };

    return (
        <div className="max-w-3xl">
            <div className="mb-4">
                <h1 className="text-2xl font-semibold text-neutral-700 dark:text-neutral-200">Configuración de la terminal</h1>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                    Impresoras, gaveta y etiquetas de <strong>esta computadora</strong>. Se guarda solo en este equipo: cada terminal puede usar sus propias impresoras.
                </p>
            </div>

            <div className="space-y-4">
                {/* Identidad de esta terminal */}
                <section className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4">
                    <h3 className="font-semibold text-primary mb-2">🖥️ Esta terminal</h3>
                    {terminal ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            <div>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400">Nombre</p>
                                <p className="font-medium text-neutral-800 dark:text-neutral-100">{terminal.deviceName}</p>
                            </div>
                            <div>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400">Caja</p>
                                <p className="font-medium text-neutral-800 dark:text-neutral-100">{terminal.cajaName}{!terminal.secured && <span className="ml-2 text-[11px] text-amber-600 dark:text-amber-400">amarre básico</span>}</p>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                            Esta PC no está asignada a ninguna caja. Para asignarla, abre la caja en <strong>Punto de Venta → Cajas</strong> desde esta computadora y pulsa «Agregar ESTA terminal».
                        </p>
                    )}
                </section>

                <section className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4">
                    <h3 className="font-semibold text-primary mb-1">{t('posx.receipt.finalize.title')}</h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">{t('posx.receipt.finalize.desc1')} <strong>{t('posx.receipt.finalize.deviceScope')}</strong>. {t('posx.receipt.finalize.desc2')}</p>
                    <select value={receiptAction} onChange={e => changeReceiptAction(e.target.value as ReceiptAction)} className={`${INPUT_SM_CLASSES} w-full`}>
                        <option value="ask">{t('posx.receipt.finalize.ask')}</option>
                        <option value="print">{t('posx.receipt.finalize.print')}</option>
                        <option value="download">{t('posx.receipt.finalize.download')}</option>
                    </select>
                </section>

                <section className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4">
                    <h3 className="font-semibold text-primary mb-1">{t('posx.receipt.printer.title')}</h3>
                    <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-1">{t('posx.receipt.printer.mode')}</p>
                    <div className="grid grid-cols-3 gap-2 mb-1">
                        <button
                            type="button"
                            onClick={() => setPrintMode('browser')}
                            className={`py-2 px-2 rounded-md border text-sm font-medium transition-colors ${printMode === 'browser' ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary' : 'border-neutral-300 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-700'}`}
                        >
                            {t('posx.receipt.printer.browser')}
                        </button>
                        <button
                            type="button"
                            onClick={() => setPrintMode('qz')}
                            className={`py-2 px-2 rounded-md border text-sm font-medium transition-colors ${printMode === 'qz' ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary' : 'border-neutral-300 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-700'}`}
                        >
                            QZ Tray
                        </button>
                        <button
                            type="button"
                            onClick={() => setPrintMode('webusb')}
                            disabled={!webUsbOk}
                            title={webUsbOk ? '' : t('posx.receipt.printer.webusbUnsupported')}
                            className={`py-2 px-2 rounded-md border text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${printMode === 'webusb' ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary' : 'border-neutral-300 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-700'}`}
                        >
                            WebUSB
                        </button>
                    </div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">
                        {printMode === 'qz'
                            ? t('posx.receipt.printer.desc.qz')
                            : printMode === 'webusb'
                            ? t('posx.receipt.printer.desc.webusb')
                            : t('posx.receipt.printer.desc.browser')}
                    </p>
                    {printMode === 'browser' && (
                        <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-xs text-neutral-700 dark:text-neutral-200 mb-1">
                            <p className="font-semibold text-primary mb-1">Imprimir gratis, sin instalar nada</p>
                            <p className="text-neutral-600 dark:text-neutral-300 mb-2">
                                El modo Navegador imprime con el cuadro de impresión del navegador. Es gratis y no requiere ningún programa.
                            </p>
                            <p className="font-medium text-neutral-700 dark:text-neutral-200">Para imprimir SIN el cuadro de diálogo (silencioso), en una PC de caja:</p>
                            <ol className="list-decimal list-inside space-y-1 text-neutral-600 dark:text-neutral-300 mt-1">
                                <li>Pon tu impresora térmica como <strong>impresora predeterminada</strong> de Windows.</li>
                                <li>Cierra Chrome por completo y ábrelo con la bandera <code className="px-1 bg-neutral-200 dark:bg-neutral-700 rounded">--kiosk-printing</code>. Ej: crea un acceso directo a Chrome y al final del "Destino" agrega un espacio y <code className="px-1 bg-neutral-200 dark:bg-neutral-700 rounded">--kiosk-printing</code>.</li>
                                <li>Al imprimir desde el POS, saldrá directo a la impresora, sin diálogo. (Funciona igual en Edge.)</li>
                            </ol>
                            <p className="mt-2 text-neutral-500 dark:text-neutral-400">Sin esa bandera, el navegador mostrará el cuadro de impresión cada vez (también gratis, solo con un clic extra).</p>
                        </div>
                    )}
                    {printMode === 'webusb' && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 flex-wrap">
                                <button type="button" onClick={selectUsbPrinter} className={BUTTON_SECONDARY_SM_CLASSES}>{t('posx.receipt.usb.select')}</button>
                                <span className="text-xs text-neutral-500">{webusb.productName ? t('posx.receipt.usb.chosen', { name: webusb.productName }) : t('posx.receipt.usb.none')}</span>
                            </div>
                            <div>
                                <label className="block text-xs text-neutral-500 mb-1">{t('posx.receipt.thermalWidth')}</label>
                                <select value={webusb.width} onChange={e => updateWebusb({ width: Number(e.target.value) })} className={`${INPUT_SM_CLASSES} w-full`}>
                                    <option value={48}>{t('posx.receipt.width.80mm')}</option>
                                    <option value={32}>{t('posx.receipt.width.58mm')}</option>
                                </select>
                            </div>
                            <button type="button" onClick={testUsb} disabled={webusb.vendorId == null} className={`${BUTTON_PRIMARY_SM_CLASSES} disabled:opacity-50`}>{t('posx.receipt.usb.testReceipt')}</button>
                            <p className="text-xs text-neutral-400">{t('posx.receipt.usb.note')}</p>
                        </div>
                    )}
                    {printMode === 'qz' && (
                        <div className="space-y-3">
                            {/* Ayuda: cómo instalar QZ Tray para poder imprimir */}
                            <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-xs text-neutral-700 dark:text-neutral-200">
                                <p className="font-semibold text-primary mb-1">¿Primera vez? Instala QZ Tray en esta PC</p>
                                <ol className="list-decimal list-inside space-y-1 text-neutral-600 dark:text-neutral-300">
                                    <li>
                                        Descarga QZ Tray (gratis):{' '}
                                        <a href="https://qz.io/download/" target="_blank" rel="noopener noreferrer" className="text-primary font-medium underline">qz.io/download</a>
                                        {' '}— elige la versión de Windows.
                                    </li>
                                    <li>Instálalo y ábrelo. Queda corriendo en la <strong>bandeja del sistema</strong> (junto al reloj, abajo a la derecha). Debe estar abierto siempre que quieras imprimir.</li>
                                    <li>La primera vez, el navegador y QZ Tray pedirán <strong>permiso de conexión</strong>: acepta/permite (marca "recordar").</li>
                                    <li>Conecta tu impresora térmica por USB (usa su driver normal de Windows) y pulsa <strong>«Detectar impresoras»</strong> aquí abajo.</li>
                                </ol>
                                <p className="mt-2 text-neutral-500 dark:text-neutral-400">
                                    A diferencia de WebUSB, QZ Tray usa el driver normal de la impresora, así que <strong>no da el error «Access denied»</strong> de Windows.
                                </p>
                                <p className="mt-2 text-neutral-500 dark:text-neutral-400">
                                    💡 QZ Tray es <strong>gratis</strong> (open source). La primera vez te pedirá permiso: pulsa <strong>«Permitir» + «Recordar»</strong> y no vuelve a preguntar. (La licencia de pago solo quita ese aviso inicial — no es necesaria.) ¿Prefieres no instalar nada? Mira el modo <strong>Navegador</strong>.
                                </p>
                            </div>

                            {/* Firma de QZ: quita el aviso "Permitir" de cada impresión (sin firma, QZ bloquea "Recordar"). */}
                            <div className={`rounded-md border p-3 text-xs ${qzSigned ? 'border-green-400/50 bg-green-50 dark:bg-green-900/20' : 'border-amber-400/50 bg-amber-50 dark:bg-amber-900/20'} text-neutral-700 dark:text-neutral-200`}>
                                <p className="font-semibold mb-1 flex items-center gap-2">
                                    {qzSigned
                                        ? <><span className="text-green-600 dark:text-green-400">✓</span> Firma activa — impresión sin avisos</>
                                        : <><span className="text-amber-600 dark:text-amber-400">!</span> QZ pregunta en cada impresión</>}
                                </p>
                                <p className="text-neutral-600 dark:text-neutral-300 mb-2">
                                    Sin firma, QZ Tray deshabilita la casilla <strong>«Recordar»</strong> y pide permiso cada vez. Genera un certificado en esta PC, confíalo en QZ Tray (pasos abajo) y el aviso desaparece.
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    <button type="button" onClick={generateSignature} className={BUTTON_PRIMARY_SM_CLASSES}>
                                        {qzSigned ? 'Regenerar certificado' : 'Generar certificado de firma'}
                                    </button>
                                    {qzSigned && (
                                        <>
                                            <button type="button" onClick={copyQzCert} className={BUTTON_SECONDARY_SM_CLASSES}>Copiar certificado</button>
                                            <button type="button" onClick={clearSignature} className="text-red-500 text-xs hover:underline self-center">Quitar firma</button>
                                        </>
                                    )}
                                </div>
                                {qzSigned && (
                                    <div className="mt-2">
                                        <label className="block text-[11px] text-neutral-500 mb-1">Certificado (para confiar en QZ Tray):</label>
                                        <textarea readOnly value={qzCertText} rows={4} onFocus={e => e.currentTarget.select()}
                                            className="w-full font-mono text-[10px] leading-tight rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 p-2 resize-none" />
                                        <ol className="list-decimal list-inside space-y-1 text-neutral-600 dark:text-neutral-300 mt-2">
                                            <li>Pulsa <strong>«Copiar certificado»</strong> y pégalo en un archivo nuevo, p. ej. <code className="px-1 bg-neutral-200 dark:bg-neutral-700 rounded">C:\Program Files\QZ Tray\pazzi-cert.txt</code></li>
                                            <li>Abre <code className="px-1 bg-neutral-200 dark:bg-neutral-700 rounded">C:\Program Files\QZ Tray\qz-tray.properties</code> y agrega la línea:<br/><code className="px-1 bg-neutral-200 dark:bg-neutral-700 rounded">authcert.override=C:/Program Files/QZ Tray/pazzi-cert.txt</code></li>
                                            <li>Reinicia QZ Tray (clic derecho en la bandeja → <strong>Exit</strong>, y vuelve a abrirlo).</li>
                                            <li>Imprime una prueba: ya no debe aparecer el aviso.</li>
                                        </ol>
                                        <p className="mt-2 text-neutral-500 dark:text-neutral-400">La llave privada se guarda <strong>solo en esta PC</strong> (no se sube a ningún lado). Repite «Generar» en cada caja, o copia el mismo certificado y llave si quieres compartirlos.</p>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end">
                                <button type="button" onClick={detectPrinters} className={BUTTON_SECONDARY_SM_CLASSES}>{t('posx.receipt.detectPrinters')}</button>
                            </div>
                            <div>
                                <label className="block text-xs text-neutral-500 mb-1">{t('posx.receipt.qz.receiptPrinter.pre')} <strong>{t('posx.receipt.receipt.word')}</strong> {t('posx.receipt.qz.receiptPrinter.post')}</label>
                                <select value={receiptPrinter.reciboPrinter} onChange={e => updateReceiptPrinter({ reciboPrinter: e.target.value })} className={`${INPUT_SM_CLASSES} w-full`}>
                                    <option value="">{t('posx.receipt.defaultPrinter')}</option>
                                    {printers.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                                <input type="text" value={receiptPrinter.reciboPrinter} onChange={e => updateReceiptPrinter({ reciboPrinter: e.target.value })} placeholder={t('posx.receipt.qz.receiptPrinter.ph')} className={`${INPUT_SM_CLASSES} w-full mt-1`} />
                            </div>
                            <div>
                                <label className="block text-xs text-neutral-500 mb-1">{t('posx.receipt.qz.invoicePrinter.pre')} <strong>{t('posx.receipt.invoice.word')}</strong> {t('posx.receipt.qz.invoicePrinter.post')}</label>
                                <select value={receiptPrinter.facturaPrinter} onChange={e => updateReceiptPrinter({ facturaPrinter: e.target.value })} className={`${INPUT_SM_CLASSES} w-full`}>
                                    <option value="">{t('posx.receipt.qz.invoiceSameAsReceipt')}</option>
                                    {printers.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                                <input type="text" value={receiptPrinter.facturaPrinter} onChange={e => updateReceiptPrinter({ facturaPrinter: e.target.value })} placeholder={t('posx.receipt.qz.invoicePrinter.ph')} className={`${INPUT_SM_CLASSES} w-full mt-1`} />
                            </div>
                            <div>
                                <label className="block text-xs text-neutral-500 mb-1">{t('posx.receipt.thermalWidth')}</label>
                                <select value={receiptPrinter.width} onChange={e => updateReceiptPrinter({ width: Number(e.target.value) })} className={`${INPUT_SM_CLASSES} w-full`}>
                                    <option value={48}>{t('posx.receipt.width.80mm')}</option>
                                    <option value={32}>{t('posx.receipt.width.58mm')}</option>
                                </select>
                            </div>
                            <div className="flex gap-2">
                                <button type="button" onClick={testRecibo} className={BUTTON_PRIMARY_SM_CLASSES}>{t('posx.receipt.qz.testReceipt')}</button>
                                <button type="button" onClick={testFactura} className={BUTTON_SECONDARY_SM_CLASSES}>{t('posx.receipt.qz.testInvoice')}</button>
                            </div>
                        </div>
                    )}
                </section>

                <section className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4">
                    <h3 className="font-semibold text-primary mb-1">{t('posx.receipt.drawer.title')}</h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">
                        {t('posx.receipt.drawer.desc1')} <strong>QZ Tray</strong> {t('posx.receipt.drawer.desc2')} <strong>{t('posx.receipt.drawer.thisPc')}</strong>
                        {' '}{t('posx.receipt.drawer.desc3')}
                    </p>
                    <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-200 mb-2">
                        <input type="checkbox" checked={drawer.enabled} onChange={e => updateDrawer({ enabled: e.target.checked })} className="h-4 w-4" />
                        {t('posx.receipt.drawer.autoOpen')}
                    </label>
                    {drawer.enabled && (
                        <div className="space-y-2">
                            <div>
                                <label className="block text-xs text-neutral-500 mb-1">{t('posx.receipt.drawer.deviceLabel')}</label>
                                <div className="flex gap-2">
                                    <select value={drawer.printerName} onChange={e => updateDrawer({ printerName: e.target.value })} className={`${INPUT_SM_CLASSES} flex-1`}>
                                        <option value="">{t('posx.receipt.defaultPrinter')}</option>
                                        {printers.map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                    <button type="button" onClick={detectPrinters} className={BUTTON_SECONDARY_SM_CLASSES}>{t('posx.receipt.detect')}</button>
                                </div>
                                <input type="text" value={drawer.printerName} onChange={e => updateDrawer({ printerName: e.target.value })} placeholder={t('posx.receipt.drawer.devicePh')} className={`${INPUT_SM_CLASSES} w-full mt-1`} />
                            </div>
                            <details>
                                <summary className="text-xs text-neutral-500 cursor-pointer">{t('posx.receipt.drawer.advanced')}</summary>
                                <label className="block text-xs text-neutral-500 mt-1 mb-1">{t('posx.receipt.drawer.escposLabel')} <code>1B700019FA</code></label>
                                <input type="text" value={drawer.kickHex} onChange={e => updateDrawer({ kickHex: e.target.value.replace(/[^0-9a-fA-F]/g, '') })} placeholder="1B700019FA" className={`${INPUT_SM_CLASSES} w-full`} />
                            </details>
                            <button type="button" onClick={testDrawer} className={BUTTON_PRIMARY_SM_CLASSES}>{t('posx.receipt.drawer.test')}</button>
                        </div>
                    )}
                </section>

                <section className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4">
                    <h3 className="font-semibold text-primary mb-1">{t('posx.receipt.label.title')}</h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">
                        {t('posx.receipt.label.desc1')} <strong>{t('posx.receipt.label.dedicated')}</strong> {t('posx.receipt.label.desc2')}
                        {t('posx.receipt.label.desc3')} <strong>QZ Tray</strong> {t('posx.receipt.label.desc4')}
                    </p>
                    <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-200 mb-2">
                        <input type="checkbox" checked={label.enabled} onChange={e => updateLabel({ enabled: e.target.checked })} className="h-4 w-4" />
                        {t('posx.receipt.label.useDedicated')}
                    </label>
                    {label.enabled && (
                        <div className="mb-2">
                            <label className="block text-xs text-neutral-500 mb-1">{t('posx.receipt.label.printerLabel')}</label>
                            <div className="flex gap-2">
                                <select value={label.printerName} onChange={e => updateLabel({ printerName: e.target.value })} className={`${INPUT_SM_CLASSES} flex-1`}>
                                    <option value="">{t('posx.receipt.defaultShort')}</option>
                                    {printers.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                                <button type="button" onClick={detectPrinters} className={BUTTON_SECONDARY_SM_CLASSES}>{t('posx.receipt.detect')}</button>
                            </div>
                        </div>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        <div>
                            <label className="block text-xs text-neutral-500 mb-1">{t('posx.receipt.label.widthMm')}</label>
                            <input type="number" value={label.widthMm} onChange={e => updateLabel({ widthMm: Number(e.target.value) || 0 })} className={`${INPUT_SM_CLASSES} w-full`} />
                        </div>
                        <div>
                            <label className="block text-xs text-neutral-500 mb-1">{t('posx.receipt.label.heightMm')}</label>
                            <input type="number" value={label.heightMm} onChange={e => updateLabel({ heightMm: Number(e.target.value) || 0 })} className={`${INPUT_SM_CLASSES} w-full`} />
                        </div>
                        <div>
                            <label className="block text-xs text-neutral-500 mb-1">{t('posx.receipt.label.codeToPrint')}</label>
                            <select value={label.field} onChange={e => updateLabel({ field: e.target.value as LabelConfig['field'] })} className={`${INPUT_SM_CLASSES} w-full`}>
                                <option value="barcode13Digits">{t('posx.receipt.label.barcode13')}</option>
                                <option value="sku">SKU</option>
                                <option value="barcode2">{t('posx.receipt.label.barcode2')}</option>
                                <option value="id">{t('posx.receipt.label.internalId')}</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-neutral-500 mb-1">{t('posx.receipt.label.defaultCopies')}</label>
                            <input type="number" min={1} value={label.copies} onChange={e => updateLabel({ copies: Math.max(1, Number(e.target.value) || 1) })} className={`${INPUT_SM_CLASSES} w-full`} />
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-2">
                        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={label.showName} onChange={e => updateLabel({ showName: e.target.checked })} className="h-4 w-4" />{t('posx.receipt.label.name')}</label>
                        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={label.showPrice} onChange={e => updateLabel({ showPrice: e.target.checked })} className="h-4 w-4" />{t('posx.receipt.label.price')}</label>
                        <button type="button" onClick={testLabel} className={`${BUTTON_PRIMARY_SM_CLASSES} ml-auto`}>{t('posx.receipt.label.testPrint')}</button>
                    </div>
                </section>
            </div>
        </div>
    );
};
