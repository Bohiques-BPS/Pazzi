/**
 * Amarre de caja a terminal por FIRMA DE PETICIONES (Web Crypto API).
 *
 * Al asignar la caja a esta terminal generamos un par de llaves ECDSA P-256 con la privada
 * NO exportable (`extractable: false`): queda guardada como CryptoKey en IndexedDB y NI SIQUIERA
 * el propio JS puede leer sus bytes → no hay string que copiar a otra computadora. La pública (JWK)
 * se registra en el backend. Al abrir turno, el server manda un challenge y aquí lo firmamos con la
 * privada; el server verifica la firma contra la pública guardada.
 *
 * Límite honesto: ata la caja al PERFIL de este navegador en esta PC (lo máximo para un web app),
 * no al hardware. Si se borran los datos del navegador, la llave se pierde y el gerente debe
 * reasignar la terminal (con PIN). En navegadores sin Web Crypto/IndexedDB cae al esquema legado.
 */

const DB_NAME = 'pazzi_device';
const STORE = 'cajaKeys';
const DB_VERSION = 1;

function subtle(): SubtleCrypto | null {
  try {
    return (typeof crypto !== 'undefined' && crypto.subtle && window.isSecureContext !== false)
      ? crypto.subtle
      : null;
  } catch {
    return null;
  }
}

export function isDeviceKeySupported(): boolean {
  return !!subtle() && typeof indexedDB !== 'undefined';
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(key: string): Promise<any> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

async function idbSet(key: string, value: any): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => reject(tx.error);
  });
}

async function idbDel(key: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); resolve(); };
  });
}

function bufToB64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** ¿Esta terminal tiene una llave privada guardada para esta caja? */
export async function hasDeviceKey(cajaId: string): Promise<boolean> {
  if (!isDeviceKeySupported()) return false;
  try {
    const rec = await idbGet(cajaId);
    return !!(rec && rec.privateKey);
  } catch {
    return false;
  }
}

/**
 * Genera (o regenera) el par de llaves de esta terminal para la caja y guarda la privada
 * no exportable en IndexedDB. Devuelve la llave pública en formato JWK para registrar en el BE.
 * Devuelve null si el navegador no soporta Web Crypto/IndexedDB (se usará el esquema legado).
 */
export async function generateDeviceKey(cajaId: string): Promise<JsonWebKey | null> {
  const s = subtle();
  if (!s || typeof indexedDB === 'undefined') return null;
  const pair = await s.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, // privada NO exportable
    ['sign', 'verify'],
  );
  const publicJwk = await s.exportKey('jwk', pair.publicKey);
  await idbSet(cajaId, { privateKey: pair.privateKey, publicJwk });
  return publicJwk;
}

/**
 * Firma el challenge del server con la privada de esta terminal para la caja.
 * Devuelve la firma en base64url, o null si no hay llave (caja no asegurada en esta PC / no soportado).
 */
export async function signChallenge(cajaId: string, challenge: string): Promise<string | null> {
  const s = subtle();
  if (!s) return null;
  try {
    const rec = await idbGet(cajaId);
    if (!rec || !rec.privateKey) return null;
    const sig = await s.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      rec.privateKey as CryptoKey,
      new TextEncoder().encode(challenge),
    );
    return bufToB64url(sig);
  } catch {
    return null;
  }
}

/** Borra la llave de esta terminal para la caja (al quitar el amarre). */
export async function clearDeviceKey(cajaId: string): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  try { await idbDel(cajaId); } catch { /* noop */ }
}
