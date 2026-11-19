'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '../../../../src/ui/index';
import { MemberFields, emptyMemberForm, memberFormToInput, type MemberFormValues } from '../../../../src/features/member-fields';
import { api, ApiError } from '../../../../src/lib/api';
import { useSession } from '../../../../src/lib/session';
import type { Member } from '../../../../src/lib/types';

export default function NewMemberPage() {
  const router = useRouter();
  const session = useSession();
  const [values, setValues] = useState<MemberFormValues>(emptyMemberForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [duplicate, setDuplicate] = useState<{ existingMemberId: string; message: string } | null>(null);

  const valid = values.name.trim().length >= 2 && /^09\d{9}$/.test(values.phone.replace(/\D/g, ''));

  const submit = async () => {
    if (!valid || busy) return;
    setBusy(true);
    setErrors({});
    setDuplicate(null);
    try {
      const m = await api.post<Member>('/members', memberFormToInput(values));
      router.replace(`/admin/members/${m.id}`);
    } catch (e) {
      if (e instanceof ApiError && (e.code === 'MEMBER_EXISTS' || e.code === 'MEMBER_ARCHIVED')) {
        const id = typeof e.extra?.existingMemberId === 'string' ? e.extra.existingMemberId : null;
        setDuplicate({ existingMemberId: id ?? '', message: e.message });
      } else if (e instanceof ApiError && e.extra?.issues) {
        // خطاهای اعتبارسنجی Zod از سرور
        const issues = e.extra.issues as { path: string[]; message: string }[];
        const map: Record<string, string> = {};
        for (const i of issues) map[String(i.path[0] ?? '')] = i.message;
        setErrors(map);
      } else {
        setErrors({ name: e instanceof Error ? e.message : 'ثبت ناموفق بود' });
      }
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 520 }}>
      <div className="adm-page-head">
        <h1>عضو جدید</h1>
        <Link href="/admin/members">
          <Button variant="ghost" size="sm">بازگشت</Button>
        </Link>
      </div>
      <div className="u-table-wrap" style={{ padding: 18 }}>
        {duplicate ? (
          <div style={{ background: 'var(--wnt)', color: 'var(--wn)', borderRadius: 10, padding: '10px 14px', marginBottom: 14, display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{duplicate.message}</span>
            {duplicate.existingMemberId ? (
              <Link href={`/admin/members/${duplicate.existingMemberId}`}>
                <Button variant="tint" size="sm">باز کردن پروفایل</Button>
              </Link>
            ) : null}
          </div>
        ) : null}
        <MemberFields values={values} onChange={setValues} errors={errors} />
        <Button
          variant="primary"
          full
          loading={busy}
          disabled={!valid}
          onClick={() => {
            void submit();
          }}
        >
          ذخیره عضو
        </Button>
        {session.user?.role === 'OWNER' || session.user?.role === 'STAFF' ? (
          <p style={{ fontSize: 12, color: 'var(--mut)', marginTop: 10 }}>
            پس از ذخیره، اشتراک را از پروفایل عضو ثبت کنید.
          </p>
        ) : null}
      </div>
    </div>
  );
}
