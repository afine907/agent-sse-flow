import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  retries: 0,
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
  },
  webServer: [
    {
      command: 'node src/mock-server/index.mjs',
      port: 3001,
      reuseExistingServer: true,
    },
    {
      command: 'pnpm run dev',
      port: 5173,
      reuseExistingServer: true,
    },
  ],
});
