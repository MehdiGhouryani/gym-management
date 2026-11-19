import { Injectable, Logger } from '@nestjs/common';

export interface SmsProvider {
  sendOtp(phone: string, code: string): Promise<void>;
}

/** فقط برای توسعه: کد در لاگ چاپ می‌شود */
class ConsoleSmsProvider implements SmsProvider {
  private readonly log = new Logger('SMS');
  async sendOtp(phone: string, code: string) {
    this.log.warn(`OTP برای ${phone}: ${code}`);
  }
}

@Injectable()
export class SmsService {
  private readonly provider: SmsProvider;

  constructor() {
    const name = process.env.SMS_PROVIDER ?? 'console';
    if (name === 'console') {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('SMS_PROVIDER=console در production مجاز نیست');
      }
      this.provider = new ConsoleSmsProvider();
    } else {
      // فاز ۳: ارائه‌دهنده‌ی واقعی (مثلاً کاوه‌نگار) اینجا اضافه می‌شود
      throw new Error(`SMS_PROVIDER ناشناخته: ${name}`);
    }
  }

  sendOtp(phone: string, code: string) {
    return this.provider.sendOtp(phone, code);
  }
}
