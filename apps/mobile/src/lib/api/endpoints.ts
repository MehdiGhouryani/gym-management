import type { ApiClient } from './client';
import type {
  CreateMemberBody, GymDto, HistoryDto, MemberCounts, MemberDto, MemberPage, MembersQuery, Me, PayBody, PayResult,
  MonthlyReport, PlanDto, RenewBody, RenewResult, UpdateMemberBody, VerifyResult,
} from './types';

export function makeApi(c: ApiClient) {
  return {
    requestOtp: (phone: string) =>
      c.post<{ ok: boolean; retryAfterSec: number }>('/auth/otp/request', { phone, purpose: 'manager' }, { auth: false }),

    async verifyOtp(phone: string, code: string): Promise<VerifyResult> {
      const r = await c.post<VerifyResult>('/auth/otp/verify', { phone, purpose: 'manager', code }, { auth: false });
      await c.setSession({ accessToken: r.accessToken, refreshToken: r.refreshToken });
      return r;
    },

    async logout() {
      const rt = await c.refreshToken();
      if (rt) {
        try {
          await c.post('/auth/logout', { refreshToken: rt }, { auth: false });
        } catch {
          // حتی اگر سرور در دسترس نبود، نشست محلی پاک می‌شود
        }
      }
      await c.clearSession();
    },

    me: () => c.get<Me>('/me'),
    gym: () => c.get<GymDto>('/gym'),
    counts: () => c.get<MemberCounts>('/members/counts'),
    plans: () => c.get<PlanDto[]>('/plans'),
    member: (id: string) => c.get<MemberDto>(`/members/${id}`),
    history: (id: string) => c.get<HistoryDto>(`/members/${id}/subscriptions`),
    updateMember: (id: string, body: UpdateMemberBody) => c.patch<MemberDto>(`/members/${id}`, body),
    archive: (id: string) => c.post<MemberDto>(`/members/${id}/archive`),
    restore: (id: string) => c.post<MemberDto>(`/members/${id}/restore`),
    report: (ym?: { year: number; month: number }) =>
      c.get<MonthlyReport>('/reports/monthly', { query: ym ? { year: ym.year, month: ym.month } : undefined }),
    createMember: (body: CreateMemberBody) => c.post<MemberDto>('/members', body),
    renew: (id: string, body: RenewBody) => c.post<RenewResult>(`/members/${id}/subscriptions`, body),
    payDebt: (id: string, body: PayBody) => c.post<PayResult>(`/members/${id}/payments`, body),
    members: (q: MembersQuery = {}) =>
      c.get<MemberPage>('/members', {
        query: {
          q: q.q?.trim() || undefined,
          status: q.status,
          debtor: q.debtor ? 'true' : undefined,
          archived: q.archived ? 'true' : undefined,
          page: q.page,
          limit: q.limit,
        },
      }),
  };
}
export type Api = ReturnType<typeof makeApi>;
