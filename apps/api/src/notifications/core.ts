/**
 * هسته‌ی صف اعلان‌ها — مستقل از Nest تا ورکر PM2 هم بدون DI از آن استفاده کند.
 * همه‌ی نوشتن‌ها داخل تراکنش با app.gym_id انجام می‌شود (RLS).
 */
import type { Prisma } from '@prisma/client';
import { subscriptionStatus } from '@fulad/shared';
import { buildRemindersPlan, type EngineMember, type LastReminderMap } from './engine';
import { reminderText, type ReminderTemplate } from './templates';

type Tx = Prisma.TransactionClient;

/** درج یادآوری فوری (مثلاً رسید پرداخت) داخل همان تراکنشِ رویداد */
export async function queueReminder(tx: Tx, gymId: string, memberId: string, template: ReminderTemplate) {
  await tx.reminder.create({ data: { gymId, memberId, template } });
}

/** مرحله ۱: ساخت صف امروز برای یک باشگاه — تعداد ردیف‌های ساخته‌شده */
export async function queueDueReminders(
  tx: Tx,
  gym: { id: string; name: string; expiringDays: number; graceDays: number },
  today: string,
): Promise<number> {
  const members = await tx.member.findMany({
    where: { gymId: gym.id, archivedAt: null },
    select: { id: true, name: true, phone: true, currentEndsOn: true, balance: true, smsOptOut: true },
  });
  const recent = await tx.reminder.findMany({
    where: { gymId: gym.id, createdAt: { gte: new Date(`${today}T00:00:00+03:30`) } },
    select: { memberId: true, template: true },
  });
  const last: LastReminderMap = {};
  for (const r of recent) last[`${r.memberId}:${r.template}`] = today;

  const engineMembers: EngineMember[] = members.map((m) => ({
    id: m.id,
    name: m.name,
    phone: m.phone,
    currentEndsOn: m.currentEndsOn ? m.currentEndsOn.toISOString().slice(0, 10) : null,
    balance: m.balance,
    smsOptOut: m.smsOptOut,
  }));
  const plan = buildRemindersPlan(engineMembers, {
    today,
    expiringDays: gym.expiringDays,
    graceDays: gym.graceDays,
    last,
  });
  if (plan.length === 0) return 0;
  await tx.reminder.createMany({
    data: plan.map((p) => ({ gymId: gym.id, memberId: p.memberId, template: p.template })),
  });
  return plan.length;
}

const MAX_ATTEMPTS = 3;

/** مرحله ۲: ارسال صف؛ خطا تلاش را افزایش می‌دهد و بعد از ۳ تلاش FAILED می‌شود */
export async function processQueue(
  tx: Tx,
  gymId: string,
  limit: number,
  varsFor: (template: ReminderTemplate, memberId: string) => Promise<{ phone: string; text: string }>,
  send: (phone: string, text: string) => Promise<{ providerId?: string }>,
): Promise<{ sent: number; failed: number; deferred: number }> {
  const rows = await tx.reminder.findMany({
    where: { gymId, status: 'QUEUED', attempts: { lt: MAX_ATTEMPTS } },
    orderBy: { createdAt: 'asc' },
    take: limit,
    include: { member: { select: { id: true, name: true, phone: true, smsOptOut: true } } },
  });
  let sent = 0;
  let failed = 0;
  let deferred = 0;
  for (const r of rows) {
    if (r.member.smsOptOut) {
      await tx.reminder.update({ where: { id: r.id }, data: { status: 'SENT', sentAt: new Date(), error: 'opt-out' } });
      continue;
    }
    try {
      const v = await varsFor(r.template as ReminderTemplate, r.member.id);
      const out = await send(v.phone, v.text);
      await tx.reminder.update({
        where: { id: r.id },
        data: { status: 'SENT', sentAt: new Date(), providerId: out.providerId ?? null, error: null },
      });
      sent++;
    } catch (e) {
      const attempts = r.attempts + 1;
      await tx.reminder.update({
        where: { id: r.id },
        data: {
          attempts,
          error: String(e instanceof Error ? e.message : e).slice(0, 300),
          status: attempts >= MAX_ATTEMPTS ? 'FAILED' : 'QUEUED',
        },
      });
      if (attempts >= MAX_ATTEMPTS) failed++;
      else deferred++;
    }
  }
  return { sent, failed, deferred };
}

/** متغیرهای قالب هر عضو (مصرف‌کننده: ورکر و اجرای دستی صف) */
export async function buildVars(
  tx: Tx,
  gym: { name: string; slug: string; expiringDays: number; graceDays: number },
  memberId: string,
  template: ReminderTemplate,
  today: string,
): Promise<{ phone: string; text: string }> {
  const member = await tx.member.findUniqueOrThrow({
    where: { id: memberId },
    select: { name: true, phone: true, currentEndsOn: true, balance: true },
  });
  let daysLeft: number | null = null;
  if (template === 'expiring' && member.currentEndsOn) {
    const s = subscriptionStatus(member.currentEndsOn.toISOString().slice(0, 10), today, {
      expiringDays: gym.expiringDays,
      graceDays: gym.graceDays,
    });
    daysLeft = s.daysLeft;
  }
  const text = reminderText(template, { name: member.name, gymName: gym.name, daysLeft, balance: member.balance, slug: gym.slug });
  return { phone: member.phone, text };
}
