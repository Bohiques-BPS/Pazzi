/**
 * HTML del editor enriquecido → texto plano para vistas previas (tarjetas, listas).
 * Quita etiquetas y decodifica entidades (&nbsp;, &amp;, &aacute;…) sin ejecutar nada:
 * DOMParser no corre scripts ni carga recursos.
 */
export function htmlToPlainText(html?: string | null): string {
  if (!html) return '';
  // Separar bloques/saltos para que las palabras de párrafos distintos no se peguen.
  const spaced = html.replace(/<(br|\/p|\/div|\/li|\/h[1-6])[^>]*>/gi, ' $&');
  try {
    const doc = new DOMParser().parseFromString(spaced, 'text/html');
    return (doc.body.textContent || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
  } catch {
    return spaced.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  }
}
