// Playwright config for Mi Dia (dev-only test harness — NOT part of the single-file app).
// This whole harness lives in e2e/. The static server serves the PARENT dir (..) so the
// app's index.html (= the promoted build) + service worker behave like production, and the
// suite runs in a mobile Chromium viewport because the app is phone-first (~412px layout).
const { defineConfig, devices } = require('@playwright/test');

const PORT = 5173;

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // 1 local retry absorbs rare transient http-server connection resets under parallel
  // load (a dev-server quirk, not a test bug); CI gets 2. A consistently failing test
  // still fails on every attempt, so this does not mask real regressions.
  retries: process.env.CI ? 2 : 1,
  // WORKERS = parallelism across CPU cores on ONE machine. SHARDS (--shard=i/n, set per CI
  // job) split the suite across DIFFERENT machines. They compose: e.g. 2 shards x 2 workers
  // = 4 tests running at once. Locally we leave workers to Playwright's default (~cores/2);
  // in CI we pin 2 workers per shard for predictable timing.
  workers: process.env.CI ? 2 : undefined,
  // On CI each shard emits a 'blob' report; the merge job combines them into one HTML report
  // (`playwright merge-reports`). Locally we keep the human-friendly html + list reporters.
  reporter: process.env.CI ? [['blob']] : [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    // CI: capture a screenshot of EVERY test (pass or fail) so the merged HTML report
    // is fully illustrated. Locally stay lean (screenshot only on failure) for fast runs.
    // To WATCH a run live: `npm run test:watch` (headed) / `npm run test:ui`; to record
    // video of a passing run on demand: `PWVIDEO=1`.
    screenshot: process.env.CI ? 'on' : 'only-on-failure',
    video: process.env.CI || process.env.PWVIDEO ? 'on' : 'retain-on-failure',
    trace: 'on-first-retry',
    // Optional slow-motion for watching a headed run with the eye: set PWSLOW=350 (ms/action).
    launchOptions: { slowMo: process.env.PWSLOW ? Number(process.env.PWSLOW) : 0 },
  },
  projects: [
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 5'] }, // mobile Chromium, 393x851, isMobile
    },
  ],
  webServer: {
    command: `npx http-server .. -p ${PORT} -c-1 --silent`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
