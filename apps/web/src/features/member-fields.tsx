'use client';

import { Field, Input, Textarea } from '../ui/index';
import { parseJalaliDate, toJalaliString } from '../lib/jalali-input';

export interface MemberFormValues {
  name: string;
  phone: string;
  birthDate: string; // شمسی؛ خالی یعنی ندارد
  note: string;
  /** رضایت پیامک یادآوری */
  smsOptOut: boolean;
}

interface Props {
  values: MemberFormValues;
  onChange: (v: MemberFormValues) => void;
  errors: Record<string, string>;
}

/** فیلدهای مشترک ثبت و ویرایش عضو؛ تاریخ تولد شمسی تایپ می‌شود و میلادی ذخیره */
export function MemberFields({ values, onChange, errors }: Props) {
  const set = (patch: Partial<MemberFormValues>) => onChange({ ...values, ...patch });
  const birthIso = parseJalaliDate(values.birthDate);
  return (
    <>
      <Field label="نام و نام خانوادگی" htmlFor="m-name" state={errors.name ? 'error' : 'default'} hint={errors.name}>
        <Input id="m-name" value={values.name} onChange={(e) => set({ name: e.target.value })} autoComplete="off" />
      </Field>
      <Field label="شماره موبایل" htmlFor="m-phone" state={errors.phone ? 'error' : 'default'} hint={errors.phone}>
        <Input
          id="m-phone"
          dir="ltr"
          inputMode="tel"
          placeholder="09xxxxxxxxx"
          value={values.phone}
          onChange={(e) => set({ phone: e.target.value })}
        />
      </Field>
      <Field
        label="تاریخ تولد (شمسی، اختیاری)"
        htmlFor="m-birth"
        state={errors.birthDate ? 'error' : 'default'}
        hint={
          errors.birthDate ??
          (values.birthDate.trim() && birthIso ? `میلادی: ${birthIso}` : 'مثل ۱۳۷۵/۰۳/۲۱ — خالی بگذارید اگر ندارد')
        }
      >
        <Input id="m-birth" dir="ltr" value={values.birthDate} onChange={(e) => set({ birthDate: e.target.value })} />
      </Field>
      <Field label="یادداشت (اختیاری)" htmlFor="m-note" state={errors.note ? 'error' : 'default'} hint={errors.note}>
        <Textarea id="m-note" value={values.note} onChange={(e) => set({ note: e.target.value })} />
      </Field>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--mut)', cursor: 'pointer', marginBottom: 12 }}>
        <input type="checkbox" checked={values.smsOptOut} onChange={(e) => set({ smsOptOut: e.target.checked })} />
        عضو پیامک یادآوری نمی‌خواهد (انصراف از اعلان‌ها)
      </label>
    </>
  );
}

/** تبدیل فرم به بدنه‌ی API؛ birthDate خالی حذف می‌شود */
export function memberFormToInput(values: MemberFormValues): { name: string; phone: string; birthDate?: string; note?: string; smsOptOut?: boolean } {
  const iso = parseJalaliDate(values.birthDate);
  return {
    name: values.name,
    phone: values.phone,
    ...(iso ? { birthDate: iso } : {}),
    ...(values.note.trim() ? { note: values.note.trim() } : {}),
    ...(values.smsOptOut ? { smsOptOut: true } : {}),
  };
}

export const emptyMemberForm: MemberFormValues = { name: '', phone: '', birthDate: '', note: '', smsOptOut: false };

export const memberFormFromMember = (m: {
  name: string;
  phone: string;
  birthDate: string | null;
  note: string | null;
  smsOptOut: boolean;
}): MemberFormValues => ({
  name: m.name,
  phone: m.phone,
  birthDate: m.birthDate ? toJalaliString(m.birthDate) : '',
  note: m.note ?? '',
  smsOptOut: m.smsOptOut,
});
