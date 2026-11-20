import { defineConfig } from 'vitest/config';

/** تست‌های واحد وب فقط در test/؛ مسیرهای e2e/ مال Playwright است */
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
  },
});
