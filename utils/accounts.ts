/**
 * Multi-cuenta estilo Google: permite tener varias sesiones conectadas y cambiar entre ellas
 * sin volver a escribir la contraseña. Cada cuenta guarda su propio token + refreshToken + user.
 *
 * La cuenta ACTIVA es la que vive en las llaves clásicas (pazzi_token / pazzi_refresh_token /
 * pazzi_user) que usa services/api. Aquí solo mantenemos, además, la LISTA de cuentas conectadas
 * para poder alternar. Todo en localStorage de este dispositivo (igual que la sesión actual).
 */

const KEY = 'pazzi_accounts';
const TOKEN_KEY = 'pazzi_token';
const REFRESH_KEY = 'pazzi_refresh_token';
const USER_KEY = 'pazzi_user';

export interface StoredAccount {
  id: string;
  name: string;
  lastName?: string;
  email: string;
  role: string;
  profilePictureUrl?: string | null;
  token: string;
  refreshToken: string;
  /** Objeto User completo que se restaura en pazzi_user al activar la cuenta. */
  user: any;
}

function read(): StoredAccount[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((a: any) => a && a.id && a.token && a.refreshToken) : [];
  } catch {
    return [];
  }
}

function write(list: StoredAccount[]): void {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* storage bloqueado */ }
}

/** Info liviana (sin tokens) para pintar la UI. */
export interface AccountInfo {
  id: string;
  name: string;
  lastName?: string;
  email: string;
  role: string;
  profilePictureUrl?: string | null;
}

export function listAccounts(): AccountInfo[] {
  return read().map(({ id, name, lastName, email, role, profilePictureUrl }) => ({ id, name, lastName, email, role, profilePictureUrl }));
}

/** Agrega o actualiza una cuenta (por id de usuario). La deja de primera. */
export function upsertAccount(user: any, token: string, refreshToken: string): void {
  if (!user?.id || !token || !refreshToken) return;
  const rest = read().filter(a => a.id !== user.id);
  const entry: StoredAccount = {
    id: user.id,
    name: user.name,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    profilePictureUrl: user.profilePictureUrl ?? null,
    token,
    refreshToken,
    user,
  };
  write([entry, ...rest]);
}

/** Quita una cuenta de la lista. Devuelve la siguiente candidata a activar (o null). */
export function removeAccount(id: string): AccountInfo | null {
  const rest = read().filter(a => a.id !== id);
  write(rest);
  const next = rest[0];
  return next ? { id: next.id, name: next.name, lastName: next.lastName, email: next.email, role: next.role, profilePictureUrl: next.profilePictureUrl } : null;
}

/** Id de la cuenta activa (según pazzi_user). */
export function activeAccountId(): string | null {
  try { const u = JSON.parse(localStorage.getItem(USER_KEY) || 'null'); return u?.id || null; } catch { return null; }
}

/** Copia las llaves de la cuenta guardada a las llaves activas. Devuelve true si existía. */
export function activateAccount(id: string): boolean {
  const a = read().find(x => x.id === id);
  if (!a) return false;
  try {
    localStorage.setItem(TOKEN_KEY, a.token);
    localStorage.setItem(REFRESH_KEY, a.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(a.user));
    return true;
  } catch {
    return false;
  }
}

/**
 * Sincroniza la cuenta guardada con las llaves activas (tras un refresh de token, el
 * access/refresh token o el user pudieron rotar). Se llama desde services/api al refrescar.
 */
export function syncStoredFromActive(): void {
  try {
    const user = JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    const token = localStorage.getItem(TOKEN_KEY);
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    if (user?.id && token && refreshToken) upsertAccount(user, token, refreshToken);
  } catch { /* noop */ }
}
