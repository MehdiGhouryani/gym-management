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
    id: uuid, planId: uuid, planName: nullable('string'), startsOn: date, endsOn: date,
    price: int({ description: 'تومان' }), paid: int(), balance: int(),
    payments: { type: 'array', items: ref('Payment') }, createdAt: dateTime,
  });
  return {
    ...out,
    Error: {
      type: 'object',
      description: 'ساختار خطا (NestJS). فیلدهای اضافه بسته به نوع خطا می‌آیند.',
      properties: {
        statusCode: int(), message: { oneOf: [str(), { type: 'array', items: str() }] }, error: str(),
        code: str({ description: 'مثلاً MEMBER_EXISTS، MEMBER_ARCHIVED، PLAN_EXISTS، PLAN_INACTIVE، NO_DEBT، AMOUNT_EXCEEDS_DEBT' }),
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
    Health: obj({ ok: { type: 'boolean' }, today: date, time: dateTime }),
    Gym: obj({
      id: uuid, slug: str(), name: str(), city: str(), address: nullable('string'), phone: nullable('string'),
      status: str({ enum: ['PENDING', 'ACTIVE', 'SUSPENDED'] }),
      expiringDays: int({ description: 'تا چند روز مانده «نزدیک انقضا» حساب شود' }),
      graceDays: int({ description: 'مهلت پیگیری بعد از پایان اشتراک (روز)' }),
    }),
    Member: obj({
      id: uuid, name: str(), phone: str({ description: '09xxxxxxxxx' }), birthDate: nullable('string', { format: 'date' }),
      note: nullable('string'), currentEndsOn: nullable('string', { format: 'date' }),
      status: str({ enum: STATUS }), daysLeft: nullable('integer', { description: 'صفر یعنی امروز آخرین روز است؛ منفی یعنی گذشته' }),
      followUp: { type: 'boolean', description: 'منقضی و هنوز در مهلت پیگیری' }, balance: int({ description: 'بدهی (تومان)' }),
      archivedAt: nullable('string', { format: 'date-time' }), createdAt: dateTime,
    }),
    MemberPage: obj({ items: { type: 'array', items: ref('Member') }, total: int(), page: int(), limit: int(), pages: int() }),
    MemberCounts: obj({ all: int(), active: int(), expiring: int(), expired: int(), lapsed: int(), none: int(), debtors: int() }),
    Plan: obj({ id: uuid, name: str(), days: int(), price: int(), active: { type: 'boolean' }, monthlyPrice: int({ description: 'معادل ماهانه (۳۰ روز)' }) }),
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

  add('post', '/auth/otp/request', {
    tag: 'ورود', summary: 'درخواست کد پیامکی', auth: false, body: 'otpRequest',
    description: 'پاسخ همیشه یکسان است تا معلوم نشود شماره ثبت شده یا نه. برای عضو، gymSlug لازم است. با SMS_PROVIDER=console کد در لاگ سرور چاپ می‌شود.',
    ok: { code: 200, schema: 'OtpRequested', description: 'درخواست ثبت شد' }, errors: [400, 429],
  });
  add('post', '/auth/otp/verify', {
    tag: 'ورود', summary: 'تأیید کد و دریافت توکن‌ها', auth: false, body: 'otpVerify',
    description: 'مدیر فقط وقتی وارد می‌شود که باشگاهش ACTIVE باشد (در انتظار تأیید یا تعلیق: ۴۰۳).',
    ok: { code: 200, schema: 'VerifyResult', description: 'ورود موفق' }, errors: [400, 401, 403, 429],
  });
  add('post', '/auth/refresh', {
    tag: 'ورود', summary: 'چرخش توکن تمدید', auth: false, body: 'refresh',
    description: 'هر refresh token یک‌بار مصرف است؛ استفاده‌ی دوباره از توکن چرخیده‌شده کل نشست را باطل می‌کند.',
    ok: { code: 200, schema: 'Tokens', description: 'توکن‌های جدید' }, errors: [400, 401, 429],
  });
  add('post', '/auth/logout', { tag: 'ورود', summary: 'خروج (باطل‌کردن نشست)', auth: false, body: 'refresh', ok: { code: 200, description: 'خارج شد' }, errors: [400] });
  add('get', '/me', { tag: 'ورود', summary: 'هویت کاربر فعلی از روی توکن', ok: { code: 200, schema: 'Me', description: 'هویت' }, errors: [401] });

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
    description: 'پلن حذف نمی‌شود. تغییر قیمت یا مدت فقط روی اشتراک‌های بعدی اثر دارد.',
    ok: { code: 200, schema: 'Plan', description: 'ویرایش شد' }, errors: [...AUTHED, 400, 404, 409],
  });

  add('get', '/members/{id}/subscriptions', { tag: 'اشتراک و پرداخت', summary: 'تاریخچه‌ی اشتراک‌ها و پرداخت‌ها', ok: { code: 200, schema: 'SubscriptionHistory', description: 'تاریخچه' }, errors: [...AUTHED, 400, 404] });
  add('post', '/members/{id}/subscriptions', {
    tag: 'اشتراک و پرداخت', summary: 'ثبت یا تمدید اشتراک', body: 'renew',
    description: 'بدون startsOn: اشتراک معتبر از روز بعد از پایان فعلی و اشتراک منقضی از امروز. price فقط برای مدیر. paidAmount از مبلغ بیشتر نمی‌شود.',
    ok: { code: 201, schema: 'RenewResult', description: 'ثبت شد' }, errors: [...AUTHED, 400, 404, 409],
  });
  add('post', '/members/{id}/payments', {
    tag: 'اشتراک و پرداخت', summary: 'پرداخت بدهی', body: 'payDebt',
    description: 'از قدیمی‌ترین اشتراک بدهکار کم می‌شود. مبلغ بیش از کل بدهی: ۴۰۰ با code برابر AMOUNT_EXCEEDS_DEBT.',
    ok: { code: 201, schema: 'PayResult', description: 'ثبت شد' }, errors: [...AUTHED, 400, 404, 409],
  });

  add('get', '/reports/monthly', {
    tag: 'گزارش', summary: 'گزارش ماهانه (فقط مدیر)', description: 'ماه شمسی. بدون year و month یعنی ماه جاری.',
    query: [
      { name: 'year', schema: int({ minimum: 1302, maximum: 1500 }), description: 'سال شمسی' },
      { name: 'month', schema: int({ minimum: 1, maximum: 12 }) },
    ],
    ok: { code: 200, schema: 'MonthlyReport', description: 'گزارش' }, errors: [...AUTHED, 400],
  });

  return {
    openapi: '3.1.0',
    info: {
      title: 'API باشگاه فولاد',
      version: '1.0.0',
      description: 'مدیریت اعضا، اشتراک و پرداخت. همه‌ی مبلغ‌ها عدد صحیح به تومان و تاریخ‌ها میلادی (YYYY-MM-DD) هستند.',
    },
    servers: [{ url: '/api/v1' }],
    tags: ['سلامت', 'باشگاه', 'ورود', 'اعضا', 'پلن‌ها', 'اشتراک و پرداخت', 'گزارش'].map((name) => ({ name })),
    paths,
    components: {
      securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', description: 'accessToken از /auth/otp/verify' } },
      schemas: componentSchemas(bodies),
    },
  };
}
