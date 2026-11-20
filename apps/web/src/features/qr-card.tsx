'use client';

import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';

/** کارت QR ورود عضو — قابل چاپ؛ توکن امن بدون اطلاعات خصوصی */
export function QrCard({ memberId }: { memberId: string }) {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .get<{ qrToken: string }>(`/members/${memberId}/qr`)
      .then((r) => alive && setToken(r.qrToken))
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : 'خطا'));
    return () => {
      alive = false;
    };
  }, [memberId]);

  if (error) return <p style={{ color: 'var(--bd)', fontSize: 13 }}>{error}</p>;
  if (!token) return null;
  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center', padding: 14, background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 13, maxWidth: 360 }}>
      <QRCodeSVG value={token} size={120} />
      <div style={{ fontSize: 12, color: 'var(--mut)' }}>
        <p style={{ margin: '0 0 6px', fontWeight: 700, color: 'var(--ink)' }}>کارت ورود</p>
        <p style={{ margin: 0 }}>این کد را در پذیرش اسکن کنید.</p>
        <p dir="ltr" style={{ margin: '6px 0 0', fontSize: 10, wordBreak: 'break-all', textAlign: 'start' }}>{token}</p>
      </div>
    </div>
  );
}
