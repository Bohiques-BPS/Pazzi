import { API_URL } from './api';

/** Sube una imagen al backend (Cloudinary) y devuelve su URL pública. */
export async function uploadImage(file: File): Promise<string> {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('pazzi_token')}` },
        body: fd,
    });
    if (!res.ok) throw new Error('No se pudo subir la imagen.');
    const data = await res.json();
    if (!data?.url) throw new Error('El servidor no devolvió la URL de la imagen.');
    return data.url as string;
}

/** Sube cualquier archivo (PDF, Word, Excel, imagen…) y devuelve su URL pública. */
export async function uploadFile(file: File): Promise<string> {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('pazzi_token')}` },
        body: fd,
    });
    if (res.status === 413) throw new Error(`"${file.name}" es demasiado grande.`);
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `No se pudo subir "${file.name}".`);
    }
    const data = await res.json();
    if (!data?.url) throw new Error('El servidor no devolvió la URL del archivo.');
    return data.url as string;
}
