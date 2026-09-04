import * as pdfjsLib from 'pdfjs-dist';
// El worker de pdf.js lo sirve Vite como URL (se carga en un Web Worker aparte).
// @ts-ignore - import con ?url resuelto por Vite
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

(pdfjsLib as any).GlobalWorkerOptions.workerSrc = workerUrl;

export function isPdf(file: File): boolean {
    return file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
}

/** Extrae el texto de un PDF en el navegador (hasta 50 páginas por seguridad). */
export async function extractPdfText(file: File): Promise<string> {
    const buf = await file.arrayBuffer();
    const pdf = await (pdfjsLib as any).getDocument({ data: buf }).promise;
    const parts: string[] = [];
    const maxPages = Math.min(pdf.numPages, 50);
    for (let i = 1; i <= maxPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const line = (content.items || []).map((it: any) => (it.str || '')).join(' ');
        if (line.trim()) parts.push(line);
    }
    try { await pdf.destroy(); } catch { /* noop */ }
    return parts.join('\n\n').replace(/[ \t]+\n/g, '\n').trim();
}
