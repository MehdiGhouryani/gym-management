import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'tint' | 'ghost' | 'danger';
type Size = 'md' | 'sm';
type Accent = 'none' | 'error' | 'success';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  accent?: Accent;
  full?: boolean;
  children: ReactNode;
}

/** دکمه با حالت‌های کامل: hover/focus/pressed/disabled/loading/error/success */
export function Button({ variant = 'primary', size = 'md', loading, accent = 'none', full, className, children, ...rest }: Props) {
  const cls = [
    'u-btn',
    `u-btn--${variant}`,
    `u-btn--${size}`,
    loading ? 'u-btn--loading' : '',
    accent !== 'none' ? `u-btn--${accent}` : '',
    full ? 'u-btn--full' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button type="button" {...rest} className={cls} aria-busy={loading || undefined} disabled={rest.disabled || loading}>
      {loading ? <span className="u-spin" aria-hidden /> : null}
      {children}
    </button>
  );
}
