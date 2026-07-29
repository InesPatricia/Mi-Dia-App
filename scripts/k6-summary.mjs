// Turn the k6 summary export into a Markdown table on the GitHub run page.
//
// WHY: same reasoning as lh-summary.mjs — surface the numbers where they are seen, not buried
// in a downloadable artifact. Here the headline is p(95) latency and the failure rate.
//
// HOW: `k6 run --summary-export=k6-summary.json` writes end-of-test metrics as JSON. We read
// the two that matter for a delivery smoke and render them against our thresholds. Plain Node.
import fs from 'node:fs';

const FILE = process.env.K6_SUMMARY || 'k6-summary.json';
const OUT = process.env.GITHUB_STEP_SUMMARY;
const line = (s = '') => (OUT ? fs.appendFileSync(OUT, s + '\n') : console.log(s));

if (!fs.existsSync(FILE)) {
  line('### 📈 k6');
  line('_No k6 summary found._');
  process.exit(0);
}

const m = JSON.parse(fs.readFileSync(FILE, 'utf8')).metrics;
const p95 = m.http_req_duration?.values?.['p(95)']; // ms
const failRate = m.http_req_failed?.values?.rate; // 0..1
const reqs = m.http_reqs?.values?.count;

// Thresholds mirror perf/smoke.js so the table reads as pass/fail at a glance.
const p95Ok = p95 != null && p95 < 500;
const failOk = failRate != null && failRate < 0.01;

line('### 📈 k6 CDN delivery smoke (5 VUs / 30s, production)');
line('');
line('| Metric | Value | Threshold | |');
line('| --- | --- | --- | --- |');
line(`| Requests | ${reqs ?? '—'} | — | |`);
line(`| p(95) latency | ${p95 != null ? p95.toFixed(0) + ' ms' : '—'} | < 500 ms | ${p95Ok ? '✅' : '❌'} |`);
line(`| Failed rate | ${failRate != null ? (failRate * 100).toFixed(2) + ' %' : '—'} | < 1 % | ${failOk ? '✅' : '❌'} |`);
