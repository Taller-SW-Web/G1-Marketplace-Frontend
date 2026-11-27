import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/h4-connected', workers: 1, fullyParallel: false, timeout: 60000,
  outputDir: 'test-results/h4-connected', reporter: 'list',
  use: { baseURL: process.env.H4_TEST_ORIGIN, browserName: 'chromium',
    channel: process.env.CI ? undefined : 'msedge', trace: 'off', video: 'off' },
});
