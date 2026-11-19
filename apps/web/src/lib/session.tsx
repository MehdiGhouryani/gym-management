'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, setAccessToken } from './api';

export interface SessionUser {
  role: 'OWNER' | 'STAFF';
  gymId: string;
  name: string;
}

export interface GymInfo {
  id: string;
  slug: string;
  name: string;
  city: string;
  status: string;
}

type State = 'loading' | 'signedIn' | 'signedOut';

interface SessionCtx {
  state: State;
  user: SessionUser | null;
  gym: GymInfo | null;
  signIn: (phone: string, code: string) => Promise<void>;
  requestOtp: (phone: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<SessionCtx>({
  state: 'loading',
  user: null,
  gym: null,
  signIn: async () => {},
  requestOtp: async () => {},
  signOut: async () => {},
});

export const useSession = () => useContext(Ctx);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>('loading');
  const [user, setUser] = useState<SessionUser | null>(null);
  const [gym, setGym] = useState<GymInfo | null>(null);

  /** هویت از /me؛ اگر توکن نبود یا گداخته بود، request خودش refresh با کوکی را امتحان می‌کند */
  const loadMe = useCallback(async () => {
    try {
      const me = await api.get<{ type: string; role: string | null; gymId: string }>('/me');
      if (me.type !== 'user' || (me.role !== 'OWNER' && me.role !== 'STAFF')) throw new Error('not staff');
      const gym = await api.get<GymInfo>('/gym');
      setUser({ role: me.role as 'OWNER' | 'STAFF', gymId: me.gymId, name: '' });
      setGym(gym);
      setState('signedIn');
    } catch {
      setUser(null);
      setGym(null);
      setState('signedOut');
    }
  }, []);

  useEffect(() => {
    void loadMe();
  }, [loadMe]);

  const requestOtp = useCallback(async (phone: string) => {
    await api.post('/auth/otp/request', { purpose: 'manager', phone });
  }, []);

  const signIn = useCallback(
    async (phone: string, code: string) => {
      const res = await api.post<{ accessToken: string; subject: { role: string | null; gymId: string; name: string } }>(
        '/auth/otp/verify',
        { purpose: 'manager', phone, code },
      );
      setAccessToken(res.accessToken);
      const gym = await api.get<GymInfo>('/gym');
      setUser({ role: (res.subject.role ?? 'STAFF') as 'OWNER' | 'STAFF', gymId: res.subject.gymId, name: res.subject.name });
      setGym(gym);
      setState('signedIn');
    },
    [],
  );

  const signOut = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      /* خروج محلی در هر حالت انجام می‌شود */
    }
    setAccessToken(null);
    setUser(null);
    setGym(null);
    setState('signedOut');
  }, []);

  const value = useMemo(() => ({ state, user, gym, signIn, requestOtp, signOut }), [state, user, gym, signIn, requestOtp, signOut]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
