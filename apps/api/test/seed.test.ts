import { describe, it, expect } from 'vitest';
import { isIranMobile, subscriptionStatus } from '@fulad/shared';
import { SEED_PLANS, buildSeed } from '../prisma/seed-data.ts';

const TODAY = '2026-10-18';
const seed = buildSeed(TODAY);
const DAY = 86_400_000;
const startOf = (endsOn: string, days: number) =>
  new Date(new Date(`${endsOn}T00:00:00Z`).getTime() - (days - 1) * DAY).toISOString().slice(0, 10);

describe('داده‌ی نمونه', () => {
  it('وضعیت هر عضو همان است که برچسب خورده', () => {
    for (const m of seed.members) {
      const last = m.subs.reduce<string | null>((acc, s) => (acc === null || s.endsOn > acc ? s.endsOn : acc), null);
      const st = subscriptionStatus(last, TODAY, { expiringDays: 7, graceDays: 14 });
      expect(`${m.name}:${st.status}:${st.followUp}`).toBe(`${m.name}:${m.expect.status}:${m.expect.followUp}`);
    }
  });
  it('بدهی هر عضو برابر جمع مبلغ منهای پرداخت است', () => {
    for (const m of seed.members) {
      const debt = m.subs.reduce((a, s) => a + ((s.price ?? SEED_PLANS[s.plan].price) - s.paid), 0);
      expect(`${m.name}:${debt}`).toBe(`${m.name}:${m.expect.balance}`);
    }
  });
  it('پرداخت از مبلغ اشتراک بیشتر نیست و تاریخ شروع در آینده نیست', () => {
    for (const m of seed.members) {
      for (const s of m.subs) {
        expect(s.paid <= (s.price ?? SEED_PLANS[s.plan].price)).toBe(true);
        expect(startOf(s.endsOn, SEED_PLANS[s.plan].days) <= TODAY).toBe(true);
      }
    }
  });
  it('اشتراک‌های یک عضو هم‌پوشانی ندارند', () => {
    for (const m of seed.members) {
      const spans = m.subs
        .map((s) => ({ start: startOf(s.endsOn, SEED_PLANS[s.plan].days), end: s.endsOn }))
        .sort((a, b) => (a.start < b.start ? -1 : 1));
      for (let i = 1; i < spans.length; i++) expect((spans[i]?.start ?? '') > (spans[i - 1]?.end ?? '')).toBe(true);
    }
  });
  it('شماره‌ها معتبر و یکتا هستند', () => {
    const phones = [...seed.users.map((u) => u.phone), ...seed.members.map((m) => m.phone)];
    expect(phones.every(isIranMobile)).toBe(true);
    expect(new Set(phones).size).toBe(phones.length);
  });
  it('همه‌ی وضعیت‌ها و یک بایگانی و یک پلن غیرفعال حاضرند', () => {
    const kinds = new Set(seed.members.map((m) => `${m.expect.status}:${m.expect.followUp}`));
    for (const k of ['ACTIVE:false', 'EXPIRING:false', 'EXPIRED:true', 'EXPIRED:false', 'NONE:false']) expect(kinds.has(k)).toBe(true);
    expect(seed.members.filter((m) => m.archived).length).toBe(1);
    expect(Object.values(seed.plans).filter((p) => !p.active).length).toBe(1);
    expect(seed.members.some((m) => m.expect.balance > 0)).toBe(true);
  });
});
