'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Badge, Button, Field, Input, Skeleton } from '../../../src/ui/index';
import { ApiError } from '../../../src/lib/api';
import { memberApi } from '../../../src/lib/member-api';
import { faDateTime, faNum, faToman, statusBadge } from '../../../src/lib/format';

interface PortalMe {
  name: string;
  gymName: string;
  gymSlug: string;
  status: 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'NONE';
  daysLeft: number | null;
  currentEndsOn: string | null;
  planName: string | null;
  sessionsRemaining: number | null;
  balance: number;
  qrToken: string;
  bookings: { id: string; status: string; className: string; startsAt: string }[];
}

/** پورتال اعضا: ورود با کد پیامکی و کارت دیجیتال */
export default function PortalPage() {
  const { slug } = useParams<{ slug: string }>();
  const [step, setStep] = useState<'phone' | 'code' | 'in'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [me, setMe] = useState<PortalMe | null>(null);
  const [payments, setPayments] = useState<{ id: string; amount: number; method: string; paidAt: string }[] | null>(null);
  const [attendance, setAttendance] = useState<{ id: string; checkInAt: string }[] | null>(null);
  const [requested, setRequested] = useState(false);

  // نشست موجود؟ مستقیم کارت
  useEffect(() => {
    memberApi
      .get<PortalMe>('/portal/me')
      .then((r) => {
        setMe(r);
        setStep('in');
      })
      .catch(() => setStep('phone'));
  }, []);

  const loadRest = () => {
    memberApi
      .get<{ items: { id: string; amount: number; method: string; paidAt: string }[] }>('/portal/me/payments')
      .then((r) => setPayments(r.items))
      .catch(() => undefined);
    memberApi
      .get<{ items: { id: string; checkInAt: string }[] }>('/portal/me/attendance')
      .then((r) => setAttendance(r.items))
      .catch(() => undefined);
  };

  const requestCode = async () => {
    setError(null);
    setBusy(true);
    try {
      await memberApi.post('/auth/otp/request', { purpose: 'member', phone, gymSlug: slug });
      setStep('code');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'ارسال کد ناموفق بود');
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setError(null);
    setBusy(true);
    try {
      await memberApi.post('/auth/otp/verify', { purpose: 'member', phone, code });
      const r = await memberApi.get<PortalMe>('/portal/me');
      setMe(r);
      setStep('in');
      loadRest();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'ورود ناموفق بود');
    } finally {
      setBusy(false);
    }
  };

  const renewRequest = async () => {
    setBusy(true);
    try {
      await memberApi.post('/portal/renew-request');
      setRequested(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'ثبت درخواست ناموفق بود');
    } finally {
      setBusy(false);
    }
  };

  if (step !== 'in') {
    return (
      <main style={{ maxWidth: 380 }}>
        <div className="adm-login">
          <h1>ورود اعضا — {slug}</h1>
          <p className="adm-login-sub">{step === 'phone' ? 'شماره موبایل ثبت‌شده در باشگاه' : 'کد ۵ رقمی پیامک‌شده'}</p>
          {step === 'phone' ? (
            <>
              {error ? <p style={{ color: 'var(--bd)', fontSize: 13 }}>{error}</p> : null}
              <Field label="شماره موبایل" htmlFor="p-phone">
                <Input id="p-phone" dir="ltr" inputMode="tel" placeholder="09xxxxxxxxx" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </Field>
              <Button variant="primary" full loading={busy} disabled={!/^09\d{9}$/.test(phone.replace(/\D/g, ''))} onClick={requestCode}>
                دریافت کد
              </Button>
            </>
          ) : (
            <>
              {error ? <p style={{ color: 'var(--bd)', fontSize: 13 }}>{error}</p> : null}
              <Field label="کد تأیید" htmlFor="p-code">
                <Input id="p-code" dir="ltr" inputMode="numeric" maxLength={5} className="adm-code-input" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 5))} />
              </Field>
              <Button variant="primary" full loading={busy} disabled={code.length !== 5} onClick={verify}>
                ورود
              </Button>
            </>
          )}
          <p style={{ fontSize: 12, color: 'var(--mut)', marginTop: 14, textAlign: 'center' }}>
            عضو نیستید؟ صفحه‌ی باشگاه: <Link href={`/${slug}`}>{`/${slug}`}</Link>
          </p>
        </div>
      </main>
    );
  }

  if (!me) return <Skeleton height={300} radius={13} />;
  const b = statusBadge[me.status];

  return (
    <main style={{ maxWidth: 560, display: 'grid', gap: 16 }}>
      <div className="adm-page-head">
        <h1>{me.gymName}</h1>
        <span style={{ color: 'var(--mut)', fontSize: 13 }}>{me.name}</span>
      </div>

      <div className="u-table-wrap" style={{ padding: 20, display: 'grid', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div>
            {b ? <Badge kind={b.kind}>{b.label}</Badge> : null}
            {me.daysLeft !== null ? <Badge kind="neutral">{faNum(me.daysLeft)} روز مانده</Badge> : null}
            {me.balance > 0 ? <Badge kind="debt">بدهی {faToman(me.balance)}</Badge> : <Badge kind="ok">تسویه</Badge>}
          </div>
          {me.currentEndsOn ? <span style={{ fontSize: 13, color: 'var(--mut)' }}>پایان اشتراک: {me.currentEndsOn}</span> : null}
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <QRCodeSVG value={me.qrToken} size={110} />
          <div style={{ fontSize: 13, color: 'var(--mut)' }}>
            <p style={{ margin: '0 0 6px', fontWeight: 700, color: 'var(--ink)' }}>کارت ورود شما</p>
            <p style={{ margin: 0 }}>این کد را هنگام ورود به باشگاه نشان دهید.</p>
            {me.planName ? <p style={{ margin: '6px 0 0' }}>پلن فعلی: {me.planName}{me.sessionsRemaining !== null ? ` (${faNum(me.sessionsRemaining)} جلسه)` : ''}</p> : null}
          </div>
        </div>
        {!requested ? (
          <Button variant="primary" onClick={renewRequest} loading={busy}>
            درخواست تمدید اشتراک
          </Button>
        ) : (
          <div style={{ background: 'var(--okt)', color: 'var(--ok)', borderRadius: 10, padding: '10px 14px', fontWeight: 700, fontSize: 13 }}>
            درخواست تمدید ثبت شد؛ پذیرش با شما تماس می‌گیرد.
          </div>
        )}
        {error ? <p style={{ color: 'var(--bd)', fontSize: 13, margin: 0 }}>{error}</p> : null}
      </div>

      {me.bookings.length > 0 ? (
        <div>
          <h2 style={{ fontSize: 14, margin: '0 0 8px' }}>جلسه‌های من</h2>
          <div className="u-table-wrap" style={{ padding: 12 }}>
            {me.bookings.map((bk) => (
              <div key={bk.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 4px', fontSize: 13 }}>
                <strong>{bk.className}</strong>
                <span style={{ color: 'var(--mut)' }}>{faDateTime(bk.startsAt)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {payments && payments.length > 0 ? (
        <div>
          <h2 style={{ fontSize: 14, margin: '0 0 8px' }}>پرداخت‌های من</h2>
          <div className="u-table-wrap" style={{ padding: 12 }}>
            {payments.map((p) => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 4px', fontSize: 13 }}>
                <strong>{faToman(p.amount)}</strong>
                <span style={{ color: 'var(--mut)' }}>{faDateTime(p.paidAt)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {attendance && attendance.length > 0 ? (
        <div>
          <h2 style={{ fontSize: 14, margin: '0 0 8px' }}>مراجعه‌های اخیر</h2>
          <div className="u-table-wrap" style={{ padding: 12 }}>
            {attendance.slice(0, 10).map((a) => (
              <div key={a.id} style={{ padding: '4px 4px', fontSize: 13, color: 'var(--mut)' }}>{faDateTime(a.checkInAt)}</div>
            ))}
          </div>
        </div>
      ) : null}

      {!payments && !attendance ? null : null}
    </main>
  );
}
