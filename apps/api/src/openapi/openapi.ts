export type JsonSchema = Record<string, unknown>;

/** طرح‌های بدنه‌ی درخواست؛ از روی Zod ساخته می‌شوند تا هرگز با اعتبارسنجی واقعی فرق نکنند */
export interface BodySchemas {
  otpRequest: JsonSchema;
  otpVerify: JsonSchema;
  refresh: JsonSchema;
  memberFields: JsonSchema;
  updateMember: JsonSchema;
  createPlan: JsonSchema;
  updatePlan: JsonSchema;
  renew: JsonSchema;
  payDebt: JsonSchema;
  gymUpdate: JsonSchema;
  createStaff: JsonSchema;
  freeze: JsonSchema;
  refund: JsonSchema;
  createLead: JsonSchema;
  updateLead: JsonSchema;
  checkin: JsonSchema;
  createCoach: JsonSchema;
  updateCoach: JsonSchema;
  createClass: JsonSchema;
  updateClass: JsonSchema;
  createSession: JsonSchema;
  bookMember: JsonSchema;
  bookingUpdate: JsonSchema;
  publicLead: JsonSchema;
}

const BODY_NAMES: Record<keyof BodySchemas, string> = {
  otpRequest: 'OtpRequestBody',
  otpVerify: 'OtpVerifyBody',
  refresh: 'RefreshBody',
  memberFields: 'CreateMemberBody',
  updateMember: 'UpdateMemberBody',
  createPlan: 'CreatePlanBody',
  updatePlan: 'UpdatePlanBody',
  renew: 'RenewBody',
  payDebt: 'PayDebtBody',
  gymUpdate: 'GymUpdateBody',
  createStaff: 'CreateStaffBody',
  freeze: 'FreezeBody',
  refund: 'RefundBody',
  createLead: 'CreateLeadBody',
  updateLead: 'UpdateLeadBody',
  checkin: 'CheckInBody',
  createCoach: 'CreateCoachBody',
  updateCoach: 'UpdateCoachBody',
  createClass: 'CreateClassBody',
  updateClass: 'UpdateClassBody',
  createSession: 'CreateSessionBody',
  bookMember: 'BookMemberBody',
  bookingUpdate: 'BookingUpdateBody',
  publicLead: 'PublicLeadBody',
};

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const str = (extra: JsonSchema = {}) => ({ type: 'string', ...extra });
const int = (extra: JsonSchema = {}) => ({ type: 'integer', ...extra });
const nullable = (type: string, extra: JsonSchema = {}) => ({ type: [type, 'null'], ...extra });
const uuid = str({ format: 'uuid' });
const date = str({ format: 'date', description: 'YYYY-MM-DD (میلادی)' });
const dateTime = str({ format: 'date-time' });
const obj = (properties: Record<string, unknown>, required: string[] = Object.keys(properties)) => ({
  type: 'object',
  properties,
  required,
});

const STATUS = ['ACTIVE', 'EXPIRING', 'EXPIRED', 'NONE'];
const METHODS = ['CASH', 'CARD', 'POS'];

