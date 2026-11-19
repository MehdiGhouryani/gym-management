import { Module } from '@nestjs/common';
import { ReportsModule } from '../reports/reports.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  // ReportsService برای منطق ماهانه؛ مپرها و فیلترهای عضو توابع خالص‌اند و ماژول نمی‌خواهند
  imports: [ReportsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
