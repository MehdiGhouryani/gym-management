import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { GymStatus, Role } from '@prisma/client';
import type { OtpRequestInput, OtpVerifyInput } from '@fulad/shared';
import { randomUUID } from 'node:crypto';
import { getSecrets } from '../config/secrets';
import { PrismaService } from '../prisma.service';
import { SmsService } from '../sms/sms.service';
import { TenantService } from '../tenant/tenant.service';
import {
  OTP_COOLDOWN_SEC,
  OTP_MAX_ATTEMPTS,
  OTP_TTL_SEC,
  OTP_WINDOW_SEC,
  decideOtpRequest,
  generateOtpCode,
  hashOtp,
  verifyOtpHash,
} from './otp';
import { ACCESS_TTL_SEC, generateRefreshToken, hashToken, signAccessToken } from './token';

const BAD_CODE = 'کد نامعتبر یا منقضی است';
const BAD_SESSION = 'نشست نامعتبر است. دوباره وارد شوید';
const REFRESH_TTL_MS = 30 * 24 * 3600 * 1000;

interface Subject {
  type: 'USER' | 'MEMBER';
  id: string;
  role?: 'OWNER' | 'STAFF';
  gymId: string;
  name: string;
}

@Injectable()
export class AuthService {
  private readonly log = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantService,
    private readonly sms: SmsService,
  ) {}

  private key(purpose: 'manager' | 'member', gymSlug?: string) {
    return purpose === 'member' ? `member:${gymSlug}` : 'manager';
  }

  /** همیشه همان پاسخ را می‌دهد تا معلوم نشود شماره ثبت شده است یا نه */
  async requestOtp(input: OtpRequestInput) {
    const { phone, purpose, gymSlug } = input;
    if (purpose === 'member' && !gymSlug) throw new BadRequestException('نشانی باشگاه لازم است');
    const key = this.key(purpose, gymSlug);
    const now = new Date();

    const recent = await this.prisma.otpCode.findMany({
      where: { phone, purpose: key, createdAt: { gte: new Date(now.getTime() - OTP_WINDOW_SEC * 1000) } },
      select: { createdAt: true },
    });
    const decision = decideOtpRequest(recent.map((r) => r.createdAt), now);
    if (!decision.allowed) {
      throw new HttpException(
        { message: 'تعداد درخواست کد بیش از حد مجاز است', retryAfterSec: decision.retryAfterSec },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const eligible = await this.isEligible(phone, purpose, gymSlug);
    const code = generateOtpCode();
    // برای شماره‌های ثبت‌نشده هم ردیف ساخته می‌شود تا محدودیت‌ها یکسان رفتار کنند
    await this.prisma.otpCode.create({
      data: {
        phone,
        purpose: key,
        codeHash: hashOtp(code, phone, getSecrets().pepper),
        expiresAt: new Date(now.getTime() + OTP_TTL_SEC * 1000),
      },
    });
    if (eligible) {
      void this.sms.sendOtp(phone, code).catch((e: unknown) => this.log.error(`ارسال پیامک ناموفق: ${String(e)}`));
    }
    return { ok: true, retryAfterSec: OTP_COOLDOWN_SEC };
  }

  async verifyOtp(input: OtpVerifyInput) {
    const { phone, purpose, gymSlug, code } = input;
    if (purpose === 'member' && !gymSlug) throw new BadRequestException('نشانی باشگاه لازم است');
    const key = this.key(purpose, gymSlug);
    const now = new Date();

    const otp = await this.prisma.otpCode.findFirst({
      where: { phone, purpose: key, consumedAt: null, expiresAt: { gt: now }, attempts: { lt: OTP_MAX_ATTEMPTS } },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp) throw new UnauthorizedException(BAD_CODE);

    if (!verifyOtpHash(code, phone, getSecrets().pepper, otp.codeHash)) {
      await this.prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
      throw new UnauthorizedException(BAD_CODE);
    }
    // مصرف یک‌باره: فقط یک درخواست هم‌زمان می‌تواند کد را مصرف کند
    const used = await this.prisma.otpCode.updateMany({
      where: { id: otp.id, consumedAt: null },
      data: { consumedAt: now },
    });
    if (used.count !== 1) throw new UnauthorizedException(BAD_CODE);

    const subject = await this.resolveSubject(phone, purpose, gymSlug);
    const tokens = await this.issue(subject, randomUUID());
    return { ...tokens, subject: { type: subject.type, role: subject.role ?? null, gymId: subject.gymId, name: subject.name } };
  }

  async refresh(token: string) {
    const rec = await this.prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(token) } });
    if (!rec) throw new UnauthorizedException(BAD_SESSION);
    if (rec.revokedAt) {
      // استفاده‌ی دوباره از توکن چرخیده‌شده: احتمال سرقت؛ کل خانواده باطل می‌شود
      await this.revokeFamily(rec.familyId);
      throw new UnauthorizedException(BAD_SESSION);
    }
    if (rec.expiresAt <= new Date()) throw new UnauthorizedException(BAD_SESSION);

    const subject = await this.loadSubject(rec.subjectType as 'USER' | 'MEMBER', rec.subjectId, rec.gymId);
    if (!subject) {
      await this.revokeFamily(rec.familyId);
      throw new UnauthorizedException(BAD_SESSION);
    }
    const rotated = await this.prisma.refreshToken.updateMany({
      where: { id: rec.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (rotated.count !== 1) {
      await this.revokeFamily(rec.familyId);
      throw new UnauthorizedException(BAD_SESSION);
    }
    return this.issue(subject, rec.familyId);
  }

  async logout(token: string) {
    const rec = await this.prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(token) } });
    if (rec) await this.revokeFamily(rec.familyId);
    return { ok: true };
  }

  // ---------- helpers ----------
  private revokeFamily(familyId: string) {
    return this.prisma.refreshToken.updateMany({ where: { familyId, revokedAt: null }, data: { revokedAt: new Date() } });
  }

  private async issue(subject: Subject, familyId: string) {
    const accessToken = signAccessToken(
      { sub: subject.id, typ: subject.type === 'USER' ? 'user' : 'member', role: subject.role, gymId: subject.gymId },
      getSecrets().jwt,
    );
    const refreshToken = generateRefreshToken();
    await this.prisma.refreshToken.create({
      data: {
        familyId,
        subjectType: subject.type,
        subjectId: subject.id,
        gymId: subject.gymId,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      },
    });
    return { accessToken, refreshToken, expiresIn: ACCESS_TTL_SEC };
  }

  private async isEligible(phone: string, purpose: 'manager' | 'member', gymSlug?: string): Promise<boolean> {
    if (purpose === 'manager') {
      const u = await this.prisma.user.findUnique({ where: { phone } });
      return !!u && (u.role === Role.OWNER || u.role === Role.STAFF);
    }
    const gym = await this.prisma.gym.findUnique({ where: { slug: gymSlug as string } });
    if (!gym) return false;
    const m = await this.tenant.run(gym.id, (tx) =>
      tx.member.findUnique({ where: { gymId_phone: { gymId: gym.id, phone } } }),
    );
    return !!m && !m.archivedAt;
  }

  private async resolveSubject(phone: string, purpose: 'manager' | 'member', gymSlug?: string): Promise<Subject> {
    if (purpose === 'manager') {
      const u = await this.prisma.user.findUnique({ where: { phone }, include: { gym: true } });
      if (!u || !u.gym || (u.role !== Role.OWNER && u.role !== Role.STAFF)) throw new UnauthorizedException(BAD_CODE);
      this.assertActive(u.gym.status);
      return { type: 'USER', id: u.id, role: u.role, gymId: u.gym.id, name: u.name };
    }
    const gym = await this.prisma.gym.findUnique({ where: { slug: gymSlug as string } });
    if (!gym) throw new UnauthorizedException(BAD_CODE);
    this.assertActive(gym.status);
    const m = await this.tenant.run(gym.id, (tx) =>
      tx.member.findUnique({ where: { gymId_phone: { gymId: gym.id, phone } } }),
    );
    if (!m || m.archivedAt) throw new UnauthorizedException(BAD_CODE);
    return { type: 'MEMBER', id: m.id, gymId: gym.id, name: m.name };
  }

  private async loadSubject(type: 'USER' | 'MEMBER', id: string, gymId: string | null): Promise<Subject | null> {
    if (type === 'USER') {
      const u = await this.prisma.user.findUnique({ where: { id }, include: { gym: true } });
      if (!u || !u.gym || u.gym.status !== GymStatus.ACTIVE) return null;
      if (u.role !== Role.OWNER && u.role !== Role.STAFF) return null;
      return { type, id: u.id, role: u.role, gymId: u.gym.id, name: u.name };
    }
    if (!gymId) return null;
    const gym = await this.prisma.gym.findUnique({ where: { id: gymId } });
    if (!gym || gym.status !== GymStatus.ACTIVE) return null;
    const m = await this.tenant.run(gymId, (tx) => tx.member.findUnique({ where: { id } }));
    if (!m || m.archivedAt) return null;
    return { type, id: m.id, gymId, name: m.name };
  }

  private assertActive(status: GymStatus) {
    if (status === GymStatus.ACTIVE) return;
    throw new ForbiddenException(status === GymStatus.PENDING ? 'باشگاه شما هنوز تأیید نشده است' : 'باشگاه شما تعلیق شده است');
  }
}
