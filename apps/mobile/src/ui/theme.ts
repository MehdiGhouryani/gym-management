import { I18nManager, useColorScheme } from 'react-native';
import { colors, radius, space, touchTarget } from '@fulad/ui-tokens';

export function useTheme() {
  const scheme = useColorScheme();
  const c = scheme === 'dark' ? colors.dark : colors.light;
  // در حالت راست‌چین، 'row' خودش از راست می‌چیند؛ تا قبل از اولین راه‌اندازی مجدد (RTL هنوز فعال نشده) برعکس می‌کنیم
  const row = I18nManager.isRTL ? ('row' as const) : ('row-reverse' as const);
  return { c, radius, space, touchTarget, row };
}
export type Theme = ReturnType<typeof useTheme>;
