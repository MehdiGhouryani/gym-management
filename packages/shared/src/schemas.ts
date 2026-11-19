import { z } from 'zod';
import { isIranMobile, normalizePhone } from './phone';
import { isValidDateOnly } from './status';
import { normalizePersian } from './text';

export const phoneSchema = z
  .string()
  .transform(normalizePhone)
  .refine(isIranMobile, 'شماره‌ی موبایل معتبر نیست');

export const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(isValidDateOnly, 'تاریخ نامعتبر است');
export const payMethodSchema = z.enum(['CASH', 'CARD', 'POS']);

// ---------- ورود ----------
export const otpPurposeSchema = z.enum(['manager', 'member']);
const gymSlugSchema = z.string().trim().toLowerCase().min(2).max(60).optional();

export const otpRequestSchema = z.object({ phone: phoneSchema, purpose: otpPurposeSchema, gymSlug: gymSlugSchema });
export const otpVerifySchema = z.object({
  phone: phoneSchema,
  purpose: otpPurposeSchema,
  gymSlug: gymSlugSchema,
  code: z.string().regex(/^\d{5}$/),
});
// refreshToken اختیاری است: اپ آن را در بدنه می‌فرستد، وب از کوکی HttpOnly می‌گیرد
export const refreshSchema = z.object({ refreshToken: z.string().min(20).max(200).optional() });

// ---------- اعضا ----------
const textOf = (label: string, min: number, max: number) =>
  z
    .string()
    .transform(normalizePersian)
    .refine((v) => v.length >= min && v.length <= max, `${label} باید ${min} تا ${max} نویسه باشد`);

export const memberNameSchema = textOf('نام', 2, 80);
const noteSchema = z.string().trim().max(500);

export const memberFieldsSchema = z.object({
  name: memberNameSchema,
  phone: phoneSchema,
  birthDate: dateOnly.optional(),
  note: noteSchema.optional(),
});
export const updateMemberSchema = z
  .object({
    name: memberNameSchema.optional(),
    phone: phoneSchema.optional(),
    birthDate: dateOnly.nullable().optional(),
    note: noteSchema.nullable().optional(),
    /** رضایت پیامک یادآوری */
    smsOptOut: z.boolean().optional(),
    /** برچسب‌های دسته‌بندی (حداکثر ۸ تا) */
    tags: z.array(z.string().trim().min(2).max(24)).max(8).optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), 'حداقل یک فیلد لازم است');

