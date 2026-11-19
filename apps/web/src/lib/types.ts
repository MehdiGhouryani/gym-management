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
  archivedAt: string | null;
  createdAt: string;
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
  days: number;
  price: number;
  active: boolean;
  monthlyPrice: number;
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
  startsOn: string;
  endsOn: string;
  price: number;
  paid: number;
  balance: number;
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
