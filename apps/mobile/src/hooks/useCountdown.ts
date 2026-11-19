import { useCallback, useEffect, useState } from 'react';

/** شمارش معکوس ثانیه‌ای؛ restart(n) از n دوباره شروع می‌کند */
export function useCountdown(initial: number): [number, (n: number) => void] {
  const [left, setLeft] = useState(initial);
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((x) => x - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  const restart = useCallback((n: number) => setLeft(n), []);
  return [left, restart];
}
