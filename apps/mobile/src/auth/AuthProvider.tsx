import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../lib/api/client';
import { api, client, subscribeSignedOut } from '../lib/api/instance';
import type { GymDto, Me } from '../lib/api/types';
import { messageOf } from '../lib/errors';

type State =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'error'; message: string }
  | { status: 'signedIn'; me: Me; gym: GymDto };

interface Ctx {
  state: State;
  signIn(phone: string, code: string): Promise<void>;
  signOut(): Promise<void>;
  retry(): void;
}
const AuthContext = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<State>({ status: 'loading' });

  const loadProfile = useCallback(async () => {
    const [me, gym] = await Promise.all([api.me(), api.gym()]);
    if (me.type !== 'user') {
      await client.clearSession(); // این اپ فقط برای مدیر و پذیرش است
      setState({ status: 'signedOut' });
      return;
    }
    setState({ status: 'signedIn', me, gym });
  }, []);

  const bootstrap = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      if (!(await client.restore())) return setState({ status: 'signedOut' });
      await loadProfile();
    } catch (e) {
      // قطع اینترنت یا خطای سرور: نشست حفظ می‌شود و کاربر «تلاش دوباره» می‌زند
      if (e instanceof ApiError && (e.status === 0 || e.status >= 500)) setState({ status: 'error', message: messageOf(e) });
      else {
        await client.clearSession();
        setState({ status: 'signedOut' });
      }
    }
  }, [loadProfile]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(
    () =>
      subscribeSignedOut(() => {
        queryClient.clear();
        setState({ status: 'signedOut' });
      }),
    [queryClient],
  );

  const value = useMemo<Ctx>(
    () => ({
      state,
      async signIn(phone, code) {
        await api.verifyOtp(phone, code);
        await loadProfile();
      },
      async signOut() {
        await api.logout();
        queryClient.clear();
        setState({ status: 'signedOut' });
      },
      retry: () => void bootstrap(),
    }),
    [state, loadProfile, bootstrap, queryClient],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): Ctx {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth باید داخل AuthProvider باشد');
  return ctx;
}

/** فقط در صفحه‌هایی که بعد از ورود دیده می‌شوند */
export function useSignedIn(): { me: Me; gym: GymDto } {
  const { state } = useAuth();
  if (state.status !== 'signedIn') throw new Error('کاربر وارد نشده است');
  return { me: state.me, gym: state.gym };
}
