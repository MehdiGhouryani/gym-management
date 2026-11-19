import type { QueryClient } from '@tanstack/react-query';

/** بعد از هر تغییر (ثبت عضو، تمدید، پرداخت) فهرست‌ها، شمارنده‌ها و پروفایل دوباره خوانده می‌شوند */
export function invalidateMember(qc: QueryClient, id?: string) {
  void qc.invalidateQueries({ queryKey: ['members'] });
  void qc.invalidateQueries({ queryKey: ['report'] }); // پرداخت‌ها روی درآمد اثر می‌گذارند
  if (id) {
    void qc.invalidateQueries({ queryKey: ['member', id] });
    void qc.invalidateQueries({ queryKey: ['history', id] });
  }
}
