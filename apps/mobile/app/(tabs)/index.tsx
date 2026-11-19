import { useMemo, useState } from 'react';
import { Alert, Platform, RefreshControl, SectionList, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { todayInTehran } from '@fulad/shared';
import { useAuth, useSignedIn } from '../../src/auth/AuthProvider';
import { RenewSheet } from '../../src/features/RenewSheet';
import { api } from '../../src/lib/api/instance';
import type { MemberDto } from '../../src/lib/api/types';
import { messageOf } from '../../src/lib/errors';
import { faDigits, formatJalali } from '../../src/lib/format';
import { openUrl } from '../../src/lib/linking';
import { buildReminder, smsUrl, telUrl, whatsappUrl } from '../../src/lib/reminders';
import { groupToday, mergeToday } from '../../src/lib/today';
import { Button } from '../../src/ui/Button';
import { MemberRow } from '../../src/ui/MemberRow';
import { Screen } from '../../src/ui/Screen';
import { EmptyState, ErrorState, Loading } from '../../src/ui/States';
import { T } from '../../src/ui/Text';
import { useToast } from '../../src/ui/Toast';
import { useTheme } from '../../src/ui/theme';

export default function Today() {
  const { c, row } = useTheme();
  const { gym } = useSignedIn();
  const { signOut } = useAuth();
  const toast = useToast();
  const [renewing, setRenewing] = useState<MemberDto | null>(null);
  const expiring = useQuery({ queryKey: ['members', 'today', 'expiring'], queryFn: () => api.members({ status: 'expiring', limit: 100 }) });
  const expired = useQuery({ queryKey: ['members', 'today', 'expired'], queryFn: () => api.members({ status: 'expired', limit: 100 }) });

  const list = useMemo(
    () => mergeToday(expiring.data?.items ?? [], expired.data?.items ?? []),
    [expiring.data, expired.data],
  );
  const groups = groupToday(list);
  const sections = [
    ...(groups.expired.length ? [{ key: 'expired', title: `منقضی‌شده، در مهلت پیگیری (${faDigits(groups.expired.length)})`, data: groups.expired }] : []),
    ...(groups.expiring.length ? [{ key: 'expiring', title: `تا ${faDigits(gym.expiringDays)} روز آینده (${faDigits(groups.expiring.length)})`, data: groups.expiring }] : []),
  ];

  const refetch = () => {
    void expiring.refetch();
    void expired.refetch();
  };
  const confirmLogout = () =>
    Alert.alert('خروج از حساب', 'مطمئنید می‌خواهید خارج شوید؟', [
      { text: 'انصراف', style: 'cancel' },
      { text: 'خروج', style: 'destructive', onPress: () => void signOut() },
    ]);

  const actions = (m: MemberDto) => {
    const text = buildReminder(m, gym.name.replace(/^باشگاه\s+/, ''));
    return (
      <View style={{ gap: 8 }}>
        <Button small label="تمدید" onPress={() => setRenewing(m)} />
        <View style={{ flexDirection: row, gap: 8 }}>
          <Button small variant="ghost" label="تماس" style={{ flex: 1 }} onPress={() => openUrl(telUrl(m.phone))} />
          <Button small variant="ghost" label="پیامک" style={{ flex: 1 }} onPress={() => openUrl(smsUrl(m.phone, text, Platform.OS === 'ios' ? 'ios' : 'android'))} />
          <Button small variant="ghost" label="واتس‌اپ" style={{ flex: 1 }} onPress={() => openUrl(whatsappUrl(m.phone, text), 'واتس‌اپ روی این دستگاه نصب نیست')} />
        </View>
      </View>
    );
  };

  const header = (
    <View style={{ paddingHorizontal: 18, paddingTop: 14, paddingBottom: 10, gap: 4 }}>
      <View style={{ flexDirection: row, justifyContent: 'space-between', alignItems: 'center' }}>
        <T size={13} color={c.muted}>
          {formatJalali(todayInTehran(), true)} · {gym.name}
        </T>
        <Button small variant="text" label="خروج" onPress={confirmLogout} />
      </View>
      <View style={{ flexDirection: row, justifyContent: 'space-between', alignItems: 'center' }}>
        <T size={28} weight="bold">
          امروز
        </T>
        <Button small label="+ عضو جدید" onPress={() => router.push('/member/new')} />
      </View>
      <T size={14} color={c.muted}>
        {list.length ? `${faDigits(list.length)} نفر نیاز به پیگیری دارند` : 'امروز کاری لازم نیست'}
      </T>
    </View>
  );

  if (expiring.isPending || expired.isPending) {
    return (
      <Screen>
        {header}
        <Loading />
      </Screen>
    );
  }
  const err = expiring.error ?? expired.error;
  if (err && !list.length) {
    return (
      <Screen>
        {header}
        <ErrorState message={messageOf(err)} onRetry={refetch} />
      </Screen>
    );
  }

  return (
    <Screen>
      <SectionList
        sections={sections}
        keyExtractor={(m) => m.id}
        ListHeaderComponent={header}
        renderSectionHeader={({ section }) => (
          <View style={{ backgroundColor: c.bg, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 6 }}>
            <T weight="bold" size={15}>
              {section.title}
            </T>
          </View>
        )}
        renderItem={({ item }) => <MemberRow m={item} onPress={() => router.push(`/member/${item.id}`)} actions={actions(item)} />}
        ListEmptyComponent={<EmptyState title="همه‌چیز مرتب است" hint="هیچ عضوی در این بازه اشتراکش تمام نمی‌شود یا تمام نشده است." />}
        refreshControl={<RefreshControl refreshing={expiring.isRefetching || expired.isRefetching} onRefresh={refetch} tintColor={c.primary} />}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      />
      <RenewSheet
        member={renewing}
        onClose={() => setRenewing(null)}
        onDone={(msg) => {
          setRenewing(null);
          toast(msg);
        }}
      />
    </Screen>
  );
}
