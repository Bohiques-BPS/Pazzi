/**
 * Firma de peticiones a QZ Tray para impresión SIN avisos.
 *
 * Problema: en modo sin firma, QZ Tray deshabilita la casilla "Recordar" y pregunta en CADA
 * impresión. Al firmar las peticiones con un certificado en el que QZ Tray confía, el aviso
 * desaparece (impresión silenciosa).
 *
 * Diseño seguro: la LLAVE PRIVADA se genera en el propio dispositivo (en el navegador) y se guarda
 * solo en el localStorage de esa PC. Nunca viaja al repositorio ni al servidor. El CERTIFICADO
 * público se muestra para copiarlo al archivo de confianza de QZ Tray (authcert.override).
 *
 * Cómo confía QZ Tray (una sola vez por PC de caja):
 *   1. Copia el certificado (botón "Copiar certificado") a un archivo, p. ej.
 *        C:\Program Files\QZ Tray\pazzi-cert.txt
 *   2. En  C:\Program Files\QZ Tray\qz-tray.properties  agrega:
 *        authcert.override=C:/Program Files/QZ Tray/pazzi-cert.txt
 *   3. Reinicia QZ Tray (bandeja → Exit, y vuelve a abrirlo).
 */

import { KEYUTIL, KJUR, hextorstr, stob64 } from 'jsrsasign';

const CERT_KEY = 'pazzi_qz_cert';
const PRIVKEY_KEY = 'pazzi_qz_privatekey';

export function getQzCert(): string | null {
    try {
        const v = localStorage.getItem(CERT_KEY);
        return v && v.includes('BEGIN CERTIFICATE') ? v : null;
    } catch {
        return null;
    }
}

export function getQzPrivateKey(): string | null {
    try {
        const v = localStorage.getItem(PRIVKEY_KEY);
        return v && v.includes('BEGIN') ? v : null;
    } catch {
        return null;
    }
}

/** True si este dispositivo ya tiene un par certificado/llave para firmar (impresión sin avisos). */
export function hasQzSignature(): boolean {
    return !!getQzCert() && !!getQzPrivateKey();
}

/** Guarda un par certificado/llave (p. ej. pegado manualmente). Vacío = borra el guardado. */
export function setQzSignature(cert: string, privateKey: string) {
    try {
        if (cert.trim()) localStorage.setItem(CERT_KEY, cert.trim());
        else localStorage.removeItem(CERT_KEY);
        if (privateKey.trim()) localStorage.setItem(PRIVKEY_KEY, privateKey.trim());
        else localStorage.removeItem(PRIVKEY_KEY);
    } catch { /* almacenamiento no disponible */ }
}

/**
 * Genera en este dispositivo un par RSA 2048 + certificado autofirmado (válido 20 años),
 * lo guarda en localStorage y devuelve el certificado público para copiarlo a QZ Tray.
 */
export function generateQzSignature(): string {
    const kp: any = KEYUTIL.generateKeypair('RSA', 2048);
    const prvPem = KEYUTIL.getPEM(kp.prvKeyObj, 'PKCS8PRV');

    const now = new Date();
    const end = new Date(now.getTime());
    end.setFullYear(end.getFullYear() + 20);
    const fmt = (d: Date) =>
        d.getUTCFullYear().toString().slice(2) +
        String(d.getUTCMonth() + 1).padStart(2, '0') +
        String(d.getUTCDate()).padStart(2, '0') +
        String(d.getUTCHours()).padStart(2, '0') +
        String(d.getUTCMinutes()).padStart(2, '0') +
        String(d.getUTCSeconds()).padStart(2, '0') + 'Z';

    const cert = new KJUR.asn1.x509.Certificate({
        serial: { int: Date.now() },
        issuer: { str: '/CN=Pazzi POS/O=Pazzi' },
        notbefore: fmt(now),
        notafter: fmt(end),
        subject: { str: '/CN=Pazzi POS/O=Pazzi' },
        sbjpubkey: kp.pubKeyObj,
        ext: [{ extname: 'basicConstraints', cA: true }],
        sigalg: 'SHA256withRSA',
        cakey: kp.prvKeyObj,
    } as any);
    const certPem = (cert as any).getPEM();

    setQzSignature(certPem, prvPem);
    return certPem;
}

/**
 * Aplica la firma a una instancia de QZ Tray. Devuelve true si quedó en modo FIRMADO
 * (sin avisos) o false si no hay par guardado y se usa el modo sin firma (con aviso).
 */
export function applyQzSecurity(qz: any): boolean {
    if (!qz?.security) return false;

    const cert = getQzCert();
    const key = getQzPrivateKey();

    if (cert && key) {
        qz.security.setCertificatePromise((resolve: any) => resolve(cert));
        qz.security.setSignatureAlgorithm('SHA512');
        qz.security.setSignaturePromise((toSign: string) => (resolve: any, reject: any) => {
            try {
                const sig = new KJUR.crypto.Signature({ alg: 'SHA512withRSA' });
                sig.init(key);
                sig.updateString(toSign);
                resolve(stob64(hextorstr(sig.sign())));
            } catch (err) {
                reject(err);
            }
        });
        return true;
    }

    // Sin par guardado: modo sin firma (QZ pedirá permiso en cada impresión).
    qz.security.setCertificatePromise((resolve: any) => resolve());
    qz.security.setSignaturePromise(() => (resolve: any) => resolve());
    return false;
}
