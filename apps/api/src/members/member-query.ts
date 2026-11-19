import { statusFilterRange } from '@fulad/shared';
import type { StatusFilter, StatusOptions } from '@fulad/shared';
import { fromDateOnly } from '../common/dates';

type DateFilter = { gt?: Date; gte?: Date; lt?: Date; lte?: Date };

/** شرط Prisma برای فیلتر وضعیت روی Member.currentEndsOn */
export function endsOnWhere(
  status: StatusFilter,
  today: string,
  opts: StatusOptions,
): { currentEndsOn: null | DateFilter } {
  const r = statusFilterRange(status, today, opts);
  if ('isNull' in r) return { currentEndsOn: null };
  const f: DateFilter = {};
  if (r.gt) f.gt = fromDateOnly(r.gt);
  if (r.gte) f.gte = fromDateOnly(r.gte);
  if (r.lt) f.lt = fromDateOnly(r.lt);
  if (r.lte) f.lte = fromDateOnly(r.lte);
  return { currentEndsOn: f };
}
