import { useEffect, useMemo, useState } from 'react';
import { I18nManager } from 'react-native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../src/auth/AuthProvider';
import { fontState, loadFontMap } from '../src/ui/fonts';
import { ToastProvider } from '../src/ui/Toast';

// راست‌چین اجباری؛ بعد از اولین اجرا یک‌بار اپ را کامل ببندید و دوباره باز کنید
if (!I18nManager.isRTL) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
}
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const map = useMemo(loadFontMap, []);
  const [fontsReady] = useFonts(map ?? {});
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } }));
  fontState.loaded = !!map && fontsReady;

  useEffect(() => {
    if (fontsReady) void SplashScreen.hideAsync();
  }, [fontsReady]);
  if (!fontsReady) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <StatusBar style="auto" />
          <Stack screenOptions={{ headerShown: false }} />
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
