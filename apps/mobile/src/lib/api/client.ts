export class ApiError extends Error {
  status: number;
  code?: string;
  body?: unknown;
  constructor(status: number, message: string, code?: string, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.body = body;
  }
}

/** فقط refresh token ماندگار است (Keychain/Keystore)؛ access token فقط در حافظه می‌ماند */
export interface TokenStore {
  getRefresh(): Promise<string | null>;
  setRefresh(token: string | null): Promise<void>;
}
export interface Session {
  accessToken: string;
  refreshToken: string;
}
export type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body?: string },
) => Promise<{ status: number; ok: boolean; text(): Promise<string> }>;

export interface ClientOptions {
  baseUrl: string;
  store: TokenStore;
  fetchFn?: FetchLike;
  /** وقتی نشست قطعی باطل شد (refresh رد شد) */
  onSignedOut?: () => void;
}
export interface RequestOptions {
  query?: Record<string, string | number | boolean | null | undefined>;
  body?: unknown;
  /** false برای مسیرهای عمومی (ورود): نه توکن می‌فرستد و نه با ۴۰۱ refresh می‌زند */
  auth?: boolean;
}

export function buildQuery(q?: RequestOptions['query']): string {
  if (!q) return '';
  const parts: string[] = [];
  for (const [k, v] of Object.entries(q)) {
    if (v === undefined || v === null || v === '') continue;
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  }
  return parts.length ? `?${parts.join('&')}` : '';
}

function errorFrom(status: number, text: string): ApiError {
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  const b = (body ?? {}) as { message?: string | string[]; code?: string };
  const message = Array.isArray(b.message) ? b.message.join('، ') : (b.message ?? `خطای ${status}`);
  return new ApiError(status, message, b.code, body);
}

export function createApiClient(opts: ClientOptions) {
  const { baseUrl, store } = opts;
  const fetchFn: FetchLike = opts.fetchFn ?? ((url, init) => fetch(url, init));
  let access: string | null = null;
  let refreshing: Promise<boolean> | null = null;

  async function call(url: string, method: string, headers: Record<string, string>, body?: unknown) {
    try {
      return await fetchFn(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    } catch {
      throw new ApiError(0, 'اتصال به سرور برقرار نشد', 'NETWORK');
    }
  }

  async function doRefresh(): Promise<boolean> {
    const rt = await store.getRefresh();
    if (!rt) return false;
    const res = await call(`${baseUrl}/auth/refresh`, 'POST', { 'Content-Type': 'application/json' }, { refreshToken: rt });
    const text = await res.text();
    if (!res.ok) {
      // خطای سرور یا محدودیت نرخ: نشست حفظ می‌شود؛ فقط ردشدن قطعی توکن کاربر را بیرون می‌اندازد
      if (res.status >= 500 || res.status === 429) throw errorFrom(res.status, text);
      access = null;
      await store.setRefresh(null);
      return false;
    }
    const b = JSON.parse(text) as { accessToken: string; refreshToken: string };
    access = b.accessToken;
    await store.setRefresh(b.refreshToken);
    return true;
  }

  /** چند درخواست هم‌زمان با توکن منقضی فقط یک refresh می‌سازند */
  function refresh(): Promise<boolean> {
    if (!refreshing) {
      refreshing = doRefresh().finally(() => {
        refreshing = null;
      });
    }
    return refreshing;
  }

  async function request<T>(method: string, path: string, o: RequestOptions = {}): Promise<T> {
    const url = `${baseUrl}${path}${buildQuery(o.query)}`;
    const authed = o.auth !== false;
    let used: string | null = null;
    const send = () => {
      const headers: Record<string, string> = { Accept: 'application/json' };
      if (o.body !== undefined) headers['Content-Type'] = 'application/json';
      used = authed ? access : null;
      if (used) headers.Authorization = `Bearer ${used}`;
      return call(url, method, headers, o.body);
    };

    let res = await send();
    if (res.status === 401 && authed) {
      if (access && access !== used) {
        res = await send(); // در همین فاصله توکن تازه شده است
      } else if (await refresh()) {
        res = await send();
      } else {
        opts.onSignedOut?.();
      }
    }
    const text = await res.text();
    if (!res.ok) throw errorFrom(res.status, text);
    return (text ? JSON.parse(text) : undefined) as T;
  }

  return {
    request,
    get: <T>(path: string, o?: RequestOptions) => request<T>('GET', path, o),
    post: <T>(path: string, body?: unknown, o?: RequestOptions) => request<T>('POST', path, { ...o, body }),
    patch: <T>(path: string, body?: unknown, o?: RequestOptions) => request<T>('PATCH', path, { ...o, body }),
    async setSession(s: Session) {
      access = s.accessToken;
      await store.setRefresh(s.refreshToken);
    },
    async clearSession() {
      access = null;
      await store.setRefresh(null);
    },
    /** در شروع اپ: با refresh ذخیره‌شده نشست را برمی‌گرداند */
    restore: () => refresh(),
    refreshToken: () => store.getRefresh(),
  };
}
export type ApiClient = ReturnType<typeof createApiClient>;
