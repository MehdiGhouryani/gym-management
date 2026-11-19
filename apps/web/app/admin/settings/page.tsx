'use client';

import { useEffect, useState } from 'react';
import { Badge, Button, DataTable, Dialog, EmptyState, Field, Input, Skeleton, StatCard, useToast, type Column } from '../../../src/ui/index';
import { api } from '../../../src/lib/api';
import { useApi } from '../../../src/lib/use-api';
import { useSession } from '../../../src/lib/session';
import { faDate, faNum } from '../../../src/lib/format';

interface GymInfo {
  id: string;
  slug: string;
  name: string;
  city: string;
  address: string | null;
  phone: string | null;
  status: string;
  expiringDays: number;
  graceDays: number;
}

interface GymUser {
  id: string;
  name: string;
  phone: string;
  role: 'OWNER' | 'STAFF';
  createdAt: string;
}

interface GymForm {
  name: string;
  city: string;
  address: string;
  phone: string;
  expiringDays: string;
  graceDays: string;
}

const userColumns: Column<GymUser>[] = [
  { key: 'name', label: 'نام', render: (u) => <strong>{u.name}</strong> },
  { key: 'phone', label: 'موبایل', render: (u) => <span dir="ltr">{u.phone}</span> },
  { key: 'role', label: 'نقش', render: (u) => (u.role === 'OWNER' ? <Badge kind="tint">مدیر</Badge> : <Badge kind="neutral">پذیرش</Badge>) },
  { key: 'createdAt', label: 'عضویت', render: (u) => faDate(u.createdAt) },
];

