import { Body, Controller, Get, Ip, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentAuth, Roles, RolesGuard } from '../auth/roles';
import type { AccessPayload } from '../auth/token';
import { ZodPipe } from '../common/zod.pipe';
import { AttendanceService } from './attendance.service';

const scanSchema = z.object({ token: z.string().min(8).max(64) });
const manualSchema = z.object({ note: z.string().trim().max(200).optional() });
const memberAttendanceQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

type ScanInput = z.infer<typeof scanSchema>;
type ManualInput = z.infer<typeof manualSchema>;

@Controller()
@UseGuards(AuthGuard, RolesGuard)
@Roles('OWNER', 'STAFF')
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  /** اسکن QR پذیرش */
  @Post('checkin')
  scan(@CurrentAuth() auth: AccessPayload, @Body(new ZodPipe(scanSchema)) body: ScanInput, @Ip() ip: string) {
    return this.attendance.scanCheckIn(auth, body.token, ip);
  }

  /** ثبت دستی ورود برای عضو */
  @Post('members/:id/attendance')
  manual(
    @CurrentAuth() auth: AccessPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(manualSchema)) body: ManualInput,
    @Ip() ip: string,
  ) {
    return this.attendance.manualCheckIn(auth, id, body.note, ip);
  }

  /** سوابق مراجعه‌ی عضو */
  @Get('members/:id/attendance')
  memberAttendance(
    @CurrentAuth() auth: AccessPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Query(new ZodPipe(memberAttendanceQuery)) q: { page: number; limit: number },
  ) {
    return this.attendance.memberAttendance(auth, id, q.page, q.limit);
  }

  /** کارت QR عضو؛ regenerate فقط مدیر */
  @Get('members/:id/qr')
  qr(
    @CurrentAuth() auth: AccessPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('regenerate') regenerate?: string,
  ) {
    return this.attendance.qrToken(auth, id, regenerate === 'true');
  }
}
