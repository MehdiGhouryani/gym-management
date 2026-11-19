'use client';

import { useState } from 'react';
import { Button, Dialog, Field, Input, Select, useToast } from '../ui/index';
import { api } from '../lib/api';
import { faNum } from '../lib/format';

interface Props {
  open: boolean;
  onClose: () => void;
  memberId: string;
  memberName: string;
  onDone: () => void;
}

/** بازپرداخت با سند معکوس — فقط مدیر؛ سقف را سرور از روی پول خالص عضو کنترل می‌کند */
export function RefundDialog({ open, onClose, memberId, memberName, onDone }: Props) {
  const toast = useToast();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountNum = Math.round(Number(amount) || 0);
  const invalid = amountNum < 1 || !method;

  const submit = async () => {
    if (invalid || busy) return;
    setError(null);
    setBusy(true);
    try {
      await api.post<{ refundId: string; balance: number }>(
        `/members/${memberId}/refunds`,
        { amount: amountNum, method, ...(reason.trim() ? { reason: reason.trim() } : {}) },
        { 'idempotency-key': crypto.randomUUID() },
      );
      toast.push('ok', `بازپرداخت ${faNum(amountNum)} تومان برای ${memberName} ثبت شد`);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ثبت بازپرداخت ناموفق بود');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title={`بازپرداخت — ${memberName}`}>
      <div style={{ display: 'grid', gap: 4 }}>
        {error ? <p style={{ color: 'var(--bd)', fontSize: 13, margin: 0 }}>{error}</p> : null}
        <Field label="مبلغ (تومان)" htmlFor="rf-amount">
          <Input id="rf-amount" dir="ltr" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} />
        </Field>
        <Field label="روش بازگشت وجه" htmlFor="rf-method">
          <Select id="rf-method" value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="" disabled>
              انتخاب…
            </option>
            <option value="CASH">نقدی</option>
            <option value="CARD">کارت</option>
            <option value="POS">کارت‌خوان</option>
          </Select>
        </Field>
        <Field label="دلیل (اختیاری)" htmlFor="rf-reason">
          <Input id="rf-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="مثلاً لغو اشتراک" />
        </Field>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <Button variant="danger" onClick={submit} loading={busy} disabled={invalid}>
            ثبت بازپرداخت
          </Button>
          <Button variant="ghost" onClick={onClose}>
            انصراف
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
