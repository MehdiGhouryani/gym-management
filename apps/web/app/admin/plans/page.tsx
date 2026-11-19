'use client';

import { useState } from 'react';
import { Badge, Button, DataTable, Dialog, EmptyState, Field, Input, Select, Skeleton, useToast, type Column } from '../../../src/ui/index';
import { api } from '../../../src/lib/api';
import { useApi } from '../../../src/lib/use-api';
import { useSession } from '../../../src/lib/session';
import { faDate, faNum, faToman } from '../../../src/lib/format';
import type { Plan, PlanPriceHistory } from '../../../src/lib/types';

interface PlanForm {
  name: string;
  kind: 'days' | 'sessions';
  days: string;
  sessionsCount: string;
  price: string;
}

export default function PlansPage() {
  const session = useSession();
  const toast = useToast();
  const isOwner = session.user?.role === 'OWNER';
  const plans = useApi<Plan[]>(isOwner ? '/plans?includeInactive=true' : '/plans');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Plan | 'new' | null>(null);
  const [form, setForm] = useState<PlanForm>({ name: '', kind: 'days', days: '', sessionsCount: '', price: '' });
  const [error, setError] = useState<string | null>(null);
  const [historyPlanId, setHistoryPlanId] = useState<string | null>(null);

  const toggleActive = async (p: Plan) => {
    setBusy(true);
    try {
      await api.patch<Plan>(`/plans/${p.id}`, { active: !p.active });
      plans.retry();
    } finally {
      setBusy(false);
    }
  };

  const history = useApi<PlanPriceHistory>(historyPlanId ? `/plans/${historyPlanId}/history` : null);

  const columns: Column<Plan>[] = [
    {
      key: 'name',
      label: 'پلن',
      render: (p) => (
        <div style={{ display: 'grid' }}>
          <strong>{p.name}</strong>
          {p.kind === 'sessions' ? (
            <span style={{ fontSize: 12, color: 'var(--mut)' }}>جلسه‌ای — {faNum(p.sessionsCount ?? 0)} جلسه</span>
          ) : null}
        </div>
      ),
    },
    { key: 'days', label: 'مدت', numeric: true, render: (p) => `${faNum(p.days)} روز` },
    { key: 'price', label: 'قیمت', numeric: true, render: (p) => faToman(p.price) },
    { key: 'monthly', label: 'معادل ماهانه', numeric: true, render: (p) => faToman(p.monthlyPrice) },
    { key: 'active', label: 'وضعیت', render: (p) => (p.active ? <Badge kind="ok">فعال</Badge> : <Badge kind="neutral">غیرفعال</Badge>) },
    ...(isOwner
      ? [
          {
            key: 'actions',
            label: 'عملیات',
            render: (p: Plan) => (
              <span style={{ display: 'inline-flex', gap: 6 }}>
                <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
                  ویرایش
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setHistoryPlanId(p.id)}>
                  تاریخچه
                </Button>
                <Button variant={p.active ? 'ghost' : 'tint'} size="sm" disabled={busy} onClick={() => void toggleActive(p)}>
                  {p.active ? 'غیرفعال' : 'فعال'}
                </Button>
              </span>
            ),
          },
        ]
      : []),
  ];

  const openNew = () => {
    setForm({ name: '', kind: 'days', days: '', sessionsCount: '', price: '' });
    setError(null);
    setEditing('new');
  };
  const openEdit = (p: Plan) => {
    setForm({ name: p.name, kind: p.kind, days: String(p.days), sessionsCount: p.sessionsCount ? String(p.sessionsCount) : '', price: String(p.price) });
    setError(null);
    setEditing(p);
  };

  const save = async () => {
    if (busy || editing === null) return;
    setError(null);
    setBusy(true);
    const body = {
      name: form.name.trim(),
      kind: form.kind,
      days: Number(form.days),
      price: Number(form.price),
      ...(form.kind === 'sessions' && form.sessionsCount ? { sessionsCount: Number(form.sessionsCount) } : {}),
    };
    try {
      if (editing === 'new') {
        await api.post<Plan>('/plans', body);
        toast.push('ok', 'پلن ساخته شد');
      } else {
        await api.patch<Plan>(`/plans/${editing.id}`, body);
        toast.push('ok', 'پلن ویرایش شد');
      }
      setEditing(null);
      plans.retry();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ذخیره ناموفق بود');
    } finally {
      setBusy(false);
    }
  };

  if (plans.loading) return <Skeleton height={240} radius={13} />;

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div className="adm-page-head">
        <h1>پلن‌های اشتراک</h1>
        {isOwner ? (
          <Button variant="primary" size="sm" onClick={openNew}>
            + پلن جدید
          </Button>
        ) : null}
      </div>

      <DataTable
        columns={columns}
        rows={plans.data ?? []}
        rowKey={(p) => p.id}
        emptyTitle="پلنی تعریف نشده"
        emptyHint="پلن‌ها را بسازید تا تمدید اشتراک ممکن شود."
        emptyActionLabel={isOwner ? '+ پلن جدید' : undefined}
        onEmptyAction={isOwner ? openNew : undefined}
      />

      {plans.error ? <EmptyState title="بارگذاری ناموفق" hint={plans.error.message} actionLabel="تلاش دوباره" onAction={plans.retry} /> : null}

      {isOwner ? (
        <p style={{ fontSize: 12, color: 'var(--mut)', margin: 0 }}>
          پلن حذف نمی‌شود؛ غیرفعال کنید. تغییر قیمت یا مدت فقط روی اشتراک‌های بعدی اثر دارد.
        </p>
      ) : null}

      <Dialog open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'پلن جدید' : 'ویرایش پلن'}>
        <div style={{ display: 'grid', gap: 4 }}>
          {error ? <p style={{ color: 'var(--bd)', fontSize: 13, margin: 0 }}>{error}</p> : null}
          <Field label="نام پلن" htmlFor="pl-name">
            <Input id="pl-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="نوع پلن" htmlFor="pl-kind" hint={form.kind === 'sessions' ? 'پایان اعتبار با روزها و مصرف با جلسه‌ها کنترل می‌شود' : undefined}>
            <Select id="pl-kind" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value === 'sessions' ? 'sessions' : 'days' })}>
              <option value="days">روزهای اعتبار</option>
              <option value="sessions">جلسه‌ای</option>
            </Select>
          </Field>
          <Field label="مدت اعتبار (روز)" htmlFor="pl-days">
            <Input id="pl-days" dir="ltr" inputMode="numeric" value={form.days} onChange={(e) => setForm({ ...form, days: e.target.value.replace(/\D/g, '') })} />
          </Field>
          {form.kind === 'sessions' ? (
            <Field label="تعداد جلسه‌ها" htmlFor="pl-sessions">
              <Input id="pl-sessions" dir="ltr" inputMode="numeric" value={form.sessionsCount} onChange={(e) => setForm({ ...form, sessionsCount: e.target.value.replace(/\D/g, '') })} />
            </Field>
          ) : null}
          <Field label="قیمت (تومان؛ صفر = آزمایشی)" htmlFor="pl-price">
            <Input id="pl-price" dir="ltr" inputMode="numeric" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value.replace(/\D/g, '') })} />
          </Field>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <Button
              variant="primary"
              onClick={save}
              loading={busy}
              disabled={form.name.trim().length < 2 || Number(form.days) < 1 || form.price === '' || (form.kind === 'sessions' && Number(form.sessionsCount) < 1)}
            >
              ذخیره
            </Button>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              انصراف
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog open={historyPlanId !== null} onClose={() => setHistoryPlanId(null)} title="تاریخچه قیمت پلن">
        {history.loading ? (
          <Skeleton height={80} />
        ) : (history.data?.items.length ?? 0) === 0 ? (
          <p style={{ color: 'var(--mut)', fontSize: 13 }}>هنوز تغییری در قیمت یا مدت ثبت نشده است.</p>
        ) : (
          <div style={{ display: 'grid', gap: 6, fontSize: 13 }}>
            {history.data?.items.map((h) => (
              <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--line)', paddingBottom: 6 }}>
                <span>{faToman(h.price)}</span>
                <span style={{ color: 'var(--mut)' }}>{faNum(h.days)} روز — {faDate(h.at)}</span>
              </div>
            ))}
          </div>
        )}
      </Dialog>
    </div>
  );
}

