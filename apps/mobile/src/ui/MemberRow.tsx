import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import type { MemberDto } from '../lib/api/types';
import { formatPhone, formatToman, initialOf, platesFilled, statusInfo } from '../lib/format';
import { Plates } from './Plates';
import { Tag } from './Tag';
import { T } from './Text';
import { useTheme } from './theme';

/** ردیف عضو؛ با onPress به پروفایل می‌رود. actions زیر ردیف می‌آید و جدا از لمس ردیف است. */
export function MemberRow({ m, onPress, actions }: { m: MemberDto; onPress?: () => void; actions?: ReactNode }) {
  const { c, row } = useTheme();
  const info = statusInfo(m);
  const bg = info.tone === 'ok' ? c.okTint : info.tone === 'warn' ? c.warnTint : info.tone === 'bad' ? c.badTint : c.line;
  const fg = info.tone === 'ok' ? c.ok : info.tone === 'warn' ? c.warn : info.tone === 'bad' ? c.bad : c.muted;
  return (
    <View style={{ paddingVertical: 12, paddingHorizontal: 18, gap: 10, borderBottomWidth: 1, borderBottomColor: c.line }}>
      <Pressable
        disabled={!onPress}
        onPress={onPress}
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={onPress ? `پروفایل ${m.name}` : undefined}
        style={({ pressed }) => ({ gap: 10, opacity: pressed ? 0.7 : 1 })}
      >
        <View style={{ flexDirection: row, alignItems: 'center', gap: 12 }}>
          <View style={{ width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: bg }}>
            <T weight="bold" size={17} color={fg} align="center">
              {initialOf(m.name)}
            </T>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <T weight="bold" size={15.5} numberOfLines={1}>
              {m.name}
            </T>
            <T size={12.5} color={c.muted}>
              {formatPhone(m.phone)}
            </T>
          </View>
        </View>
        <View style={{ flexDirection: row, gap: 6, flexWrap: 'wrap' }}>
          <Tag label={info.label} tone={info.tone} />
          {m.balance > 0 ? <Tag label={`بدهی ${formatToman(m.balance)}`} tone="debt" /> : null}
        </View>
        <Plates filled={platesFilled(m.daysLeft)} tone={info.tone} />
      </Pressable>
      {actions}
    </View>
  );
}