export const memberStatusSchema = z.enum(['active', 'expiring', 'expired', 'lapsed', 'none']);
export const listMembersQuerySchema = z.object({
  q: z.string().max(80).optional(),
  status: memberStatusSchema.optional(),
  archived: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  debtor: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

// ---------- باشگاه و کارکنان ----------
export const gymUpdateSchema = z
  .object({
    name: textOf('نام باشگاه', 2, 80).optional(),
    city: textOf('شهر', 2, 40).optional(),
    address: z.string().trim().max(200).nullable().optional(),
    phone: phoneSchema.nullable().optional(),
    expiringDays: z.number().int().min(1).max(30).optional(),
    graceDays: z.number().int().min(1).max(60).optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), 'حداقل یک فیلد لازم است');

export const createStaffSchema = z.object({
  name: textOf('نام', 2, 80),
  phone: phoneSchema,
});

// ---------- پلن‌ها ----------
export const planKindSchema = z.enum(['days', 'sessions']);

// پایه بدون refine تا .partial() کار کند
const planBase = z.object({
  name: textOf('نام پلن', 2, 40),
  kind: planKindSchema.default('days'),
  days: z.number().int().min(1).max(3660),
  /** فقط پلن جلسه‌ای: تعداد جلسه‌های مجاز */
  sessionsCount: z.number().int().min(1).max(500).optional(),
  price: z.number().int().min(0).max(2_000_000_000),
});

export const planFieldsSchema = planBase.refine(
  (v) => (v.kind === 'sessions' ? v.sessionsCount !== undefined : v.sessionsCount === undefined),
  { message: 'تعداد جلسه فقط برای پلن جلسه‌ای لازم است' },
);
export const createPlanSchema = planFieldsSchema;
export const updatePlanSchema = planBase
  .partial()
  .extend({ active: z.boolean().optional() })
  .refine((v) => Object.values(v).some((x) => x !== undefined), 'حداقل یک فیلد لازم است');
export const listPlansQuerySchema = z.object({
  includeInactive: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
});

// ---------- گزارش ----------
/** ماه شمسی به‌صورت YYYY-MM (مثلاً 1405-07)؛ بدون مقدار یعنی ماه جاری */
export const reportQuerySchema = z.object({ month: z.string().regex(/^\d{4}-\d{2}$/).optional() });

// ---------- گزارش ----------
export const monthlyReportQuerySchema = z
  .object({
    year: z.coerce.number().int().min(1302).max(1500).optional(),
    month: z.coerce.number().int().min(1).max(12).optional(),
  })
  .refine((v) => (v.year === undefined) === (v.month === undefined), 'سال و ماه را با هم بفرستید');

// ---------- اشتراک و پرداخت ----------
const tomanSchema = z.number().int().min(0).max(2_000_000_000);

/**
 * تمدید یا ثبت اشتراک جدید برای عضو. startsOn اگر نیاید، هوشمند حساب می‌شود.
 * price فقط برای مدیر باشگاه (تخفیف). method وقتی paidAmount بیشتر از صفر است لازم است.
 */
export const renewSchema = z
  .object({
    planId: z.uuid(),
    startsOn: dateOnly.optional(),
    price: tomanSchema.optional(),
    /** تخفیف درصدی فقط برای مدیر؛ با price هم‌زمان پذیرفته نمی‌شود */
    discountPercent: z.number().int().min(1).max(99).optional(),
    paidAmount: tomanSchema,
    method: payMethodSchema.optional(),
  })
  .refine((v) => v.paidAmount === 0 || v.method !== undefined, 'روش پرداخت را مشخص کنید')
  .refine((v) => v.price === undefined || v.discountPercent === undefined, 'تخفیف درصدی و مبلغ دستی با هم پذیرفته نمی‌شود');

export const freezeSchema = z.object({ days: z.number().int().min(1).max(30) });

// ---------- CRM: سرنخ‌ها ----------
export const leadStatusSchema = z.enum(['NEW', 'CONTACTED', 'TRIAL', 'CONVERTED', 'LOST']);

export const createLeadSchema = z.object({
  name: textOf('نام', 2, 80),
  phone: phoneSchema,
  source: z.string().trim().max(80).optional(),
  note: z.string().trim().max(300).optional(),
});

export const updateLeadSchema = z
  .object({
    status: leadStatusSchema.optional(),
    source: z.string().trim().max(80).nullable().optional(),
    note: z.string().trim().max(300).nullable().optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), 'حداقل یک فیلد لازم است');

/** چرخه‌ی مجاز سرنخ؛ هر گذار فقط به همین حالت‌ها */
export const leadTransitions: Record<string, string[]> = {
  NEW: ['CONTACTED', 'TRIAL', 'LOST'],
  CONTACTED: ['TRIAL', 'LOST'],
  TRIAL: ['CONVERTED', 'LOST'],
  CONVERTED: [],
  LOST: ['CONTACTED'],
};

export function canTransitionLead(from: string, to: string): boolean {
  return (leadTransitions[from] ?? []).includes(to);
}

/** پرداخت بدهی عضو؛ از قدیمی‌ترین اشتراک بدهکار کم می‌شود */
export const payDebtSchema = z.object({
  amount: z.number().int().min(1).max(2_000_000_000),
  method: payMethodSchema,
});

/** بازپرداخت با سند معکوس؛ فقط مدیر. مانده پس از بازپرداخت نمی‌تواند منفی شود */
export const refundSchema = z.object({
  amount: z.number().int().min(1).max(2_000_000_000),
  method: payMethodSchema,
  reason: z.string().trim().max(200).optional(),
});

export type OtpRequestInput = z.infer<typeof otpRequestSchema>;
export type OtpVerifyInput = z.infer<typeof otpVerifySchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type MemberFieldsInput = z.infer<typeof memberFieldsSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
export type ListMembersQuery = z.infer<typeof listMembersQuerySchema>;
export type CreatePlanInput = z.infer<typeof createPlanSchema>;
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
export type ListPlansQuery = z.infer<typeof listPlansQuerySchema>;
export type ReportQuery = z.infer<typeof reportQuerySchema>;
export type MonthlyReportQuery = z.infer<typeof monthlyReportQuerySchema>;
export type RenewInput = z.infer<typeof renewSchema>;
export type PayDebtInput = z.infer<typeof payDebtSchema>;
export type GymUpdateInput = z.infer<typeof gymUpdateSchema>;
export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type FreezeInput = z.infer<typeof freezeSchema>;
export type RefundInput = z.infer<typeof refundSchema>;
export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
