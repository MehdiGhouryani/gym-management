/** تایپ‌های DTO مطابق سند OpenAPI سرور */

export interface Member {
  id: string;
  name: string;
  phone: string;
  birthDate: string | null;
  note: string | null;
  currentEndsOn: string | null;
  status: 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'NONE';
  daysLeft: number | null;
  followUp: boolean;
  balance: number;
  smsOptOut: boolean;
  tags: string[];
  archivedAt: string | null;
  createdAt: string;
}

export type LeadStatus = 'NEW' | 'CONTACTED' | 'TRIAL' | 'CONVERTED' | 'LOST';

export interface Lead {
  id: string;
  name: string;
  phone: string;
  status: LeadStatus;
  source: string | null;
  note: string | null;
  memberId: string | null;
  memberName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeadsPageData {
  items: Lead[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface MemberTimeline {
  items: { id: string; action: string; at: string; meta: Record<string, unknown> | null }[];
}

export interface PlanStats {
  period: { year: number; month: number; monthName: string };
  items: { planId: string; planName: string; count: number; revenue: number; sharePercent: number }[];
  total: number;
}

export interface StaffReport {
  period: { year: number; month: number; monthName: string };
  items: { actorId: string; name: string; renewals: number; payments: number; collected: number }[];
}

export interface MemberPage {
  items: Member[];
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

export interface Plan {
  id: string;
  name: string;
  kind: 'days' | 'sessions';
  days: number;
  sessionsCount: number | null;
  price: number;
  active: boolean;
  monthlyPrice: number;
}

export interface PlanPriceHistory {
  items: { id: string; price: number; days: number; at: string }[];
}

export interface Payment {
  id: string;
  amount: number;
  method: 'CASH' | 'CARD' | 'POS';
  paidAt: string;
}

export interface Subscription {
  id: string;
  planId: string;
  planName: string | null;
  planKind: 'days' | 'sessions';
  sessionsTotal: number | null;
  sessionsUsed: number | null;
  sessionsRemaining: number | null;
  startsOn: string;
  endsOn: string;
  price: number;
  paid: number;
  balance: number;
  frozenDays: number;
  cancelledAt: string | null;
  payments: Payment[];
  createdAt: string;
}

export interface SubscriptionHistory {
  items: Subscription[];
  summary: { totalPrice: number; totalPaid: number; balance: number };
}

export interface RenewResult {
  subscription: Subscription;
  member: { id: string; currentEndsOn: string; balance: number };
}

export interface PayResult {
  allocations: { subscriptionId: string; amount: number }[];
  balance: number;
}

export interface GymClass {
  id: string;
  name: string;
  coachId: string | null;
  coachName: string | null;
  capacity: number;
  durationMin: number;
  active: boolean;
  sessions: { id: string; startsAt: string }[];
}

export interface ClassSessionRow {
  id: string;
  startsAt: string;
  booked: number;
  waitlist: number;
  capacity: number;
}

export interface Booking {
  id: string;
  status: 'BOOKED' | 'CANCELLED' | 'ATTENDED' | 'WAITLIST';
  memberId: string;
  memberName: string;
  memberPhone: string;
  createdAt: string;
}
