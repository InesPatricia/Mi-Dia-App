// Lighthouse CI — post-deploy performance/quality baseline for the PRODUCTION URL.
// Invoked by .github/workflows/smoke-prod.yml AFTER the smoke job has confirmed the
// new build is actually live (wait-for-deploy), so we always measure the build we
// just shipped — never a stale cached one.
//
// PINNED TOOLING: @lhci/cli 0.13.x = Lighthouse 11, the last major version with the
// PWA category (removed in Lighthouse 12). "Installable + offline" is part of this
// app's story, so we deliberately trade newer scoring calibration for keeping the
// PWA category asserted. Revisit the pin if/when PWA coverage moves fully to e2e.
//
// Budget philosophy: ERROR only on hard regressions (a floor comfortably below the
// measured baseline), WARN on drift. Baseline measured 2026-07-27 against prod (v172),
// mobile emulation: perf 0.62 · a11y 0.95 · best-practices 0.96 · pwa 0.88
// (FCP 5.2 s · LCP 5.8 s · TBT 0 ms · CLS 0.03).

module.exports = {
  ci: {
    collect: {
      url: ['https://mi-dia-app.pages.dev/'],
      // Median of 3 runs: a single run against a live URL can swing the perf score
      // by ±0.05–0.10 from network/CDN variance alone.
      numberOfRuns: 3,
      settings: {
        // Default mobile emulation (throttled CPU + 4G) — matches how the app is
        // really used (installed PWA on a phone) and how PageSpeed would score it.
        // SEO category intentionally excluded: this is an app, not a content site.
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'pwa'],
      },
    },
    assert: {
      assertions: {
        // Baseline 0.62. A ~1 MB self-contained HTML file parsed cold is the app's
        // deliberate architecture trade-off (zero build, zero supply chain), so we
        // don't pretend it scores 0.9. Floor at 0.50: tolerates live-network noise,
        // still catches a structural regression (new blocking asset, runaway JS).
        'categories:performance': ['error', { minScore: 0.5 }],

        // Baseline 0.95. The primary a11y gate is axe-core inside the e2e suite;
        // this floor is the independent post-deploy safety net.
        'categories:accessibility': ['error', { minScore: 0.9 }],

        // Baseline 0.96. Below 0.9 would mean something real (console errors,
        // deprecated APIs, mixed content) reached production.
        'categories:best-practices': ['error', { minScore: 0.9 }],

        // Baseline 0.88 — the only failing audit is splash-screen (no iOS splash
        // assets), a known accepted gap. Floor at 0.80 still fails the run if the
        // app loses installability or its service worker.
        'categories:pwa': ['error', { minScore: 0.8 }],

        // Metric-level DRIFT alarms (warn-only): visible in the report without
        // failing the job. Values = baseline + headroom for live-network variance.
        'first-contentful-paint': ['warn', { maxNumericValue: 6500 }], // baseline 5.2 s
        'largest-contentful-paint': ['warn', { maxNumericValue: 7000 }], // baseline 5.8 s
        'total-blocking-time': ['warn', { maxNumericValue: 300 }], // baseline 0 ms
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }], // baseline 0.03
      },
    },
    upload: {
      // Reports stay in the CI workspace and are published only as a GitHub
      // Actions artifact — never to third-party public storage.
      target: 'filesystem',
      outputDir: '.lighthouseci-report',
    },
  },
};
