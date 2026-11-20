'use client';

import { useEffect, useRef, useState } from 'react';
import { Badge, Button, EmptyState } from '../../../src/ui/index';
import { api, ApiError } from '../../../src/lib/api';
import { faNum, statusBadge } from '../../../src/lib/format';

interface CheckInResult {
  memberId: string;
  name: string;
  status: 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'NONE';
  daysLeft: number | null;
  balance: number;
  sessionsRemaining: number | null;
}

interface LogRow {
  name: string;
  ok: boolean;
  message: string;
}

/** کیوسک ورود: اسکنر QR تایپ می‌کند و Enter می‌زند — ورود دستی توکن هم همین‌جاست */
export default function CheckInPage() {
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<CheckInResult | null>(null);
  const [log, setLog] = useState<LogRow[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = async (t: string) => {
    const clean = t.trim();
    if (!clean || busy) return;
    setBusy(true);
    try {
      const r = await api.post<CheckInResult>('/checkin', { token: clean });
      setLast(r);
      setLog((cur) => [{ name: r.name, ok: true, message: 'ورود ثبت شد' }, ...cur].slice(0, 20));
    } catch (e) {
      const message = e instanceof ApiError ? e.message : 'ثبت ورود ناموفق بود';
      setLast(null);
      setLog((cur) => [{ name: message, ok: false, message }, ...cur].slice(0, 20));
    } finally {
      setToken('');
      setBusy(false);
      inputRef.current?.focus();
    }
  };

  const b = last ? statusBadge[last.status] : null;

  return (
    <div style={{ maxWidth: 620 }}>
      <div className="adm-page-head">
        <h1>ورود با QR</h1>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit(token);
        }}
      >
        <input
          ref={inputRef}
          className="u-input adm-code-input"
          dir="ltr"
          placeholder="توکن QR را اسکن کنید یا بچسبانید…"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          aria-label="توکن QR"
        />
        <div style={{ marginTop: 10 }}>
          <Button variant="primary" full loading={busy} disabled={!token.trim()}>
            ثبت ورود
          </Button>
        </div>
      </form>

      {last && b ? (
        <div
          className="u-table-wrap"
          style={{ padding: 22, marginTop: 16, borderColor: 'var(--ok)', animation: 'u-pop var(--dur) var(--ease)' }}
        >
          <h2 style={{ margin: '0 0 8px', fontSize: 22 }}>{last.name}</h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <Badge kind={b.kind}>{b.label}</Badge>
            {last.daysLeft !== null ? <Badge kind="neutral">{faNum(last.daysLeft)} روز مانده</Badge> : null}
            {last.sessionsRemaining !== null ? <Badge kind="tint">{faNum(last.sessionsRemaining)} جلسه باقی</Badge> : null}
            {last.balance > 0 ? <Badge kind="debt">بدهی {faNum(last.balance)}</Badge> : null}
          </div>
        </div>
      ) : null}

      <div style={{ marginTop: 18 }}>
        <h2 style={{ fontSize: 14, margin: '0 0 8px' }}>آخرین تلاش‌ها</h2>
        {log.length === 0 ? (
          <EmptyState title="هنوز ورودی ثبت نشده" hint="اسکنر را روی فیلد بالا بگذارید و کارت عضو را اسکن کنید." />
        ) : (
          <div style={{ display: 'grid', gap: 6 }}>
            {log.map((row, i) => (
              <div
                key={i}
                style={{
                  display: 'flex', justifyContent: 'space-between', padding: '8px 12px',
                  background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 10,
                  borderInlineStart: `4px solid ${row.ok ? 'var(--ok)' : 'var(--bd)'}`,
                }}
              >
                <span style={{ fontWeight: 700, fontSize: 13 }}>{row.name}</span>
                <span style={{ fontSize: 12, color: row.ok ? 'var(--ok)' : 'var(--bd)' }}>{row.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
