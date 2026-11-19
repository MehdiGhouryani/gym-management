import { View } from 'react-native';
import type { Tone } from '../lib/format';
import { useTheme } from './theme';

/** میله‌ی ۳۰ روزه: هر تکه یک روز (از راست پر می‌شود) */
export function Plates({ filled, tone, onDark }: { filled: number; tone: Tone; onDark?: boolean }) {
  const { c, row } = useTheme();
  const color = onDark ? c.signal : tone === 'ok' ? c.ok : tone === 'warn' ? c.warn : tone === 'bad' ? c.bad : c.line;
  const empty = onDark ? 'rgba(255,255,255,0.2)' : c.line;
  return (
    <View
      style={{ flexDirection: row, gap: 3, height: 8 }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {Array.from({ length: 30 }, (_, i) => (
        <View key={i} style={{ flex: 1, borderRadius: 2, backgroundColor: i < filled ? color : empty }} />
      ))}
    </View>
  );
}
