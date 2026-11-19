'use client';

import { useEffect, type ReactNode } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  /** center = دیالوگ؛ start/end = کشو کنار صفحه (RTL خودش جهت را می‌فهمد) */
  side?: 'center' | 'start' | 'end';
  children: ReactNode;
}

/** دیالوگ و کشو با بستن با Esc و کلیک بیرون */
export function Dialog({ open, onClose, title, side = 'center', children }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  const overlayCls = side === 'center' ? 'u-overlay' : `u-overlay u-overlay--${side}`;
  const panelCls = side === 'center' ? 'u-panel' : 'u-panel u-panel--drawer';
  return (
    <div className={overlayCls} onClick={onClose} role="presentation">
      <div
        className={panelCls}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <h2 className="u-panel-title">
          {title}
          <button type="button" className="u-panel-close" onClick={onClose} aria-label="بستن">
            ×
          </button>
        </h2>
        {children}
      </div>
    </div>
  );
}
