import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { todayInTehran } from '@fulad/shared';
import { api } from '../../src/lib/api/instance';
import { messageOf } from '../../src/lib/errors';
import { compactToman, faDigits, formatJalali, METHOD_LABELS } from '../../src/lib/format';
import { canGoNext, canGoPrev, changeLabel, currentMonth, isSameMonth, millionsOnly, monthTitle, renewalSummary, shiftMonth, weekBars } from '../../src/lib/report';
import { Button } from '../../src/ui/Button';
import { Screen } from '../../src/ui/Screen';
import { ErrorState, Loading } from '../../src/ui/States';
import { T } from '../../src/ui/Text';
import { useTheme } from '../../src/ui/theme';

export default function Report() {
  const { c, radius, row } = useTheme();
  const today = todayInTehran();
  const [ym, setYm] = useState(() => currentMonth(today));
  const q = useQuery({ queryKey: ['report', ym.year, ym.month], queryFn: () => api.report(ym) });
  const isCurrent = isSameMonth(ym, currentMonth(today));

  const nav = (
    <View style={{ flexDirection: row, alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <Button small variant="ghost" label="ماه قبل" disabled={!canGoPrev(ym)} onPress={() => setYm(shiftMonth(ym, -1))} />
      <T weight="bold" size={17} align="center">
        {monthTitle(ym)}
      </T>
      <Button small variant="ghost" label="ماه بعد" disabled={!canGoNext(ym, today)} onPress={() => setYm(shiftMonth(ym, 1))} />
    </View>
  );
  const title = (
    <T size={28} weight="bold">
      گزارش
    </T>
  );

  if (q.isPending) {
    return (
      <Screen>
        <View style={{ padding: 18, gap: 14 }}>{title}{nav}</View>
        <Loading />
      </Screen>
    );
  }
  if (q.isError) {
    return (
      <Screen>
        <View style={{ padding: 18, gap: 14 }}>{title}{nav}</View>
        <ErrorState message={messageOf(q.error)} onRetry={() => void q.refetch()} />
      </Screen>
    );
  }

  const r = q.data;
  const change = changeLabel(r.revenue.changePercent);
  const bars = weekBars(r.revenue.weeks);
  const renewal = renewalSummary(r.renewal);
  const changeColor = change.tone === 'up' ? '#BFE8D0' : change.tone === 'down' ? '#F5C4B9' : '#CFE3D9';
  const methods = (Object.keys(METHOD_LABELS) as (keyof typeof METHOD_LABELS)[]).filter((k) => r.revenue.byMethod[k] > 0);

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ padding: 18, gap: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} tintColor={c.primary} />}
      >
        {title}
        {nav}

        <View style={{ backgroundColor: c.primary, borderRadius: radius.xl, padding: 20, gap: 6 }}>
          <T size={14} color="#CFE3D9">
            {isCurrent ? 'درآمد این ماه' : `درآمد ${r.period.monthName}`}
          </T>
          <T weight="bold" size={44} color="#FFFFFF" style={{ lineHeight: 52 }}>
            {compactToman(r.revenue.total)}
          </T>
          <T size={13.5} color={changeColor} weight="bold">
            {change.text}
          </T>
          <T size={13} color="#CFE3D9">
            {faDigits(r.revenue.paymentCount)} پرداخت
            {methods.length ? ` · ${methods.map((k) => `${METHOD_LABELS[k]} ${compactToman(r.revenue.byMethod[k])}`).join(' · ')}` : ''}
          </T>
        </View>

        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: row, justifyContent: 'space-between' }}>
            <T weight="bold" size={16}>
              درآمد هر هفته
            </T>
            <T size={12.5} color={c.muted}>
              میلیون تومان
            </T>
          </View>
          <View style={{ flexDirection: row, alignItems: 'flex-end', gap: 12, height: 160 }} accessibilityLabel="نمودار درآمد هفتگی">
            {bars.map((b, i) => (
              <View key={i} style={{ flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center', gap: 4 }}>
                <T size={12} weight="bold" align="center">
                  {millionsOnly(b.value)}
                </T>
                <View style={{ width: '100%', height: Math.round(b.ratio * 100), borderTopLeftRadius: 8, borderTopRightRadius: 8, borderBottomLeftRadius: 3, borderBottomRightRadius: 3, backgroundColor: isCurrent && i === bars.length - 1 ? c.signal : c.primary }} />
                <T size={11.5} color={c.muted} align="center">
                  {b.label}
                </T>
              </View>
            ))}
          </View>
        </View>

        <View style={{ flexDirection: row, flexWrap: 'wrap', gap: 10 }}>
          <Kpi label="نرخ تمدید" value={renewal.value} hint={renewal.detail} tone={r.renewal.rate !== null ? c.ok : undefined} />
          <Kpi label="عضو جدید" value={faDigits(r.members.newInMonth)} />
          <Kpi label="اشتراک فعال" value={faDigits(r.members.active)} hint="هم‌اکنون" />
          <Kpi label="مطالبات" value={compactToman(r.receivables.total)} hint={`${faDigits(r.receivables.debtors)} بدهکار`} tone={r.receivables.total > 0 ? c.debt : undefined} />
        </View>

        <View style={{ gap: 4 }}>
          <T weight="bold" size={16}>
            آخرین پرداخت‌ها
          </T>
          {r.recentPayments.length === 0 ? (
            <T color={c.muted}>هنوز پرداختی ثبت نشده است.</T>
          ) : (
            r.recentPayments.map((p) => (
              <Pressable
                key={p.id}
                accessibilityRole="button"
                accessibilityLabel={`پروفایل ${p.memberName}`}
                onPress={() => router.push(`/member/${p.memberId}`)}
                style={{ flexDirection: row, justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.line }}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <T weight="bold" numberOfLines={1}>
                    {p.memberName}
                  </T>
                  <T size={12.5} color={c.muted}>
                    {METHOD_LABELS[p.method]} · {formatJalali(todayInTehran(new Date(p.paidAt)))}
                  </T>
                </View>
                <T weight="bold">{compactToman(p.amount)}</T>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

function Kpi({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: string }) {
  const { c, radius } = useTheme();
  return (
    <View style={{ flexBasis: '47%', flexGrow: 1, backgroundColor: c.card, borderRadius: radius.md, borderWidth: 1, borderColor: c.line, padding: 14, gap: 4 }}>
      <T size={13} color={c.muted}>
        {label}
      </T>
      <T weight="bold" size={24} color={tone}>
        {value}
      </T>
      {hint ? (
        <T size={12} color={c.muted}>
          {hint}
        </T>
      ) : null}
    </View>
  );
}
