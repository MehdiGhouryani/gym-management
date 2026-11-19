'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Badge, Button, DataTable, EmptyState, Pagination, Tabs, type Column } from '../ui/index';
import { useApi } from '../lib/use-api';
import { useSession } from '../lib/session';
import { faNum, statusBadge } from '../lib/format';
import { toJalaliString } from '../lib/jalali-input';
import type { Member, MemberCounts, MemberPage } from '../lib/types';

type StatusKey = '' | 'active' | 'expiring' | 'expired' | 'lapsed' | 'none';

const TAB_ITEMS = (c: MemberCounts | null) => [
  { key: '', label: 'همه', count: c?.all },
  { key: 'active', label: 'فعال', count: c?.active },
  { key: 'expiring', label: 'نزدیک انقضا', count: c?.expiring },
  { key: 'expired', label: 'منقضی', count: c?.expired },
  { key: 'lapsed', label: 'خارج از مهلت', count: c?.lapsed },
  { key: 'none', label: 'بدون اشتراک', count: c?.none },
];

const columns: Column<Member>[] = [
  {
    key: 'name',
    label: 'عضو',
    render: (m) => (
      <div style={{ display: 'grid' }}>
        <strong style={{ fontSize: 14 }}>{m.name}</strong>
        <span dir="ltr" style={{ fontSize: 12, color: 'var(--mut)', textAlign: 'start' }}>
          {m.phone}
        </span>
      </div>
    ),
  },
  {
    key: 'status',
    label: 'وضعیت',
    render: (m) => {
      const b = statusBadge[m.status];
      return (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {b ? <Badge kind={b.kind}>{b.label}</Badge> : null}
          {m.followUp ? <Badge kind="wn">پیگیری</Badge> : null}
        </div>
      );
    },
  },
  {
    key: 'ends',
    label: 'پایان اشتراک',
    render: (m) => (m.currentEndsOn ? toJalaliString(m.currentEndsOn) : '—'),
  },
  {
    key: 'daysLeft',
    label: 'روز مانده',
    numeric: true,
    render: (m) => (m.daysLeft === null ? '—' : faNum(m.daysLeft)),
  },
  {
    key: 'balance',
    label: 'بدهی',
    numeric: true,
    render: (m) => (m.balance > 0 ? <Badge kind="debt">{faNum(m.balance)}</Badge> : '—'),
  },
];

export function MembersList() {
  const router = useRouter();
  const params = useSearchParams();
  const session = useSession();
  const isOwner = session.user?.role === 'OWNER';

  const [q, setQ] = useState(params.get('q') ?? '');
  const [status, setStatus] = useState<StatusKey>('');
  const [debtor, setDebtor] = useState(false);
  const [archived, setArchived] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState(params.get('q') ?? '');

  const query = new URLSearchParams();
  if (search.trim()) query.set('q', search.trim());
  if (status) query.set('status', status);
  if (debtor) query.set('debtor', 'true');
  if (archived) query.set('archived', 'true');
  query.set('page', String(page));

  const list = useApi<MemberPage>(`/members?${query.toString()}`);
  const counts = useApi<MemberCounts>('/members/counts');

  // جستجوی تاخیری: تایپ → ۴۰۰ms → درخواست
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(q);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div className="adm-page-head">
        <h1>اعضا</h1>
        <Link href="/admin/members/new">
          <Button variant="primary" size="sm">+ عضو جدید</Button>
        </Link>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          className="u-input"
          style={{ maxWidth: 260, minHeight: 38 }}
          placeholder="جستجو: نام یا بخشی از شماره…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="جستجوی عضو"
        />
        {isOwner ? (
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--mut)', cursor: 'pointer' }}>
            <input type="checkbox" checked={archived} onChange={(e) => { setArchived(e.target.checked); setPage(1); }} />
            بایگانی
          </label>
        ) : null}
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--mut)', cursor: 'pointer' }}>
          <input type="checkbox" checked={debtor} onChange={(e) => { setDebtor(e.target.checked); setPage(1); }} />
          فقط بدهکارها
        </label>
      </div>

      <Tabs
        items={TAB_ITEMS(counts.data)}
        active={status}
        onChange={(k) => {
          setStatus(k as StatusKey);
          setPage(1);
        }}
      />

      <DataTable
        columns={columns}
        rows={list.data?.items ?? []}
        rowKey={(m) => m.id}
        loading={list.loading}
        onRowClick={(m) => router.push(`/admin/members/${m.id}`)}
        emptyTitle={search || status || debtor ? 'عضوی با این فیلترها پیدا نشد' : 'هنوز عضوی ثبت نشده'}
        emptyHint={search || status || debtor ? 'فیلترها را تغییر دهید.' : 'اولین عضو را اضافه کنید.'}
        emptyActionLabel={search || status || debtor ? undefined : '+ عضو جدید'}
        onEmptyAction={search || status || debtor ? undefined : () => router.push('/admin/members/new')}
      />

      {list.error ? <EmptyState title="بارگذاری ناموفق" hint={list.error.message} actionLabel="تلاش دوباره" onAction={list.retry} /> : null}

      <Pagination page={list.data?.page ?? 1} pages={list.data?.pages ?? 1} onChange={setPage} />
      {list.data ? (
        <p style={{ fontSize: 12, color: 'var(--mut)', margin: 0, textAlign: 'center' }}>
          {faNum(list.data.total)} عضو — ترتیب: نزدیک‌ترین انقضا بالا
        </p>
      ) : null}
    </div>
  );
}
