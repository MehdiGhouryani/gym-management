'use client';

import { useCallback, useEffect, useState } from 'react';

export type ThemeChoice = 'light' | 'dark' | 'system';
const KEY = 'fulad.theme';

/** اعمال تم روی data-theme؛ system یعنی حذف صفت تا prefers-color-scheme عمل کند */
export function applyTheme(choice: ThemeChoice) {
  if (typeof document === 'undefined') return;
  if (choice === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = choice;
}

export function useTheme() {
  const [choice, setChoice] = useState<ThemeChoice>('system');

  useEffect(() => {
    const saved = (localStorage.getItem(KEY) as ThemeChoice | null) ?? 'system';
    setChoice(saved);
    applyTheme(saved);
  }, []);

  const set = useCallback((c: ThemeChoice) => {
    localStorage.setItem(KEY, c);
    applyTheme(c);
    setChoice(c);
  }, []);

  const toggle = useCallback(() => {
    const next: ThemeChoice = choice === 'dark' ? 'light' : choice === 'light' ? 'system' : 'dark';
    set(next);
  }, [choice, set]);

  return { choice, set, toggle };
}
