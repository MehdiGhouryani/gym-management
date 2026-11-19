import { Redirect } from 'expo-router';
import { useAuth } from '../src/auth/AuthProvider';
import { ErrorState, Loading } from '../src/ui/States';
import { Screen } from '../src/ui/Screen';

export default function Entry() {
  const { state, retry } = useAuth();
  if (state.status === 'loading') return <Loading />;
  if (state.status === 'error') {
    return (
      <Screen>
        <ErrorState message={state.message} onRetry={retry} />
      </Screen>
    );
  }
  return <Redirect href={state.status === 'signedIn' ? '/(tabs)' : '/(auth)/login'} />;
}
