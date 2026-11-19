import { Pressable } from 'react-native';
import { faDigits } from '../lib/format';
import { T } from './Text';
import { useTheme } from './theme';

export function Chip({ label, count, selected, onPress }: { label: string; count?: number; selected: boolean; onPress: () => void }) {
  const { c, radius, touchTarget, row } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        minHeight: touchTarget,
        flexDirection: row,
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        borderRadius: radius.md,
        backgroundColor: selected ? c.primary : c.card,
        borderWidth: 1,
        borderColor: selected ? c.primary : c.line,
      }}
    >
      <T size={13.5} weight="bold" color={selected ? '#FFFFFF' : c.ink}>
        {label}
      </T>
      {count !== undefined ? (
        <T size={13} color={selected ? '#CFE3D9' : c.muted}>
          {faDigits(count)}
        </T>
      ) : null}
    </Pressable>
  );
}
