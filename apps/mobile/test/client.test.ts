import { describe, it, expect } from 'vitest';
import { ApiError, buildQuery, createApiClient } from '../src/lib/api/client.ts';
import { makeApi } from '../src/lib/api/endpoints.ts';

type Init = { method: string; headers: Record<string, string>; body?: string };
type Reply = { status: number; body?: unknown };
const BASE = 'http://x/api/v1';

function setup(route: (path: string, init: Init) => Reply | Promise<Reply>, initialRefresh: string | null = null) {
  const calls: { path: string; method: string; auth?: string; body?: string }[] = [];
  const store = {
    value: initialRefresh as string | null,
    async getRefresh() { return this.value; },
    async setRefresh(t: string | null) { this.value = t; },
  };
  let signedOut = 0;
  const client = createApiClient({
    baseUrl: BASE,
    store,
    onSignedOut: () => { signedOut++; },
    fetchFn: async (url, init) => {
      const path = url.slice(BASE.length);
      calls.push({ path, method: init.method, auth: init.headers.Authorization, body: init.body });
      const r = await route(path, init);
      return { status: r.status, ok: r.status >= 200 && r.status < 300, text: async () => (r.body === undefined ? '' : JSON.stringify(r.body)) };
    },
  });
  return { client, calls, store, signedOut: () => signedOut };
}
const rejects = async (p: Promise<unknown>): Promise<ApiError> => {
  try { await p; } catch (e) { return e as ApiError; }
  throw new Error('باید رد می‌شد');
};

describe('buildQuery', () => {
  it('مقدارهای خالی حذف و بقیه کدگذاری می‌شوند', () => {
    expect(buildQuery({ a: 1, b: undefined, c: 'x y', d: true, e: null, f: '' })).toBe('?a=1&c=x%20y&d=true');
    expect(buildQuery({})).toBe('');
    expect(buildQuery(undefined)).toBe('');
  });
});

describe('توکن و refresh', () => {
  it('Bearer ارسال می‌شود', async () => {
    const { client, calls } = setup(() => ({ status: 200, body: { ok: 1 } }));
    await client.setSession({ accessToken: 'acc', refreshToken: 'r1' });
    await client.get('/me');
    expect(calls[0]?.auth).toBe('Bearer acc');
  });
  it('۴۰۱ یک‌بار refresh و تکرار می‌شود و توکن چرخیده ذخیره می‌شود', async () => {
    const { client, calls, store } = setup((path, init) => {
      if (path === '/auth/refresh') return { status: 200, body: { accessToken: 'new', refreshToken: 'r2' } };
      return init.headers.Authorization === 'Bearer new' ? { status: 200, body: { ok: 1 } } : { status: 401 };
    });
    await client.setSession({ accessToken: 'old', refreshToken: 'r1' });
    expect(await client.get('/me')).toEqual({ ok: 1 });
    expect(calls.map((c) => c.path).join()).toBe('/me,/auth/refresh,/me');
    expect(calls[1]?.body).toBe('{"refreshToken":"r1"}');
    expect(store.value).toBe('r2');
  });
  it('سه درخواست هم‌زمان فقط یک refresh می‌سازند', async () => {
    const { client, calls } = setup((path, init) => {
      if (path === '/auth/refresh') return { status: 200, body: { accessToken: 'new', refreshToken: 'r2' } };
      return init.headers.Authorization === 'Bearer new' ? { status: 200, body: { ok: 1 } } : { status: 401 };
    });
    await client.setSession({ accessToken: 'old', refreshToken: 'r1' });
    await Promise.all([client.get('/me'), client.get('/me'), client.get('/me')]);
    expect(calls.filter((c) => c.path === '/auth/refresh').length).toBe(1);
  });
  it('ردشدن refresh: نشست پاک و خروج اعلام می‌شود', async () => {
    const { client, store, signedOut } = setup((path) => (path === '/auth/refresh' ? { status: 401 } : { status: 401 }));
    await client.setSession({ accessToken: 'old', refreshToken: 'r1' });
    const err = await rejects(client.get('/me'));
    expect(err.status).toBe(401);
    expect(store.value).toBe(null);
    expect(signedOut()).toBe(1);
  });
  it('قطع اینترنت هنگام refresh نشست را نگه می‌دارد', async () => {
    const { client, store, signedOut } = setup((path) => {
      if (path === '/auth/refresh') throw new Error('offline');
      return { status: 401 };
    });
    await client.setSession({ accessToken: 'old', refreshToken: 'r1' });
    const err = await rejects(client.get('/me'));
    expect(err.status).toBe(0);
    expect(err.code).toBe('NETWORK');
    expect(store.value).toBe('r1');
    expect(signedOut()).toBe(0);
  });
  it('خطای ۵۰۰ هنگام refresh نشست را نگه می‌دارد', async () => {
    const { client, store, signedOut } = setup((path) => (path === '/auth/refresh' ? { status: 503 } : { status: 401 }));
    await client.setSession({ accessToken: 'old', refreshToken: 'r1' });
    const err = await rejects(client.get('/me'));
    expect(err.status).toBe(503);
    expect(store.value).toBe('r1');
    expect(signedOut()).toBe(0);
  });
  it('restore در شروع اپ با refresh ذخیره‌شده', async () => {
    const { client } = setup(() => ({ status: 200, body: { accessToken: 'a', refreshToken: 'b' } }), 'saved');
    expect(await client.restore()).toBe(true);
    const none = setup(() => ({ status: 200 }), null);
    expect(await none.client.restore()).toBe(false);
  });
});

