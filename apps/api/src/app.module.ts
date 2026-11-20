import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { AttendanceModule } from './attendance/attendance.module';
import { ClassesModule } from './classes/classes.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { LeadsModule } from './leads/leads.module';
import { GymModule } from './gym/gym.module';
import { HealthController } from './health.controller';
import { MembersModule } from './members/members.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PaymentsModule } from './payments/payments.module';
import { PlansModule } from './plans/plans.module';
import { ReportsModule } from './reports/reports.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { PrismaModule } from './prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    AuthModule,
    MembersModule,
    PaymentsModule,
    NotificationsModule,
    LeadsModule,
    AttendanceModule,
    ClassesModule,
    PlansModule,
    SubscriptionsModule,
    ReportsModule,
    DashboardModule,
    GymModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
