/** منطق خالص رزرو کلاس */

export type BookingDecision = { kind: 'BOOKED' } | { kind: 'WAITLIST' } | { kind: 'ERROR'; reason: 'FULL_AND_WAITLIST_CLOSED' | 'ALREADY_BOOKED' };

/** تصمیم رزرو: ظرفیت پر → فهرست انتظار؛ رزرو فعال قبلی همان عضو → خطا */
export function decideBooking(input: {
  bookedCount: number;
  capacity: number;
  existingStatus: 'BOOKED' | 'CANCELLED' | 'ATTENDED' | 'WAITLIST' | null;
}): BookingDecision {
  if (input.existingStatus === 'BOOKED' || input.existingStatus === 'ATTENDED' || input.existingStatus === 'WAITLIST') {
    return { kind: 'ERROR', reason: 'ALREADY_BOOKED' };
  }
  if (input.bookedCount < input.capacity) return { kind: 'BOOKED' };
  return { kind: 'WAITLIST' };
}

/** اولین نفر فهرست انتظار برای ارتقا بعد از لغو (قدیمی‌ترین) */
export function firstWaitlistBooking(
  bookings: { id: string; status: 'BOOKED' | 'CANCELLED' | 'ATTENDED' | 'WAITLIST'; createdAt: string }[],
): string | null {
  const wl = bookings
    .filter((b) => b.status === 'WAITLIST')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return wl[0]?.id ?? null;
}
