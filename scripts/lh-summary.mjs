// Turn the Lighthouse CI result into a Markdown table on the GitHub run page.
//
// WHY: Lighthouse scores otherwise live only inside a downloaded artifact. Writing them to
// $GITHUB_STEP_SUMMARY (a file GitHub renders as Markdown right on the run's summary page)
// removes the friction — the numbers are visible at a glance, so they actually get looked at.
//
// HOW: `lhci autorun` with the filesystem target drops a manifest.json in the report dir. The
// entry with isRepresentativeRun:true is the median run (the one the budgets were asserted on);
// we read its category scores and print them. No dependencies — plain Node 18+.
//
// Never throws the workflow off course: if the report is missing (e.g. Lighthouse crashed
// before writing), we note that and exit 0 — a summary is a nice-to-have, not a gate.
import fs from 'node:fs';

const REPORT_DIR = process.env.LH_REPORT_DIR || '.lighthouseci-report';
const OUT = process.env.GITHUB_STEP_SUMMARY; // set by GitHub Actions; undefined when run locally

function line(s = '') {
  if (OUT) fs.appendFileSync(OUT, s + '\n');
  else console.log(s); // running locally: just print, so the script is testable by hand
}

const manifestPath = `${REPORT_DIR}/manifest.json`;
if (!fs.existsSync(manifestPath)) {
  line('### 🚦 Lighthouse');
  line('_No Lighthouse report found (the run may have failed before producing one)._');
  process.exit(0);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const median = manifest.find((r) => r.isRepresentativeRun) || manifest[0];
const s = median.summary; // { performance, accessibility, best-practices, pwa } as 0..1

// A tiny visual cue so a glance is enough: green ≥0.9, yellow ≥0.5, red below.
const pct = (v) => Math.round(v * 100);
const dot = (v) => (v >= 0.9 ? '🟢' : v >= 0.5 ? '🟡' : '🔴');
const row = (label, v) => `| ${label} | ${dot(v)} ${pct(v)} |`;

line('### 🚦 Lighthouse (median of 3 runs, production)');
line('');
line('| Category | Score |');
line('| --- | --- |');
line(row('Performance', s.performance));
line(row('Accessibility', s.accessibility));
line(row('Best practices', s['best-practices']));
line(row('PWA', s.pwa));
line('');
line(`_Measured on ${median.url}_`);
