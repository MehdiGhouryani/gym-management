'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Badge, DataTable, EmptyState, Pagination, StatCard, type Column } from '../../../src/ui/index';
import { useApi } from '../../../src/lib/use-api';
import { faNum, faToman, methodLabel } from '../../../src/lib/format';
import { faDate, faNum as faDigits } from '../../../src/lib/format';
import { parseJalaliDate } from '../../../src/lib/jalali-input';

interface PaymentsPageData {
  items: { id: string; amount: number; method: string; paidAt: string; memberId: string; memberName: string }[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  sum: number;
}

const columns: Column<PaymentsPageData['items'][number]>[] = [
  {
    key: 'member',
    label: 'عضو',
    render: (p) => (
      <Link href={`/admin/members/${p.memberId}`} style={{ color: 'inherit', textDecoration: 'none', fontWeight: 700 }}>
        {p.memberName}
      </Link>
    ),
  },
  { key: 'amount', label: 'مبلغ', numeric: true, render: (p) => faNum(p.amount) },
  { key: 'method', label: 'روش', render: (p) => <Badge kind="tint">{methodLabel[p.method] ?? p.method}</Badge> },
  { key: 'paidAt', label: 'تاریخ', render: (p) => faDate(p.paidAt) },
];

export default function PaymentsPage() {
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(q);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [q]);

  const fromIso = from.trim() ? parseJalaliDate(from) : null;
  const toIso = to.trim() ? parseJalaliDate(to) : null;
  const invalidRange = (from.trim() && !fromIso) || (to.trim() && !toIso);

  const query = new URLSearchParams();
  if (search.trim()) query.set('q', search.trim());
  if (fromIso) query.set('from', fromIso);
  if (toIso) query.set('to', toIso);
  query.set('page', String(page));

  const data = useApi<PaymentsPageData>(invalidRange ? null : `/payments?${query.toString()}`);

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div className="adm-page-head">
        <h1>پرداخت‌ها</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            className="u-input"
            style={{ width: 140, minHeight: 36 }}
            dir="ltr"
            placeholder="از 1405/01/01"
            value={from}
            onChange={(e) => { setFrom(e.target.value); setPage(1); }}
            aria-label="از تاریخ (شمسی)"
          />
          <input
            className="u-input"
            style={{ width: 140, minHeight: 36 }}
            dir="ltr"
            placeholder="تا 1405/07/01"
            value={to}
            onChange={(e) => { setTo(e.target.value); setPage(1); }}
            aria-label="تا تاریخ (شمسی)"
          />
          <input
            className="u-input"
            style={{ width: 200, minHeight: 36 }}
            placeholder="نام یا بخشی از شماره…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="جستجو"
          />
        </div>
      </div>

      {invalidRange ? (
        <EmptyState title="تاریخ نامعتبر" hint="تاریخ را به شکل ۱۴۰۵/۰۱/۰۱ شمسی وارد کنید." />
      ) : data.loading ? (
        <div className="adm-grid">
          <StatCard label="جمع دوره" value="…" />
        </div>
      ) : data.data ? (
        <>
          <div className="adm-grid">
            <StatCard label="جمع دوره" value={faToman(data.data.sum)} hint={`${faDigits(data.data.total)} پرداخت`} />
          </div>
          <DataTable
            columns={columns}
            rows={data.data.items}
            rowKey={(p) => p.id}
            emptyTitle="پرداختی در این بازه نیست"
            emptyHint="بازه یا جستجو را تغییر دهید."
          />
          <Pagination page={data.data.page} pages={data.data.pages} onChange={setPage} />
        </>
      ) : null}

      {data.error ? <EmptyState title="بارگذاری ناموفق" hint={data.error.message} actionLabel="تلاش دوباره" onAction={data.retry} /> : null}
    </div>
  );
}
