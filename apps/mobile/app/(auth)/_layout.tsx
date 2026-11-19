import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../../src/auth/AuthProvider';

export default function AuthLayout() {
  const { state } = useAuth();
  if (state.status === 'signedIn') return <Redirect href="/(tabs)" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