function componentSchemas(bodies: BodySchemas): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  (Object.keys(BODY_NAMES) as (keyof BodySchemas)[]).forEach((k) => {
    out[BODY_NAMES[k]] = bodies[k];
  });
  const payment = obj({ id: uuid, amount: int(), method: str({ enum: METHODS }), paidAt: dateTime });
  const subscription = obj({
    id: uuid, planId: uuid, planName: nullable('string'),
    planKind: str({ enum: ['days', 'sessions'] }),
    sessionsTotal: nullable('integer'), sessionsUsed: nullable('integer'), sessionsRemaining: nullable('integer'),
    startsOn: date, endsOn: date,
    price: int({ description: 'تومان' }), paid: int(), balance: int(),
    frozenDays: int({ description: 'جمع روزهای توقف موقت' }),
    cancelledAt: nullable('string', { format: 'date-time' }),
    payments: { type: 'array', items: ref('Payment') }, createdAt: dateTime,
  });
  return {
    ...out,
    Error: {
      type: 'object',
      description: 'ساختار خطا (NestJS). فیلدهای اضافه بسته به نوع خطا می‌آیند.',
      properties: {
        statusCode: int(), message: { oneOf: [str(), { type: 'array', items: str() }] }, error: str(),
        code: str({ description: 'مثلاً MEMBER_EXISTS، MEMBER_ARCHIVED، PLAN_EXISTS، PLAN_INACTIVE، NO_DEBT، AMOUNT_EXCEEDS_DEBT، IDEMPOTENCY_CONFLICT، ORIGIN_FORBIDDEN' }),
        existingMemberId: uuid, totalDebt: int(), retryAfterSec: int(),
        issues: { type: 'array', items: obj({ path: str(), message: str() }) },
      },
      additionalProperties: true,
    },
    OtpRequested: obj({ ok: { type: 'boolean' }, retryAfterSec: int() }),
    Tokens: obj({ accessToken: str(), refreshToken: str(), expiresIn: int({ description: 'ثانیه' }) }),
    VerifyResult: obj({
      accessToken: str(), refreshToken: str(), expiresIn: int(),
      subject: obj({ type: str({ enum: ['USER', 'MEMBER'] }), role: nullable('string', { enum: ['OWNER', 'STAFF', null] }), gymId: uuid, name: str() }),
    }),
    Me: obj({ type: str({ enum: ['user', 'member'] }), role: nullable('string'), gymId: uuid }),
    Session: obj({
      id: uuid, gymId: nullable('string'),
      createdAt: dateTime, expiresAt: dateTime,
    }),
    SessionsPage: obj({ items: { type: 'array', items: ref('Session') } }),
    RevokeResult: obj({ ok: { type: 'boolean' }, revoked: int({ description: 'تعداد نشست باطل‌شده' }) }),
    CheckInResult: obj({
      memberId: uuid, name: str(),
      status: str({ enum: ['ACTIVE', 'EXPIRING', 'EXPIRED', 'NONE'] }),
      daysLeft: nullable('integer'), balance: int(),
      sessionsRemaining: nullable('integer'),
    }),
    AttendanceRow: obj({ id: uuid, method: str({ enum: ['QR', 'MANUAL'] }), note: nullable('string'), checkInAt: dateTime }),
    AttendancePage: obj({
      items: { type: 'array', items: ref('AttendanceRow') },
      total: int(), page: int(), limit: int(), pages: int(),
    }),
    QrToken: obj({ qrToken: str({ description: 'توکن امن ورود؛ در QR گذاشته می‌شود' }) }),
    Coach: obj({ id: uuid, name: str(), specialty: nullable('string'), phone: nullable('string'), active: { type: 'boolean' } }),
    GymClass: obj({
      id: uuid, name: str(), coachId: nullable('uuid'), coachName: nullable('string'),
      capacity: int(), durationMin: int(), active: { type: 'boolean' },
    }),
    ClassSessionRow: obj({
      id: uuid, startsAt: dateTime, booked: int(), waitlist: int(), capacity: int(),
    }),
    BookingRow: obj({
      id: uuid,
      status: str({ enum: ['BOOKED', 'CANCELLED', 'ATTENDED', 'WAITLIST'] }),
      memberId: uuid, memberName: str(), memberPhone: str(), createdAt: dateTime,
    }),
    SessionBookings: obj({
      session: obj({ id: uuid, startsAt: dateTime, className: str(), capacity: int() }),
      items: { type: 'array', items: ref('BookingRow') },
    }),
    BookingResult: obj({ bookingId: uuid, status: str({ enum: ['BOOKED', 'WAITLIST'] }) }),
    BookingUpdateResult: obj({ bookingId: uuid, status: str(), promotedId: nullable('uuid') }),
    PublicGymProfile: obj({
      slug: str(), name: str(), city: str(), address: nullable('string'), phone: nullable('string'),
      plans: { type: 'array', items: obj({ name: str(), days: int(), price: int() }) },
      sessions: { type: 'array', items: obj({ id: uuid, startsAt: dateTime, className: str(), coachName: nullable('string') }) },
    }),
    PortalMe: obj({
      name: str(), gymName: str(), gymSlug: str(),
      status: str({ enum: ['ACTIVE', 'EXPIRING', 'EXPIRED', 'NONE'] }),
      daysLeft: nullable('integer'), currentEndsOn: nullable('date'),
      planName: nullable('string'), sessionsRemaining: nullable('integer'),
      balance: int(), qrToken: str(),
      bookings: { type: 'array', items: obj({ id: uuid, status: str(), className: str(), startsAt: dateTime }) },
    }),
    PortalPayments: obj({
      items: { type: 'array', items: obj({ id: uuid, amount: int(), method: str(), paidAt: dateTime }) },
    }),
    PortalAttendance: obj({
      items: { type: 'array', items: obj({ id: uuid, checkInAt: dateTime }) },
    }),
    PortalOk: obj({ ok: { type: 'boolean' } }),
    ReminderRow: obj({
      id: uuid,
      template: str({ enum: ['expiring', 'expired', 'debt', 'receipt'] }),
      status: str({ enum: ['QUEUED', 'SENT', 'FAILED'] }),
      attempts: int(), error: nullable('string'), sentAt: nullable('string', { format: 'date-time' }),
      createdAt: dateTime, memberId: uuid, memberName: str(), memberPhone: str(),
    }),
    RemindersPage: obj({
      items: { type: 'array', items: ref('ReminderRow') },
      total: int(), page: int(), limit: int(), pages: int(),
    }),
    Health: obj({ ok: { type: 'boolean' }, today: date, time: dateTime }),
    Gym: obj({
      id: uuid, slug: str(), name: str(), city: str(), address: nullable('string'), phone: nullable('string'),
      status: str({ enum: ['PENDING', 'ACTIVE', 'SUSPENDED'] }),
      expiringDays: int({ description: 'تا چند روز مانده «نزدیک انقضا» حساب شود' }),
      graceDays: int({ description: 'مهلت پیگیری بعد از پایان اشتراک (روز)' }),
    }),
    GymUser: obj({
      id: uuid, name: str(), phone: str({ description: '09xxxxxxxxx' }),
      role: str({ enum: ['OWNER', 'STAFF'] }), createdAt: dateTime,
    }),
    GymUsersPage: obj({ items: { type: 'array', items: ref('GymUser') } }),
    Ok: obj({ ok: { type: 'boolean' } }),
    Member: obj({
      id: uuid, name: str(), phone: str({ description: '09xxxxxxxxx' }), birthDate: nullable('string', { format: 'date' }),
      note: nullable('string'), currentEndsOn: nullable('string', { format: 'date' }),
      status: str({ enum: STATUS }), daysLeft: nullable('integer', { description: 'صفر یعنی امروز آخرین روز است؛ منفی یعنی گذشته' }),
      followUp: { type: 'boolean', description: 'منقضی و هنوز در مهلت پیگیری' }, balance: int({ description: 'بدهی (تومان)' }),
      smsOptOut: { type: 'boolean', description: 'عضو پیامک یادآوری نمی‌خواهد' },
      tags: { type: 'array', items: str(), description: 'برچسب‌های دسته‌بندی' },
      archivedAt: nullable('string', { format: 'date-time' }), createdAt: dateTime,
    }),
    MemberPage: obj({ items: { type: 'array', items: ref('Member') }, total: int(), page: int(), limit: int(), pages: int() }),
    MemberCounts: obj({ all: int(), active: int(), expiring: int(), expired: int(), lapsed: int(), none: int(), debtors: int() }),
    MemberTimeline: obj({
      items: { type: 'array', items: obj({ id: uuid, action: str(), at: dateTime, meta: nullable('object') }) },
    }),
    Lead: obj({
      id: uuid, name: str(), phone: str(),
      status: str({ enum: ['NEW', 'CONTACTED', 'TRIAL', 'CONVERTED', 'LOST'] }),
      source: nullable('string'), note: nullable('string'),
      memberId: nullable('uuid'), memberName: nullable('string'),
      createdAt: dateTime, updatedAt: dateTime,
    }),
    LeadsPage: obj({
      items: { type: 'array', items: ref('Lead') },
      total: int(), page: int(), limit: int(), pages: int(),
    }),
    ConvertLeadResult: obj({ memberId: uuid, lead: ref('Lead') }),
    Plan: obj({
      id: uuid, name: str(), kind: str({ enum: ['days', 'sessions'] }),
      days: int(), sessionsCount: nullable('integer', { description: 'فقط پلن جلسه‌ای' }),
      price: int(), active: { type: 'boolean' }, monthlyPrice: int({ description: 'معادل ماهانه (۳۰ روز)' }),
    }),
    PlanPriceHistory: obj({ items: { type: 'array', items: obj({ id: uuid, price: int(), days: int(), at: dateTime }) } }),
    Payment: payment,
    Subscription: subscription,
    SubscriptionHistory: obj({
      items: { type: 'array', items: ref('Subscription') },
      summary: obj({ totalPrice: int(), totalPaid: int(), balance: int() }),
    }),
    RenewResult: obj({
      subscription: ref('Subscription'),
      member: obj({ id: uuid, currentEndsOn: date, balance: int() }),
    }),
    PayResult: obj({
      allocations: { type: 'array', items: obj({ subscriptionId: uuid, amount: int() }) },
      balance: int({ description: 'بدهی باقی‌مانده' }),
    }),
    RefundResult: obj({ refundId: uuid, balance: int({ description: 'بدهی پس از بازپرداخت' }) }),
    MonthlyReport: obj({
      period: obj({ year: int(), month: int(), monthName: str(), from: date, to: date }),
      revenue: obj({
        total: int(), paymentCount: int(),
        byMethod: obj({ CASH: int(), CARD: int(), POS: int() }),
        weeks: { type: 'array', items: int(), minItems: 4, maxItems: 4 },
        previousTotal: int(), changePercent: nullable('integer'),
      }),
      members: obj({ active: int(), newInMonth: int() }),
      renewal: obj({ total: int(), renewed: int(), lost: int(), pending: int(), rate: nullable('integer') }),
      receivables: obj({ total: int(), debtors: int() }),
      recentPayments: {
        type: 'array',
        items: obj({ id: uuid, amount: int(), method: str({ enum: METHODS }), paidAt: dateTime, memberId: uuid, memberName: str() }),
      },
    }),
    PaymentRow: obj({
      id: uuid, amount: int(), method: str({ enum: METHODS }), paidAt: dateTime,
      memberId: uuid, memberName: str(),
    }),
    PaymentsPage: obj({
      items: { type: 'array', items: ref('PaymentRow') },
      total: int(), page: int(), limit: int(), pages: int(),
      sum: int({ description: 'جمع پرداخت‌های دوره‌ی فیلترشده' }),
    }),
    AnnualReport: obj({
      year: int(),
      months: { type: 'array', items: obj({ month: int(), monthName: str(), revenue: int(), paymentCount: int(), newInMonth: int() }) },
      totals: obj({ revenue: int(), paymentCount: int(), newMembers: int() }),
    }),
    PlanStats: obj({
      period: obj({ year: int(), month: int(), monthName: str() }),
      items: { type: 'array', items: obj({ planId: uuid, planName: str(), count: int(), revenue: int(), sharePercent: int() }) },
      total: int(),
    }),
    StaffStats: obj({
      period: obj({ year: int(), month: int(), monthName: str() }),
      items: { type: 'array', items: obj({ actorId: uuid, name: str(), renewals: int(), payments: int(), collected: int() }) },
    }),
    Dashboard: obj({
      kpis: obj({
        activeMembers: int({ description: 'اعضای بایگانی‌نشده با اشتراک معتبر امروز' }),
        monthRevenue: int(), revenueChangePercent: nullable('integer'),
        receivables: int(), debtors: int(), newInMonth: int(),
        followUps: int({ description: 'نزدیک انقضا + منقضی در مهلت پیگیری' }),
      }),
      trend: { type: 'array', items: obj({ label: str(), total: int() }), description: 'درآمد ۶ ماه اخیر شمسی' },
      recentPayments: {
        type: 'array',
        items: obj({ id: uuid, amount: int(), method: str({ enum: METHODS }), paidAt: dateTime, memberId: uuid, memberName: str() }),
      },
      followUps: obj({
        expiring: { type: 'array', items: ref('Member') },
        expired: { type: 'array', items: ref('Member') },
      }),
    }),
  };
}

