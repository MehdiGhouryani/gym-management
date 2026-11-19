import { toDateOnly } from '../common/dates';

export interface SubscriptionRow {
  id: string;
  planId: string;
  startsOn: Date;
  endsOn: Date;
  price: number;
  frozenDays: number;
  cancelledAt: Date | null;
  sessionsUsed: number | null;
  createdAt: Date;
  plan?: { name: string; kind: 'days' | 'sessions'; sessionsCount: number | null } | null;
  payments: { id: string; amount: number; method: string; paidAt: Date }[];
}

export function toSubscriptionDto(s: SubscriptionRow) {
  const paid = s.payments.reduce((sum, p) => sum + p.amount, 0);
  return {
    id: s.id,
    planId: s.planId,
    planName: s.plan?.name ?? null,
    planKind: s.plan?.kind ?? 'days',
    sessionsTotal: s.plan?.sessionsCount ?? null,
    sessionsUsed: s.sessionsUsed,
    sessionsRemaining: s.plan?.sessionsCount != null ? Math.max(0, s.plan.sessionsCount - (s.sessionsUsed ?? 0)) : null,
    startsOn: toDateOnly(s.startsOn),
    endsOn: toDateOnly(s.endsOn),
    price: s.price,
    paid,
    balance: s.price - paid,
    frozenDays: s.frozenDays,
    cancelledAt: s.cancelledAt ? s.cancelledAt.toISOString() : null,
    payments: s.payments.map((p) => ({ id: p.id, amount: p.amount, method: p.method, paidAt: p.paidAt.toISOString() })),
    createdAt: s.createdAt.toISOString(),
  };
}

export const summarize = (items: { price: number; paid: number }[]) => {
  const totalPrice = items.reduce((a, i) => a + i.price, 0);
  const totalPaid = items.reduce((a, i) => a + i.paid, 0);
  return { totalPrice, totalPaid, balance: totalPrice - totalPaid };
};
