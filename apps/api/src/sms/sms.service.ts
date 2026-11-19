import { Injectable, Logger } from '@nestjs/common';

export interface SmsProvider {
  sendOtp(phone: string, code: string): Promise<void>;
  /** متن آزاد برای یادآوری‌ها */
  send(phone: string, text: string): Promise<void>;
}

/** فقط برای توسعه: کد و متن در لاگ چاپ می‌شود */
class ConsoleSmsProvider implements SmsProvider {
  private readonly log = new Logger('SMS');
  async sendOtp(phone: string, code: string) {
    this.log.warn(`OTP برای ${phone}: ${code}`);
  }
  async send(phone: string, text: string) {
    this.log.warn(`SMS برای ${phone}: ${text}`);
  }
}

/** کاوه‌نگار: SMS_API_KEY لازم است؛ خطای شبکه پاس‌داده می‌شود تا صف وضعیت FAILED بگیرد */
class KavenegarProvider implements SmsProvider {
  private readonly log = new Logger('SMS');
  constructor(private readonly apiKey: string) {}

  private async request(action: 'sms/send', params: URLSearchParams): Promise<void> {
    const res = await fetch(`https://api.kavenegar.com/v1/${this.apiKey}/${action}?${params.toString()}`, {
      method: 'POST',
    });
    const body = (await res.json().catch(() => ({}))) as { return?: { status?: number; message?: string } };
    if (!res.ok || (body.return?.status !== undefined && body.return.status >= 400)) {
      throw new Error(`kavenegar: ${body.return?.message ?? res.status}`);
    }
    this.log.log(`ارسال شد: ${body.return?.message ?? 'ok'}`);
  }

  async sendOtp(phone: string, code: string) {
    await this.request('sms/send', new URLSearchParams({ receptor: phone, message: `کد ورود شما به فولاد: ${code}` }));
  }

  async send(phone: string, text: string) {
    await this.request('sms/send', new URLSearchParams({ receptor: phone, message: text }));
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
    } else if (name === 'kavenegar') {
      const key = process.env.SMS_API_KEY;
      if (!key) throw new Error('SMS_API_KEY برای ارائه‌دهنده‌ی کاوه‌نگار لازم است');
      this.provider = new KavenegarProvider(key);
    } else {
      throw new Error(`SMS_PROVIDER ناشناخته: ${name}`);
    }
  }

  sendOtp(phone: string, code: string) {
    return this.provider.sendOtp(phone, code);
  }

  send(phone: string, text: string) {
    return this.provider.send(phone, text);
  }
}
