import { addDays } from '@fulad/shared';

export interface EndedSub {
  memberId: string;
  endsOn: string;
}
export interface LaterStart {
  memberId: string;
  startsOn: string;
}

export interface RenewalStats {
  renewed: number;
  lost: number;
  /** مهلت پیگیری هنوز باز است و عضو تمدید نکرده؛ در نرخ حساب نمی‌شود */
  pending: number;
  /** درصد، یا null وقتی هنوز هیچ مورد قطعی‌ای نیست */
  rate: number | null;
}

/**
 * نرخ تمدید برای اشتراک‌هایی که در یک ماه تمام شده‌اند.
 * تمدید یعنی اشتراک بعدی با شروع بعد از endsOn و حداکثر graceDays روز بعد از آن.
 * فقط موردهای قطعی (تمدید شده یا مهلت‌شان تمام شده) در نرخ می‌آیند.
 */
export function renewalStats(ended: EndedSub[], starts: LaterStart[], today: string, graceDays: number): RenewalStats {
  const byMember = new Map<string, string[]>();
  for (const s of starts) {
    const list = byMember.get(s.memberId);
    if (list) list.push(s.startsOn);
    else byMember.set(s.memberId, [s.startsOn]);
  }
  let renewed = 0;
  let lost = 0;
  let pending = 0;
  for (const e of ended) {
    const limit = addDays(e.endsOn, graceDays);
    const ok = (byMember.get(e.memberId) ?? []).some((s) => s > e.endsOn && s <= limit);
    if (ok) renewed++;
    else if (today <= limit) pending++;
    else lost++;
  }
  const decided = renewed + lost;
  return { renewed, lost, pending, rate: decided === 0 ? null : Math.round((renewed / decided) * 100) };
}