describe('خطاها و مسیرهای عمومی', () => {
  it('خطای ۴۰۹ با code و جزئیات', async () => {
    const { client } = setup(() => ({ status: 409, body: { message: 'این شماره قبلاً ثبت شده است', code: 'MEMBER_EXISTS', existingMemberId: 'x' } }));
    await client.setSession({ accessToken: 'a', refreshToken: 'r' });
    const err = await rejects(client.post('/members', { name: 'a' }));
    expect(err.status).toBe(409);
    expect(err.code).toBe('MEMBER_EXISTS');
    expect((err.body as { existingMemberId: string }).existingMemberId).toBe('x');
  });
  it('message آرایه‌ای به‌هم چسبانده می‌شود', async () => {
    const { client } = setup(() => ({ status: 400, body: { message: ['الف', 'ب'] } }));
    await client.setSession({ accessToken: 'a', refreshToken: 'r' });
    expect((await rejects(client.get('/x'))).message).toBe('الف، ب');
  });
  it('مسیر عمومی: بدون توکن و بدون refresh', async () => {
    const { client, calls, signedOut } = setup(() => ({ status: 401, body: { message: 'کد نامعتبر یا منقضی است' } }), 'r1');
    await client.setSession({ accessToken: 'acc', refreshToken: 'r1' });
    const err = await rejects(client.post('/auth/otp/verify', { phone: '0' }, { auth: false }));
    expect(err.status).toBe(401);
    expect(calls.length).toBe(1);
    expect(calls[0]?.auth).toBe(undefined);
    expect(signedOut()).toBe(0);
  });
  it('بدنه‌ی خالی', async () => {
    const { client } = setup(() => ({ status: 200 }));
    await client.setSession({ accessToken: 'a', refreshToken: 'r' });
    expect(await client.get('/x')).toBe(undefined);
  });
});

describe('makeApi', () => {
  it('verifyOtp نشست را می‌گذارد و درخواست بعدی توکن دارد', async () => {
    const { client, calls, store } = setup((path) =>
      path === '/auth/otp/verify'
        ? { status: 200, body: { accessToken: 'acc', refreshToken: 'ref', expiresIn: 900, subject: { type: 'USER', role: 'OWNER', gymId: 'g', name: 'n' } } }
        : { status: 200, body: { type: 'user', role: 'OWNER', gymId: 'g' } },
    );
    const api = makeApi(client);
    await api.verifyOtp('09120000001', '12345');
    await api.me();
    expect(calls[0]?.auth).toBe(undefined);
    expect(calls[0]?.body).toBe('{"phone":"09120000001","purpose":"manager","code":"12345"}');
    expect(calls[1]?.auth).toBe('Bearer acc');
    expect(store.value).toBe('ref');
  });
  it('پارامترهای فهرست اعضا', async () => {
    const { client, calls } = setup(() => ({ status: 200, body: { items: [] } }));
    await client.setSession({ accessToken: 'a', refreshToken: 'r' });
    const api = makeApi(client);
    await api.members({ q: '  ', status: 'expiring', debtor: false, limit: 100 });
    await api.members({ q: ' نگار ', debtor: true, page: 2 });
    expect(calls[0]?.path).toBe('/members?status=expiring&limit=100');
    expect(calls[1]?.path).toBe('/members?q=%D9%86%DA%AF%D8%A7%D8%B1&debtor=true&page=2');
  });
  it('خروج: سرور صدا زده و نشست محلی پاک می‌شود، حتی اگر اینترنت قطع باشد', async () => {
    const { client, store } = setup(() => { throw new Error('offline'); });
    await client.setSession({ accessToken: 'a', refreshToken: 'r' });
    await makeApi(client).logout();
    expect(store.value).toBe(null);
  });
  it('تمدید و پرداخت بدهی به مسیر درست با بدنه‌ی درست می‌روند', async () => {
    const { client, calls } = setup(() => ({ status: 201, body: {} }));
    await client.setSession({ accessToken: 'a', refreshToken: 'r' });
    const api = makeApi(client);
    await api.renew('m1', { planId: 'p', paidAmount: 5, method: 'CASH' });
    await api.payDebt('m1', { amount: 3, method: 'POS' });
    await api.createMember({ name: 'علی', phone: '09123456789' });
    expect(calls.map((c) => `${c.method} ${c.path}`).join()).toBe('POST /members/m1/subscriptions,POST /members/m1/payments,POST /members');
    expect(calls[0]?.body).toBe('{"planId":"p","paidAmount":5,"method":"CASH"}');
    expect(calls[1]?.body).toBe('{"amount":3,"method":"POS"}');
  });
  it('ویرایش، بایگانی، بازگردانی و گزارش به مسیر درست می‌روند', async () => {
    const { client, calls } = setup(() => ({ status: 200, body: {} }));
    await client.setSession({ accessToken: 'a', refreshToken: 'r' });
    const api = makeApi(client);
    await api.updateMember('m1', { note: null });
    await api.archive('m1');
    await api.restore('m1');
    await api.report({ year: 1405, month: 7 });
    await api.report();
    await api.members({ archived: true });
    expect(calls.map((c) => `${c.method} ${c.path}`).join()).toBe(
      'PATCH /members/m1,POST /members/m1/archive,POST /members/m1/restore,GET /reports/monthly?year=1405&month=7,GET /reports/monthly,GET /members?archived=true',
    );
    expect(calls[0]?.body).toBe('{"note":null}');
  });
});
