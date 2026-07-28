import { defineConfig } from '@playwright/test';

const externalBaseURL = process.env.CLIENT_BASE_URL;
const defaultBaseURL = 'http://127.0.0.1:5173/that-math-things/';
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: '.',
  timeout: 120000,
  expect: { timeout: 15000 },
  workers: isCI ? 2 : 4,
  retries: isCI ? 1 : 0,
  outputDir: 'test-results',
  use: {
    baseURL: externalBaseURL || defaultBaseURL,
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
  webServer: externalBaseURL
    ? undefined
    : {
        command: 'npm start -- --host 127.0.0.1 --port 5173 --strictPort',
        url: defaultBaseURL,
        reuseExistingServer: false,
        timeout: 120000,
      },
  reporter: [
    ['html', { outputFolder: 'e2e-report', open: 'never' }],
    ['list'],
  ],
});
