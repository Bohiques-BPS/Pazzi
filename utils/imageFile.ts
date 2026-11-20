/**
 * Validación de imágenes ANTES de mostrarlas en la vista previa: si no se acepta, no debe aparecer.
 * El servidor de imágenes (Cloudinary) rechaza archivos muy pesados; 5 MB deja margen.
 */
export const MAX_IMAGE_MB = 5;

/** Mensaje de error si el archivo no sirve como imagen (o null si está bien). */
export function imageFileError(file: File, maxMb = MAX_IMAGE_MB): string | null {
    if (!/^image\//.test(file.type || '')) return 'El archivo no es una imagen.';
    if (file.size > maxMb * 1024 * 1024) {
        const mb = (file.size / (1024 * 1024)).toFixed(1);
        return `La imagen pesa ${mb} MB; el máximo es ${maxMb} MB. Use una imagen más liviana.`;
    }
    return null;
}

/** Mensaje del servidor al fallar la subida (o uno genérico). */
export async function uploadErrorMessage(res: Response): Promise<string> {
    const body = await res.json().catch(() => null);
    if (res.status === 413) return `La imagen es demasiado pesada para el servidor (máx. ${MAX_IMAGE_MB} MB).`;
    return (body && (body.error || body.message)) || 'No se pudo subir la imagen al servidor.';
}
