'use client';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export class ApiError extends Error {
  status: number;
  code?: string;
  extra?: Record<string, unknown>;

  constructor(status: number, message: string, code?: string, extra?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

/** access token فقط در حافظه؛ refresh token در کوکی HttpOnly نزد سرور است */
let accessToken: string | null = null;
export const setAccessToken = (t: string | null) => {
  accessToken = t;
};

/**
 * کلاینت مستقل برای هر نوع نشست (پنل مدیر / پورتال عضو) تا توکن‌ها با هم قاطی نشوند.
 * کوکی HttpOnly مشترک است؛ refresh مسیر /auth را برای هر دو برمی‌گرداند.
 */
export function createApiClient(getToken: () => string | null, setToken: (t: string | null) => void) {
  async function raw(path: string, init?: RequestInit): Promise<Response> {
    const headers = new Headers(init?.headers);
    headers.set('content-type', 'application/json');
    const t = getToken();
    if (t) headers.set('authorization', `Bearer ${t}`);
    return fetch(`${BASE}${path}`, { ...init, headers, credentials: 'include' });
  }

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    let res = await raw(path, init);
    if (res.status === 401 && !path.startsWith('/auth/')) {
      const refreshed = await raw('/auth/refresh', { method: 'POST', body: '{}' });
      if (refreshed.ok) {
        const data = (await refreshed.json()) as { accessToken?: string };
        if (data.accessToken) setToken(data.accessToken);
        res = await raw(path, init);
      }
    }
    if (!res.ok) {
      let body: Record<string, unknown> = {};
      try {
        body = (await res.json()) as Record<string, unknown>;
      } catch {
        /* پاسخ غیر JSON */
      }
      const message = typeof body.message === 'string' ? body.message : 'خطای ارتباط با سرور';
      const code = typeof body.code === 'string' ? body.code : undefined;
      const { statusCode: _s, message: _m, code: _c, ...extra } = body;
      throw new ApiError(res.status, message, code, extra);
    }
    return (await res.json()) as T;
  }

  return {
    get: <T,>(path: string) => request<T>(path),
    post: <T,>(path: string, body?: unknown, headers?: Record<string, string>) =>
      request<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}), headers }),
    patch: <T,>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body ?? {}) }),
    delete: <T,>(path: string) => request<T>(path, { method: 'DELETE' }),
  };
}

/** نشست پنل مدیر/پذیرش */
export const api = createApiClient(
  () => accessToken,
  (t) => {
    accessToken = t;
  },
);
