'use client';

import Link from 'next/link';
import { Badge, Button, DataTable, EmptyState, Skeleton, StatCard, type Column } from '../../src/ui/index';
import { BarChart } from '../../src/ui/chart';
import { useApi } from '../../src/lib/use-api';
import { faNum, faToman, faDate, methodLabel, statusBadge } from '../../src/lib/format';

interface DashboardData {
  kpis: {
    activeMembers: number;
    monthRevenue: number;
    revenueChangePercent: number | null;
    receivables: number;
    debtors: number;
    newInMonth: number;
    followUps: number;
  };
  trend: { label: string; total: number }[];
  recentPayments: { id: string; amount: number; method: string; paidAt: string; memberId: string; memberName: string }[];
  followUps: {
    expiring: MemberLite[];
    expired: MemberLite[];
  };
}

interface MemberLite {
  id: string;
  name: string;
  phone: string;
  status: string;
  daysLeft: number | null;
  followUp: boolean;
  balance: number;
}

const paymentColumns: Column<DashboardData['recentPayments'][number]>[] = [
  { key: 'member', label: 'عضو', render: (p) => p.memberName },
  { key: 'amount', label: 'مبلغ', numeric: true, render: (p) => faNum(p.amount) },
  { key: 'method', label: 'روش', render: (p) => <Badge kind="tint">{methodLabel[p.method] ?? p.method}</Badge> },
  { key: 'paidAt', label: 'تاریخ', render: (p) => faDate(p.paidAt) },
];

function FollowList({ title, members, tone }: { title: string; members: MemberLite[]; tone: 'wn' | 'bad' }) {
  return (
    <div className="u-table-wrap">
      <div style={{ padding: '12px 14px', fontWeight: 700, borderBottom: '1px solid var(--line)', fontSize: 14 }}>
        {title} <Badge kind={tone}>{faNum(members.length)}</Badge>
      </div>
      {members.length === 0 ? (
        <p style={{ color: 'var(--mut)', fontSize: 13, padding: 14 }}>موردی نیست.</p>
      ) : (
        <div>
          {members.map((m) => {
            const b = statusBadge[m.status];
            return (
              <Link
                key={m.id}
                href={`/admin/members/${m.id}`}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '10px 14px', borderBottom: '1px solid color-mix(in srgb, var(--line) 50%, transparent)', textDecoration: 'none', color: 'inherit' }}
              >
                <span style={{ fontWeight: 700, fontSize: 14 }}>{m.name}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {m.balance > 0 ? <Badge kind="debt">بدهی {faNum(m.balance)}</Badge> : null}
                  {b ? <Badge kind={b.kind}>{b.label}</Badge> : null}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { data, error, loading, retry } = useApi<DashboardData>('/dashboard');

  if (loading) {
    return (
      <div style={{ display: 'grid', gap: 16 }}>
        <Skeleton height={28} width={220} />
        <div className="adm-grid">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} height={92} radius={13} />
          ))}
        </div>
        <Skeleton height={200} radius={13} />
      </div>
    );
  }
  if (error || !data) {
    return <EmptyState title="داشبورد بارگذاری نشد" hint={error?.message} actionLabel="تلاش دوباره" onAction={retry} />;
  }

  const k = data.kpis;
  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div className="adm-page-head">
        <h1>داشبورد</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/admin/members/new">
            <Button variant="primary" size="sm">+ عضو جدید</Button>
          </Link>
          <Link href="/admin/plans">
            <Button variant="ghost" size="sm">پلن‌ها</Button>
          </Link>
        </div>
      </div>

      <div className="adm-grid">
        <StatCard label="اعضای فعال" value={faNum(k.activeMembers)} />
        <StatCard label="درآمد ماه" value={faNum(k.monthRevenue)} delta={k.revenueChangePercent ?? undefined} />
        <StatCard label="مطالبات" value={faNum(k.receivables)} hint={`${faNum(k.debtors)} بدهکار`} />
        <StatCard label="نیازمند پیگیری" value={faNum(k.followUps)} hint="نزدیک انقضا و منقضی" />
        <StatCard label="عضو جدید ماه" value={faNum(k.newInMonth)} />
      </div>

      <div className="u-table-wrap" style={{ padding: 16 }}>
        <h2 style={{ fontSize: 14, margin: '0 0 14px' }}>روند درآمد ۶ ماه</h2>
        <BarChart data={data.trend} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
        <FollowList title="نزدیک انقضا" members={data.followUps.expiring} tone="wn" />
        <FollowList title="منقضی در مهلت پیگیری" members={data.followUps.expired} tone="bad" />
      </div>

      <div>
        <h2 style={{ fontSize: 14, margin: '0 0 10px' }}>آخرین پرداخت‌ها</h2>
        <DataTable
          columns={paymentColumns}
          rows={data.recentPayments}
          rowKey={(p) => p.id}
          emptyTitle="پرداختی ثبت نشده"
          emptyHint={<>اولین پرداخت را از پروفایل اعضا ثبت کنید. جمع مطالبات فعلی {faToman(k.receivables)} است.</>}
        />
      </div>
    </div>
  );
}
