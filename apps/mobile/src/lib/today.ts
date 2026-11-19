import type { MemberDto } from './api/types';

/** منقضی‌ها اول (بیشترین تأخیر بالاتر)، بعد نزدیک‌ترین انقضا؛ هر عضو یک‌بار */
export function mergeToday(...lists: MemberDto[][]): MemberDto[] {
  const byId = new Map<string, MemberDto>();
  for (const list of lists) for (const m of list) byId.set(m.id, m);
  return [...byId.values()].sort(
    (a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0) || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0),
  );
}

export function groupToday(list: MemberDto[]) {
  return {
    expired: list.filter((m) => m.status === 'EXPIRED'),
    expiring: list.filter((m) => m.status === 'EXPIRING'),
  };
}
