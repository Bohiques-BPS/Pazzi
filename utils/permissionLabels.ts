/**
 * Las etiquetas del catálogo de permisos llegan del servidor en español.
 * Si existe traducción en el diccionario ('perm.<clave>' / 'permcat.<categoría>'), se usa; si no, el texto del servidor.
 */
type T = (key: string, params?: Record<string, string | number>) => string;

export const permLabel = (t: T, key: string, fallback: string): string => {
  const k = `perm.${key}`;
  const v = t(k);
  return v && v !== k ? v : fallback;
};

export const permCategoryLabel = (t: T, key: string, fallback: string): string => {
  const k = `permcat.${key}`;
  const v = t(k);
  return v && v !== k ? v : fallback;
};
