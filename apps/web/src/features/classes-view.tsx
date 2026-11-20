'use client';

import { useEffect, useState } from 'react';
import { Badge, Button, DataTable, Dialog, EmptyState, Field, Input, Select, Skeleton, useToast, type Column } from '../ui/index';
import { api } from '../lib/api';
import { useApi } from '../lib/use-api';
import { useSession } from '../lib/session';
import { faNum } from '../lib/format';
import type { Booking, ClassSessionRow, GymClass } from '../lib/types';

interface Coach {
  id: string;
  name: string;
  specialty: string | null;
  phone: string | null;
  active: boolean;
}

const faDateTime = (iso: string) =>
  `${new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short' }).format(new Date(iso))} · ${new Intl.DateTimeFormat('fa-IR', { timeStyle: 'short' }).format(new Date(iso))}`;

const SESSION_ISO = (localValue: string): string => {
  // ورودی datetime-local بدون تایم‌زون → تهران
  return `${localValue}:00+03:30`;
};

const statusBadgeKind: Record<Booking['status'], 'ok' | 'debt' | 'neutral' | 'wn'> = {
  BOOKED: 'ok',
  ATTENDED: 'debt',
  WAITLIST: 'wn',
  CANCELLED: 'neutral',
};

const STATUS_FA: Record<Booking['status'], string> = {
  BOOKED: 'رزرو',
  ATTENDED: 'حاضر',
  WAITLIST: 'انتظار',
  CANCELLED: 'لغو',
};