interface Param {
  name: string;
  schema: JsonSchema;
  description?: string;
}
interface OpSpec {
  tag: string;
  summary: string;
  description?: string;
  auth?: boolean;
  body?: keyof BodySchemas;
  query?: Param[];
  headers?: Param[];
  ok: { code: number; schema?: string; description: string };
  errors?: number[];
}

const ERRORS: Record<number, string> = {
  400: 'ورودی نامعتبر',
  401: 'ورود نشده یا توکن نامعتبر',
  403: 'دسترسی ندارید',
  404: 'پیدا نشد',
  409: 'تعارض (مثلاً شماره‌ی تکراری)',
  429: 'تعداد درخواست بیش از حد مجاز',
};

export function buildOpenApi(bodies: BodySchemas) {
  const paths: Record<string, Record<string, unknown>> = {};

  const add = (method: string, path: string, s: OpSpec) => {
    const parameters: unknown[] = [...path.matchAll(/\{(\w+)\}/g)].map((m) => ({
      name: m[1], in: 'path', required: true, schema: uuid,
    }));
    for (const q of s.query ?? []) {
      parameters.push({ name: q.name, in: 'query', required: false, schema: q.schema, description: q.description });
    }
    for (const h of s.headers ?? []) {
      parameters.push({ name: h.name, in: 'header', required: false, schema: h.schema, description: h.description });
    }
    const responses: Record<string, unknown> = {
      [String(s.ok.code)]: s.ok.schema
        ? { description: s.ok.description, content: { 'application/json': { schema: ref(s.ok.schema) } } }
        : { description: s.ok.description },
    };
    for (const code of s.errors ?? []) {
      responses[String(code)] = {
        description: ERRORS[code],
        content: { 'application/json': { schema: ref('Error') } },
      };
    }
    (paths[path] ??= {})[method] = {
      tags: [s.tag],
      summary: s.summary,
      ...(s.description ? { description: s.description } : {}),
      security: s.auth === false ? [] : [{ bearerAuth: [] }],
      ...(parameters.length ? { parameters } : {}),
      ...(s.body
        ? { requestBody: { required: true, content: { 'application/json': { schema: ref(BODY_NAMES[s.body]) } } } }
        : {}),
      responses,
    };
  };

  const AUTHED = [401, 403];
  const page = [
    { name: 'page', schema: int({ minimum: 1, default: 1 }) },
    { name: 'limit', schema: int({ minimum: 1, maximum: 100, default: 30 }) },
  ];

  add('get', '/health', { tag: 'سلامت', summary: 'بررسی سلامت سرور و پایگاه داده', auth: false, ok: { code: 200, schema: 'Health', description: 'سالم' } });

  add('get', '/gym', {
    tag: 'باشگاه', summary: 'اطلاعات و آستانه‌های باشگاهِ کاربر', description: 'نقش: مدیر و پذیرش. باشگاه از روی توکن تعیین می‌شود.',
    ok: { code: 200, schema: 'Gym', description: 'باشگاه' }, errors: [401, 403, 404],
  });
  add('patch', '/gym', {
    tag: 'باشگاه', summary: 'ویرایش باشگاه (فقط مدیر)', body: 'gymUpdate',
    description: 'آستانه‌ها: expiringDays بین ۱ تا ۳۰ و graceDays بین ۱ تا ۶۰.',
    ok: { code: 200, schema: 'Gym', description: 'ویرایش شد' }, errors: [...AUTHED, 400],
  });
  add('get', '/gym/users', {
    tag: 'باشگاه', summary: 'کارکنان باشگاه (فقط مدیر)',
    ok: { code: 200, schema: 'GymUsersPage', description: 'کارکنان' }, errors: AUTHED,
  });
  add('post', '/gym/users', {
    tag: 'باشگاه', summary: 'افزودن پذیرش (فقط مدیر)', body: 'createStaff',
    description: 'نقش جدید همیشه STAFF است. شماره تکراری: ۴۰۹ USER_EXISTS. ورود با OTP همان شماره.',
    ok: { code: 201, schema: 'GymUser', description: 'ساخته شد' }, errors: [...AUTHED, 400, 409],
  });
  add('delete', '/gym/users/{id}', {
    tag: 'باشگاه', summary: 'حذف پذیرش (فقط مدیر)', description: 'نشست‌های او باطل می‌شود. مدیر باشگاه قابل حذف نیست (۴۰۹ OWNER_IMMUTABLE).',
    ok: { code: 200, schema: 'Ok', description: 'حذف شد' }, errors: [...AUTHED, 404, 409],
  });

  add('post', '/auth/otp/request', {
    tag: 'ورود', summary: 'درخواست کد پیامکی', auth: false, body: 'otpRequest',
    description: 'پاسخ همیشه یکسان است تا معلوم نشود شماره ثبت شده یا نه. برای عضو، gymSlug لازم است. با SMS_PROVIDER=console کد در لاگ سرور چاپ می‌شود.',
    ok: { code: 200, schema: 'OtpRequested', description: 'درخواست ثبت شد' }, errors: [400, 429],
  });
  add('post', '/auth/otp/verify', {
    tag: 'ورود', summary: 'تأیید کد و دریافت توکن‌ها', auth: false, body: 'otpVerify',
    description: 'مدیر فقط وقتی وارد می‌شود که باشگاهش ACTIVE باشد (در انتظار تأیید یا تعلیق: ۴۰۳). درخواست از مرورگر (با Origin): refresh token در کوکی HttpOnly و بدنه فقط accessToken دارد؛ اپ توکن‌ها را در بدنه می‌گیرد.',
    ok: { code: 200, schema: 'VerifyResult', description: 'ورود موفق' }, errors: [400, 401, 403, 429],
  });
  add('post', '/auth/refresh', {
    tag: 'ورود', summary: 'چرخش توکن تمدید', auth: false, body: 'refresh',
    description: 'هر refresh token یک‌بارمصرف است؛ استفاده‌ی دوباره از توکن چرخیده‌شده کل نشست را باطل می‌کند. اپ: refreshToken در بدنه. وب: بدون بدنه، توکن از کوکی HttpOnly خوانده و کوکی جدید ست می‌شود.',
    ok: { code: 200, schema: 'Tokens', description: 'توکن‌های جدید' }, errors: [400, 401, 429],
  });
  add('post', '/auth/logout', { tag: 'ورود', summary: 'خروج (باطل‌کردن نشست)', auth: false, body: 'refresh', description: 'اپ: refreshToken در بدنه؛ وب: از کوکی خوانده می‌شود. کوکی همیشه پاک می‌شود.', ok: { code: 200, description: 'خارج شد' }, errors: [400] });
  add('get', '/auth/sessions', {
    tag: 'ورود', summary: 'نشست‌های فعال من', description: 'همه‌ی نشست‌های فعال همین کاربر/عضو روی همه‌ی دستگاه‌ها.',
    ok: { code: 200, schema: 'SessionsPage', description: 'فهرست نشست‌ها' }, errors: AUTHED,
  });
  add('delete', '/auth/sessions/{id}', {
    tag: 'ورود', summary: 'ابطال یک نشست', ok: { code: 200, schema: 'RevokeResult', description: 'باطل شد' }, errors: [...AUTHED, 404],
  });
  add('delete', '/auth/sessions', {
    tag: 'ورود', summary: 'ابطال همه‌ی نشست‌ها', description: 'شامل نشست جاری؛ همه‌ی دستگاه‌ها از حساب خارج می‌شوند.',
    ok: { code: 200, schema: 'RevokeResult', description: 'همه باطل شدند' }, errors: AUTHED,
  });
  add('get', '/me', { tag: 'ورود', summary: 'هویت کاربر فعلی از روی توکن', ok: { code: 200, schema: 'Me', description: 'هویت' }, errors: [401] });

  add('get', '/dashboard', {
    tag: 'گزارش', summary: 'داشبورد مدیریتی', description: 'KPIهای ماه جاری، روند ۶ ماه درآمد، مرکز پیگیری و آخرین پرداخت‌ها.',
    ok: { code: 200, schema: 'Dashboard', description: 'داشبورد' }, errors: [...AUTHED],
  });
  add('get', '/payments', {
    tag: 'اشتراک و پرداخت', summary: 'فهرست پرداخت‌های باشگاه', description: 'با بازه‌ی روز تهران (from/to میلادی) و جستجوی نام یا بخشی از شماره؛ sum جمع دوره است.',
    query: [
      { name: 'from', schema: date },
      { name: 'to', schema: date },
      { name: 'q', schema: str({ maxLength: 80 }), description: 'نام یا بخشی از شماره‌ی موبایل' },
      ...page,
    ],
    ok: { code: 200, schema: 'PaymentsPage', description: 'پرداخت‌ها' }, errors: [...AUTHED, 400],
  });
  add('get', '/reminders', {
    tag: 'اعلان‌ها', summary: 'ردیابی یادآوری‌ها (فقط مدیر)', description: 'صف و وضعیت تحویل پیامک‌های یادآوری؛ ورکر روزانه صف را ارسال می‌کند.',
    query: [
      { name: 'status', schema: str({ enum: ['QUEUED', 'SENT', 'FAILED'] }) },
      ...page,
    ],
    ok: { code: 200, schema: 'RemindersPage', description: 'یادآوری‌ها' }, errors: AUTHED,
  });

  add('post', '/checkin', {
    tag: 'حضور و غیاب', summary: 'اسکن QR و ثبت ورود', body: 'checkin',
    description: 'توکن امن عضو. ورود تکراری در همان روز: ۴۰۹ CHECKIN_DUPLICATE. اشتراک منقضی/بدون اشتراک/بدون جلسه: ۴۰۹.',
    ok: { code: 201, schema: 'CheckInResult', description: 'ورود ثبت شد' }, errors: [...AUTHED, 400, 404, 409],
  });
  add('post', '/members/{id}/attendance', {
    tag: 'حضور و غیاب', summary: 'ثبت دستی ورود با علت',
    ok: { code: 201, schema: 'AttendanceRow', description: 'ثبت شد' }, errors: [...AUTHED, 400, 404],
  });
  add('get', '/members/{id}/attendance', {
    tag: 'حضور و غیاب', summary: 'سوابق مراجعه‌ی عضو',
    ok: { code: 200, schema: 'AttendancePage', description: 'سوابق' }, errors: AUTHED,
  });
  add('get', '/members/{id}/qr', {
    tag: 'حضور و غیاب', summary: 'کارت QR عضو', description: 'regenerate=true فقط مدیر: توکن قبلی باطل و توکن تازه صادر می‌شود.',
    query: [{ name: 'regenerate', schema: str({ enum: ['true', 'false'] }) }],
    ok: { code: 200, schema: 'QrToken', description: 'توکن' }, errors: [...AUTHED, 404],
  });

  add('get', '/coaches', {
    tag: 'کلاس‌ها', summary: 'فهرست مربیان',
    ok: { code: 200, description: 'آرایه‌ی مربیان' }, errors: AUTHED,
  });
  add('post', '/coaches', {
    tag: 'کلاس‌ها', summary: 'افزودن مربی (فقط مدیر)', body: 'createCoach',
    ok: { code: 201, schema: 'Coach', description: 'ساخته شد' }, errors: [...AUTHED, 400],
  });
  add('patch', '/coaches/{id}', {
    tag: 'کلاس‌ها', summary: 'ویرایش مربی (فقط مدیر)', body: 'updateCoach',
    ok: { code: 200, schema: 'Coach', description: 'ویرایش شد' }, errors: [...AUTHED, 400, 404],
  });
  add('get', '/classes', {
    tag: 'کلاس‌ها', summary: 'فهرست کلاس‌ها با جلسه‌های اخیر',
    ok: { code: 200, description: 'آرایه‌ی کلاس‌ها' }, errors: AUTHED,
  });
  add('post', '/classes', {
    tag: 'کلاس‌ها', summary: 'ساخت کلاس (فقط مدیر)', body: 'createClass',
    description: 'نام یکتا در باشگاه؛ مربی باید فعال باشد.',
    ok: { code: 201, description: 'ساخته شد' }, errors: [...AUTHED, 400, 404, 409],
  });
  add('patch', '/classes/{id}', {
    tag: 'کلاس‌ها', summary: 'ویرایش کلاس (فقط مدیر)', body: 'updateClass',
    ok: { code: 200, description: 'ویرایش شد' }, errors: [...AUTHED, 400, 404],
  });
  add('post', '/classes/{id}/sessions', {
    tag: 'کلاس‌ها', summary: 'تعریف جلسه (فقط مدیر)', body: 'createSession',
    description: 'startsAt با آفست تایم‌زون (مثل 2026-11-25T18:00:00+03:30).',
    ok: { code: 201, description: 'جلسه ساخته شد' }, errors: [...AUTHED, 400, 404],
  });
  add('get', '/classes/{id}/sessions', {
    tag: 'کلاس‌ها', summary: 'جلسه‌های کلاس با ظرفیت پرشده',
    ok: { code: 200, description: 'جلسه‌ها' }, errors: [...AUTHED, 404],
  });
  add('get', '/classes/{id}/bookings', {
    tag: 'کلاس‌ها', summary: 'رزروهای جلسه', description: 'شناسه‌ی جلسه؛ شامل فهرست انتظار.',
    ok: { code: 200, schema: 'SessionBookings', description: 'رزروها' }, errors: [...AUTHED, 404],
  });
  add('post', '/classes/{id}/bookings', {
    tag: 'کلاس‌ها', summary: 'رزرو عضو در جلسه', body: 'bookMember',
    description: 'ظرفیت پر → وضعیت WAITLIST. رزرو فعال قبلی: ۴۰۹ ALREADY_BOOKED.',
    ok: { code: 201, schema: 'BookingResult', description: 'رزرو شد' }, errors: [...AUTHED, 400, 404, 409],
  });
  add('patch', '/bookings/{id}', {
    tag: 'کلاس‌ها', summary: 'تغییر وضعیت رزرو', body: 'bookingUpdate',
    description: 'لغو رزروی که جای پرکرده، اولین نفر فهرست انتظار را ارتقا می‌دهد (promotedId).',
    ok: { code: 200, schema: 'BookingUpdateResult', description: 'به‌روزرسانی شد' }, errors: [...AUTHED, 400, 404],
  });

  add('get', '/public/gyms/{slug}', {
    tag: 'عمومی', summary: 'صفحه‌ی عمومی باشگاه', auth: false,
    description: 'فقط باشگاه ACTIVE. معرفی، پلن‌ها و جلسه‌های پیشِ‌رو.',
    ok: { code: 200, schema: 'PublicGymProfile', description: 'پروفایل' }, errors: [404, 429],
  });
  add('post', '/public/gyms/{slug}/join', {
    tag: 'عمومی', summary: 'درخواست عضویت از سایت', auth: false, body: 'publicLead',
    description: 'پاسخ همیشه یکسان است تا عضو بودن فاش نشود؛ ردیف در سرنخ‌های باشگاه ثبت می‌شود.',
    ok: { code: 200, schema: 'PortalOk', description: 'ثبت شد' }, errors: [400, 404, 429],
  });
  add('get', '/portal/me', {
    tag: 'پورتال اعضا', summary: 'کارت دیجیتال من', description: 'توکن عضو لازم است؛ عضو فقط داده‌ی خودش را می‌بیند.',
    ok: { code: 200, schema: 'PortalMe', description: 'کارت من' }, errors: [401, 403],
  });
  add('get', '/portal/me/payments', {
    tag: 'پورتال اعضا', summary: 'تاریخچه پرداخت‌های من',
    ok: { code: 200, schema: 'PortalPayments', description: 'پرداخت‌ها' }, errors: [401, 403],
  });
  add('get', '/portal/me/attendance', {
    tag: 'پورتال اعضا', summary: 'سابقه مراجعه‌ی من',
    ok: { code: 200, schema: 'PortalAttendance', description: 'مراجعه‌ها' }, errors: [401, 403],
  });
  add('post', '/portal/renew-request', {
    tag: 'پورتال اعضا', summary: 'درخواست تمدید اشتراک', description: 'در مرکز پیگیری مدیر به‌عنوان Request OPEN می‌آید؛ درخواست تکراری باز: ۴۰۹ REQUEST_OPEN.',
    ok: { code: 200, schema: 'PortalOk', description: 'ثبت شد' }, errors: [401, 403, 409],
  });

  add('get', '/leads', {
    tag: 'سرنخ‌ها', summary: 'فهرست سرنخ‌های فروش', description: 'چرخه: NEW → CONTACTED → TRIAL → CONVERTED/LOST.',
    query: [
      { name: 'status', schema: str({ enum: ['NEW', 'CONTACTED', 'TRIAL', 'CONVERTED', 'LOST'] }) },
      { name: 'q', schema: str({ maxLength: 80 }) },
      ...page,
    ],
    ok: { code: 200, schema: 'LeadsPage', description: 'سرنخ‌ها' }, errors: [...AUTHED, 400],
  });
  add('post', '/leads', {
    tag: 'سرنخ‌ها', summary: 'ثبت سرنخ', body: 'createLead',
    description: 'شماره‌ی عضو موجود: ۴۰۹ ALREADY_MEMBER. سرنخ تکراری: ۴۰۹ LEAD_EXISTS.',
    ok: { code: 201, schema: 'Lead', description: 'ثبت شد' }, errors: [...AUTHED, 400, 409],
  });
  add('patch', '/leads/{id}', {
    tag: 'سرنخ‌ها', summary: 'تغییر وضعیت/یادداشت سرنخ', body: 'updateLead',
    description: 'گذارها فقط طبق چرخه؛ گذار نامعتبر: ۴۰۰ LEAD_TRANSITION.',
    ok: { code: 200, schema: 'Lead', description: 'به‌روزرسانی شد' }, errors: [...AUTHED, 400, 404],
  });
  add('post', '/leads/{id}/convert', {
    tag: 'سرنخ‌ها', summary: 'تبدیل سرنخ به عضو', description: 'فقط از وضعیت TRIAL؛ عضو با نام و شماره ساخته می‌شود و اشتراک جدا ثبت می‌شود.',
    ok: { code: 201, schema: 'ConvertLeadResult', description: 'تبدیل شد' }, errors: [...AUTHED, 404, 409],
  });

  add('get', '/members', {
    tag: 'اعضا', summary: 'فهرست اعضا با جستجو و فیلتر', description: 'نقش: مدیر و پذیرش. archived فقط برای مدیر. ترتیب: نزدیک‌ترین انقضا بالا.',
    query: [
      { name: 'q', schema: str({ maxLength: 80 }), description: 'فقط رقم: شماره‌ی موبایل (بخشی از آن)، وگرنه نام' },
      { name: 'status', schema: str({ enum: ['active', 'expiring', 'expired', 'lapsed', 'none'] }) },
      { name: 'archived', schema: str({ enum: ['true', 'false'] }) },
      { name: 'debtor', schema: str({ enum: ['true', 'false'] }) },
      ...page,
    ],
    ok: { code: 200, schema: 'MemberPage', description: 'صفحه‌ی اعضا' }, errors: [...AUTHED, 400],
  });
  add('get', '/members/counts', { tag: 'اعضا', summary: 'شمارنده‌ی چیپ‌های فیلتر', ok: { code: 200, schema: 'MemberCounts', description: 'شمارنده‌ها' }, errors: AUTHED });
  add('post', '/members', {
    tag: 'اعضا', summary: 'ثبت عضو', body: 'memberFields',
    description: 'شماره‌ی تکراری ۴۰۹ با code برابر MEMBER_EXISTS یا MEMBER_ARCHIVED و existingMemberId. اشتراک را جدا با /members/{id}/subscriptions ثبت کنید.',
    ok: { code: 201, schema: 'Member', description: 'ثبت شد' }, errors: [...AUTHED, 400, 409],
  });
  add('get', '/members/{id}', { tag: 'اعضا', summary: 'مشاهده‌ی عضو', ok: { code: 200, schema: 'Member', description: 'عضو' }, errors: [...AUTHED, 400, 404] });
  add('patch', '/members/{id}', {
    tag: 'اعضا', summary: 'ویرایش عضو', body: 'updateMember',
    ok: { code: 200, schema: 'Member', description: 'ویرایش شد' }, errors: [...AUTHED, 400, 404, 409],
  });
  add('post', '/members/{id}/archive', {
    tag: 'اعضا', summary: 'بایگانی عضو (فقط مدیر)', description: 'نشست‌های وب عضو باطل می‌شود و در لاگ ممیزی ثبت می‌شود.',
    ok: { code: 200, schema: 'Member', description: 'بایگانی شد' }, errors: [...AUTHED, 400, 404],
  });
  add('post', '/members/{id}/restore', { tag: 'اعضا', summary: 'بازگردانی عضو (فقط مدیر)', ok: { code: 200, schema: 'Member', description: 'بازگردانده شد' }, errors: [...AUTHED, 400, 404] });

  add('get', '/plans', {
    tag: 'پلن‌ها', summary: 'فهرست پلن‌ها', description: 'پذیرش فقط پلن‌های فعال را می‌بیند. includeInactive فقط برای مدیر.',
    query: [{ name: 'includeInactive', schema: str({ enum: ['true', 'false'] }) }],
    ok: { code: 200, description: 'آرایه‌ی پلن‌ها' }, errors: [...AUTHED, 400],
  });
  add('post', '/plans', { tag: 'پلن‌ها', summary: 'ساخت پلن (فقط مدیر)', body: 'createPlan', ok: { code: 201, schema: 'Plan', description: 'ساخته شد' }, errors: [...AUTHED, 400, 409] });
  add('patch', '/plans/{id}', {
    tag: 'پلن‌ها', summary: 'ویرایش یا غیرفعال‌کردن پلن (فقط مدیر)', body: 'updatePlan',
    description: 'پلن حذف نمی‌شود. تغییر قیمت یا مدت فقط روی اشتراک‌های بعدی اثر دارد و در تاریخچه ثبت می‌شود.',
    ok: { code: 200, schema: 'Plan', description: 'ویرایش شد' }, errors: [...AUTHED, 400, 404, 409],
  });
  add('get', '/plans/{id}/history', {
    tag: 'پلن‌ها', summary: 'تاریخچه قیمت پلن (فقط مدیر)',
    ok: { code: 200, schema: 'PlanPriceHistory', description: 'تاریخچه' }, errors: AUTHED,
  });

  add('get', '/members/{id}/subscriptions', { tag: 'اشتراک و پرداخت', summary: 'تاریخچه‌ی اشتراک‌ها و پرداخت‌ها', ok: { code: 200, schema: 'SubscriptionHistory', description: 'تاریخچه' }, errors: [...AUTHED, 400, 404] });
  add('get', '/members/{id}/timeline', {
    tag: 'اعضا', summary: 'تایم‌لاین ممیزی عضو (فقط مدیر)',
    ok: { code: 200, schema: 'MemberTimeline', description: 'رویدادها' }, errors: [...AUTHED, 404],
  });
  add('post', '/members/{id}/subscriptions', {
    tag: 'اشتراک و پرداخت', summary: 'ثبت یا تمدید اشتراک', body: 'renew',
    description: 'بدون startsOn: اشتراک معتبر از روز بعد از پایان فعلی و اشتراک منقضی از امروز. price فقط برای مدیر. paidAmount از مبلغ بیشتر نمی‌شود.',
    headers: [{
      name: 'Idempotency-Key', schema: str({ maxLength: 200 }),
      description: 'اختیاری؛ برای شبکه‌ی ضعیف. همان کلید و همان بدنه = همان پاسخ بدون اجرای دوباره؛ همان کلید با بدنه‌ی متفاوت = ۴۰۹ IDEMPOTENCY_CONFLICT.',
    }],
    ok: { code: 201, schema: 'RenewResult', description: 'ثبت شد' }, errors: [...AUTHED, 400, 404, 409],
  });
  add('post', '/members/{id}/payments', {
    tag: 'اشتراک و پرداخت', summary: 'پرداخت بدهی', body: 'payDebt',
    description: 'از قدیمی‌ترین اشتراک بدهکار کم می‌شود. مبلغ بیش از کل بدهی: ۴۰۰ با code برابر AMOUNT_EXCEEDS_DEBT.',
    headers: [{
      name: 'Idempotency-Key', schema: str({ maxLength: 200 }),
      description: 'اختیاری؛ همان رفتار تمدید.',
    }],
    ok: { code: 201, schema: 'PayResult', description: 'ثبت شد' }, errors: [...AUTHED, 400, 404, 409],
  });
  add('post', '/members/{id}/refunds', {
    tag: 'اشتراک و پرداخت', summary: 'بازپرداخت با سند معکوس (فقط مدیر)', body: 'refund',
    description: 'سقف: پول خالص پرداخت‌شده‌ی عضو. پرداخت‌ها حذف/ویرایش نمی‌شوند؛ سند جداگانه ثبت و بدهی دوباره از ردیف‌ها حساب می‌شود.',
    ok: { code: 201, schema: 'RefundResult', description: 'بازپرداخت ثبت شد' }, errors: [...AUTHED, 400, 404, 409],
  });
  add('post', '/members/{id}/subscriptions/{subId}/freeze', {
    tag: 'اشتراک و پرداخت', summary: 'توقف موقت اشتراک (فقط مدیر)', body: 'freeze',
    description: 'پایان اشتراک به اندازه‌ی روزها کش داده می‌شود؛ هر بار ۱ تا ۳۰ روز و مجموع ۳۰ روز.',
    ok: { code: 201, schema: 'Subscription', description: 'توقف اعمال شد' }, errors: [...AUTHED, 400, 404, 409],
  });
  add('post', '/members/{id}/subscriptions/{subId}/cancel', {
    tag: 'اشتراک و پرداخت', summary: 'لغو اشتراک (فقط مدیر)',
    description: 'پایان آینده به امروز کوتاه می‌شود؛ بدهی باقی می‌ماند و بازپرداخت با سند معکوس در هسته مالی انجام می‌شود.',
    ok: { code: 201, schema: 'Subscription', description: 'لغو شد' }, errors: [...AUTHED, 404, 409],
  });

  add('get', '/reports/monthly', {
    tag: 'گزارش', summary: 'گزارش ماهانه (فقط مدیر)', description: 'ماه شمسی. بدون year و month یعنی ماه جاری.',
    query: [
      { name: 'year', schema: int({ minimum: 1302, maximum: 1500 }), description: 'سال شمسی' },
      { name: 'month', schema: int({ minimum: 1, maximum: 12 }) },
    ],
    ok: { code: 200, schema: 'MonthlyReport', description: 'گزارش' }, errors: [...AUTHED, 400],
  });
  add('get', '/reports/annual', {
    tag: 'گزارش', summary: 'گزارش سالانه (فقط مدیر)', description: '۱۲ ماه شمسی: درآمد، تعداد پرداخت و عضو جدید.',
    query: [{ name: 'year', schema: int({ minimum: 1302, maximum: 1500 }) }],
    ok: { code: 200, schema: 'AnnualReport', description: 'گزارش سالانه' }, errors: [...AUTHED, 400],
  });
  add('get', '/reports/plans', {
    tag: 'گزارش', summary: 'عملکرد پلن‌ها (فقط مدیر)', description: 'اشتراک‌های شروع‌شده در ماه به تفکیک پلن با سهم درصدی.',
    query: [
      { name: 'year', schema: int({ minimum: 1302, maximum: 1500 }) },
      { name: 'month', schema: int({ minimum: 1, maximum: 12 }) },
    ],
    ok: { code: 200, schema: 'PlanStats', description: 'عملکرد پلن‌ها' }, errors: [...AUTHED, 400],
  });
  add('get', '/reports/staff', {
    tag: 'گزارش', summary: 'عملکرد کارکنان (فقط مدیر)', description: 'تعداد تمدید و پرداخت ثبت‌شده و مبلغ وصولی به تفکیک کارمند، از لاگ ممیزی.',
    query: [
      { name: 'year', schema: int({ minimum: 1302, maximum: 1500 }) },
      { name: 'month', schema: int({ minimum: 1, maximum: 12 }) },
    ],
    ok: { code: 200, schema: 'StaffStats', description: 'عملکرد کارکنان' }, errors: [...AUTHED, 400],
  });

  return {
    openapi: '3.1.0',
    info: {
      title: 'API باشگاه فولاد',
      version: '1.0.0',
      description: 'مدیریت اعضا، اشتراک و پرداخت. همه‌ی مبلغ‌ها عدد صحیح به تومان و تاریخ‌ها میلادی (YYYY-MM-DD) هستند.',
    },
    servers: [{ url: '/api/v1' }],
    tags: ['سلامت', 'باشگاه', 'ورود', 'اعضا', 'پلن‌ها', 'اشتراک و پرداخت', 'حضور و غیاب', 'کلاس‌ها', 'گزارش', 'اعلان‌ها', 'سرنخ‌ها', 'عمومی', 'پورتال اعضا'].map((name) => ({ name })),
    paths,
    components: {
      securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', description: 'accessToken از /auth/otp/verify' } },
      schemas: componentSchemas(bodies),
    },
  };
}
