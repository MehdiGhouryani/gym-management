import { describe, it, expect } from 'vitest';
import { buildReminder, smsUrl, telUrl, toInternational, whatsappUrl } from '../src/lib/reminders.ts';

describe('پیام یادآوری', () => {
  it('نزدیک انقضا', () => {
    const t = buildReminder({ name: 'نگار احمدی', status: 'EXPIRING', currentEndsOn: '2026-10-12' }, 'فولاد');
    expect(t).toBe('سلام نگار عزیز، اشتراک شما در باشگاه فولاد در ۲۰ مهر تمام می‌شود. برای تمدید با ما در تماس باشید.');
  });
  it('منقضی', () => {
    const t = buildReminder({ name: 'مهدی کریمی', status: 'EXPIRED', currentEndsOn: '2026-10-12' }, 'فولاد');
    expect(t.includes('تمام شده است')).toBe(true);
    expect(t.includes('مهدی')).toBe(true);
  });
});

describe('لینک‌ها', () => {
  it('شماره‌ی بین‌المللی', () => {
    expect(toInternational('09123456789')).toBe('989123456789');
  });
  it('تماس', () => {
    expect(telUrl('09123456789')).toBe('tel:09123456789');
  });
  it('پیامک اندروید و iOS', () => {
    expect(smsUrl('09123456789', 'سلام', 'android')).toBe('sms:09123456789?body=%D8%B3%D9%84%D8%A7%D9%85');
    expect(smsUrl('09123456789', 'سلام', 'ios')).toBe('sms:09123456789&body=%D8%B3%D9%84%D8%A7%D9%85');
  });
  it('واتس‌اپ', () => {
    expect(whatsappUrl('09123456789', 'a b')).toBe('https://wa.me/989123456789?text=a%20b');
  });
});
