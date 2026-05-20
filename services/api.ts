export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
/** Alias retro-compatible. Nuevo código debe importar `API_BASE`. */
export const API_URL = API_BASE;

interface ApiOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  /** Si true, no intenta refresh ante 401 (usado por el propio /auth/refresh). */
  skipAuthRefresh?: boolean;
}

class ApiError extends Error {
  public status: number;
  public errors?: any[];
  public code?: string;

  constructor(message: string, status: number, errors?: any[], code?: string) {
    super(message);
    this.status = status;
    this.errors = errors;
    this.code = code;
  }
}

type ApiErrorListener = (err: ApiError) => void;
const listeners: Set<ApiErrorListener> = new Set();

/**
 * Suscribirse a errores del API (útil para mostrar toasts globales sin
 * acoplar `api.ts` al sistema de toasts).
 */
export function onApiError(listener: ApiErrorListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit(err: ApiError) {
  for (const l of listeners) {
    try {
      l(err);
    } catch {
      // ignorar errores de listeners
    }
  }
}

async function refreshAuthToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('pazzi_refresh_token');
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      localStorage.removeItem('pazzi_token');
      localStorage.removeItem('pazzi_refresh_token');
      localStorage.removeItem('pazzi_user');
      return null;
    }

    const data = await res.json();
    localStorage.setItem('pazzi_token', data.token);
    if (data.refreshToken) {
      localStorage.setItem('pazzi_refresh_token', data.refreshToken);
    }
    if (data.user) {
      localStorage.setItem('pazzi_user', JSON.stringify(data.user));
    }
    return data.token;
  } catch {
    return null;
  }
}

async function request<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { params, skipAuthRefresh, ...fetchOptions } = options;
  const token = localStorage.getItem('pazzi_token');

  let url = `${API_BASE}${endpoint}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        searchParams.set(key, String(value));
      }
    });
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(fetchOptions.headers as Record<string, string> || {}),
  };

  let res = await fetch(url, { ...fetchOptions, headers });

  if (res.status === 401 && token && !skipAuthRefresh) {
    const newToken = await refreshAuthToken();
    if (newToken) {
      headers.Authorization = `Bearer ${newToken}`;
      res = await fetch(url, { ...fetchOptions, headers });
    }
  }

  if (!res.ok) {
    let errorData: any = {};
    try {
      errorData = await res.json();
    } catch {
      errorData = { error: `Error ${res.status}: ${res.statusText}` };
    }

    const message =
      errorData.error ||
      errorData.message ||
      (res.status === 403 ? 'No tienes permisos para esta acción' :
       res.status === 429 ? 'Demasiadas solicitudes. Intenta en unos minutos.' :
       res.status === 500 ? 'Error interno del servidor' :
       'Error de conexión');

    const apiErr = new ApiError(message, res.status, errorData.errors, errorData.code);
    emit(apiErr);
    throw apiErr;
  }

  // Algunos endpoints (ej. delete) pueden devolver 204 o cuerpo vacío
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const api = {
  get: <T>(endpoint: string, params?: Record<string, any>) =>
    request<T>(endpoint, { method: 'GET', params }),

  post: <T>(endpoint: string, body?: any, options?: ApiOptions) =>
    request<T>(endpoint, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...options,
    }),

  put: <T>(endpoint: string, body?: any) =>
    request<T>(endpoint, { method: 'PUT', body: body !== undefined ? JSON.stringify(body) : undefined }),

  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: 'DELETE' }),

  upload: <T>(endpoint: string, formData: FormData) => {
    const token = localStorage.getItem('pazzi_token');
    return fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    }).then(async (res) => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Error de conexión' }));
        const apiErr = new ApiError(err.error || 'Error al subir archivo', res.status, err.errors, err.code);
        emit(apiErr);
        throw apiErr;
      }
      return res.json() as Promise<T>;
    });
  },
};

export { ApiError };
