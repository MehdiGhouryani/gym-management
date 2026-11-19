/** قالب‌های پیام یادآوری — خالص و تست‌پذیر */
export type ReminderTemplate = 'expiring' | 'expired' | 'debt' | 'receipt';

export interface ReminderVars {
  name: string;
  gymName: string;
  /** برای expiring: روزهای باقی‌مانده */
  daysLeft?: number | null;
  /** برای debt: مبلغ بدهی (تومان) */
  balance?: number;
  slug?: string;
}

const toman = (n: number): string => n.toLocaleString('fa-IR');

export function reminderText(template: ReminderTemplate, v: ReminderVars): string {
  switch (template) {
    case 'expiring':
      return `${v.name} عزیز، اشتراک شما در ${v.gymName} تا ${toman(v.daysLeft ?? 0)} روز دیگر تمام می‌شود. برای تمدید منتظرتان هستیم.${v.slug ? ` فولاد.app/${v.slug}` : ''}`;
    case 'expired':
      return `${v.name} عزیز، اشتراک شما در ${v.gymName} منقضی شده است. با تمدید، تمرین را ادامه دهید.${v.slug ? ` فولاد.app/${v.slug}` : ''}`;
    case 'debt':
      return `${v.name} عزیز، بدهی شما به ${v.gymName} ${toman(v.balance ?? 0)} تومان است. برای تسویه با پذیرش در تماس باشید.`;
    case 'receipt':
      return `${v.name} عزیز، پرداخت شما در ${v.gymName} ثبت شد. سپاس از اعتماد شما.`;
  }
}
