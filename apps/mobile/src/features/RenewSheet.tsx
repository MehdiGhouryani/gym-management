import { useEffect, useState } from 'react';
import { Pressable, Switch, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { todayInTehran } from '@fulad/shared';
import { useSignedIn } from '../auth/AuthProvider';
import { api } from '../lib/api/instance';
import type { MemberDto, PayMethod } from '../lib/api/types';
import { messageOf } from '../lib/errors';
import { compactToman, formatJalali, formatToman, METHOD_LABELS } from '../lib/format';
import { formatMoneyInput } from '../lib/money';
import { buildRenewal } from '../lib/renewal-form';
import { Button } from '../ui/Button';
import { Segmented } from '../ui/Segmented';
import { Sheet } from '../ui/Sheet';
import { T } from '../ui/Text';
import { TextField } from '../ui/TextField';
import { useTheme } from '../ui/theme';
import { invalidateMember } from './invalidate';

const METHOD_OPTIONS = (Object.keys(METHOD_LABELS) as PayMethod[]).map((key) => ({ key, label: METHOD_LABELS[key] }));

interface Props {
  member: MemberDto | null;
  onClose: () => void;
  onDone: (message: string) => void;
}

/** تمدید یا ثبت اشتراک در دو لمس: پلن قبلی از پیش انتخاب است و تاریخ‌ها و پرداخت کامل خودکارند */
export function RenewSheet({ member, onClose, onDone }: Props) {
  const { c, radius, row } = useTheme();
  const { me } = useSignedIn();
  const qc = useQueryClient();
  const open = member !== null;

  const plans = useQuery({ queryKey: ['plans'], queryFn: () => api.plans(), enabled: open });
  const history = useQuery({ queryKey: ['history', member?.id], queryFn: () => api.history(member!.id), enabled: open });

  const [planId, setPlanId] = useState<string | null>(null);
  const [priceText, setPriceText] = useState<string | null>(null);
  const [paidText, setPaidText] = useState<string | null>(null);
  const [method, setMethod] = useState<PayMethod>('CARD');
  const [settle, setSettle] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPlanId(null);
    setPriceText(null);
    setPaidText(null);
    setSettle(false);
    setError(null);
  }, [member?.id]);

  const lastPlanId = history.data?.items[0]?.planId ?? null;
  const chosenId = planId ?? (plans.data?.some((p) => p.id === lastPlanId) ? lastPlanId : null);
  const plan = plans.data?.find((p) => p.id === chosenId) ?? null;
  const isOwner = me.role === 'OWNER';

  const form = buildRenewal({
    member: member ?? { currentEndsOn: null, balance: 0 },
    plan,
    today: todayInTehran(),
    isOwner,
    priceText,
    paidText,
    method,
    settleOldDebt: settle,
  });

  const submit = async () => {
    if (!member || !form.ok || !form.request) return;
    setBusy(true);
    setError(null);
    let debtFailure: string | null = null;
    try {
      await api.renew(member.id, form.request);
      if (form.oldDebtPayment > 0) {
        try {
          await api.payDebt(member.id, { amount: form.oldDebtPayment, method });
        } catch (e) {
          debtFailure = messageOf(e); // اشتراک ثبت شده؛ فقط پرداخت بدهی قبلی نشده
        }
      }
    } catch (e) {
      invalidateMember(qc, member.id);
      setError(messageOf(e));
      setBusy(false);
      return;
    }
    invalidateMember(qc, member.id);
    setBusy(false);
    onDone(debtFailure ? `اشتراک ثبت شد، ولی پرداخت بدهی قبلی ناموفق بود: ${debtFailure}` : 'اشتراک ثبت شد');
  };

  const needsMethod = form.paid > 0 || (settle && (member?.balance ?? 0) > 0);

  return (
    <Sheet visible={open} onClose={onClose} title={member && member.status === 'NONE' ? 'ثبت اشتراک' : 'تمدید اشتراک'}>
      {member ? (
        <>
          <T size={14} color={c.muted}>
            {member.name}
          </T>

          {plans.isPending ? (
            <T color={c.muted}>در حال خواندن پلن‌ها…</T>
          ) : plans.isError ? (
            <T color={c.bad}>{messageOf(plans.error)}</T>
          ) : plans.data.length === 0 ? (
            <T color={c.bad}>هنوز پلنی تعریف نشده است. مدیر باشگاه باید پلن بسازد.</T>
          ) : (
            <View style={{ flexDirection: row, flexWrap: 'wrap', gap: 8 }}>
              {plans.data.map((p) => {
                const on = p.id === chosenId;
                return (
                  <Pressable
                    key={p.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    onPress={() => {
                      setPlanId(p.id);
                      setPriceText(null);
                      setPaidText(null);
                    }}
                    style={{
                      minWidth: 96, flexGrow: 1, minHeight: 64, padding: 10, borderRadius: radius.md, gap: 2, alignItems: 'center', justifyContent: 'center',
                      backgroundColor: on ? c.tint : c.card, borderWidth: on ? 2 : 1, borderColor: on ? c.primary : c.line,
                    }}
                  >
                    <T weight="bold" size={14} align="center">
                      {p.name}
                    </T>
                    <T size={12.5} color={c.muted} align="center">
                      {compactToman(p.price)}
                    </T>
                  </Pressable>
                );
              })}
            </View>
          )}

          {plan ? (
            <>
              {isOwner ? (
                priceText === null ? (
                  <Button small variant="text" label={`مبلغ ${formatToman(plan.price)} · تغییر (تخفیف)`} onPress={() => setPriceText(formatMoneyInput(String(plan.price)))} />
                ) : (
                  <TextField
                    label="مبلغ اشتراک (تومان)"
                    value={priceText}
                    onChangeText={(t) => setPriceText(formatMoneyInput(t))}
                    keyboardType="number-pad"
                  />
                )
              ) : null}

              <TextField
                label="مبلغ دریافتی برای این اشتراک (تومان)"
                value={paidText ?? formatMoneyInput(String(form.price))}
                onChangeText={(t) => setPaidText(formatMoneyInput(t))}
                keyboardType="number-pad"
              />
              <View style={{ flexDirection: row, gap: 8 }}>
                <Button small variant="ghost" label="پرداخت کامل" style={{ flex: 1 }} onPress={() => setPaidText(null)} />
                <Button small variant="ghost" label="بعداً پرداخت می‌کند" style={{ flex: 1 }} onPress={() => setPaidText('0')} />
              </View>

              {member.balance > 0 ? (
                <View style={{ flexDirection: row, alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <T weight="bold">تسویه‌ی بدهی قبلی</T>
                    <T size={12.5} color={c.muted}>
                      {formatToman(member.balance)} هم‌زمان دریافت شود
                    </T>
                  </View>
                  <Switch value={settle} onValueChange={setSettle} trackColor={{ true: c.primary, false: c.line }} accessibilityLabel="تسویه‌ی بدهی قبلی" />
                </View>
              ) : null}

              {needsMethod ? <Segmented options={METHOD_OPTIONS} value={method} onChange={setMethod} /> : null}
            </>
          ) : null}

          <View style={{ backgroundColor: c.bg, borderRadius: radius.md, padding: 14, gap: 6 }}>
            {form.ok ? (
              <>
                <Line label="شروع" value={formatJalali(form.startsOn, true)} />
                <Line label="پایان" value={formatJalali(form.endsOn, true)} />
                <Line label="جمع دریافتی" value={formatToman(form.totalToCollect)} bold />
                <Line label="بدهی بعد از ثبت" value={formatToman(form.debtAfter)} tone={form.debtAfter > 0 ? c.debt : undefined} />
              </>
            ) : (
              <T size={14} color={plan ? c.bad : c.muted}>
                {form.error}
              </T>
            )}
          </View>

          {error ? (
            <T size={13.5} weight="bold" color={c.bad} accessibilityLiveRegion="polite">
              {error}
            </T>
          ) : null}
          <Button label="ثبت" onPress={submit} loading={busy} disabled={!form.ok} />
          <Button label="انصراف" variant="text" onPress={onClose} />
        </>
      ) : null}
    </Sheet>
  );
}

function Line({ label, value, bold, tone }: { label: string; value: string; bold?: boolean; tone?: string }) {
  const { c, row } = useTheme();
  return (
    <View style={{ flexDirection: row, justifyContent: 'space-between', gap: 12 }}>
      <T size={14} color={c.muted}>
        {label}
      </T>
      <T size={14} weight={bold ? 'bold' : 'regular'} color={tone}>
        {value}
      </T>
    </View>
  );
}
