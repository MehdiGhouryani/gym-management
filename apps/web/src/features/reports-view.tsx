'use client';

import { useState } from 'react';
import { DataTable, EmptyState, Input, Select, Skeleton, StatCard, Tabs, type Column } from '../ui/index';
import { BarChart } from '../ui/chart';
import { useApi } from '../lib/use-api';
import { faNum, faToman } from '../lib/format';
import type { Plan, PlanStats, StaffReport } from '../lib/types';

interface MonthlyReport {
  period: { year: number; month: number; monthName: string; from: string; to: string };
  revenue: { total: number; paymentCount: number; weeks: number[]; previousTotal: number; changePercent: number | null };
  members: { active: number; newInMonth: number };
  renewal: { total: number; renewed: number; lost: number; pending: number; rate: number | null };
  receivables: { total: number; debtors: number };
  recentPayments: { id: string; amount: number; method: string; paidAt: string; memberId: string; memberName: string }[];
}

interface AnnualReport {
  year: number;
  months: { month: number; monthName: string; revenue: number; paymentCount: number; newInMonth: number }[];
  totals: { revenue: number; paymentCount: number; newMembers: number };
}

const TABS = [
  { key: 'monthly', label: 'ماهانه' },
  { key: 'annual', label: 'سالانه' },
  { key: 'plans', label: 'عملکرد پلن‌ها' },
  { key: 'staff', label: 'کارکنان' },
];

