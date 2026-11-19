import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

/**
 * هر کوئری روی جدول‌های وابسته به باشگاه (members، plans، subscriptions، payments، reminders، requests)
 * باید داخل run() اجرا شود. این تابع app.gym_id را برای همان تراکنش تنظیم می‌کند و سیاست RLS
 * در PostgreSQL فقط ردیف‌های همان باشگاه را نشان می‌دهد. بدون run() هیچ ردیفی دیده نمی‌شود.
 */
@Injectable()
export class TenantService {
  constructor(private readonly prisma: PrismaService) {}

  run<T>(gymId: string, fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT set_config('app.gym_id', ${gymId}, true)`;
      return fn(tx);
    });
  }
}
