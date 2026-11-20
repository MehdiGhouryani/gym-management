'use client';

import { useState } from 'react';
import { Button, Field, Input, Textarea, useToast } from '../ui/index';

/** فرم درخواست عضویت از سایت عمومی — پاسخ سرور همیشه یکسان است */
export function JoinForm({ slug }: { slug: string }) {
  const toast = useToast();
  const [form, setForm] = useState({ name: '', phone: '', note: '' });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1'}/public/gyms/${slug}/join`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone,
          ...(form.note.trim() ? { note: form.note.trim() } : {}),
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message ?? 'ثبت ناموفق بود');
      }
      setDone(true);
      setForm({ name: '', phone: '', note: '' });
      toast.push('ok', 'درخواست شما ثبت شد؛ باشگاه با شما تماس می‌گیرد.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ثبت ناموفق بود');
    } finally {
      setBusy(false);
    }
  };

  const valid = form.name.trim().length >= 2 && /^09\d{9}$/.test(form.phone.replace(/\D/g, ''));

  if (done) {
    return (
      <div style={{ background: 'var(--okt)', color: 'var(--ok)', borderRadius: 13, padding: '14px 18px', fontWeight: 700 }}>
        درخواست شما ثبت شد — باشگاه به‌زودی با شما تماس می‌گیرد.
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 4 }}>
      {error ? <p style={{ color: 'var(--bd)', fontSize: 13, margin: 0 }}>{error}</p> : null}
      <Field label="نام و نام خانوادگی" htmlFor="j-name">
        <Input id="j-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </Field>
      <Field label="شماره موبایل" htmlFor="j-phone">
        <Input id="j-phone" dir="ltr" inputMode="tel" placeholder="09xxxxxxxxx" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      </Field>
      <Field label="یادداشت (اختیاری)" htmlFor="j-note">
        <Textarea id="j-note" placeholder="مثلاً: علاقه‌مند به کلاس کراس‌فیت" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
      </Field>
      <Button variant="primary" full loading={busy} disabled={!valid} onClick={submit}>
        درخواست عضویت
      </Button>
    </div>
  );
}
