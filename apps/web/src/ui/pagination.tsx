'use client';

interface Props {
  page: number;
  pages: number;
  onChange: (page: number) => void;
}

/** صفحه‌بندی با پنجره‌ی شماره‌ها حول صفحه‌ی جاری */
export function Pagination({ page, pages, onChange }: Props) {
  if (pages <= 1) return null;
  const window: number[] = [];
  for (let p = Math.max(1, page - 2); p <= Math.min(pages, page + 2); p++) window.push(p);
  return (
    <nav className="u-pagination" aria-label="صفحه‌بندی">
      <button type="button" className="u-page-btn" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="صفحه قبل">
        ›
      </button>
      {window[0] > 1 ? (
        <>
          <button type="button" className="u-page-btn" onClick={() => onChange(1)}>
            ۱
          </button>
          {window[0] > 2 ? <span className="u-page-info">…</span> : null}
        </>
      ) : null}
      {window.map((p) => (
        <button key={p} type="button" className="u-page-btn" aria-current={p === page ? 'page' : undefined} onClick={() => onChange(p)}>
          {p.toLocaleString('fa-IR')}
        </button>
      ))}
      {window[window.length - 1] < pages ? (
        <>
          {window[window.length - 1] < pages - 1 ? <span className="u-page-info">…</span> : null}
          <button type="button" className="u-page-btn" onClick={() => onChange(pages)}>
            {pages.toLocaleString('fa-IR')}
          </button>
        </>
      ) : null}
      <button type="button" className="u-page-btn" disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="صفحه بعد">
        ‹
      </button>
    </nav>
  );
}
