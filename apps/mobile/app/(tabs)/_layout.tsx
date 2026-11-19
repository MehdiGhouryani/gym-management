import { Redirect, Tabs } from 'expo-router';
import { useAuth } from '../../src/auth/AuthProvider';
import { fontState } from '../../src/ui/fonts';
import { useTheme } from '../../src/ui/theme';

export default function TabsLayout() {
  const { state } = useAuth();
  const { c } = useTheme();
  if (state.status === 'loading') return null;
  if (state.status !== 'signedIn') return <Redirect href="/" />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: { backgroundColor: c.card, borderTopColor: c.line, height: 64 },
        tabBarLabelStyle: { fontSize: 14, marginBottom: 10, fontFamily: fontState.loaded ? 'Vazirmatn-Bold' : undefined },
        tabBarIconStyle: { display: 'none' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'امروز' }} />
      <Tabs.Screen name="members" options={{ title: 'اعضا' }} />
      {/* گزارش مالی فقط برای مدیر؛ برای پذیرش تب پنهان است (سرور هم ۴۰۳ می‌دهد) */}
      <Tabs.Screen name="report" options={{ title: 'گزارش', href: state.me.role === 'OWNER' ? undefined : null }} />
    </Tabs>
  );
}
