export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
export const API_URL = API_BASE;

interface ApiOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

class ApiError extends Error {
  public status: number;
  public errors?: any[];

  constructor(message: string, status: number, errors?: any[]) {
    super(message);
    this.status = status;
    this.errors = errors;
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
  const { params, ...fetchOptions } = options;
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

  if (res.status === 401 && token) {
    const newToken = await refreshAuthToken();
    if (newToken) {
      headers.Authorization = `Bearer ${newToken}`;
      res = await fetch(url, { ...fetchOptions, headers });
    }
  }

  if (!res.ok) {
    let errorData: any;
    try {
      errorData = await res.json();
    } catch {
      errorData = { error: `Error ${res.status}: ${res.statusText}` };
    }
    throw new ApiError(
      errorData.error || errorData.message || 'Error de conexión',
      res.status,
      errorData.errors
    );
  }

  return res.json();
}

export const api = {
  get: <T>(endpoint: string, params?: Record<string, any>) =>
    request<T>(endpoint, { method: 'GET', params }),

  post: <T>(endpoint: string, body?: any) =>
    request<T>(endpoint, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),

  put: <T>(endpoint: string, body?: any) =>
    request<T>(endpoint, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),

  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: 'DELETE' }),

  upload: <T>(endpoint: string, formData: FormData) => {
    const token = localStorage.getItem('pazzi_token');
    return fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    }).then(async (res) => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Error de conexión' }));
        throw new ApiError(err.error, res.status);
      }
      return res.json() as Promise<T>;
    });
  },
};

export { ApiError };
