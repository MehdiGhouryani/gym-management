import { Pressable, View } from 'react-native';
import { T } from './Text';
import { useTheme } from './theme';

export function Segmented<K extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: K; label: string }[];
  value: K;
  onChange: (key: K) => void;
}) {
  const { c, radius, row } = useTheme();
  return (
    <View accessibilityRole="radiogroup" style={{ flexDirection: row, backgroundColor: c.line, borderRadius: radius.md, padding: 3, gap: 3 }}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.key)}
            style={{ flex: 1, minHeight: 42, borderRadius: radius.md - 3, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.card : 'transparent' }}
          >
            <T weight="bold" size={13.5} align="center" color={on ? c.ink : c.muted}>
              {o.label}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}
