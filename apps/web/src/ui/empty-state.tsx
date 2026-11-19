import type { ReactNode } from 'react';

interface Props {
  title: string;
  hint?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

/** حالت خالی با اقدام پیشنهادی */
export function EmptyState({ title, hint, actionLabel, onAction }: Props) {
  return (
    <div className="u-empty">
      <p className="u-empty-title">{title}</p>
      {hint ? <p className="u-empty-hint">{hint}</p> : null}
      {actionLabel && onAction ? (
        <button type="button" className="u-btn u-btn--tint u-btn--md" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
