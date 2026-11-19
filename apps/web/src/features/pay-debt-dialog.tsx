'use client';

import { useState } from 'react';
import { Button, Dialog, Field, Input, Select, useToast } from '../ui/index';
import { api } from '../lib/api';
import { faNum } from '../lib/format';
import type { PayResult } from '../lib/types';

interface Props {
  open: boolean;
  onClose: () => void;
  memberId: string;
  memberName: string;
  balance: number;
  onDone: (r: PayResult) => void;
}

/** پرداخت بدهی: پیش‌فرض کل بدهی؛ از قدیمی‌ترین اشتراک بدهکار کم می‌شود */
export function PayDebtDialog({ open, onClose, memberId, memberName, balance, onDone }: Props) {
  const toast = useToast();
  const [amount, setAmount] = useState(String(balance));
  const [method, setMethod] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountNum = Math.round(Number(amount) || 0);
  const invalid = amountNum < 1 || amountNum > balance || !method;

  const submit = async () => {
    if (invalid || busy) return;
    setError(null);
    setBusy(true);
    try {
      const r = await api.post<PayResult>(
        `/members/${memberId}/payments`,
        { amount: amountNum, method },
        { 'idempotency-key': crypto.randomUUID() },
      );
      toast.push('ok', `${faNum(amountNum)} تومان از بدهی ${memberName} دریافت شد`);
      onDone(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ثبت پرداخت ناموفق بود');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title={`پرداخت بدهی — ${memberName}`}>
      <div style={{ display: 'grid', gap: 4 }}>
        <p style={{ fontSize: 13, color: 'var(--mut)', margin: 0 }}>
          بدهی فعلی: <strong>{faNum(balance)}</strong> تومان
        </p>
        {error ? <p style={{ color: 'var(--bd)', fontSize: 13, margin: 0 }}>{error}</p> : null}
        <Field label="مبلغ (تومان)" htmlFor="p-amount">
          <Input
            id="p-amount"
            dir="ltr"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
          />
        </Field>
        <Field label="روش پرداخت" htmlFor="p-method">
          <Select id="p-method" value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="" disabled>
              انتخاب…
            </option>
            <option value="CASH">نقدی</option>
            <option value="CARD">کارت</option>
            <option value="POS">کارت‌خوان</option>
          </Select>
        </Field>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <Button variant="primary" onClick={submit} loading={busy} disabled={invalid}>
            ثبت پرداخت
          </Button>
          <Button variant="ghost" onClick={onClose}>
            انصراف
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
