import type { ReactNode } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from './theme';

export function Screen({ children }: { children: ReactNode }) {
  const { c } = useTheme();
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: c.bg }}>
      {children}
    </SafeAreaView>
  );
}
