import { useState } from 'react';
import { TextInput, View } from 'react-native';
import type { StyleProp, TextInputProps, TextStyle } from 'react-native';
import { fontState } from './fonts';
import { T } from './Text';
import { useTheme } from './theme';

interface Props extends TextInputProps {
  label?: string;
  error?: string | null;
  inputStyle?: StyleProp<TextStyle>;
}

export function TextField({ label, error, inputStyle, onFocus, onBlur, ...rest }: Props) {
  const { c, radius } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      {label ? (
        <T size={13} weight="bold" color={c.muted}>
          {label}
        </T>
      ) : null}
      <TextInput
        placeholderTextColor={c.muted}
        {...rest}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[
          {
            minHeight: 52,
            borderRadius: radius.md,
            paddingHorizontal: 14,
            fontSize: 16,
            color: c.ink,
            backgroundColor: c.card,
            borderWidth: focused || error ? 2 : 1.5,
            borderColor: error ? c.bad : focused ? c.primary : c.line,
            textAlign: 'right',
            writingDirection: 'rtl',
            fontFamily: fontState.loaded ? 'Vazirmatn' : undefined,
          },
          inputStyle,
        ]}
      />
      {error ? (
        <T size={12.5} color={c.bad} weight="bold" accessibilityLiveRegion="polite">
          {error}
        </T>
      ) : null}
    </View>
  );
}
