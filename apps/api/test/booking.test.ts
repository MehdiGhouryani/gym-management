import { describe, it, expect } from 'vitest';
import { decideBooking, firstWaitlistBooking } from '../src/classes/booking-logic.ts';

describe('تصمیم رزرو', () => {
  it('ظرفیت خالی → BOOKED', () => {
    expect(decideBooking({ bookedCount: 3, capacity: 12, existingStatus: null })).toEqual({ kind: 'BOOKED' });
  });
  it('ظرفیت پر → WAITLIST', () => {
    expect(decideBooking({ bookedCount: 12, capacity: 12, existingStatus: null })).toEqual({ kind: 'WAITLIST' });
  });
  it('رزرو فعال تکراری → خطا', () => {
    expect(decideBooking({ bookedCount: 3, capacity: 12, existingStatus: 'BOOKED' })).toEqual({ kind: 'ERROR', reason: 'ALREADY_BOOKED' });
    expect(decideBooking({ bookedCount: 3, capacity: 12, existingStatus: 'WAITLIST' })).toEqual({ kind: 'ERROR', reason: 'ALREADY_BOOKED' });
  });
  it('رزرو لغوشده قابل رزرو دوباره است', () => {
    expect(decideBooking({ bookedCount: 3, capacity: 12, existingStatus: 'CANCELLED' })).toEqual({ kind: 'BOOKED' });
  });
});

describe('فهرست انتظار', () => {
  it('قدیمی‌ترین WAITLIST ارتقا می‌یابد', () => {
    const r = firstWaitlistBooking([
      { id: 'a', status: 'BOOKED', createdAt: '2026-01-01' },
      { id: 'b', status: 'WAITLIST', createdAt: '2026-01-03' },
      { id: 'c', status: 'WAITLIST', createdAt: '2026-01-02' },
    ]);
    expect(r).toBe('c');
  });
  it('انتظار خالی → null', () => {
    expect(firstWaitlistBooking([{ id: 'a', status: 'BOOKED', createdAt: '2026-01-01' }])).toBeNull();
  });
});
