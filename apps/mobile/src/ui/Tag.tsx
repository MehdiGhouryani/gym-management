import { View } from 'react-native';
import { T } from './Text';
import { useTheme } from './theme';

export type TagTone = 'ok' | 'warn' | 'bad' | 'none' | 'debt';

export function Tag({ label, tone }: { label: string; tone: TagTone }) {
  const { c, row } = useTheme();
  const map = {
    ok: [c.okTint, c.ok],
    warn: [c.warnTint, c.warn],
    bad: [c.badTint, c.bad],
    debt: [c.debtTint, c.debt],
    none: [c.line, c.muted],
  } as const;
  const [bg, fg] = map[tone];
  return (
    <View style={{ flexDirection: row, alignItems: 'center', gap: 5, backgroundColor: bg, paddingHorizontal: 9, paddingVertical: 2, borderRadius: 8 }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: fg }} />
      <T size={12} weight="bold" color={fg}>
        {label}
      </T>
    </View>
  );
}