export default function SettingsPage() {
  const session = useSession();
  const toast = useToast();
  const isOwner = session.user?.role === 'OWNER';
  const gym = useApi<GymInfo>('/gym');
  const users = useApi<{ items: GymUser[] }>(isOwner ? '/gym/users' : null);

  const [form, setForm] = useState<GymForm | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState({ name: '', phone: '' });
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<GymUser | null>(null);

  useEffect(() => {
    if (gym.data && !form) {
      setForm({
        name: gym.data.name,
        city: gym.data.city,
        address: gym.data.address ?? '',
        phone: gym.data.phone ?? '',
        expiringDays: String(gym.data.expiringDays),
        graceDays: String(gym.data.graceDays),
      });
    }
  }, [gym.data, form]);

  const saveGym = async () => {
    if (!form || busy) return;
    setError(null);
    setBusy(true);
    try {
      await api.patch<GymInfo>('/gym', {
        name: form.name.trim(),
        city: form.city.trim(),
        address: form.address.trim() ? form.address.trim() : null,
        phone: form.phone.trim() ? form.phone.trim() : null,
        expiringDays: Number(form.expiringDays),
        graceDays: Number(form.graceDays),
      });
      toast.push('ok', 'تنظیمات ذخیره شد');
      gym.retry();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ذخیره ناموفق بود');
    } finally {
      setBusy(false);
    }
  };

  const inviteStaff = async () => {
    if (busy) return;
    setInviteError(null);
    setBusy(true);
    try {
      await api.post('/gym/users', { name: invite.name.trim(), phone: invite.phone });
      toast.push('ok', 'پذیرش اضافه شد؛ ورود با کد پیامکی همان شماره');
      setInviteOpen(false);
      setInvite({ name: '', phone: '' });
      users.retry();
    } catch (e) {
      setInviteError(e instanceof Error ? e.message : 'افزودن ناموفق بود');
    } finally {
      setBusy(false);
    }
  };

  const removeStaff = async () => {
    if (!removing || busy) return;
    setBusy(true);
    try {
      await api.delete(`/gym/users/${removing.id}`);
      toast.push('ok', `${removing.name} حذف شد`);
      setRemoving(null);
      users.retry();
    } finally {
      setBusy(false);
    }
  };

  if (gym.loading) return <Skeleton height={300} radius={13} />;
  if (gym.error || !gym.data) {
    return <EmptyState title="بارگذاری ناموفق" hint={gym.error?.message} actionLabel="تلاش دوباره" onAction={gym.retry} />;
  }

  return (
    <div style={{ display: 'grid', gap: 16, maxWidth: 720 }}>
      <div className="adm-page-head">
        <h1>تنظیمات باشگاه</h1>
        <Badge kind={gym.data.status === 'ACTIVE' ? 'ok' : 'wn'}>
          {gym.data.status === 'ACTIVE' ? 'فعال' : gym.data.status === 'PENDING' ? 'در انتظار تأیید' : 'تعلیق'}
        </Badge>
      </div>

      <div className="u-table-wrap" style={{ padding: 18 }}>
        <h2 style={{ fontSize: 14, margin: '0 0 14px' }}>مشخصات و آستانه‌ها</h2>
        {form ? (
          <>
            {error ? <p style={{ color: 'var(--bd)', fontSize: 13 }}>{error}</p> : null}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 6 }}>
              <Field label="نام باشگاه" htmlFor="g-name">
                <Input id="g-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} disabled={!isOwner} />
              </Field>
              <Field label="شهر" htmlFor="g-city">
                <Input id="g-city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} disabled={!isOwner} />
              </Field>
              <Field label="تلفن" htmlFor="g-phone">
                <Input id="g-phone" dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} disabled={!isOwner} />
              </Field>
              <Field label="آستانه «نزدیک انقضا» (روز، ۱–۳۰)" htmlFor="g-exp">
                <Input id="g-exp" dir="ltr" inputMode="numeric" value={form.expiringDays} onChange={(e) => setForm({ ...form, expiringDays: e.target.value.replace(/\D/g, '') })} disabled={!isOwner} />
              </Field>
              <Field label="مهلت پیگیری پس از انقضا (روز، ۱–۶۰)" htmlFor="g-grace">
                <Input id="g-grace" dir="ltr" inputMode="numeric" value={form.graceDays} onChange={(e) => setForm({ ...form, graceDays: e.target.value.replace(/\D/g, '') })} disabled={!isOwner} />
              </Field>
              <Field label="نشانی" htmlFor="g-addr">
                <Input id="g-addr" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} disabled={!isOwner} />
              </Field>
            </div>
            {isOwner ? (
              <Button
                variant="primary"
                onClick={saveGym}
                loading={busy}
                disabled={form.name.trim().length < 2 || form.city.trim().length < 2 || Number(form.expiringDays) < 1 || Number(form.graceDays) < 1}
              >
                ذخیره تنظیمات
              </Button>
            ) : (
              <p style={{ fontSize: 12, color: 'var(--mut)', margin: 0 }}>ویرایش فقط برای مدیر باشگاه.</p>
            )}
          </>
        ) : null}
      </div>

      <div className="adm-grid">
        <StatCard label="نشانی باشگاه در وب اعضا" value={`/${gym.data.slug}`} hint="در فاز ۲۰ سایت عمومی فعال می‌شود" />
        <StatCard label="کارکنان" value={faNum(users.data?.items.length ?? 0)} hint="مدیر و پذیرش" />
      </div>

      {isOwner ? (
        <div>
          <div className="adm-page-head">
            <h2 style={{ fontSize: 14, margin: 0 }}>کارکنان</h2>
            <Button variant="tint" size="sm" onClick={() => { setInviteError(null); setInviteOpen(true); }}>
              + افزودن پذیرش
            </Button>
          </div>
          <DataTable
            columns={userColumns.map((c) =>
              c.key === 'role'
                ? {
                    ...c,
                    render: (u: GymUser) => (
                      <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                        {c.render(u)}
                        {u.role === 'STAFF' ? (
                          <Button variant="danger" size="sm" onClick={() => setRemoving(u)}>
                            حذف
                          </Button>
                        ) : null}
                      </span>
                    ),
                  }
                : c,
            )}
            rows={users.data?.items ?? []}
            rowKey={(u) => u.id}
            emptyTitle="کاربری ثبت نشده"
          />
        </div>
      ) : null}

      <Dialog open={inviteOpen} onClose={() => setInviteOpen(false)} title="افزودن پذیرش">
        <div style={{ display: 'grid', gap: 4 }}>
          {inviteError ? <p style={{ color: 'var(--bd)', fontSize: 13, margin: 0 }}>{inviteError}</p> : null}
          <Field label="نام" htmlFor="i-name">
            <Input id="i-name" value={invite.name} onChange={(e) => setInvite({ ...invite, name: e.target.value })} />
          </Field>
          <Field label="شماره موبایل" htmlFor="i-phone" hint="با کد پیامکی وارد می‌شود؛ هیچ رمزی لازم نیست">
            <Input id="i-phone" dir="ltr" inputMode="tel" placeholder="09xxxxxxxxx" value={invite.phone} onChange={(e) => setInvite({ ...invite, phone: e.target.value })} />
          </Field>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <Button variant="primary" onClick={inviteStaff} loading={busy} disabled={invite.name.trim().length < 2 || !/^09\d{9}$/.test(invite.phone.replace(/\D/g, ''))}>
              افزودن
            </Button>
            <Button variant="ghost" onClick={() => setInviteOpen(false)}>
              انصراف
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog open={removing !== null} onClose={() => setRemoving(null)} title="حذف پذیرش">
        <p style={{ color: 'var(--mut)', fontSize: 14 }}>
          نشست‌های {removing?.name} باطل و دسترسی او حذف می‌شود. این کار در لاگ ممیزی ثبت می‌شود.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="danger" onClick={removeStaff} loading={busy}>
            حذف
          </Button>
          <Button variant="ghost" onClick={() => setRemoving(null)}>
            انصراف
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
