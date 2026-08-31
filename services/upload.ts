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
