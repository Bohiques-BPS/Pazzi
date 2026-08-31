/**
 * Extrae el texto de un archivo .docx (Word) en el navegador, sin dependencias.
 * Un .docx es un ZIP; el texto vive en `word/document.xml`. Se localiza esa entrada,
 * se descomprime (DEFLATE vía DecompressionStream) y se limpian las etiquetas XML.
 */

async function inflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
    const DS: any = (globalThis as any).DecompressionStream;
    if (typeof DS === 'undefined') {
        throw new Error('Tu navegador no soporta abrir .docx aquí. Guarda el documento como .txt o pega el texto.');
    }
    const ds = new DS('deflate-raw');
    const stream = (new Blob([bytes]).stream() as any).pipeThrough(ds);
    const ab = await new Response(stream).arrayBuffer();
    return new Uint8Array(ab);
}

export async function extractDocxText(file: File): Promise<string> {
    const data = new Uint8Array(await file.arrayBuffer());
    const dv = new DataView(data.buffer);

    // Localizar el End Of Central Directory (firma 0x06054b50), buscando desde el final.
    let eocd = -1;
    for (let i = data.length - 22; i >= 0; i--) {
        if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('El archivo no parece un .docx válido.');

    const cdOffset = dv.getUint32(eocd + 16, true);
    const cdCount = dv.getUint16(eocd + 10, true);

    let p = cdOffset;
    let target: { method: number; compSize: number; localOffset: number } | null = null;
    for (let n = 0; n < cdCount; n++) {
        if (dv.getUint32(p, true) !== 0x02014b50) break; // firma de entrada del directorio central
        const method = dv.getUint16(p + 10, true);
        const compSize = dv.getUint32(p + 20, true);
        const nameLen = dv.getUint16(p + 28, true);
        const extraLen = dv.getUint16(p + 30, true);
        const commentLen = dv.getUint16(p + 32, true);
        const localOffset = dv.getUint32(p + 42, true);
        const name = new TextDecoder().decode(data.subarray(p + 46, p + 46 + nameLen));
        if (name === 'word/document.xml') { target = { method, compSize, localOffset }; break; }
        p += 46 + nameLen + extraLen + commentLen;
    }
    if (!target) throw new Error('No se encontró el contenido del documento.');

    // Cabecera local para saber dónde empiezan los datos comprimidos.
    const lo = target.localOffset;
    if (dv.getUint32(lo, true) !== 0x04034b50) throw new Error('El .docx está dañado.');
    const lNameLen = dv.getUint16(lo + 26, true);
    const lExtraLen = dv.getUint16(lo + 28, true);
    const dataStart = lo + 30 + lNameLen + lExtraLen;
    const compData = data.subarray(dataStart, dataStart + target.compSize);

    const xmlBytes = target.method === 0 ? compData : await inflateRaw(compData);
    const xml = new TextDecoder().decode(xmlBytes);

    // Convertir el XML de Word a texto plano: párrafos → saltos de línea, tabs, y quitar etiquetas.
    const text = xml
        .replace(/<w:p[ >\/]/g, '\n<w:p ')
        .replace(/<w:tab\b[^>]*\/?>/g, '\t')
        .replace(/<w:br\b[^>]*\/?>/g, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"').replace(/&apos;/g, "'");

    return text.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** ¿El archivo es un .docx? (por extensión o mime) */
export function isDocx(file: File): boolean {
    return /\.docx$/i.test(file.name) || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
}
