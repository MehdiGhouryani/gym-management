import Link from 'next/link';
import { notFound } from 'next/navigation';
import { JoinForm } from '../../src/features/join-form';

interface PublicGym {
  slug: string;
  name: string;
  city: string;
  address: string | null;
  phone: string | null;
  plans: { name: string; days: number; price: number }[];
  sessions: { id: string; startsAt: string; className: string; coachName: string | null }[];
}

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
const faToman = (n: number) => `${n.toLocaleString('fa-IR')} تومان`;
const faDateTime = (iso: string) => new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));

/** سایت عمومی هر باشگاه: معرفی، پلن‌ها، جلسه‌های کلاس و درخواست عضویت */
export default async function PublicGymPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const res = await fetch(`${API}/public/gyms/${slug}`, { next: { revalidate: 60 } });
  if (!res.ok) notFound();
  const gym = (await res.json()) as PublicGym;

  return (
    <main style={{ maxWidth: 760 }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 30, margin: '0 0 6px' }}>{gym.name}</h1>
        <p style={{ color: 'var(--mut)', margin: 0 }}>
          {gym.city}
          {gym.address ? ` — ${gym.address}` : ''}
          {gym.phone ? ` · ${gym.phone}` : ''}
        </p>
      </header>

      {gym.plans.length > 0 ? (
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18 }}>پلن‌های اشتراک</h2>
          <div className="adm-grid">
            {gym.plans.map((p) => (
              <div key={p.name} className="u-stat">
                <div className="u-stat-label">{p.days} روز</div>
                <div className="u-stat-value">{p.name}</div>
                <div className="u-stat-hint">{faToman(p.price)}</div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {gym.sessions.length > 0 ? (
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18 }}>جلسه‌های پیشِ‌رو</h2>
          <div className="u-table-wrap">
            {gym.sessions.map((s) => (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid color-mix(in srgb, var(--line) 50%, transparent)' }}>
                <strong style={{ fontSize: 14 }}>{s.className}</strong>
                <span style={{ fontSize: 13, color: 'var(--mut)' }}>
                  {faDateTime(s.startsAt)}
                  {s.coachName ? ` — ${s.coachName}` : ''}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18 }}>درخواست عضویت</h2>
        <div className="u-table-wrap" style={{ padding: 18 }}>
          <JoinForm slug={slug} />
        </div>
      </section>

      <p style={{ color: 'var(--mut)', fontSize: 13 }}>
        عضو هستید؟{' '}
        <Link href={`/portal/${slug}`} style={{ color: 'var(--pr)', fontWeight: 700 }}>
          ورود اعضا
        </Link>
      </p>
    </main>
  );
}
