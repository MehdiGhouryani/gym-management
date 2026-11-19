'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

type Kind = 'ok' | 'bad' | 'wn';
interface Toast {
  id: number;
  kind: Kind;
  text: string;
}

const ToastContext = createContext<{ push: (kind: Kind, text: string) => void }>({ push: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

/** توست سراسری: useToast().push('ok', 'ذخیره شد') */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const push = useCallback((kind: Kind, text: string) => {
    const id = nextId.current++;
    setItems((cur) => [...cur, { id, kind, text }]);
    setTimeout(() => setItems((cur) => cur.filter((t) => t.id !== id)), 3500);
  }, []);
  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="u-toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`u-toast u-toast--${t.kind}`}>
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
