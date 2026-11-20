'use client';

import { createApiClient } from './api';

/** نشست مستقل پورتال عضو — توکن در حافظه، refresh با کوکی HttpOnly */
let memberAccessToken: string | null = null;

export const memberApi = createApiClient(
  () => memberAccessToken,
  (t) => {
    memberAccessToken = t;
  },
);
