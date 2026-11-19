import type { ReactNode } from 'react';

interface Props {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  /** تغییر درصدی؛ مثبت خوب، منفی بد */
  delta?: number;
  icon?: ReactNode;
}

/** کارت KPI داشبورد */
export function StatCard({ label, value, hint, delta, icon }: Props) {
  return (
    <div className="u-stat">
      <div className="u-stat-label">
        {icon ? <span aria-hidden> {icon} </span> : null}
        {label}
      </div>
      <div className="u-stat-value">{value}</div>
      {hint ? <div className="u-stat-hint">{hint}</div> : null}
      {typeof delta === 'number' ? (
        <span className={`u-stat-delta ${delta >= 0 ? 'u-stat-delta--good' : 'u-stat-delta--bad'}`}>
          {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}٪
        </span>
      ) : null}
    </div>
  );
}
