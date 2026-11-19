import { useEffect, useRef, useState } from 'react';
import { Alert, Platform, RefreshControl, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { todayInTehran } from '@fulad/shared';
import { useSignedIn } from '../../src/auth/AuthProvider';
import { invalidateMember } from '../../src/features/invalidate';
import { PayDebtSheet } from '../../src/features/PayDebtSheet';
import { RenewSheet } from '../../src/features/RenewSheet';
import { api } from '../../src/lib/api/instance';
import type { SubscriptionDto } from '../../src/lib/api/types';
import { messageOf } from '../../src/lib/errors';
import { faDigits, formatJalali, formatPhone, formatToman, METHOD_LABELS, platesFilled, statusInfo } from '../../src/lib/format';
import { openUrl } from '../../src/lib/linking';
import { buildReminder, smsUrl, telUrl, whatsappUrl } from '../../src/lib/reminders';
import { Button } from '../../src/ui/Button';
import { Plates } from '../../src/ui/Plates';
import { Screen } from '../../src/ui/Screen';
import { ErrorState, Loading } from '../../src/ui/States';
import { Tag } from '../../src/ui/Tag';
import { T } from '../../src/ui/Text';
import { useToast } from '../../src/ui/Toast';
import { useTheme } from '../../src/ui/theme';

export default function MemberProfile() {
  const { c, radius, row } = useTheme();
  const { gym, me } = useSignedIn();
  const isOwner = me.role === 'OWNER';
  const qc = useQueryClient();
  const toast = useToast();
  const { id, renew } = useLocalSearchParams<{ id: string; renew?: string }>();
  const member = useQuery({ queryKey: ['member', id], queryFn: () => api.member(id) });
  const history = useQuery({ queryKey: ['history', id], queryFn: () => api.history(id) });
  const [renewing, setRenewing] = useState(false);
  const [paying, setPaying] = useState(false);

  // بعد از «ذخیره و ثبت اشتراک» برگه‌ی تمدید خودش باز می‌شود (فقط یک‌بار)
  const autoOpened = useRef(false);
  useEffect(() => {
    if (renew === '1' && member.data && !autoOpened.current) {
      autoOpened.current = true;
      setRenewing(true);
    }
  }, [renew, member.data]);

  const back = <Button small variant="text" label="بازگشت" onPress={() => router.back()} style={{ alignSelf: 'flex-end' }} />;
  if (member.isPending) return <Screen>{back}<Loading /></Screen>;
  if (member.isError || !member.data) return <Screen>{back}<ErrorState message={messageOf(member.error)} onRetry={() => void member.refetch()} /></Screen>;

  const m = member.data;
  const info = statusInfo(m);
  const reminder = buildReminder(m, gym.name.replace(/^باشگاه\s+/, ''));
  const archived = m.archivedAt !== null;
  const archive = () =>
    Alert.alert('بایگانی عضو', `${m.name} بایگانی شود؟ سوابق مالی می‌ماند و ورود او به وب بسته می‌شود.`, [
      { text: 'انصراف', style: 'cancel' },
      {
        text: 'بایگانی',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.archive(m.id);
            invalidateMember(qc, m.id);
            toast('عضو بایگانی شد');
            router.back();
          } catch (e) {
            toast(messageOf(e));
          }
        },
      },
    ]);
  const restore = async () => {
    try {
      await api.restore(m.id);
      invalidateMember(qc, m.id);
      toast('عضو بازگردانده شد');
    } catch (e) {
      toast(messageOf(e));
    }
  };
  const heroLabel =
    m.status === 'NONE' ? 'هنوز اشتراکی ثبت نشده' : m.status === 'EXPIRED' ? 'روز از پایان اشتراک گذشته' : 'روز تا پایان اشتراک';

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ padding: 18, gap: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={member.isRefetching || history.isRefetching} onRefresh={() => { void member.refetch(); void history.refetch(); }} tintColor={c.primary} />}
      >
        {back}
        <View style={{ gap: 4 }}>
          <T size={26} weight="bold">
            {m.name}
          </T>
          <T size={14} color={c.muted}>
            {formatPhone(m.phone)}
          </T>
        </View>

        <View style={{ backgroundColor: c.primary, borderRadius: radius.xl, padding: 20, gap: 12 }}>
          {m.status === 'NONE' ? (
            <T weight="bold" size={18} color="#FFFFFF">
              {heroLabel}
            </T>
          ) : (
            <>
              <T weight="bold" size={64} color="#FFFFFF" style={{ lineHeight: 72 }}>
                {faDigits(Math.abs(m.daysLeft ?? 0))}
              </T>
              <T size={15} color="#CFE3D9">
                {heroLabel}
              </T>
              <Plates filled={platesFilled(m.daysLeft)} tone={info.tone} onDark />
              {m.currentEndsOn ? (
                <T size={13.5} color="#CFE3D9">
                  پایان: {formatJalali(m.currentEndsOn, true)}
                </T>
              ) : null}
            </>
          )}
        </View>

        {archived ? (
          <View style={{ backgroundColor: c.warnTint, borderRadius: radius.md, padding: 14, gap: 10 }}>
            <T weight="bold" color={c.warn}>
              این عضو بایگانی شده است و اشتراک یا پرداخت جدید برایش ثبت نمی‌شود.
            </T>
            {isOwner ? <Button small variant="ghost" label="بازگردانی عضو" onPress={restore} /> : null}
          </View>
        ) : null}

        <Button label={m.status === 'NONE' ? 'ثبت اشتراک' : 'تمدید'} onPress={() => setRenewing(true)} disabled={archived} />

        {m.balance > 0 ? (
          <View style={{ backgroundColor: c.debtTint, borderRadius: radius.md, padding: 14, gap: 10 }}>
            <T weight="bold" color={c.debt}>
              مانده‌ی پرداخت: {formatToman(m.balance)}
            </T>
            <Button small variant="ghost" label="ثبت پرداخت بدهی" onPress={() => setPaying(true)} disabled={archived} />
          </View>
        ) : null}

        <View style={{ flexDirection: row, gap: 8 }}>
          <Button small variant="ghost" label="تماس" style={{ flex: 1 }} onPress={() => openUrl(telUrl(m.phone))} />
          <Button small variant="ghost" label="پیامک" style={{ flex: 1 }} onPress={() => openUrl(smsUrl(m.phone, reminder, Platform.OS === 'ios' ? 'ios' : 'android'))} />
          <Button small variant="ghost" label="واتس‌اپ" style={{ flex: 1 }} onPress={() => openUrl(whatsappUrl(m.phone, reminder), 'واتس‌اپ روی این دستگاه نصب نیست')} />
        </View>

        <View style={{ flexDirection: row, gap: 8 }}>
          <Button small variant="ghost" label="ویرایش" style={{ flex: 1 }} disabled={archived} onPress={() => router.push({ pathname: '/member/edit', params: { id: m.id } })} />
          {isOwner && !archived ? <Button small variant="ghost" label="بایگانی" style={{ flex: 1 }} onPress={archive} /> : null}
        </View>

        {m.note ? (
          <View style={{ gap: 4 }}>
            <T size={13} weight="bold" color={c.muted}>
              یادداشت
            </T>
            <T>{m.note}</T>
          </View>
        ) : null}

        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: row, justifyContent: 'space-between', alignItems: 'center' }}>
            <T weight="bold" size={17}>
              اشتراک‌ها و پرداخت‌ها
            </T>
            {history.data ? (
              <Tag label={history.data.summary.balance > 0 ? `مانده ${formatToman(history.data.summary.balance)}` : 'تسویه'} tone={history.data.summary.balance > 0 ? 'debt' : 'ok'} />
            ) : null}
          </View>
          {history.isPending ? (
            <T color={c.muted}>در حال خواندن…</T>
          ) : history.isError ? (
            <ErrorState message={messageOf(history.error)} onRetry={() => void history.refetch()} />
          ) : history.data.items.length === 0 ? (
            <T color={c.muted}>هنوز اشتراکی ثبت نشده است.</T>
          ) : (
            history.data.items.map((s) => <SubscriptionItem key={s.id} s={s} />)
          )}
        </View>
      </ScrollView>

      <RenewSheet
        member={renewing ? m : null}
        onClose={() => setRenewing(false)}
        onDone={(msg) => {
          setRenewing(false);
          toast(msg);
        }}
      />
      <PayDebtSheet
        member={paying ? m : null}
        onClose={() => setPaying(false)}
        onDone={(msg) => {
          setPaying(false);
          toast(msg);
        }}
      />
    </Screen>
  );
}

function SubscriptionItem({ s }: { s: SubscriptionDto }) {
  const { c, row, radius } = useTheme();
  return (
    <View style={{ backgroundColor: c.card, borderRadius: radius.md, borderWidth: 1, borderColor: c.line, padding: 14, gap: 6 }}>
      <View style={{ flexDirection: row, justifyContent: 'space-between', alignItems: 'center' }}>
        <T weight="bold">{s.planName ?? 'اشتراک'}</T>
        {s.balance > 0 ? <Tag label={`مانده ${formatToman(s.balance)}`} tone="debt" /> : null}
      </View>
      <T size={13} color={c.muted}>
        {formatJalali(s.startsOn)} تا {formatJalali(s.endsOn, true)} · مبلغ {formatToman(s.price)}
      </T>
      {s.payments.map((p) => (
        <T key={p.id} size={13} color={c.muted}>
          دریافت {formatToman(p.amount)} · {METHOD_LABELS[p.method]} · {formatJalali(todayInTehran(new Date(p.paidAt)))}
        </T>
      ))}
    </View>
  );
}
