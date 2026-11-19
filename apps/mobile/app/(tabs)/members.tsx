import { useState } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';
import { router } from 'expo-router';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useSignedIn } from '../../src/auth/AuthProvider';
import { api } from '../../src/lib/api/instance';
import type { MemberCounts, MemberFilter } from '../../src/lib/api/types';
import { useDebounced } from '../../src/hooks/useDebounced';
import { messageOf } from '../../src/lib/errors';
import { faDigits } from '../../src/lib/format';
import { Button } from '../../src/ui/Button';
import { Chip } from '../../src/ui/Chip';
import { MemberRow } from '../../src/ui/MemberRow';
import { Screen } from '../../src/ui/Screen';
import { EmptyState, ErrorState, Loading } from '../../src/ui/States';
import { T } from '../../src/ui/Text';
import { TextField } from '../../src/ui/TextField';
import { useTheme } from '../../src/ui/theme';

type FilterKey = 'all' | 'debtor' | 'archived' | MemberFilter;
const FILTERS: { key: FilterKey; label: string; count?: keyof MemberCounts; ownerOnly?: boolean }[] = [
  { key: 'all', label: 'همه', count: 'all' },
  { key: 'active', label: 'فعال', count: 'active' },
  { key: 'expiring', label: 'نزدیک انقضا', count: 'expiring' },
  { key: 'expired', label: 'منقضی', count: 'expired' },
  { key: 'lapsed', label: 'قدیمی', count: 'lapsed' },
  { key: 'debtor', label: 'بدهکار', count: 'debtors' },
  { key: 'none', label: 'بدون اشتراک', count: 'none' },
  { key: 'archived', label: 'بایگانی', ownerOnly: true },
];

export default function Members() {
  const { c, row } = useTheme();
  const { me } = useSignedIn();
  const filters = FILTERS.filter((f) => !f.ownerOnly || me.role === 'OWNER');
  const [text, setText] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const q = useDebounced(text.trim(), 300);

  const counts = useQuery({ queryKey: ['members', 'counts'], queryFn: () => api.counts() });
  const list = useInfiniteQuery({
    queryKey: ['members', 'list', q, filter],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      api.members({
        q,
        status: filter === 'all' || filter === 'debtor' || filter === 'archived' ? undefined : filter,
        debtor: filter === 'debtor',
        archived: filter === 'archived',
        page: pageParam,
        limit: 30,
      }),
    getNextPageParam: (last) => (last.page < last.pages ? last.page + 1 : undefined),
  });
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];
  const filtered = q.length > 0 || filter !== 'all';

  const header = (
    <View style={{ paddingTop: 14, gap: 12 }}>
      <View style={{ paddingHorizontal: 18, flexDirection: row, justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ gap: 4 }}>
          <T size={28} weight="bold">
            اعضا
          </T>
          <T size={14} color={c.muted}>
            {counts.data ? `${faDigits(counts.data.all)} عضو` : ' '}
          </T>
        </View>
        <Button small label="+ عضو جدید" onPress={() => router.push('/member/new')} />
      </View>
      <View style={{ paddingHorizontal: 18 }}>
        <TextField
          value={text}
          onChangeText={setText}
          placeholder="نام عضو یا بخشی از شماره موبایل"
          returnKeyType="search"
          accessibilityLabel="جستجوی عضو"
        />
      </View>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={filters}
        keyExtractor={(f) => f.key}
        contentContainerStyle={{ paddingHorizontal: 18, gap: 8 }}
        renderItem={({ item }) => (
          <Chip label={item.label} count={item.count ? counts.data?.[item.count] : undefined} selected={filter === item.key} onPress={() => setFilter(item.key)} />
        )}
      />
    </View>
  );

  return (
    <Screen>
      <FlatList
        data={items}
        keyExtractor={(m) => m.id}
        ListHeaderComponent={header}
        renderItem={({ item }) => <MemberRow m={item} onPress={() => router.push(`/member/${item.id}`)} />}
        keyboardShouldPersistTaps="handled"
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage();
        }}
        ListFooterComponent={list.isFetchingNextPage ? <ActivityIndicator color={c.primary} style={{ padding: 16 }} /> : undefined}
        ListEmptyComponent={
          list.isPending ? (
            <Loading />
          ) : list.isError ? (
            <ErrorState message={messageOf(list.error)} onRetry={() => void list.refetch()} />
          ) : filtered ? (
            <EmptyState title="عضوی با این مشخصات پیدا نشد" hint="جستجو یا فیلتر را تغییر دهید." />
          ) : (
            <EmptyState title="هنوز عضوی ثبت نشده" hint="اولین عضو را اضافه کنید." actionLabel="+ عضو جدید" onAction={() => router.push('/member/new')} />
          )
        }
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </Screen>
  );
}
