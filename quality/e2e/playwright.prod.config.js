// Playwright config for the POST-DEPLOY smoke suite — runs against the LIVE production URL
// (Cloudflare Pages), NOT a local http-server. Kept separate from playwright.config.js so the
// main e2e suite (local build) and the prod smoke never interfere. Test files live in
// ./tests-prod so the default config (testDir ./tests) never picks them up.
const { defineConfig, devices } = require('@playwright/test');

const BASE = process.env.PROD_URL || 'https://mi-dia-app.pages.dev';

module.exports = defineConfig({
  testDir: './tests-prod',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Prod is over the public internet -> a couple of retries absorb transient blips.
  retries: 2,
  // A handful of read-only smoke checks; one worker keeps it gentle on the live site.
  workers: 1,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  timeout: 30_000,
  use: {
    baseURL: BASE,
    screenshot: 'on',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 5'] }, // phone-first app, same viewport as the main suite
    },
  ],
  // NO webServer: we hit the real deployed site.
});
