import { Text } from 'react-native';
import type { TextProps, TextStyle } from 'react-native';
import { fontState } from './fonts';
import { useTheme } from './theme';

interface Props extends TextProps {
  size?: number;
  weight?: 'regular' | 'bold';
  color?: string;
  align?: TextStyle['textAlign'];
}

export function T({ size = 15, weight = 'regular', color, align = 'right', style, ...rest }: Props) {
  const { c } = useTheme();
  const family = fontState.loaded ? (weight === 'bold' ? 'Vazirmatn-Bold' : 'Vazirmatn') : undefined;
  return (
    <Text
      {...rest}
      style={[
        {
          fontSize: size,
          color: color ?? c.ink,
          textAlign: align,
          writingDirection: 'rtl',
          fontFamily: family,
          fontWeight: family ? undefined : weight === 'bold' ? '700' : '400',
        },
        style,
      ]}
    />
  );
}
