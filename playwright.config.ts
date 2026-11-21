import { defineConfig } from '@playwright/test';

const baseURL = 'http://127.0.0.1:4196';

export default defineConfig({
  testDir: './tests/browser',
  outputDir: './artifacts/browser-tests',
  use: { baseURL, browserName: 'chromium' },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 960 } } },
    { name: 'phone', use: { viewport: { width: 390, height: 844 }, hasTouch: true } },
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4196 --strictPort',
    url: baseURL,
  },
});