export function ClassesView() {
  const session = useSession();
  const toast = useToast();
  const isOwner = session.user?.role === 'OWNER';

  const classes = useApi<GymClass[]>('/classes');
  const coaches = useApi<Coach[]>('/coaches');
  const [openClassId, setOpenClassId] = useState<string | null>(null);
  const sessions = useApi<{ items: ClassSessionRow[] }>(openClassId ? `/classes/${openClassId}/sessions` : null);
  const [openSessionId, setOpenSessionId] = useState<string | null>(null);
  const bookings = useApi<{ session: { className: string; capacity: number; startsAt: string }; items: Booking[] }>(
    openSessionId ? `/classes/${openSessionId}/bookings` : null,
  );
  const [busy, setBusy] = useState(false);

  // فرم‌ها
  const [classDialog, setClassDialog] = useState<'new' | GymClass | null>(null);
  const [classForm, setClassForm] = useState({ name: '', coachId: '', capacity: '12', durationMin: '60' });
  const [coachDialog, setCoachDialog] = useState(false);
  const [coachForm, setCoachForm] = useState({ name: '', specialty: '', phone: '' });
  const [sessionDialog, setSessionDialog] = useState(false);
  const [sessionAt, setSessionAt] = useState('');
  const [bookPhone, setBookPhone] = useState('');
  const [bookCandidate, setBookCandidate] = useState<{ id: string; name: string; phone: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // جستجوی عضو برای رزرو بر اساس شماره
  useEffect(() => {
    const phone = bookPhone.replace(/\D/g, '');
    if (phone.length < 4) {
      setBookCandidate(null);
      return;
    }
    const t = setTimeout(() => {
      api
        .get<{ items: { id: string; name: string; phone: string }[] }>(`/members?q=${encodeURIComponent(phone)}&limit=5`)
        .then((r) => setBookCandidate(r.items[0] ?? null))
        .catch(() => setBookCandidate(null));
    }, 400);
    return () => clearTimeout(t);
  }, [bookPhone]);

  const saveClass = async () => {
    if (busy || classDialog === null) return;
    setError(null);
    setBusy(true);
    const body = {
      name: classForm.name.trim(),
      capacity: Number(classForm.capacity),
      durationMin: Number(classForm.durationMin),
      ...(classForm.coachId ? { coachId: classForm.coachId } : {}),
    };
    try {
      if (classDialog === 'new') await api.post('/classes', body);
      else await api.patch(`/classes/${classDialog.id}`, body);
      toast.push('ok', 'ذخیره شد');
      setClassDialog(null);
      classes.retry();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ذخیره ناموفق بود');
    } finally {
      setBusy(false);
    }
  };

  const saveCoach = async () => {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      await api.post('/coaches', {
        name: coachForm.name.trim(),
        ...(coachForm.specialty.trim() ? { specialty: coachForm.specialty.trim() } : {}),
        ...(coachForm.phone.trim() ? { phone: coachForm.phone.trim() } : {}),
      });
      toast.push('ok', 'مربی اضافه شد');
      setCoachDialog(false);
      setCoachForm({ name: '', specialty: '', phone: '' });
      coaches.retry();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ذخیره ناموفق بود');
    } finally {
      setBusy(false);
    }
  };

  const addSession = async () => {
    if (busy || !openClassId || !sessionAt) return;
    setBusy(true);
    try {
      await api.post(`/classes/${openClassId}/sessions`, { startsAt: SESSION_ISO(sessionAt) });
      toast.push('ok', 'جلسه ساخته شد');
      setSessionDialog(false);
      setSessionAt('');
      sessions.retry();
    } catch (e) {
      toast.push('bad', e instanceof Error ? e.message : 'خطا');
    } finally {
      setBusy(false);
    }
  };

  const book = async () => {
    if (busy || !openSessionId || !bookCandidate) return;
    setBusy(true);
    try {
      const r = await api.post<{ status: string }>(`/classes/${openSessionId}/bookings`, { memberId: bookCandidate.id });
      toast.push(r.status === 'WAITLIST' ? 'wn' : 'ok', r.status === 'WAITLIST' ? 'در فهرست انتظار قرار گرفت' : 'رزرو شد');
      setBookPhone('');
      setBookCandidate(null);
      bookings.retry();
      sessions.retry();
    } catch (e) {
      toast.push('bad', e instanceof Error ? e.message : 'رزرو ناموفق بود');
    } finally {
      setBusy(false);
    }
  };

  const setBookingStatus = async (bookingId: string, status: 'CANCELLED' | 'ATTENDED') => {
    setBusy(true);
    try {
      await api.patch(`/bookings/${bookingId}`, { status });
      bookings.retry();
      sessions.retry();
    } finally {
      setBusy(false);
    }
  };

  if (classes.loading) return <Skeleton height={260} radius={13} />;

  const bookingColumns: Column<Booking>[] = [
    { key: 'member', label: 'عضو', render: (b) => <strong>{b.memberName}</strong> },
    { key: 'phone', label: 'موبایل', render: (b) => <span dir="ltr">{b.memberPhone}</span> },
    { key: 'status', label: 'وضعیت', render: (b) => <Badge kind={statusBadgeKind[b.status]}>{STATUS_FA[b.status]}</Badge> },
    { key: 'createdAt', label: 'زمان رزرو', render: (b) => faDateTime(b.createdAt) },
    {
      key: 'actions',
      label: 'عملیات',
      render: (b) =>
        b.status === 'BOOKED' ? (
          <span style={{ display: 'inline-flex', gap: 6 }}>
            <Button variant="tint" size="sm" disabled={busy} onClick={() => void setBookingStatus(b.id, 'ATTENDED')}>
              حاضر شد
            </Button>
            <Button variant="danger" size="sm" disabled={busy} onClick={() => void setBookingStatus(b.id, 'CANCELLED')}>
              لغو
            </Button>
          </span>
        ) : b.status === 'WAITLIST' ? (
          <Button variant="danger" size="sm" disabled={busy} onClick={() => void setBookingStatus(b.id, 'CANCELLED')}>
            حذف از انتظار
          </Button>
        ) : null,
    },
  ];

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div className="adm-page-head">
        <h1>کلاس‌ها و رزرو</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {isOwner ? (
            <Button variant="ghost" size="sm" onClick={() => setCoachDialog(true)}>
              + مربی
            </Button>
          ) : null}
          {isOwner ? (
            <Button variant="primary" size="sm" onClick={() => { setClassForm({ name: '', coachId: '', capacity: '12', durationMin: '60' }); setError(null); setClassDialog('new'); }}>
              + کلاس جدید
            </Button>
          ) : null}
        </div>
      </div>

      {(classes.data?.length ?? 0) === 0 ? (
        <EmptyState title="کلاسی تعریف نشده" hint={isOwner ? 'اول مربی و بعد کلاس را بسازید.' : 'هنوز کلاسی ثبت نشده است.'} />
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {classes.data?.map((c) => (
            <div key={c.id} className="u-table-wrap" style={{ padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <div>
                  <strong style={{ fontSize: 15 }}>{c.name}</strong>
                  <span style={{ fontSize: 13, color: 'var(--mut)', marginInlineStart: 10 }}>
                    {c.coachName ? `مربی: ${c.coachName}` : 'بدون مربی'} · ظرفیت {faNum(c.capacity)} · {faNum(c.durationMin)} دقیقه
                  </span>
                  {!c.active ? <Badge kind="neutral">غیرفعال</Badge> : null}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Button variant="tint" size="sm" onClick={() => { setOpenClassId(c.id === openClassId ? null : c.id); setOpenSessionId(null); }}>
                    جلسه‌ها
                  </Button>
                  {isOwner ? (
                    <Button variant="ghost" size="sm" onClick={() => { setClassForm({ name: c.name, coachId: c.coachId ?? '', capacity: String(c.capacity), durationMin: String(c.durationMin) }); setError(null); setClassDialog(c); }}>
                      ویرایش
                    </Button>
                  ) : null}
                </div>
              </div>

              {openClassId === c.id ? (
                <div style={{ marginTop: 14, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <h3 style={{ fontSize: 13, margin: 0 }}>جلسه‌ها</h3>
                    {isOwner ? (
                      <Button variant="ghost" size="sm" onClick={() => setSessionDialog(true)}>
                        + جلسه
                      </Button>
                    ) : null}
                  </div>
                  {sessions.loading ? (
                    <Skeleton height={60} />
                  ) : (sessions.data?.items.length ?? 0) === 0 ? (
                    <p style={{ fontSize: 13, color: 'var(--mut)' }}>جلسه‌ای تعریف نشده است.</p>
                  ) : (
                    <div style={{ display: 'grid', gap: 6 }}>
                      {sessions.data?.items.map((s) => {
                        const full = s.booked >= s.capacity;
                        return (
                          <div
                            key={s.id}
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--bg)', borderRadius: 10, cursor: 'pointer' }}
                            onClick={() => { setOpenSessionId(s.id === openSessionId ? null : s.id); }}
                          >
                            <span style={{ fontSize: 13 }}>{faDateTime(s.startsAt)}</span>
                            <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              <Badge kind={full ? 'wn' : 'ok'}>{faNum(s.booked)}/{faNum(s.capacity)}</Badge>
                              {s.waitlist > 0 ? <Badge kind="wn">{faNum(s.waitlist)} انتظار</Badge> : null}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {openSessionId && bookings.data ? (
                    <div style={{ marginTop: 12 }}>
                      <p style={{ fontSize: 13, margin: '0 0 8px' }}>
                        رزروهای جلسه {faDateTime(bookings.data.session.startsAt)} — {bookings.data.session.className}
                      </p>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
                        <Input
                          placeholder="شماره موبایل عضو…"
                          dir="ltr"
                          style={{ maxWidth: 220, minHeight: 36 }}
                          value={bookPhone}
                          onChange={(e) => setBookPhone(e.target.value)}
                        />
                        {bookCandidate ? (
                          <span style={{ fontSize: 13 }}>
                            یافت شد: <strong>{bookCandidate.name}</strong>
                            <Button variant="primary" size="sm" style={{ marginInlineStart: 8 }} disabled={busy} onClick={() => void book()}>
                              رزرو
                            </Button>
                          </span>
                        ) : bookPhone.length >= 4 ? (
                          <span style={{ fontSize: 12, color: 'var(--mut)' }}>عضوی یافت نشد</span>
                        ) : null}
                      </div>
                      <DataTable columns={bookingColumns} rows={bookings.data.items} rowKey={(b) => b.id} emptyTitle="رزروی نیست" emptyHint="با جستجوی شماره، عضو را رزرو کنید." />
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {/* دیالوگ کلاس */}
      <Dialog open={classDialog !== null} onClose={() => setClassDialog(null)} title={classDialog === 'new' ? 'کلاس جدید' : 'ویرایش کلاس'}>
        <div style={{ display: 'grid', gap: 4 }}>
          {error ? <p style={{ color: 'var(--bd)', fontSize: 13, margin: 0 }}>{error}</p> : null}
          <Field label="نام کلاس" htmlFor="c-name">
            <Input id="c-name" value={classForm.name} onChange={(e) => setClassForm({ ...classForm, name: e.target.value })} />
          </Field>
          <Field label="مربی" htmlFor="c-coach">
            <Select id="c-coach" value={classForm.coachId} onChange={(e) => setClassForm({ ...classForm, coachId: e.target.value })}>
              <option value="">بدون مربی</option>
              {coaches.data?.filter((c) => c.active).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="ظرفیت" htmlFor="c-cap">
            <Input id="c-cap" dir="ltr" inputMode="numeric" value={classForm.capacity} onChange={(e) => setClassForm({ ...classForm, capacity: e.target.value.replace(/\D/g, '') })} />
          </Field>
          <Field label="مدت (دقیقه)" htmlFor="c-dur">
            <Input id="c-dur" dir="ltr" inputMode="numeric" value={classForm.durationMin} onChange={(e) => setClassForm({ ...classForm, durationMin: e.target.value.replace(/\D/g, '') })} />
          </Field>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <Button variant="primary" onClick={saveClass} loading={busy} disabled={classForm.name.trim().length < 2 || Number(classForm.capacity) < 1}>
              ذخیره
            </Button>
            <Button variant="ghost" onClick={() => setClassDialog(null)}>
              انصراف
            </Button>
          </div>
        </div>
      </Dialog>

      {/* دیالوگ مربی */}
      <Dialog open={coachDialog} onClose={() => setCoachDialog(false)} title="مربی جدید">
        <div style={{ display: 'grid', gap: 4 }}>
          {error ? <p style={{ color: 'var(--bd)', fontSize: 13, margin: 0 }}>{error}</p> : null}
          <Field label="نام" htmlFor="co-name">
            <Input id="co-name" value={coachForm.name} onChange={(e) => setCoachForm({ ...coachForm, name: e.target.value })} />
          </Field>
          <Field label="تخصص (اختیاری)" htmlFor="co-spec">
            <Input id="co-spec" value={coachForm.specialty} onChange={(e) => setCoachForm({ ...coachForm, specialty: e.target.value })} />
          </Field>
          <Field label="موبایل (اختیاری)" htmlFor="co-phone">
            <Input id="co-phone" dir="ltr" inputMode="tel" value={coachForm.phone} onChange={(e) => setCoachForm({ ...coachForm, phone: e.target.value })} />
          </Field>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <Button variant="primary" onClick={saveCoach} loading={busy} disabled={coachForm.name.trim().length < 2}>
              ذخیره
            </Button>
            <Button variant="ghost" onClick={() => setCoachDialog(false)}>
              انصراف
            </Button>
          </div>
        </div>
      </Dialog>

      {/* دیالوگ جلسه */}
      <Dialog open={sessionDialog} onClose={() => setSessionDialog(false)} title="جلسه جدید">
        <div style={{ display: 'grid', gap: 4 }}>
          <Field label="تاریخ و ساعت شروع" htmlFor="s-at" hint="به وقت تهران">
            <Input id="s-at" type="datetime-local" value={sessionAt} onChange={(e) => setSessionAt(e.target.value)} />
          </Field>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <Button variant="primary" onClick={addSession} loading={busy} disabled={!sessionAt}>
              ساخت جلسه
            </Button>
            <Button variant="ghost" onClick={() => setSessionDialog(false)}>
              انصراف
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
