import type { ReactNode } from 'react';

type Kind = 'ok' | 'wn' | 'bad' | 'debt' | 'tint' | 'neutral';

/** نشان وضعیت با رنگ از توکن‌ها */
export function Badge({ kind = 'neutral', children }: { kind?: Kind; children: ReactNode }) {
  return <span className={`u-badge u-badge--${kind}`}>{children}</span>;
}
