import { subscriptionStatus } from '@fulad/shared';
import type { StatusOptions } from '@fulad/shared';
import { toDateOnly } from '../common/dates';

export interface MemberRow {
  id: string;
  name: string;
  phone: string;
  birthDate: Date | null;
  note: string | null;
  currentEndsOn: Date | null;
  balance: number;
  archivedAt: Date | null;
  createdAt: Date;
}

/** وضعیت هرگز ذخیره نمی‌شود؛ همیشه از currentEndsOn و تاریخ امروز (تهران) محاسبه می‌شود */
export function toMemberDto(m: MemberRow, today: string, opts: StatusOptions) {
  const s = subscriptionStatus(m.currentEndsOn, today, opts);
  return {
    id: m.id,
    name: m.name,
    phone: m.phone,
    birthDate: m.birthDate ? toDateOnly(m.birthDate) : null,
    note: m.note,
    currentEndsOn: m.currentEndsOn ? toDateOnly(m.currentEndsOn) : null,
    status: s.status,
    daysLeft: s.daysLeft,
    followUp: s.followUp,
    balance: m.balance,
    archivedAt: m.archivedAt ? m.archivedAt.toISOString() : null,
    createdAt: m.createdAt.toISOString(),
  };
}
