import { addDays } from '@fulad/shared';

export type PlanKey = 'm1' | 'm3' | 'm6' | 'y1';
export type Method = 'CASH' | 'CARD' | 'POS';

export const SEED_GYM_SLUG = 'fulad';

export interface SeedSub {
  plan: PlanKey;
  /** آخرین روز معتبر اشتراک */
  endsOn: string;
  paid: number;
  method: Method;
  /** قیمت ثبت‌شده؛ اگر نیاید قیمت پلن */
  price?: number;
}
export interface SeedMember {
  name: string;
  phone: string;
  archived?: boolean;
  subs: SeedSub[];
  /** وضعیتی که این عضو نمونه باید در فهرست داشته باشد */
  expect: { status: 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'NONE'; followUp: boolean; balance: number };
}

export const SEED_PLANS: Record<PlanKey, { name: string; days: number; price: number; active: boolean }> = {
  m1: { name: 'یک‌ماهه', days: 30, price: 4_500_000, active: true },
  m3: { name: 'سه‌ماهه', days: 90, price: 12_000_000, active: true },
  m6: { name: 'شش‌ماهه', days: 180, price: 22_000_000, active: true },
  y1: { name: 'سالانه', days: 365, price: 40_000_000, active: false },
};

/** داده‌ی نمونه نسبت به «امروز» ساخته می‌شود تا همیشه همه‌ی وضعیت‌ها در فهرست دیده شوند */
export function buildSeed(today: string) {
  const d = (n: number) => addDays(today, n);
  const full = (plan: PlanKey, endsOn: string, method: Method = 'CARD'): SeedSub => ({
    plan, endsOn, paid: SEED_PLANS[plan].price, method,
  });

  const members: SeedMember[] = [
    { name: 'نگار احمدی', phone: '09121000001', subs: [full('m3', d(3))], expect: { status: 'EXPIRING', followUp: false, balance: 0 } },
    { name: 'مهدی کریمی', phone: '09121000002', subs: [full('m1', d(-2), 'CASH')], expect: { status: 'EXPIRED', followUp: true, balance: 0 } },
    { name: 'امیر صادقی', phone: '09121000003', subs: [full('m1', d(5))], expect: { status: 'EXPIRING', followUp: false, balance: 0 } },
    { name: 'علی رضایی', phone: '09121000004', subs: [full('m1', d(12), 'CASH')], expect: { status: 'ACTIVE', followUp: false, balance: 0 } },
    {
      name: 'سارا موسوی', phone: '09121000005',
      subs: [{ plan: 'm3', endsOn: d(18), paid: 10_800_000, method: 'CARD' }],
      expect: { status: 'ACTIVE', followUp: false, balance: 1_200_000 },
    },
    { name: 'رضا محمدی', phone: '09121000006', subs: [full('m1', d(26), 'POS')], expect: { status: 'ACTIVE', followUp: false, balance: 0 } },
    { name: 'پریسا حیدری', phone: '09121000007', subs: [full('m1', d(-30))], expect: { status: 'EXPIRED', followUp: false, balance: 0 } },
    { name: 'کاوه ناصری', phone: '09121000008', subs: [full('m1', d(2), 'CASH')], expect: { status: 'EXPIRING', followUp: false, balance: 0 } },
    { name: 'لیلا فرهادی', phone: '09121000009', subs: [], expect: { status: 'NONE', followUp: false, balance: 0 } },
    {
      name: 'حسین جعفری', phone: '09121000010',
      subs: [
        full('m1', d(-130)),
        { plan: 'm6', endsOn: d(60), paid: 21_500_000, method: 'CARD', price: 22_000_000 },
      ],
      expect: { status: 'ACTIVE', followUp: false, balance: 500_000 },
    },
    {
      name: 'مریم قاسمی', phone: '09121000011',
      subs: [{ plan: 'm1', endsOn: d(-10), paid: 2_500_000, method: 'CASH' }],
      expect: { status: 'EXPIRED', followUp: true, balance: 2_000_000 },
    },
    { name: 'داوود شریفی', phone: '09121000012', archived: true, subs: [full('m1', d(-90))], expect: { status: 'EXPIRED', followUp: false, balance: 0 } },
  ];

  return {
    gym: {
      slug: SEED_GYM_SLUG, name: 'باشگاه فولاد', city: 'تهران', address: 'بلوار ارم، پلاک ۱۲', phone: '02188001234',
    },
    users: [
      { role: 'OWNER' as const, name: 'رضا نیک‌خو', phone: '09120000001' },
      { role: 'STAFF' as const, name: 'ابراهیم توکلی', phone: '09120000002' },
    ],
    plans: SEED_PLANS,
    members,
  };
}
