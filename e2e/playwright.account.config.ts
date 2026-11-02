import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: 'training-account.spec.ts',
  workers: 1,
  retries: 0,
  timeout: 45_000,
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: process.env.TEACHERLAB_ACCOUNT_BASE_URL ?? 'http://127.0.0.1:3000',
    locale: 'zh-CN',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
});
