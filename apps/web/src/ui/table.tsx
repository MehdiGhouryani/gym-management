import type { ReactNode } from 'react';
import { EmptyState } from './empty-state';
import { SkeletonRows } from './skeleton';

export interface Column<R> {
  key: string;
  label: string;
  align?: 'start' | 'end';
  numeric?: boolean;
  render: (row: R) => ReactNode;
}

interface Props<R> {
  columns: Column<R>[];
  rows: R[];
  rowKey: (row: R) => string;
  loading?: boolean;
  emptyTitle?: string;
  emptyHint?: ReactNode;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  /** ردیف کلیک‌پذیر (رفتن به پروفایل و …) */
  onRowClick?: (row: R) => void;
}

/**
 * جدول داده؛ در موبایل هر ردیف به کارت با data-label تبدیل می‌شود.
 * حالت‌ها: loading (اسکلت) / empty (EmptyState) / داده.
 */
export function DataTable<R>({ columns, rows, rowKey, loading, emptyTitle = 'موردی نیست', emptyHint, emptyActionLabel, onEmptyAction, onRowClick }: Props<R>) {
  if (loading) {
    return (
      <div className="u-table-wrap">
        <SkeletonRows />
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <div className="u-table-wrap">
        <EmptyState title={emptyTitle} hint={emptyHint} actionLabel={emptyActionLabel} onAction={onEmptyAction} />
      </div>
    );
  }
  return (
    <div className="u-table-wrap">
      <table className="u-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} style={{ textAlign: c.align ?? 'start' }}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              style={onRowClick ? { cursor: 'pointer' } : undefined}
            >
              {columns.map((c) => (
                <td key={c.key} data-label={c.label} className={c.numeric ? 'u-table-num' : undefined} style={{ textAlign: c.align ?? 'start' }}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
