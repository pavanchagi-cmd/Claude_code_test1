import { defineConfig, devices } from '@playwright/test';

// BASE_URL points the suite at a deployed preview; otherwise it builds and
// starts the app locally (CI uses a throwaway Postgres and mock integrations).
const baseURL = process.env.BASE_URL ?? 'http://localhost:3100';
const local = !process.env.BASE_URL;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  globalSetup: local ? './tests/e2e/global-setup.ts' : undefined,
  grep: local ? undefined : /@smoke/,
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    extraHTTPHeaders: process.env.VERCEL_AUTOMATION_BYPASS_SECRET ? { 'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET } : undefined,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } }, grepInvert: /@mobile/ },
    { name: 'mobile', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } }, grep: /@mobile/ },
  ],
  webServer: local
    ? {
        command: 'pnpm start -p 3100',
        url: 'http://localhost:3100',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: { E2E_FIXED_OTP: '246810', PORT: '3100' },
      }
    : undefined,
});
