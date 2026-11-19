import { createContext, useCallback, useContext, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { T } from './Text';
import { useTheme } from './theme';

const ToastContext = createContext<(message: string) => void>(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const { c, radius } = useTheme();
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((m: string) => {
    setMessage(m);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), 3200);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      {message ? (
        <View pointerEvents="none" style={{ position: 'absolute', left: 16, right: 16, bottom: 90, alignItems: 'center' }}>
          <View style={{ backgroundColor: c.ink, borderRadius: radius.md, paddingHorizontal: 18, paddingVertical: 12, maxWidth: '100%' }} accessibilityLiveRegion="polite">
            <T size={14} weight="bold" color={c.bg} align="center">
              {message}
            </T>
          </View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}
