import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'scripts/screenshots',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:3000',
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    locale: 'en-US',
    colorScheme: 'light',
  },
  webServer: {
    command: 'pnpm dev -p 3000',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
