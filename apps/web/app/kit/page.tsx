import { notFound } from 'next/navigation';
import { KitDemo } from '../../src/ui/kit-demo';

/**
 * نمایش کیت UI: همه‌ی اجزا و حالت‌ها در یک‌جا (مرجع بصری توسعه).
 * فقط خارج از production؛ در build پروDUCTION مسیر ۴۰۴ می‌شود.
 */
export default function KitPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <main style={{ maxWidth: 960 }}>
      <h1>کیت UI فولاد</h1>
      <p style={{ marginTop: 0 }}>توکن‌ها: packages/ui-tokens — این صفحه مرجع حالت‌های اجزاست.</p>
      <KitDemo />
    </main>
  );
}
