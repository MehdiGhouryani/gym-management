'use client';

export interface TabItem {
  key: string;
  label: string;
  count?: number;
}

interface Props {
  items: TabItem[];
  active: string;
  onChange: (key: string) => void;
}

/** تب افقی با شمارنده‌ی اختیاری */
export function Tabs({ items, active, onChange }: Props) {
  return (
    <div className="u-tabs" role="tablist">
      {items.map((t) => (
        <button
          key={t.key}
          type="button"
          role="tab"
          aria-selected={t.key === active}
          className="u-tab"
          onClick={() => onChange(t.key)}
        >
          {t.label}
          {typeof t.count === 'number' ? <span className="u-tab-count">{t.count.toLocaleString('fa-IR')}</span> : null}
        </button>
      ))}
    </div>
  );
}
