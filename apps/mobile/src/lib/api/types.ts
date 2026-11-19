// شکل پاسخ‌های API (هم‌خوان با سند OpenAPI در apps/api/src/openapi)
export type StatusName = 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'NONE';
export type MemberFilter = 'active' | 'expiring' | 'expired' | 'lapsed' | 'none';

export interface MemberDto {
  id: string;
  name: string;
  phone: string;
  birthDate: string | null;
  note: string | null;
  currentEndsOn: string | null;
  status: StatusName;
  daysLeft: number | null;
  followUp: boolean;
  balance: number;
  archivedAt: string | null;
  createdAt: string;
}
export interface MemberPage {
  items: MemberDto[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}
export interface MemberCounts {
  all: number;
  active: number;
  expiring: number;
  expired: number;
  lapsed: number;
  none: number;
  debtors: number;
}
export interface MembersQuery {
  q?: string;
  status?: MemberFilter;
  debtor?: boolean;
  archived?: boolean;
  page?: number;
  limit?: number;
}
export interface GymDto {
  id: string;
  slug: string;
  name: string;
  city: string;
  address: string | null;
  phone: string | null;
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED';
  expiringDays: number;
  graceDays: number;
}
export interface Me {
  type: 'user' | 'member';
  role: 'OWNER' | 'STAFF' | null;
  gymId: string;
}
export interface VerifyResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  subject: { type: 'USER' | 'MEMBER'; role: 'OWNER' | 'STAFF' | null; gymId: string; name: string };
}

export type PayMethod = 'CASH' | 'CARD' | 'POS';

export interface PlanDto {
  id: string;
  name: string;
  days: number;
  price: number;
  active: boolean;
  /** معادل ماهانه (۳۰ روز) */
  monthlyPrice: number;
}
export interface PaymentDto {
  id: string;
  amount: number;
  method: PayMethod;
  paidAt: string;
}
export interface SubscriptionDto {
  id: string;
  planId: string;
  planName: string | null;
  startsOn: string;
  endsOn: string;
  price: number;
  paid: number;
  balance: number;
  payments: PaymentDto[];
  createdAt: string;
}
export interface HistoryDto {
  items: SubscriptionDto[];
  summary: { totalPrice: number; totalPaid: number; balance: number };
}
export interface CreateMemberBody {
  name: string;
  phone: string;
  note?: string;
}
export interface RenewBody {
  planId: string;
  startsOn?: string;
  price?: number;
  paidAmount: number;
  method?: PayMethod;
}
export interface RenewResult {
  subscription: SubscriptionDto;
  member: { id: string; currentEndsOn: string; balance: number };
}
export interface PayBody {
  amount: number;
  method: PayMethod;
}
export interface PayResult {
  allocations: { subscriptionId: string; amount: number }[];
  balance: number;
}

export interface UpdateMemberBody {
  name?: string;
  phone?: string;
  note?: string | null;
}
export interface MonthlyReport {
  period: { year: number; month: number; monthName: string; from: string; to: string };
  revenue: {
    total: number;
    paymentCount: number;
    byMethod: { CASH: number; CARD: number; POS: number };
    weeks: number[];
    previousTotal: number;
    changePercent: number | null;
  };
  members: { active: number; newInMonth: number };
  renewal: { total: number; renewed: number; lost: number; pending: number; rate: number | null };
  receivables: { total: number; debtors: number };
  recentPayments: { id: string; amount: number; method: PayMethod; paidAt: string; memberId: string; memberName: string }[];
}
