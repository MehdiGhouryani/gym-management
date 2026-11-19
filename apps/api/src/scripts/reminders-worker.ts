/**
 * ورکر یادآوری‌ها — با PM2 روزی یک‌بار (۰۹:۰۰ تهران) اجرا و تمام می‌شود:
 *   pm2: cron_restart '0 9 * * *', autorestart false
 * ۱) صف امروز هر باشگاه فعال ساخته می‌شود؛ ۲) صف ارسال می‌شود (با تلاش مجدد).
 */
import { PrismaClient } from '@prisma/client';
import { todayInTehran } from '@fulad/shared';
import { buildVars, processQueue, queueDueReminders } from '../notifications/core';
import { SmsService } from '../sms/sms.service';

const prisma = new PrismaClient();

async function main() {
  const today = todayInTehran();
  const sms = new SmsService();

  const gyms = await prisma.gym.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, name: true, slug: true, expiringDays: true, graceDays: true },
  });

  // مرحله ۱: ساخت صف هر باشگاه در محدوده‌ی RLS خودش
  for (const gym of gyms) {
    const queued = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT set_config('app.gym_id', ${gym.id}, true)`;
      return queueDueReminders(tx, gym, today);
    });
    console.log(`[${gym.slug}] ${queued} یادآوری صف شد`);
  }

  // مرحله ۲: ارسال صف هر باشگاه
  for (const gym of gyms) {
    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT set_config('app.gym_id', ${gym.id}, true)`;
      return processQueue(
        tx,
        gym.id,
        100,
        (template, memberId) => buildVars(tx, gym, memberId, template, today),
        (phone, text) => sms.send(phone, text).then(() => ({})),
      );
    });
    console.log(`[${gym.slug}] ارسال: ${result.sent} موفق، ${result.failed} ناموفق، ${result.deferred} تلاش دوباره`);
  }
}

main()
  .catch((e) => {
    console.error('ورکر یادآوری ناموفق:', e);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
