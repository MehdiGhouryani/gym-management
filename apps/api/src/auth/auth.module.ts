import { Module } from '@nestjs/common';
import { SmsModule } from '../sms/sms.module';
import { AuthController, MeController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { RolesGuard } from './roles';

@Module({
  imports: [SmsModule],
  controllers: [AuthController, MeController],
  providers: [AuthService, AuthGuard, RolesGuard],
  exports: [AuthService, AuthGuard, RolesGuard],
})
export class AuthModule {}
