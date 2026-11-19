'use client';

import { useEffect, useState } from 'react';
import { Badge, Button, DataTable, Dialog, EmptyState, Field, Input, Select, useToast, type Column } from '../ui/index';
import { api } from '../lib/api';
import { useApi } from '../lib/use-api';
import { faDate, faNum } from '../lib/format';
import type { Lead, LeadStatus, LeadsPageData } from '../lib/types';

const STATUS_LABEL: Record<LeadStatus, { label: string; kind: 'wn' | 'tint' | 'debt' | 'ok' | 'neutral' }> = {
  NEW: { label: 'جدید', kind: 'wn' },
  CONTACTED: { label: 'تماس گرفته‌شده', kind: 'tint' },
  TRIAL: { label: 'آزمایش', kind: 'debt' },
  CONVERTED: { label: 'تبدیل‌شده', kind: 'ok' },
  LOST: { label: 'از دست رفته', kind: 'neutral' },
};

const NEXT_STATUS: Record<LeadStatus, LeadStatus[]> = {
  NEW: ['CONTACTED', 'TRIAL', 'LOST'],
  CONTACTED: ['TRIAL', 'LOST'],
  TRIAL: ['CONVERTED', 'LOST'],
  CONVERTED: [],
  LOST: ['CONTACTED'],
};

export function LeadsList() {
  const toast = useToast();
  const [status, setStatus] = useState<LeadStatus | ''>('');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', source: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const query = new URLSearchParams();
  if (status) query.set('status', status);
  if (search.trim()) query.set('q', search.trim());
  query.set('page', String(page));
  const leads = useApi<LeadsPageData>(`/leads?${query.toString()}`);

  // جستجوی تاخیری
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(q);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [q]);

  const add = async () => {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      await api.post('/leads', { name: form.name.trim(), phone: form.phone, ...(form.source.trim() ? { source: form.source.trim() } : {}) });
      toast.push('ok', 'سرنخ ثبت شد');
      setAddOpen(false);
      setForm({ name: '', phone: '', source: '' });
      leads.retry();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ثبت ناموفق بود');
    } finally {
      setBusy(false);
    }
  };

  const changeStatus = async (l: Lead, next: LeadStatus) => {
    setBusy(true);
    try {
      await api.patch(`/leads/${l.id}`, { status: next });
      leads.retry();
    } catch (e) {
      toast.push('bad', e instanceof Error ? e.message : 'تغییر وضعیت ناموفق بود');
    } finally {
      setBusy(false);
    }
  };

  const convert = async (l: Lead) => {
    setBusy(true);
    try {
      const r = await api.post<{ memberId: string }>(`/leads/${l.id}/convert`);
      toast.push('ok', 'به عضو تبدیل شد');
      leads.retry();
      window.location.hash = r.memberId;
    } catch (e) {
      toast.push('bad', e instanceof Error ? e.message : 'تبدیل ناموفق بود');
    } finally {
      setBusy(false);
    }
  };

  const columns: Column<Lead>[] = [
    {
      key: 'name',
      label: 'سرنخ',
      render: (l) => (
        <div style={{ display: 'grid' }}>
          <strong style={{ fontSize: 14 }}>{l.name}</strong>
          <span dir="ltr" style={{ fontSize: 12, color: 'var(--mut)', textAlign: 'start' }}>{l.phone}</span>
        </div>
      ),
    },
    { key: 'status', label: 'وضعیت', render: (l) => <Badge kind={STATUS_LABEL[l.status].kind}>{STATUS_LABEL[l.status].label}</Badge> },
    { key: 'source', label: 'منبع', render: (l) => l.source ?? '—' },
    { key: 'updatedAt', label: 'آخرین تغییر', render: (l) => faDate(l.updatedAt) },
    {
      key: 'actions',
      label: 'عملیات',
      render: (l) =>
        l.status === 'CONVERTED' ? (
          l.memberId ? <Badge kind="ok">عضو شد</Badge> : null
        ) : (
          <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap' }}>
            {NEXT_STATUS[l.status].map((s) => (
              <Button key={s} variant={s === 'CONVERTED' ? 'primary' : 'ghost'} size="sm" disabled={busy} onClick={() => (s === 'CONVERTED' ? convert(l) : changeStatus(l, s))}>
                {STATUS_LABEL[s].label}
              </Button>
            ))}
          </span>
        ),
    },
  ];

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div className="adm-page-head">
        <h1>سرنخ‌های فروش</h1>
        <Button variant="primary" size="sm" onClick={() => { setError(null); setAddOpen(true); }}>
          + سرنخ جدید
        </Button>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          className="u-input"
          style={{ maxWidth: 240, minHeight: 38 }}
          placeholder="جستجو: نام یا شماره…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="جستجوی سرنخ"
        />
        <Select value={status} onChange={(e) => { setStatus(e.target.value as LeadStatus | ''); setPage(1); }} style={{ maxWidth: 180, minHeight: 38 }}>
          <option value="">همه</option>
          {(Object.keys(STATUS_LABEL) as LeadStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s].label}</option>
          ))}
        </Select>
        {leads.data ? <span style={{ fontSize: 12, color: 'var(--mut)' }}>{faNum(leads.data.total)} سرنخ</span> : null}
      </div>

      <DataTable
        columns={columns}
        rows={leads.data?.items ?? []}
        rowKey={(l) => l.id}
        loading={leads.loading}
        emptyTitle="سرنخی نیست"
        emptyHint="متقاضیان جدید را همین‌جا ثبت کنید تا از دست نروند."
      />
      {leads.error ? <EmptyState title="بارگذاری ناموفق" hint={leads.error.message} actionLabel="تلاش دوباره" onAction={leads.retry} /> : null}

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} title="سرنخ جدید">
        <div style={{ display: 'grid', gap: 4 }}>
          {error ? <p style={{ color: 'var(--bd)', fontSize: 13, margin: 0 }}>{error}</p> : null}
          <Field label="نام" htmlFor="l-name">
            <Input id="l-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="شماره موبایل" htmlFor="l-phone">
            <Input id="l-phone" dir="ltr" inputMode="tel" placeholder="09xxxxxxxxx" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label="منبع (اختیاری)" htmlFor="l-src" hint="مثل: معرف، اینستاگرام، سایت">
            <Input id="l-src" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
          </Field>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <Button variant="primary" onClick={add} loading={busy} disabled={form.name.trim().length < 2 || !/^09\d{9}$/.test(form.phone.replace(/\D/g, ''))}>
              ذخیره سرنخ
            </Button>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>
              انصراف
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
