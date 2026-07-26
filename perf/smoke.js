// k6 performance smoke — Mi Día PWA (https://mi-dia-app.pages.dev)
//
// WHAT THIS MEASURES
//   CDN/edge delivery of a static, single-file PWA served by Cloudflare Pages:
//   time-to-first-byte + transfer of the app shell (index.html) and its four
//   same-origin companions (service worker + feature modules). That is the
//   complete network surface of this app — there is no backend, no API, no
//   database; after these five files arrive, everything runs client-side.
//
// WHAT THIS DOES *NOT* MEASURE
//   Application logic, rendering, interactivity or persistence — those live in
//   the browser and are covered by the 85-test Playwright e2e suite (and the
//   Lighthouse job for user-centric render metrics). A load test cannot "load"
//   client-side JS, so we don't pretend it does.
//
// LOAD PROFILE — deliberately polite: 5 virtual users for 30 s (~a few hundred
//   requests total) against our own production CDN. This is a smoke/baseline,
//   not a stress test: Cloudflare's edge is not the thing we doubt; what we
//   want is a repeatable latency/error baseline to compare release-over-release.
//
// RUN LOCALLY
//   k6 run perf/smoke.js                       # against production
//   k6 run -e BASE_URL=http://localhost:8080 perf/smoke.js   # against a local server
//
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = __ENV.BASE_URL || 'https://mi-dia-app.pages.dev';

// The app's entire network surface: the shell + the 4 same-origin companion files.
const ROUTES = ['/', '/sw.js', '/ritual.js', '/cycle.js', '/onboard.js'];

export const options = {
  vus: 5, // polite: this is our own live site, not a lab target
  duration: '30s',
  thresholds: {
    // p(95) < 500 ms: generous for a CDN edge hit (typically well under 100 ms
    // from Europe) but tight enough to flag an edge-cache miss pattern or an
    // origin problem. Hard-fails the run (exit code 99) when breached.
    http_req_duration: ['p(95)<500'],
    // < 1% failed requests: a static site behind a CDN should serve ~100%;
    // anything above 1% over 30 s means something is genuinely wrong.
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  for (const route of ROUTES) {
    const res = http.get(`${BASE}${route}`, { tags: { route } });
    check(res, { [`${route} -> 200`]: (r) => r.status === 200 });
  }
  // Think-time so 5 VUs approximate 5 users refreshing, not a tight request loop.
  sleep(1);
}
