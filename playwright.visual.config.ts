import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 5 * 60_000,
  expect: {
    timeout: 15_000
  },
  use: {
    baseURL: 'http://127.0.0.1:3303',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off'
  },
  webServer: {
    command: 'npm run start -- --port 3303 --hostname 127.0.0.1',
    url: 'http://127.0.0.1:3303',
    reuseExistingServer: true,
    timeout: 120_000
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome']
      }
    }
  ]
});
