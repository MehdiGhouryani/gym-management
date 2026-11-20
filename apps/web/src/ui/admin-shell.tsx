'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { BarChart3, CreditCard, Dumbbell, LayoutDashboard, LogOut, Menu, Moon, ScanLine, Settings, UserPlus, Users, Wallet, X } from 'lucide-react';
import './admin.css';
import { Badge, Button } from './index';
import { useSession } from '../lib/session';
import { useTheme } from '../lib/theme';

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
  /** فقط مدیر */
  ownerOnly?: boolean;
}

const NAV: NavItem[] = [
  { href: '/admin', label: 'داشبورد', icon: <LayoutDashboard size={18} /> },
  { href: '/admin/checkin', label: 'ورود با QR', icon: <ScanLine size={18} /> },
  { href: '/admin/members', label: 'اعضا', icon: <Users size={18} /> },
  { href: '/admin/leads', label: 'سرنخ‌ها', icon: <UserPlus size={18} /> },
  { href: '/admin/plans', label: 'پلن‌ها', icon: <CreditCard size={18} /> },
  { href: '/admin/payments', label: 'پرداخت‌ها', icon: <Wallet size={18} /> },
  { href: '/admin/classes', label: 'کلاس‌ها', icon: <Dumbbell size={18} /> },
  { href: '/admin/reports', label: 'گزارش‌ها', icon: <BarChart3 size={18} />, ownerOnly: true },
  { href: '/admin/settings', label: 'تنظیمات', icon: <Settings size={18} />, ownerOnly: true },
];

/** پوسته‌ی پنل: مسیرهای محافظت‌شده، سایدبار جمع‌شونده، هدر با جستجو و تم */
export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const session = useSession();
  const theme = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState('');

  const isLogin = pathname === '/admin/login';

  // مسیرهای محافظت‌شده: بدون نشست → صفحه ورود
  useEffect(() => {
    if (!isLogin && session.state === 'signedOut') router.replace('/admin/login');
  }, [isLogin, session.state, router]);

  if (isLogin) return <>{children}</>;
  if (session.state !== 'signedIn') {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <span className="u-spin" style={{ width: 22, height: 22, borderWidth: 3 }} aria-label="در حال بارگذاری" />
      </div>
    );
  }

  const nav = NAV.filter((n) => !n.ownerOnly || session.user?.role === 'OWNER');

  const sidebar = (
    <nav className="adm-side" aria-label="منوی اصلی">
      <div className="adm-brand">
        <span className="adm-brand-mark">ف</span>
        <span className="adm-brand-name">{session.gym?.name ?? 'فولاد'}</span>
      </div>
      {nav.map((item) => {
        const active = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`adm-nav-item${active ? ' adm-nav-item--active' : ''}`}
            onClick={() => setMenuOpen(false)}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        );
      })}
      <div style={{ marginTop: 'auto' }}>
        <button
          type="button"
          className="adm-nav-item"
          onClick={() => {
            void session.signOut();
            router.replace('/admin/login');
          }}
        >
          <LogOut size={18} />
          <span>خروج</span>
        </button>
      </div>
    </nav>
  );

  return (
    <div className="adm-root">
      {/* سایدبار دسکتاپ */}
      {sidebar}
      {/* سایدبار موبایل */}
      {menuOpen ? (
        <div className="adm-drawer" onClick={() => setMenuOpen(false)}>
          <div onClick={(e) => e.stopPropagation()}>{sidebar}</div>
        </div>
      ) : null}

      <div className="adm-main">
        <header className="adm-header">
          <button type="button" className="adm-burger" onClick={() => setMenuOpen(true)} aria-label="منو">
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <form
            className="adm-search"
            onSubmit={(e) => {
              e.preventDefault();
              const q = query.trim();
              router.push(q ? `/admin/members?q=${encodeURIComponent(q)}` : '/admin/members');
            }}
          >
            <input
              className="u-input adm-search-input"
              placeholder="جستجوی عضو (نام یا شماره)…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="جستجوی سراسری"
            />
          </form>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginInlineStart: 'auto' }}>
            {session.user?.role === 'OWNER' ? <Badge kind="tint">مدیر</Badge> : <Badge kind="neutral">پذیرش</Badge>}
            <span className="adm-user-name">{session.user?.name}</span>
            <Button variant="ghost" size="sm" onClick={theme.toggle} aria-label="تغییر تم">
              <Moon size={16} />
            </Button>
          </div>
        </header>
        <main className="adm-content">{children}</main>
      </div>
    </div>
  );
}
