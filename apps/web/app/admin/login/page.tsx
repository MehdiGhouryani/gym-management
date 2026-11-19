'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Field, Input } from '../../../src/ui/index';
import { useSession } from '../../../src/lib/session';
import { ApiError } from '../../../src/lib/api';

const RESEND_SEC = 60;

/** ورود مدیر/پذیرش با کد پیامکی؛ نشست با کوکی HttpOnly برقرار می‌شود */
export default function AdminLoginPage() {
  const router = useRouter();
  const session = useSession();
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  // اگر نشست از قبل هست، مستقیم به داشبورد
  useEffect(() => {
    if (session.state === 'signedIn') router.replace('/admin');
  }, [session.state, router]);

  // شمارش معکوس ارسال دوباره
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    if (step === 'code') codeRef.current?.focus();
  }, [step]);

  const submitPhone = async () => {
    setError(null);
    setBusy(true);
    try {
      await session.requestOtp(phone);
      setStep('code');
      setCooldown(RESEND_SEC);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'ارسال کد ناموفق بود');
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async () => {
    setError(null);
    setBusy(true);
    try {
      await session.signIn(phone, code);
      router.replace('/admin');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'ورود ناموفق بود');
      setBusy(false);
    }
  };

  const digits = phone.replace(/\D/g, '');
  const phoneOk = /^09\d{9}$/.test(digits);
  const codeOk = /^\d{5}$/.test(code);

  return (
    <div className="adm-login">
      <h1>ورود به پنل فولاد</h1>
      <p className="adm-login-sub">{step === 'phone' ? 'شماره موبایل ثبت‌شده در باشگاه' : `کد ۵ رقمی به ${digits} ارسال شد`}</p>

      {step === 'phone' ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (phoneOk && !busy) void submitPhone();
          }}
        >
          <Field label="شماره موبایل" htmlFor="phone" state={error ? 'error' : 'default'} hint={error}>
            <Input
              id="phone"
              inputMode="tel"
              dir="ltr"
              autoComplete="tel"
              placeholder="09xxxxxxxxx"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </Field>
          <Button type="submit" full loading={busy} disabled={!phoneOk}>
            دریافت کد
          </Button>
        </form>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (codeOk && !busy) void submitCode();
          }}
        >
          <Field label="کد تأیید" htmlFor="code" state={error ? 'error' : 'default'} hint={error}>
            <Input
              id="code"
              ref={codeRef}
              inputMode="numeric"
              dir="ltr"
              maxLength={5}
              className="adm-code-input"
              placeholder="－－－－－"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
            />
          </Field>
          <Button type="submit" full loading={busy} disabled={!codeOk}>
            ورود
          </Button>
          <div className="adm-resend">
            {cooldown > 0 ? (
              <span>ارسال دوباره تا {cooldown.toLocaleString('fa-IR')} ثانیه</span>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setCode('');
                  void submitPhone();
                }}
              >
                ارسال دوباره کد
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
