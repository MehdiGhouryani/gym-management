/** اسکلت بارگذاری */
export function Skeleton({ width = '100%', height = 14, radius }: { width?: number | string; height?: number | string; radius?: number }) {
  return <div className="u-skeleton" style={{ width, height, borderRadius: radius }} aria-hidden />;
}

/** اسکلت چندردیفی برای جدول‌ها */
export function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div style={{ padding: 12, display: 'grid', gap: 10 }}>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} height={20} />
      ))}
    </div>
  );
}
