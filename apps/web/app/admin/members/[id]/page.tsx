'use client';

import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Badge, Button, DataTable, Dialog, EmptyState, Field, Input, Skeleton, StatCard, type Column } from '../../../../src/ui/index';
import { MemberFields, memberFormFromMember, memberFormToInput, type MemberFormValues } from '../../../../src/features/member-fields';
import { PayDebtDialog } from '../../../../src/features/pay-debt-dialog';
import { RefundDialog } from '../../../../src/features/refund-dialog';
import { RenewDialog } from '../../../../src/features/renew-dialog';
import { api } from '../../../../src/lib/api';
import { useApi } from '../../../../src/lib/use-api';
import { useSession } from '../../../../src/lib/session';
import { faNum, faToman, statusBadge } from '../../../../src/lib/format';
import { toJalaliString } from '../../../../src/lib/jalali-input';
import type { Member, Subscription, SubscriptionHistory } from '../../../../src/lib/types';

const subColumnsBase: Column<Subscription>[] = [
  {
    key: 'plan',
    label: 'پلن',
    render: (s) => (
      <div style={{ display: 'grid' }}>
        <span>{s.planName ?? '—'}</span>
        <span style={{ fontSize: 12, color: 'var(--mut)', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {s.planKind === 'sessions' && s.sessionsRemaining !== null ? `${faNum(s.sessionsRemaining)} جلسه باقی` : null}
          {s.frozenDays > 0 ? `توقف ${faNum(s.frozenDays)} روز` : null}
          {s.cancelledAt ? 'لغوشده' : null}
        </span>
      </div>
    ),
  },
  { key: 'period', label: 'بازه', render: (s) => `${toJalaliString(s.startsOn)} تا ${toJalaliString(s.endsOn)}` },
  { key: 'price', label: 'مبلغ', numeric: true, render: (s) => faNum(s.price) },
  { key: 'paid', label: 'پرداخته', numeric: true, render: (s) => faNum(s.paid) },
  {
    key: 'balance',
    label: 'مانده',
    numeric: true,
    render: (s) => (s.balance > 0 ? <Badge kind="debt">{faNum(s.balance)}</Badge> : <Badge kind="ok">تسویه</Badge>),
  },
  { key: 'payments', label: 'پرداخت‌ها', render: (s) => `${faNum(s.payments.length)} پرداخت` },
];

export default function MemberProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const session = useSession();
  const isOwner = session.user?.role === 'OWNER';

  const member = useApi<Member>(`/members/${id}`);
  const history = useApi<SubscriptionHistory>(`/members/${id}/subscriptions`);

  const [renewOpen, setRenewOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [form, setForm] = useState<MemberFormValues | null>(null);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [freezeSub, setFreezeSub] = useState<Subscription | null>(null);
  const [freezeDays, setFreezeDays] = useState('');
  const [cancelSub, setCancelSub] = useState<Subscription | null>(null);
  const [refundOpen, setRefundOpen] = useState(false);

  const m = member.data;

  const doFreeze = async () => {
    if (!freezeSub || busy || !m) return;
    setBusy(true);
    try {
      await api.post(`/members/${m.id}/subscriptions/${freezeSub.id}/freeze`, { days: Number(freezeDays) });
      setFreezeSub(null);
      setFreezeDays('');
      refreshAll();
    } finally {
      setBusy(false);
    }
  };

  const doCancel = async () => {
    if (!cancelSub || busy || !m) return;
    setBusy(true);
    try {
      await api.post(`/members/${m.id}/subscriptions/${cancelSub.id}/cancel`);
      setCancelSub(null);
      refreshAll();
    } finally {
      setBusy(false);
    }
  };

  const patchInput = useMemo(() => {
    if (!m || !form) return null;
    const next = memberFormToInput(form);
    const orig = memberFormToInput(memberFormFromMember(m));
    const patch: Record<string, unknown> = {};
    for (const k of ['name', 'phone', 'birthDate', 'note'] as const) {
      if (next[k] !== orig[k]) patch[k] = next[k] ?? null;
    }
    return Object.keys(patch).length ? patch : null;
  }, [m, form]);

  const refreshAll = () => {
    member.retry();
    history.retry();
  };

  const saveEdit = async () => {
    if (!patchInput || busy) {
      setEditOpen(false);
      return;
    }
    setBusy(true);
    setEditErrors({});
    try {
      await api.patch<Member>(`/members/${id}`, patchInput);
      setEditOpen(false);
      refreshAll();
    } catch (e) {
      const extra = (e as { extra?: { issues?: { path: string[]; message: string }[] } }).extra;
      if (extra?.issues) {
        const map: Record<string, string> = {};
        for (const i of extra.issues) map[String(i.path[0] ?? '')] = i.message;
        setEditErrors(map);
      } else {
        setEditErrors({ name: e instanceof Error ? e.message : 'ویرایش ناموفق بود' });
      }
    } finally {
      setBusy(false);
    }
  };

  const toggleArchive = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await api.post(`/members/${id}/${m?.archivedAt ? 'restore' : 'archive'}`);
      setArchiveOpen(false);
      refreshAll();
    } finally {
      setBusy(false);
    }
  };

  if (member.loading) {
    return (
      <div style={{ display: 'grid', gap: 14 }}>
        <Skeleton height={110} radius={13} />
        <Skeleton height={180} radius={13} />
      </div>
    );
  }
  if (member.error || !m) {
    return (
      <EmptyState
        title="عضو پیدا نشد"
        hint={member.error?.message}
        actionLabel="بازگشت به فهرست"
        onAction={() => router.push('/admin/members')}
      />
    );
  }

  const b = statusBadge[m.status];
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* سربرگ پروفایل */}
      <div className="u-table-wrap" style={{ padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 20 }}>
              {m.name} {m.archivedAt ? <Badge kind="neutral">بایگانی‌شده</Badge> : null}
            </h1>
            <p style={{ margin: '4px 0 0', color: 'var(--mut)', fontSize: 13 }}>
              <span dir="ltr">{m.phone}</span>
              {m.birthDate ? ` · تولد ${toJalaliString(m.birthDate)}` : ''}
              {m.note ? ` · ${m.note}` : ''}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button variant="primary" size="sm" onClick={() => setRenewOpen(true)} disabled={!!m.archivedAt}>
              تمدید اشتراک
            </Button>
            {m.balance > 0 ? (
              <Button variant="tint" size="sm" onClick={() => setPayOpen(true)} disabled={!!m.archivedAt}>
                پرداخت بدهی
              </Button>
            ) : null}
            {isOwner ? (
              <Button variant="ghost" size="sm" onClick={() => setRefundOpen(true)} disabled={!!m.archivedAt}>
                بازپرداخت
              </Button>
            ) : null}
            <Button variant="ghost" size="sm" onClick={() => { setForm(memberFormFromMember(m)); setEditErrors({}); setEditOpen(true); }}>
              ویرایش
            </Button>
            {isOwner ? (
              <Button variant="danger" size="sm" onClick={() => setArchiveOpen(true)}>
                {m.archivedAt ? 'بازگردانی' : 'بایگانی'}
              </Button>
            ) : null}
          </div>
        </div>
        <div className="adm-grid" style={{ marginTop: 14 }}>
          <StatCard label="وضعیت" value={b?.label ?? '—'} hint={m.daysLeft === null ? 'بدون اشتراک' : `${faNum(m.daysLeft)} روز مانده`} />
          <StatCard label="پایان اشتراک" value={m.currentEndsOn ? toJalaliString(m.currentEndsOn) : '—'} />
          <StatCard label="بدهی" value={faToman(m.balance)} />
        </div>
      </div>

      {/* تاریخچه */}
      <div>
        <h2 style={{ fontSize: 14, margin: '0 0 10px' }}>
          تاریخچه اشتراک‌ها — جمع {faToman(history.data?.summary.totalPrice ?? 0)}، پرداخته {faToman(history.data?.summary.totalPaid ?? 0)}
        </h2>
        <DataTable
          columns={[
            ...subColumnsBase,
            ...(isOwner
              ? [
                  {
                    key: 'actions',
                    label: 'عملیات',
                    render: (s: Subscription) =>
                      s.cancelledAt ? (
                        <span style={{ fontSize: 12, color: 'var(--mut)' }}>—</span>
                      ) : (
                        <span style={{ display: 'inline-flex', gap: 6 }}>
                          <Button variant="ghost" size="sm" onClick={() => { setFreezeSub(s); setFreezeDays(''); }}>
                            توقف موقت
                          </Button>
                          <Button variant="danger" size="sm" onClick={() => setCancelSub(s)}>
                            لغو
                          </Button>
                        </span>
                      ),
                  },
                ]
              : []),
          ]}
          rows={history.data?.items ?? []}
          rowKey={(s) => s.id}
          loading={history.loading}
          emptyTitle="هنوز اشتراکی ثبت نشده"
          emptyHint="با دکمه‌ی «تمدید اشتراک» اولین اشتراک را ثبت کنید."
        />
      </div>

      {/* دیالوگ‌ها */}
      <RenewDialog
        open={renewOpen}
        onClose={() => setRenewOpen(false)}
        memberId={m.id}
        memberName={m.name}
        currentEndsOn={m.currentEndsOn}
        canSetPrice={isOwner}
        onDone={() => {
          setRenewOpen(false);
          refreshAll();
        }}
      />
      <PayDebtDialog
        open={payOpen}
        onClose={() => setPayOpen(false)}
        memberId={m.id}
        memberName={m.name}
        balance={m.balance}
        onDone={() => {
          setPayOpen(false);
          refreshAll();
        }}
      />
      <RefundDialog
        open={refundOpen}
        onClose={() => setRefundOpen(false)}
        memberId={m.id}
        memberName={m.name}
        onDone={() => {
          setRefundOpen(false);
          refreshAll();
        }}
      />

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} title={`ویرایش — ${m.name}`}>
        {form ? <MemberFields values={form} onChange={setForm} errors={editErrors} /> : null}
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="primary" onClick={saveEdit} loading={busy} disabled={!patchInput}>
            ذخیره
          </Button>
          <Button variant="ghost" onClick={() => setEditOpen(false)}>
            انصراف
          </Button>
        </div>
      </Dialog>

      <Dialog open={archiveOpen} onClose={() => setArchiveOpen(false)} title={m.archivedAt ? 'بازگردانی عضو' : 'بایگانی عضو'}>
        <p style={{ color: 'var(--mut)', fontSize: 14 }}>
          {m.archivedAt
            ? `${m.name} به فهرست عادی برمی‌گردد.`
            : `با بایگانی، نشست وب عضو باطل می‌شود و از فهرست عادی پنهان می‌شود. این کار در لاگ ممیزی ثبت می‌شود.`}
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant={m.archivedAt ? 'primary' : 'danger'} onClick={toggleArchive} loading={busy}>
            تأیید
          </Button>
          <Button variant="ghost" onClick={() => setArchiveOpen(false)}>
            انصراف
          </Button>
        </div>
      </Dialog>

      <Dialog open={freezeSub !== null} onClose={() => setFreezeSub(null)} title="توقف موقت اشتراک">
        <div style={{ display: 'grid', gap: 4 }}>
          <p style={{ fontSize: 13, color: 'var(--mut)', margin: 0 }}>
            پایان اشتراک به اندازه‌ی روزها کش داده می‌شود. هر بار ۱ تا ۳۰ روز؛ مجموع ۳۰ روز.
            {freezeSub ? ` پایان فعلی: ${toJalaliString(freezeSub.endsOn)}` : ''}
          </p>
          <Field label="تعداد روز" htmlFor="fz-days">
            <Input id="fz-days" dir="ltr" inputMode="numeric" value={freezeDays} onChange={(e) => setFreezeDays(e.target.value.replace(/\D/g, '').slice(0, 2))} />
          </Field>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <Button variant="primary" onClick={doFreeze} loading={busy} disabled={Number(freezeDays) < 1 || Number(freezeDays) > 30}>
              اعمال توقف
            </Button>
            <Button variant="ghost" onClick={() => setFreezeSub(null)}>
              انصراف
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog open={cancelSub !== null} onClose={() => setCancelSub(null)} title="لغو اشتراک">
        <p style={{ color: 'var(--mut)', fontSize: 14 }}>
          {cancelSub ? `پایان آینده (${toJalaliString(cancelSub.endsOn)}) به امروز کوتاه می‌شود. بدهی باقی می‌ماند و این کار در لاگ ممیزی ثبت می‌شود.` : ''}
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="danger" onClick={doCancel} loading={busy}>
            لغو اشتراک
          </Button>
          <Button variant="ghost" onClick={() => setCancelSub(null)}>
            انصراف
          </Button>
        </div>
      </Dialog>

      <p style={{ fontSize: 12, color: 'var(--mut)', margin: 0 }}>
        عضو از {toJalaliString(m.createdAt.slice(0, 10))} در باشگاه است.
      </p>
    </div>
  );
}
