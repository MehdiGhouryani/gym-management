/* داده‌ی نمونه برای توسعه. اجرا:  pnpm db:seed         (اگر باشگاه نمونه هست، کاری نمی‌کند)
 *                               pnpm db:seed --reset   (داده‌ی نمونه را پاک و دوباره می‌سازد)
 * با DATABASE_URL (نقش fulad_app) اجرا می‌شود؛ پس خودش تست می‌کند که دسترسی‌های نقش درست است. */
import { PrismaClient } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { fromDayNumber, toDayNumber, todayInTehran } from '@fulad/shared';
import { SEED_GYM_SLUG, SEED_PLANS, buildSeed } from './seed-data';
import type { PlanKey } from './seed-data';

const prisma = new PrismaClient();
const at0900 = (day: string) => new Date(`${day}T05:30:00.000Z`); // ۰۹:۰۰ تهران
const asDate = (day: string) => new Date(`${day}T00:00:00.000Z`);

async function inGym<T>(gymId: string, fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT set_config('app.gym_id', ${gymId}, true)`;
    return fn(tx);
  });
}

async function wipe(gymId: string, phones: string[]) {
  await inGym(gymId, async (tx) => {
    await tx.payment.deleteMany({ where: { gymId } });
    await tx.subscription.deleteMany({ where: { gymId } });
    await tx.reminder.deleteMany({ where: { gymId } });
    await tx.request.deleteMany({ where: { gymId } });
    await tx.member.deleteMany({ where: { gymId } });
    await tx.plan.deleteMany({ where: { gymId } });
  });
  await prisma.refreshToken.deleteMany({ where: { gymId } });
  await prisma.user.deleteMany({ where: { gymId } });
  await prisma.otpCode.deleteMany({ where: { phone: { in: phones } } });
  await prisma.gym.delete({ where: { id: gymId } });
}

async function main() {
  if (process.env.NODE_ENV === 'production') throw new Error('seed در production مجاز نیست');
  const reset = process.argv.includes('--reset');
  const today = todayInTehran();
  const seed = buildSeed(today);
  const phones = [...seed.users.map((u) => u.phone), ...seed.members.map((m) => m.phone)];

  const existing = await prisma.gym.findUnique({ where: { slug: SEED_GYM_SLUG } });
  if (existing && !reset) {
    console.log('باشگاه نمونه از قبل هست. برای ساخت دوباره: pnpm db:seed --reset');
    return;
  }
  if (existing) await wipe(existing.id, phones);

  const gym = await prisma.gym.create({ data: { ...seed.gym, status: 'ACTIVE' } });
  for (const u of seed.users) await prisma.user.create({ data: { ...u, gymId: gym.id } });

  await inGym(gym.id, async (tx) => {
    const planIds = {} as Record<PlanKey, string>;
    for (const key of Object.keys(SEED_PLANS) as PlanKey[]) {
      const p = await tx.plan.create({ data: { gymId: gym.id, ...SEED_PLANS[key] } });
      planIds[key] = p.id;
    }
    for (const m of seed.members) {
      let balance = 0;
      let lastEnd: string | null = null;
      const member = await tx.member.create({
        data: { gymId: gym.id, name: m.name, phone: m.phone, archivedAt: m.archived ? new Date() : null },
      });
      for (const s of m.subs) {
        const plan = SEED_PLANS[s.plan];
        const price = s.price ?? plan.price;
        const startsOn = fromDayNumber(toDayNumber(s.endsOn) - plan.days + 1);
        const sub = await tx.subscription.create({
          data: { gymId: gym.id, memberId: member.id, planId: planIds[s.plan], startsOn: asDate(startsOn), endsOn: asDate(s.endsOn), price },
        });
        if (s.paid > 0) {
          await tx.payment.create({ data: { gymId: gym.id, subscriptionId: sub.id, amount: s.paid, method: s.method, paidAt: at0900(startsOn) } });
        }
        balance += price - s.paid;
        if (lastEnd === null || s.endsOn > lastEnd) lastEnd = s.endsOn;
      }
      await tx.member.update({ where: { id: member.id }, data: { balance, currentEndsOn: lastEnd ? asDate(lastEnd) : null } });
    }
  });

  console.log(`باشگاه نمونه ساخته شد (slug: ${SEED_GYM_SLUG}).`);
  console.log(`مدیر:  ${seed.users[0]?.phone}   پذیرش: ${seed.users[1]?.phone}`);
  console.log('ورود: POST /api/v1/auth/otp/request و بعد verify. با SMS_PROVIDER=console کد در لاگ سرور چاپ می‌شود.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
