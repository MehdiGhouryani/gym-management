import { toDateOnly } from '../common/dates';

export interface SubscriptionRow {
  id: string;
  planId: string;
  startsOn: Date;
  endsOn: Date;
  price: number;
  createdAt: Date;
  plan?: { name: string } | null;
  payments: { id: string; amount: number; method: string; paidAt: Date }[];
}

export function toSubscriptionDto(s: SubscriptionRow) {
  const paid = s.payments.reduce((sum, p) => sum + p.amount, 0);
  return {
    id: s.id,
    planId: s.planId,
    planName: s.plan?.name ?? null,
    startsOn: toDateOnly(s.startsOn),
    endsOn: toDateOnly(s.endsOn),
    price: s.price,
    paid,
    balance: s.price - paid,
    payments: s.payments.map((p) => ({ id: p.id, amount: p.amount, method: p.method, paidAt: p.paidAt.toISOString() })),
    createdAt: s.createdAt.toISOString(),
  };
}

export const summarize = (items: { price: number; paid: number }[]) => {
  const totalPrice = items.reduce((a, i) => a + i.price, 0);
  const totalPaid = items.reduce((a, i) => a + i.paid, 0);
  return { totalPrice, totalPaid, balance: totalPrice - totalPaid };
};
