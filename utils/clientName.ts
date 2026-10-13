/**
 * Nombre del cliente para DOCUMENTOS (factura, recibo, reimpresión, estado de cuenta).
 * Si el cliente tiene "Nombre para documentos" (displayName, p.ej. el nombre de su empresa), se usa
 * ese; si no, Nombre + Apellido. Misma regla que el backend al generar los PDF.
 */
export function clientDocName(c?: { name?: string | null; lastName?: string | null; displayName?: string | null } | null): string {
  if (!c) return '';
  const alias = (c.displayName || '').trim();
  return alias || `${c.name || ''} ${c.lastName || ''}`.trim();
}
