/**
 * Carga una imagen (URL http(s) o data URI) y la devuelve como data URL, para poder
 * incrustarla en un PDF de jsPDF (`doc.addImage`). Devuelve null si no se puede cargar
 * (CORS, 404, etc.) — el llamador simplemente omite el logo.
 */
export async function loadImageAsDataUrl(url?: string | null): Promise<string | null> {
    if (!url) return null;
    if (url.startsWith('data:')) return url;
    try {
        const res = await fetch(url, { mode: 'cors' });
        if (!res.ok) return null;
        const blob = await res.blob();
        return await new Promise<string | null>((resolve) => {
            const r = new FileReader();
            r.onloadend = () => resolve(typeof r.result === 'string' ? r.result : null);
            r.onerror = () => resolve(null);
            r.readAsDataURL(blob);
        });
    } catch {
        return null;
    }
}

/** Formato de imagen ('PNG' | 'JPEG') a partir de un data URL, para jsPDF.addImage. */
export function dataUrlFormat(dataUrl: string): 'PNG' | 'JPEG' {
    return /^data:image\/jpe?g/i.test(dataUrl) ? 'JPEG' : 'PNG';
}
