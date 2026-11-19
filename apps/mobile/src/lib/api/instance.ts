import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { createApiClient } from './client';
import type { TokenStore } from './client';
import { makeApi } from './endpoints';

const KEY = 'fulad.refresh';
const store: TokenStore = {
  getRefresh: () => SecureStore.getItemAsync(KEY),
  setRefresh: async (t) => {
    if (t) await SecureStore.setItemAsync(KEY, t);
    else await SecureStore.deleteItemAsync(KEY);
  },
};

// اندروید امولاتور سیستم میزبان را با 10.0.2.2 می‌بیند
const fallback = Platform.OS === 'android' ? 'http://10.0.2.2:4000/api/v1' : 'http://localhost:4000/api/v1';
export const baseUrl = process.env.EXPO_PUBLIC_API_URL ?? fallback;

const signedOutListeners = new Set<() => void>();
export const subscribeSignedOut = (fn: () => void) => {
  signedOutListeners.add(fn);
  return () => {
    signedOutListeners.delete(fn);
  };
};

export const client = createApiClient({ baseUrl, store, onSignedOut: () => signedOutListeners.forEach((fn) => fn()) });
export const api = makeApi(client);