export function ReportsView() {
  const [tab, setTab] = useState('monthly');
  const [year, setYear] = useState(1405);
  const [month, setMonth] = useState(7);

  const monthly = useApi<MonthlyReport>(tab === 'monthly' ? `/reports/monthly?year=${year}&month=${month}` : null);
  const annual = useApi<AnnualReport>(tab === 'annual' ? `/reports/annual?year=${year}` : null);
  const plans = useApi<PlanStats>(tab === 'plans' ? `/reports/plans?year=${year}&month=${month}` : null);
  const staff = useApi<StaffReport>(tab === 'staff' ? `/reports/staff?year=${year}&month=${month}` : null);
  const allPlans = useApi<Plan[]>(tab === 'plans' ? '/plans?includeInactive=true' : null);

  const planName = (planId: string) => allPlans.data?.find((p) => p.id === planId)?.name ?? planId;

  const periodLabel = `${month.toLocaleString('fa-IR', { useGrouping: false })} ${month === 12 ? '— اسفند' : ''} · سال ${year.toLocaleString('fa-IR', { useGrouping: false })}`;

  const planColumns: Column<NonNullable<PlanStats>['items'][number]>[] = [
    { key: 'plan', label: 'پلن', render: (r) => planName(r.planId) },
    { key: 'count', label: 'اشتراک', numeric: true, render: (r) => faNum(r.count) },
    { key: 'revenue', label: 'درآمد', numeric: true, render: (r) => faToman(r.revenue) },
    { key: 'share', label: 'سهم', numeric: true, render: (r) => `${faNum(r.sharePercent)}٪` },
  ];

  const staffColumns: Column<NonNullable<StaffReport>['items'][number]>[] = [
    { key: 'name', label: 'کارمند', render: (r) => <strong>{r.name}</strong> },
    { key: 'renewals', label: 'تمدید', numeric: true, render: (r) => faNum(r.renewals) },
    { key: 'payments', label: 'پرداخت بدهی', numeric: true, render: (r) => faNum(r.payments) },
    { key: 'collected', label: 'وصولی', numeric: true, render: (r) => faToman(r.collected) },
  ];

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div className="adm-page-head">
        <h1>گزارش‌ها</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <Select value={month} onChange={(e) => setMonth(Number(e.target.value))} style={{ width: 130, minHeight: 36 }} aria-label="ماه شمسی">
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {(i + 1).toLocaleString('fa-IR')} — {['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'][i]}
              </option>
            ))}
          </Select>
          <Input
            value={year}
            onChange={(e) => setYear(Number(e.target.value.replace(/\D/g, '').slice(0, 4)) || 1405)}
            dir="ltr"
            inputMode="numeric"
            style={{ width: 100, minHeight: 36 }}
            aria-label="سال شمسی"
          />
        </div>
      </div>

      <Tabs items={TABS} active={tab} onChange={setTab} />

      {tab === 'monthly' ? (
        monthly.loading ? (
          <Skeleton height={260} radius={13} />
        ) : monthly.error || !monthly.data ? (
          <EmptyState title="گزارش بارگذاری نشد" hint={monthly.error?.message} actionLabel="تلاش دوباره" onAction={monthly.retry} />
        ) : (
          <>
            <div className="adm-grid">
              <StatCard label={`درآمد ${monthly.data.period.monthName}`} value={faToman(monthly.data.revenue.total)} delta={monthly.data.revenue.changePercent ?? undefined} />
              <StatCard label="پرداخت‌ها" value={faNum(monthly.data.revenue.paymentCount)} />
              <StatCard label="اعضای فعال" value={faNum(monthly.data.members.active)} hint={`${faNum(monthly.data.members.newInMonth)} عضو جدید`} />
              <StatCard label="مطالبات" value={faToman(monthly.data.receivables.total)} hint={`${faNum(monthly.data.receivables.debtors)} بدهکار`} />
              <StatCard
                label="نرخ تمدید"
                value={monthly.data.renewal.rate === null ? '—' : `${faNum(monthly.data.renewal.rate)}٪`}
                hint={`${faNum(monthly.data.renewal.renewed)} تمدید · ${faNum(monthly.data.renewal.lost)} ریزش · ${faNum(monthly.data.renewal.pending)} در انتظار`}
              />
            </div>
            <div className="u-table-wrap" style={{ padding: 16 }}>
              <h2 style={{ fontSize: 14, margin: '0 0 14px' }}>درآمد هفته‌های ماه</h2>
              <BarChart data={monthly.data.revenue.weeks.map((w, i) => ({ label: `هفته ${(i + 1).toLocaleString('fa-IR')}`, total: w }))} />
            </div>
          </>
        )
      ) : null}

      {tab === 'annual' ? (
        annual.loading ? (
          <Skeleton height={260} radius={13} />
        ) : annual.error || !annual.data ? (
          <EmptyState title="گزارش بارگذاری نشد" hint={annual.error?.message} actionLabel="تلاش دوباره" onAction={annual.retry} />
        ) : (
          <>
            <div className="adm-grid">
              <StatCard label={`درآمد سال ${annual.data.year.toLocaleString('fa-IR', { useGrouping: false })}`} value={faToman(annual.data.totals.revenue)} />
              <StatCard label="پرداخت‌ها" value={faNum(annual.data.totals.paymentCount)} />
              <StatCard label="عضو جدید" value={faNum(annual.data.totals.newMembers)} />
            </div>
            <div className="u-table-wrap" style={{ padding: 16 }}>
              <h2 style={{ fontSize: 14, margin: '0 0 14px' }}>روند ۱۲ ماه</h2>
              <BarChart data={annual.data.months.map((m) => ({ label: m.monthName, total: m.revenue }))} height={220} />
            </div>
          </>
        )
      ) : null}

      {tab === 'plans' ? (
        plans.loading ? (
          <Skeleton height={220} radius={13} />
        ) : plans.error || !plans.data ? (
          <EmptyState title="گزارش بارگذاری نشد" hint={plans.error?.message} actionLabel="تلاش دوباره" onAction={plans.retry} />
        ) : plans.data.items.length === 0 ? (
          <EmptyState title="در این ماه اشتراکی شروع نشده" hint={`دوره: ${periodLabel}`} />
        ) : (
          <DataTable columns={planColumns} rows={plans.data.items} rowKey={(r) => r.planId} emptyTitle="موردی نیست" />
        )
      ) : null}

      {tab === 'staff' ? (
        staff.loading ? (
          <Skeleton height={220} radius={13} />
        ) : staff.error || !staff.data ? (
          <EmptyState title="گزارش بارگذاری نشد" hint={staff.error?.message} actionLabel="تلاش دوباره" onAction={staff.retry} />
        ) : staff.data.items.length === 0 ? (
          <EmptyState title="در این ماه عملیاتی ثبت نشده" hint={`دوره: ${periodLabel}`} />
        ) : (
          <DataTable columns={staffColumns} rows={staff.data.items} rowKey={(r) => r.actorId} emptyTitle="موردی نیست" />
        )
      ) : null}
    </div>
  );
}
