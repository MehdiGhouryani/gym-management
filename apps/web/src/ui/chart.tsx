import { faNum, faToman } from '../lib/format';

interface Bar {
  label: string;
  total: number;
}

/** نمودار ستونی SVG بدون وابستگی؛ ارقام فارسی و خوانایی در تم روشن/تیره */
export function BarChart({ data, height = 180 }: { data: Bar[]; height?: number }) {
  const max = Math.max(1, ...data.map((d) => d.total));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height }}>
      {data.map((d) => {
        const h = Math.round((d.total / max) * (height - 34));
        return (
          <div key={d.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <div
              title={faToman(d.total)}
              style={{
                width: '100%',
                maxWidth: 46,
                height: Math.max(3, h),
                background: 'var(--pr)',
                opacity: d.total > 0 ? 1 : 0.25,
                borderRadius: 6,
                transition: 'height var(--dur) var(--ease)',
              }}
            />
            <span style={{ fontSize: 11, color: 'var(--mut)', whiteSpace: 'nowrap' }}>{d.label}</span>
            {d.total > 0 ? <span style={{ fontSize: 10, color: 'var(--mut)', fontVariantNumeric: 'tabular-nums' }}>{faNum(d.total)}</span> : null}
          </div>
        );
      })}
    </div>
  );
}
