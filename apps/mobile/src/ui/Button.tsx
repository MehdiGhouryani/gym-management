import { ActivityIndicator, Pressable } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { T } from './Text';
import { useTheme } from './theme';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'text';
  small?: boolean;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({ label, onPress, variant = 'primary', small, loading, disabled, style }: Props) {
  const { c, radius, touchTarget } = useTheme();
  const off = disabled || loading;
  const fg = variant === 'primary' ? '#FFFFFF' : variant === 'ghost' ? c.primary : c.muted;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      onPress={onPress}
      disabled={off}
      style={({ pressed }) => [
        {
          minHeight: small ? touchTarget : 50,
          paddingHorizontal: small ? 14 : 20,
          borderRadius: radius.md,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: variant === 'primary' ? (off ? c.line : c.primary) : 'transparent',
          borderWidth: variant === 'ghost' ? 1.5 : 0,
          borderColor: off ? c.line : c.primary,
          opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <T weight="bold" size={small ? 13.5 : 16} color={off && variant === 'primary' ? c.muted : fg} align="center">
          {label}
        </T>
      )}
    </Pressable>
  );
}
