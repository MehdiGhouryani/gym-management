'use client';

import { useMemo, useState } from 'react';
import { planRenewal, todayInTehran } from '@fulad/shared';
import { Badge, Button, Dialog, Field, Input, Select, useToast } from '../ui/index';
import { api } from '../lib/api';
import { useApi } from '../lib/use-api';
import { faNum, faToman } from '../lib/format';
import { parseJalaliDate, toJalaliString } from '../lib/jalali-input';
import type { Plan, RenewResult } from '../lib/types';

interface Props {
  open: boolean;
  onClose: () => void;
  memberId: string;
  memberName: string;
  currentEndsOn: string | null;
  /** تخفیف فقط برای مدیر */
  canSetPrice: boolean;
  onDone: (r: RenewResult) => void;
}

/** برگه‌ی تمدید: پلن، تاریخ خودکار با پیش‌نمایش، پرداخت و تخفیف مدیر */
export function RenewDialog({ open, onClose, memberId, memberName, currentEndsOn, canSetPrice, onDone }: Props) {
  const toast = useToast();
  const plans = useApi<Plan[]>(open ? '/plans' : null);
  const [planId, setPlanId] = useState('');
  const [paid, setPaid] = useState('');
  const [price, setPrice] = useState('');
  const [discount, setDiscount] = useState('');
  const [method, setMethod] = useState('');
  const [startsOn, setStartsOn] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const plan = useMemo(() => plans.data?.find((p) => p.id === planId) ?? null, [plans.data, planId]);
  const paidNum = Math.max(0, Math.round(Number(paid) || 0));
  const priceNum = price.trim() ? Math.round(Number(price) || 0) : null;
  const startsIso = parseJalaliDate(startsOn);

  // پیش‌نمایش تاریخ با همان محاسبه‌ی سرور
  const preview = useMemo(() => {
    if (!plan) return null;
    const r = planRenewal({
      currentEndsOn: currentEndsOn,
      planDays: plan.days,
      today: todayInTehran(),
      startsOn: startsIso ?? undefined,
    });
    return r.ok ? r : null;
  }, [plan, currentEndsOn, startsIso]);

  const reset = () => {
    setPlanId('');
    setPaid('');
    setPrice('');
    setDiscount('');
    setMethod('');
    setStartsOn('');
    setError(null);
  };

  const submit = async () => {
    if (!plan || busy) return;
    setError(null);
    setBusy(true);
    try {
      const r = await api.post<RenewResult>(
        `/members/${memberId}/subscriptions`,
        {
          planId: plan.id,
          paidAmount: paidNum,
          method: paidNum > 0 ? method : undefined,
          ...(canSetPrice && priceNum !== null && priceNum !== plan.price ? { price: priceNum } : {}),
          ...(canSetPrice && !price.trim() && discount.trim() ? { discountPercent: Number(discount) } : {}),
          ...(startsIso ? { startsOn: startsIso } : {}),
        },
        { 'idempotency-key': crypto.randomUUID() },
      );
      toast.push('ok', `اشتراک ${memberName} تا ${toJalaliString(r.subscription.endsOn)} تمدید شد`);
      reset();
      onDone(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ثبت تمدید ناموفق بود');
    } finally {
      setBusy(false);
    }
  };

  const invalid = !plan || (paidNum > 0 && !method) || (canSetPrice && priceNum !== null && priceNum > (plan.price * 4)) || (startsOn.trim() && !startsIso);

  return (
    <Dialog open={open} onClose={() => { reset(); onClose(); }} title={`تمدید اشتراک — ${memberName}`}>
      {plans.loading ? (
        <p style={{ color: 'var(--mut)' }}>در حال بارگذاری پلن‌ها…</p>
      ) : (plans.data?.length ?? 0) === 0 ? (
        <p style={{ color: 'var(--mut)' }}>پلنی تعریف نشده است. اول از بخش پلن‌ها پلن بسازید.</p>
      ) : (
        <div style={{ display: 'grid', gap: 4 }}>
          <Field label="پلن" htmlFor="r-plan" state={error ? 'error' : 'default'}>
            <Select
              id="r-plan"
              value={planId}
              onChange={(e) => {
                setPlanId(e.target.value);
                const p = plans.data?.find((x) => x.id === e.target.value);
                if (p) {
                  setPaid(String(p.price));
                  setPrice('');
                }
              }}
            >
              <option value="" disabled>
                انتخاب پلن…
              </option>
              {plans.data?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {faToman(p.price)} ({faNum(p.days)} روز)
                </option>
              ))}
            </Select>
          </Field>
          {error ? <Badge kind="bad">{error}</Badge> : null}
          {preview && plan ? (
            <p style={{ fontSize: 13, color: 'var(--mut)' }}>
              از {toJalaliString(preview.startsOn)} تا <strong>{toJalaliString(preview.endsOn)}</strong> (پایان اشتراک فعلی: {currentEndsOn ? toJalaliString(currentEndsOn) : '—'})
            </p>
          ) : null}
          <Field label="تاریخ شروع دستی (شمسی، اختیاری)" htmlFor="r-start" hint="خالی = ادامه از پایان اشتراک فعلی">
            <Input id="r-start" dir="ltr" placeholder="1405/08/01" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
          </Field>
          <Field label="مبلغ دریافتی (تومان)" htmlFor="r-paid">
            <Input id="r-paid" dir="ltr" inputMode="numeric" value={paid} onChange={(e) => setPaid(e.target.value.replace(/\D/g, ''))} />
          </Field>
          {paidNum > 0 ? (
            <Field label="روش پرداخت" htmlFor="r-method">
              <Select id="r-method" value={method} onChange={(e) => setMethod(e.target.value)}>
                <option value="" disabled>انتخاب…</option>
                <option value="CASH">نقدی</option>
                <option value="CARD">کارت</option>
                <option value="POS">کارت‌خوان</option>
              </Select>
            </Field>
          ) : (
            <p style={{ fontSize: 12, color: 'var(--wn)' }}>پرداخت صفر یعنی بدهی — بعداً از «پرداخت بدهی» تسویه کنید.</p>
          )}
          {canSetPrice ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <Field label="مبلغ دستی (تومان)" htmlFor="r-price" hint={plan ? `قیمت پلن: ${faToman(plan.price)}` : undefined}>
                <Input id="r-price" dir="ltr" inputMode="numeric" placeholder={plan ? String(plan.price) : ''} value={price} onChange={(e) => { setPrice(e.target.value.replace(/\D/g, '')); setDiscount(''); }} />
              </Field>
              <Field label="یا تخفیف درصدی (۱–۹۹)" htmlFor="r-disc">
                <Input id="r-disc" dir="ltr" inputMode="numeric" placeholder="مثلاً ۱۵" value={discount} onChange={(e) => { setDiscount(e.target.value.replace(/\D/g, '').slice(0, 2)); setPrice(''); }} />
              </Field>
            </div>
          ) : null}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <Button variant="primary" onClick={submit} loading={busy} disabled={invalid || !plan}>
              ثبت تمدید
            </Button>
            <Button variant="ghost" onClick={() => { reset(); onClose(); }}>
              انصراف
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
