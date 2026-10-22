/**
 * Logo del recibo para impresoras térmicas (ESC/POS): convierte una imagen (URL o data URL) a un
 * bitmap blanco/negro y lo empaqueta con el comando raster `GS v 0`, que casi todas las térmicas
 * soportan. Se cachea por URL + tamaño para no reprocesar el logo en cada venta.
 */

const cache = new Map<string, Uint8Array | null>();

/** Puntos imprimibles por línea según las columnas del recibo (80 mm ≈ 576, 58 mm ≈ 384). */
export const dotsForWidth = (cols: number) => (cols <= 32 ? 384 : 576);

function loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        // Sin esto el canvas queda "contaminado" con imágenes de otro dominio (Cloudinary) y no se puede leer.
        if (!url.startsWith('data:')) img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('No se pudo cargar el logo.'));
        img.src = url;
    });
}

/**
 * Devuelve el comando `GS v 0` con el logo, o null si no se pudo (el recibo se imprime igual sin logo).
 * Tamaño parecido a la vista previa: ~40% del ancho del papel y como máximo ~160 puntos de alto.
 */
export async function logoRaster(url: string, cols: number): Promise<Uint8Array | null> {
    const paperDots = dotsForWidth(cols);
    const maxW = Math.round(paperDots * 0.42);
    const maxH = 160;
    const key = `${url}|${maxW}|${maxH}`;
    if (cache.has(key)) return cache.get(key)!;
    try {
        const img = await loadImage(url);
        const scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight, 1);
        // El ancho en bytes debe ser entero: múltiplo de 8 puntos.
        const w = Math.max(8, Math.round((img.naturalWidth * scale) / 8) * 8);
        const h = Math.max(1, Math.round(img.naturalHeight * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        ctx.fillStyle = '#fff'; // lo transparente se imprime en blanco
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        const px = ctx.getImageData(0, 0, w, h).data;

        // Gris por punto y tramado Floyd–Steinberg: los colores medios (no solo los oscuros) se ven
        // como puntos, así el logo se parece a la vista previa en vez de perder lo claro.
        const gray = new Float32Array(w * h);
        for (let i = 0; i < w * h; i++) gray[i] = 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2];
        const bytesPerRow = w / 8;
        const out = new Uint8Array(8 + bytesPerRow * h);
        out.set([0x1d, 0x76, 0x30, 0x00, bytesPerRow & 0xff, (bytesPerRow >> 8) & 0xff, h & 0xff, (h >> 8) & 0xff]);
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const i = y * w + x;
                const old = gray[i];
                const black = old < 128;
                if (black) out[8 + y * bytesPerRow + (x >> 3)] |= 0x80 >> (x & 7);
                const err = old - (black ? 0 : 255);
                if (x + 1 < w) gray[i + 1] += err * 7 / 16;
                if (y + 1 < h) {
                    if (x > 0) gray[i + w - 1] += err * 3 / 16;
                    gray[i + w] += err * 5 / 16;
                    if (x + 1 < w) gray[i + w + 1] += err * 1 / 16;
                }
            }
        }
        cache.set(key, out);
        return out;
    } catch (e) {
        console.warn('[recibo] logo no imprimible:', e);
        cache.set(key, null);
        return null;
    }
}

/** Bytes → "cadena binaria" (un carácter por byte), para mezclar con el texto ESC/POS. */
export const bytesToBinary = (b: Uint8Array) => {
    let s = '';
    for (let i = 0; i < b.length; i += 8192) s += String.fromCharCode(...b.subarray(i, i + 8192));
    return s;
};

/** Bytes → base64 (para mandar el logo por QZ sin que el code page lo altere). */
export const bytesToBase64 = (b: Uint8Array) => btoa(bytesToBinary(b));
