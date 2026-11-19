/** Prisma ستون DATE را به‌صورت Date در ساعت ۰۰:۰۰ UTC می‌دهد */
export const toDateOnly = (d: Date): string => d.toISOString().slice(0, 10);
export const fromDateOnly = (s: string): Date => new Date(`${s}T00:00:00.000Z`);

/** تاریخ تولد: از ۱۹۰۰ تا امروز */
export const isPlausibleBirthDate = (s: string, today: string): boolean => s >= '1900-01-01' && s <= today;
