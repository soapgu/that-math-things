import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  timeout: 120000,
  expect: { timeout: 15000 },
  workers: 4,
  retries: 0,
  outputDir: 'test-results',
  use: {
    baseURL: process.env.CLIENT_BASE_URL || 'http://127.0.0.1:5173/that-math-things/',
    headless: process.env.HEADED !== '1',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    actionTimeout: 10000,
    viewport: { width: 1440, height: 900 },
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
      testMatch: /.*\.spec\.js/,
    },
  ],
  reporter: [
    ['html', { outputFolder: 'e2e-report' }],
    ['list'],
  ],
});