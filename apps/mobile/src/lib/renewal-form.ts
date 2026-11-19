import { planRenewal } from '@fulad/shared';
import type { MemberDto, PayMethod, PlanDto, RenewBody } from './api/types';
import { parseToman } from './money';

export interface RenewFormInput {
  member: Pick<MemberDto, 'currentEndsOn' | 'balance'>;
  plan: PlanDto | null;
  today: string;
  isOwner: boolean;
  /** null = قیمت پلن. فقط برای مدیر اعمال می‌شود (تخفیف) */
  priceText: string | null;
  /** null = پرداخت کامل */
  paidText: string | null;
  method: PayMethod;
  /** هم‌زمان بدهی قبلی عضو هم پرداخت شود (با درخواست جدا) */
  settleOldDebt: boolean;
  startsOn?: string;
}

export interface RenewForm {
  ok: boolean;
  error: string | null;
  price: number;
  paid: number;
  startsOn: string;
  endsOn: string;
  oldDebtPayment: number;
  /** جمع پولی که همین الان باید دریافت شود */
  totalToCollect: number;
  /** بدهی عضو بعد از ثبت */
  debtAfter: number;
  request: RenewBody | null;
}

export function buildRenewal(i: RenewFormInput): RenewForm {
  const fail = (error: string, partial: Partial<RenewForm> = {}): RenewForm => ({
    ok: false, error, price: 0, paid: 0, startsOn: '', endsOn: '', oldDebtPayment: 0, totalToCollect: 0,
    debtAfter: i.member.balance, request: null, ...partial,
  });
  if (!i.plan) return fail('پلن را انتخاب کنید');

  const price = i.isOwner && i.priceText !== null ? parseToman(i.priceText) : i.plan.price;
  if (price === null) return fail('مبلغ اشتراک معتبر نیست');
  const paid = i.paidText === null ? price : parseToman(i.paidText);
  if (paid === null) return fail('مبلغ پرداختی معتبر نیست', { price });
  if (paid > price) return fail('مبلغ پرداختی از مبلغ اشتراک بیشتر است', { price, paid });

  const r = planRenewal({ currentEndsOn: i.member.currentEndsOn, planDays: i.plan.days, today: i.today, startsOn: i.startsOn });
  if (!r.ok) {
    return fail(
      r.reason === 'OVERLAP' ? 'تاریخ شروع با اشتراک فعلی هم‌پوشانی دارد' : 'تاریخ شروع باید حداکثر ۶۰ روز قبل یا بعد از امروز باشد',
      { price, paid },
    );
  }

  const oldDebtPayment = i.settleOldDebt ? i.member.balance : 0;
  const request: RenewBody = { planId: i.plan.id, paidAmount: paid };
  if (paid > 0) request.method = i.method;
  if (price !== i.plan.price) request.price = price;
  if (i.startsOn !== undefined) request.startsOn = i.startsOn;
  return {
    ok: true, error: null, price, paid, startsOn: r.startsOn, endsOn: r.endsOn, oldDebtPayment,
    totalToCollect: paid + oldDebtPayment,
    debtAfter: i.member.balance - oldDebtPayment + (price - paid),
    request,
  };
}
