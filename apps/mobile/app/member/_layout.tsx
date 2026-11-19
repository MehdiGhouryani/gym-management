import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../../src/auth/AuthProvider';

export default function MemberLayout() {
  const { state } = useAuth();
  if (state.status === 'loading') return null;
  if (state.status !== 'signedIn') return <Redirect href="/" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
