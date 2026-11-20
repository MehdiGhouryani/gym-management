import { defineConfig } from '@playwright/test';

/**
 * E2E فولاد — نیازمند پایگاه داده‌ی مهاجرت‌شده و seed‌شده:
 *   pnpm db:generate && pnpm db:deploy && pnpm db:seed
 * سرورهای api و web را خود این کانفیگ بالا می‌آورد.
 * کد OTP در تست با OTP_FIXED_CODE=12345 ثابت می‌شود (فقط خارج از production).
 */
const API_URL = 'http://localhost:4000';

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'line' : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'node ../../apps/api/dist/main.js',
      url: `${API_URL}/api/v1/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      env: {
        ...process.env,
        NODE_ENV: 'test',
        PORT: '4000',
        OTP_FIXED_CODE: '12345',
        JWT_SECRET: process.env.JWT_SECRET ?? 'e2e-only-secret-key-0123456789abcdef0123',
        OTP_PEPPER: process.env.OTP_PEPPER ?? 'e2e-only-pepper-0123456789',
        SMS_PROVIDER: 'console',
        ENABLE_DOCS: 'false',
        WEB_ORIGIN: 'http://localhost:3000',
      },
    },
    {
      command: 'pnpm start',
      url: 'http://localhost:3000/api',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
