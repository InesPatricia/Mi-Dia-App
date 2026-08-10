// Simple, dependency-free test report.
// Runs the suite with the JSON reporter (written to a file so the dev-server's stdout
// noise can't corrupt it), then emits a concise Markdown summary to TEST-REPORT.md.
// Usage: npm run report
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const JSON_FILE = 'results.json';
const OUT = 'TEST-REPORT.md';

// 1) run the suite -> JSON file (+ live list output on the console)
process.env.PLAYWRIGHT_JSON_OUTPUT_NAME = JSON_FILE;
let failedRun = false;
try {
  execSync('npx playwright test --reporter=list,json', { stdio: 'inherit' });
} catch (e) {
  failedRun = true; // some tests failed — we still build the report below
}

// 2) parse
const data = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
const rows = [];
(function walk(suite, file) {
  const f = suite.file ? path.basename(suite.file) : file;
  for (const spec of suite.specs || []) rows.push({ file: f, title: spec.title, ok: spec.ok });
  for (const child of suite.suites || []) walk(child, f);
})({ suites: data.suites }, '?');

// 3) group by spec file
const byFile = {};
for (const r of rows) {
  (byFile[r.file] = byFile[r.file] || { pass: 0, total: 0, fails: [] });
  byFile[r.file].total++;
  if (r.ok) byFile[r.file].pass++;
  else byFile[r.file].fails.push(r.title);
}

const s = data.stats || {};
const dur = Math.round((s.duration || 0) / 1000);
const mmss = `${Math.floor(dur / 60)}m ${dur % 60}s`;
const stamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
const proj = (data.config && data.config.projects && data.config.projects[0] && data.config.projects[0].name) || 'default';

// 4) emit Markdown
let md = `# Mi Día — E2E test report\n\n`;
md += `_${stamp} · Playwright ${data.config?.version || ''} · project: ${proj}_\n\n`;
md += `**${s.expected || 0} passed**`;
if (s.unexpected) md += ` · **${s.unexpected} failed**`;
if (s.flaky) md += ` · ${s.flaky} flaky`;
if (s.skipped) md += ` · ${s.skipped} skipped`;
md += ` · ${mmss}\n\n`;

md += `| Suite | Result |\n|---|---|\n`;
for (const f of Object.keys(byFile).sort()) {
  const b = byFile[f];
  const mark = b.fails.length ? '❌' : '✅';
  md += `| ${f} | ${mark} ${b.pass}/${b.total} |\n`;
}

const allFails = rows.filter((r) => !r.ok);
if (allFails.length) {
  md += `\n## Failures\n\n`;
  for (const r of allFails) md += `- ❌ \`${r.file}\` — ${r.title}\n`;
}

// per-test breakdown, grouped by suite file (in the order tests appear)
md += `\n## Details\n`;
for (const f of Object.keys(byFile).sort()) {
  const b = byFile[f];
  md += `\n### ${f} — ${b.fails.length ? '❌' : '✅'} ${b.pass}/${b.total}\n`;
  for (const r of rows.filter((x) => x.file === f)) {
    md += `- ${r.ok ? '✅' : '❌'} ${r.title}\n`;
  }
}

md += `\n_Total: ${rows.length} tests across ${Object.keys(byFile).length} suites._\n`;

fs.writeFileSync(OUT, md);
fs.rmSync(JSON_FILE, { force: true });
console.log(`\nWrote ${OUT} (${rows.length} tests).`);
process.exit(failedRun ? 1 : 0);
