export interface Debt {
  subscriptionId: string;
  balance: number;
}

/** پرداخت بدهی از قدیمی‌ترین اشتراک شروع می‌شود (ورودی باید از قدیمی به جدید مرتب باشد) */
export function allocatePayment(debts: Debt[], amount: number) {
  let left = amount;
  const allocations: { subscriptionId: string; amount: number }[] = [];
  for (const d of debts) {
    if (left <= 0) break;
    if (d.balance <= 0) continue;
    const part = Math.min(d.balance, left);
    allocations.push({ subscriptionId: d.subscriptionId, amount: part });
    left -= part;
  }
  return { allocations, remaining: left };
}
