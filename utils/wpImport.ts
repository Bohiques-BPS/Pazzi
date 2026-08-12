/**
 * Ayudantes para importar exportaciones de WordPress / WooCommerce de forma inteligente.
 * Se usan como `transform` en los campos del ImportModal.
 */

/** Quita etiquetas HTML y decodifica entidades básicas; colapsa espacios. */
export function stripHtml(v: any): string | undefined {
    if (v == null || v === '') return undefined;
    let s = String(v)
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<\/(p|div|h[1-6]|li)>/gi, ' ')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#0?39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
    return s || undefined;
}

/** Extrae la primera URL de imagen del campo `images` de WooCommerce
 *  (formato: "https://... ! alt : ... ! title : ...", varias separadas por "|"). */
export function firstImageUrl(v: any): string | undefined {
    if (!v) return undefined;
    const first = String(v).split('|')[0].split('!')[0].trim();
    return /^https?:\/\//i.test(first) ? first : undefined;
}

/** Toma la primera ruta de categoría (varias separadas por "|" o ","). */
function firstCatPath(v: any): string[] {
    if (!v) return [];
    const first = String(v).split(/[|,]/)[0];
    return first.split('>').map(x => x.trim()).filter(Boolean);
}

/** Categoría = último segmento de la ruta ("Servicios > Pago único" → "Pago único").
 *  Para un valor plano ("Bebidas") devuelve ese valor. */
export function categoryFromPath(v: any): string | undefined {
    const parts = firstCatPath(v);
    return parts.length ? parts[parts.length - 1] : undefined;
}

/** Departamento = primer segmento de la ruta ("Servicios > Pago único" → "Servicios").
 *  Para un valor plano lo devuelve tal cual (sirve también para columnas de departamento no-WP). */
export function departmentFromPath(v: any): string | undefined {
    const parts = firstCatPath(v);
    return parts.length ? parts[0] : undefined;
}

/** Convierte un slug ("sistemas-it-y-programacion") en un nombre legible ("Sistemas It Y Programacion"). */
export function slugToName(v: any): string | undefined {
    const s = String(v ?? '').trim();
    if (!s) return undefined;
    return s.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/** Estado WordPress/booleano → activo. "Publicada"/"publish"/"1"/"sí" = true; "Borrador"/"draft" = false. */
export function statusToActive(v: any): boolean | undefined {
    const s = String(v ?? '').trim().toLowerCase();
    if (!s) return undefined;
    if (['borrador', 'draft', 'pending', 'trash', 'private', '0', 'false', 'no'].includes(s)) return false;
    return ['publicada', 'publicado', 'publish', 'published', 'activo', 'active', '1', 'true', 'si', 'sí', 'x'].includes(s) ? true : undefined;
}

/** Precio: usa el valor y, si viene vacío, intenta `sale_price`/`regular_price` de la fila. */
export function priceOf(raw: any, row: Record<string, any>): number | undefined {
    const pick = (x: any) => {
        const n = parseFloat(String(x ?? '').replace(/[^0-9.\-]/g, ''));
        return isNaN(n) ? undefined : n;
    };
    return pick(raw) ?? pick(row?.['regular_price']) ?? pick(row?.['sale_price']) ?? pick(row?.['price']);
}

/** Nombre desde first_name/display_name; apellido desde last_name. */
export function firstName(raw: any, row: Record<string, any>): string | undefined {
    const v = String(raw ?? '').trim();
    if (v) return v;
    const disp = String(row?.['display_name'] ?? row?.['user_nicename'] ?? '').trim();
    return disp ? disp.split(' ')[0] : undefined;
}
export function lastName(raw: any, row: Record<string, any>): string | undefined {
    const v = String(raw ?? '').trim();
    if (v) return v;
    const disp = String(row?.['display_name'] ?? '').trim();
    const parts = disp.split(' ');
    return parts.length > 1 ? parts.slice(1).join(' ') : undefined;
}
