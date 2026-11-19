import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api/instance';
import type { MemberDto, PayMethod } from '../lib/api/types';
import { messageOf } from '../lib/errors';
import { formatToman, METHOD_LABELS } from '../lib/format';
import { buildDebtPayment } from '../lib/forms';
import { formatMoneyInput } from '../lib/money';
import { Button } from '../ui/Button';
import { Segmented } from '../ui/Segmented';
import { Sheet } from '../ui/Sheet';
import { T } from '../ui/Text';
import { TextField } from '../ui/TextField';
import { useTheme } from '../ui/theme';
import { invalidateMember } from './invalidate';

const METHOD_OPTIONS = (Object.keys(METHOD_LABELS) as PayMethod[]).map((key) => ({ key, label: METHOD_LABELS[key] }));

export function PayDebtSheet({ member, onClose, onDone }: { member: MemberDto | null; onClose: () => void; onDone: (message: string) => void }) {
  const { c, radius, row } = useTheme();
  const qc = useQueryClient();
  const [amountText, setAmountText] = useState<string | null>(null);
  const [method, setMethod] = useState<PayMethod>('CASH');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAmountText(null);
    setError(null);
  }, [member?.id]);

  const form = buildDebtPayment({ balance: member?.balance ?? 0, amountText, method });

  const submit = async () => {
    if (!member || !form.ok) return;
    setBusy(true);
    setError(null);
    try {
      const r = await api.payDebt(member.id, form.request);
      invalidateMember(qc, member.id);
      onDone(r.balance === 0 ? 'بدهی تسویه شد' : `پرداخت ثبت شد. مانده: ${formatToman(r.balance)}`);
    } catch (e) {
      invalidateMember(qc, member.id);
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet visible={member !== null} onClose={onClose} title="پرداخت بدهی">
      {member ? (
        <>
          <T size={14} color={c.muted}>
            {member.name} · بدهی فعلی {formatToman(member.balance)}
          </T>
          <TextField
            label="مبلغ پرداخت (تومان)"
            value={amountText ?? formatMoneyInput(String(member.balance))}
            onChangeText={(t) => setAmountText(formatMoneyInput(t))}
            keyboardType="number-pad"
            error={amountText !== null && !form.ok ? form.error : null}
          />
          <Button small variant="ghost" label="کل بدهی" onPress={() => setAmountText(null)} />
          <Segmented options={METHOD_OPTIONS} value={method} onChange={setMethod} />
          <View style={{ flexDirection: row, justifyContent: 'space-between', backgroundColor: c.bg, borderRadius: radius.md, padding: 14 }}>
            <T size={14} color={c.muted}>
              مانده بعد از پرداخت
            </T>
            <T size={14} weight="bold">
              {formatToman(form.remaining)}
            </T>
          </View>
          {error ? (
            <T size={13.5} weight="bold" color={c.bad} accessibilityLiveRegion="polite">
              {error}
            </T>
          ) : null}
          <Button label="ثبت پرداخت" onPress={submit} loading={busy} disabled={!form.ok} />
          <Button label="انصراف" variant="text" onPress={onClose} />
        </>
      ) : null}
    </Sheet>
  );
}
