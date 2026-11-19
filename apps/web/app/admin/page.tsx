'use client';

import Link from 'next/link';
import { useSession } from '../../src/lib/session';

/** صفحه‌ی ورودی پنل؛ در فاز ۷ با داشبورد کامل جایگزین می‌شود */
export default function AdminHome() {
  const session = useSession();
  return (
    <div>
      <div className="adm-page-head">
        <h1>خوش آمدید{session.user?.name ? `، ${session.user.name}` : ''}</h1>
        {session.gym ? <span style={{ color: 'var(--mut)', fontSize: 13 }}>{session.gym.name}</span> : null}
      </div>
      <div className="adm-grid">
        <Link className="u-stat" href="/admin/members" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="u-stat-label">اعضا</div>
          <div className="u-stat-value">مدیریت اعضا</div>
          <div className="u-stat-hint">جستجو، ثبت و تمدید</div>
        </Link>
        {session.user?.role === 'OWNER' ? (
          <>
            <Link className="u-stat" href="/admin/plans" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="u-stat-label">پلن‌ها</div>
              <div className="u-stat-value">پلن‌های اشتراک</div>
              <div className="u-stat-hint">مدیریت قیمت و مدت</div>
            </Link>
            <Link className="u-stat" href="/admin/reports" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="u-stat-label">گزارش‌ها</div>
              <div className="u-stat-value">گزارش ماهانه</div>
              <div className="u-stat-hint">درآمد، تمدید، مطالبات</div>
            </Link>
            <Link className="u-stat" href="/admin/settings" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="u-stat-label">تنظیمات</div>
              <div className="u-stat-value">باشگاه</div>
              <div className="u-stat-hint">آستانه‌ها و کارکنان</div>
            </Link>
          </>
        ) : null}
      </div>
    </div>
  );
}
