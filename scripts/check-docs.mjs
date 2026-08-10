#!/usr/bin/env node
/**
 * check-docs — treat the documentation as a build artifact and gate it.
 *
 * The repo's own argument is that a change should be gated by something that runs, not by a
 * convention someone remembers. This applies that to the docs themselves.
 *
 * Six rules:
 *   [1] no dead paths          — every file path mentioned in the docs exists on disk
 *   [2] no state in the router — CLAUDE.md must not hard-code build numbers or point at private/
 *   [3] router stays small     — CLAUDE.md under MAX_ROUTER_LINES
 *   [4] no count drift         — every test count in the docs matches what the runner reports
 *   [5] history is complete    — every archived changelog heading is still in the build log
 *   [6] router does not fork   — CLAUDE.md is identical on every branch
 *
 * A skipped check is reported loudly and counts as a failure unless it is explicitly allowed.
 * A gate that quietly stops checking is worse than no gate — this repo has already had one.
 *
 * Usage:  node scripts/check-docs.mjs [--root <dir>] [--json]
 * Exit:   0 all rules pass · 1 any rule fails
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve, dirname, basename } from 'node:path';

const args = process.argv.slice(2);
const rootFlag = args.indexOf('--root');
const ROOT = resolve(rootFlag !== -1 ? args[rootFlag + 1] : process.cwd());
const asJson = args.includes('--json');

const ROUTER = 'CLAUDE.md';
const MAX_ROUTER_LINES = 160;
const HEADINGS_BASELINE = 'docs/history/.headings-baseline.txt';
const BUILD_LOG = 'docs/history/BUILD-LOG.md';

/**
 * Docs that are scanned for dead paths and count drift.
 *
 * The skills are in here on purpose. The defect that prompted this checker was three skills routing
 * agents to a CLAUDE.md heading that had been deleted, so the files that *point* at documentation
 * are exactly as worth gating as the documentation itself.
 */
const SCANNED = [
  ROUTER,
  'README.md',
  'CHANGELOG.md',
  'docs/DATA_SCHEMA.md',
  'docs/DESIGN_SYSTEM.md',
  'docs/APP-REFERENCE.md',
  'docs/QA-ARCHITECTURE.md',
  'docs/AGENTIC-QA.md',
  ...skillDocs(),
];

/** Every markdown file under .claude/skills, which is where the routing instructions live. */
function skillDocs(dir = join(ROOT, '.claude', 'skills'), acc = []) {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) skillDocs(full, acc);
    else if (entry.name.endsWith('.md')) acc.push(full.slice(ROOT.length + 1).replace(/\\/g, '/'));
  }
  return acc;
}

const results = [];
const record = (rule, status, detail) => results.push({ rule, status, detail });
const pass = (rule, detail) => record(rule, 'PASS', detail);
const fail = (rule, detail) => record(rule, 'FAIL', detail);
const skip = (rule, detail) => record(rule, 'SKIP', detail);

const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const has = (rel) => existsSync(join(ROOT, rel));
const present = () => SCANNED.filter(has);

// ---------------------------------------------------------------- [1] dead paths

const PATH_EXT = /\.(md|mjs|js|cjs|json|html|yml|yaml|txt|png|svg|css)$/i;

/**
 * Output a command produces on demand. A clean checkout — CI, or a colleague's first clone — does
 * not have any of it, so a doc may name it without the path being dead.
 *
 * These mirror the build-artifact block in .gitignore. Keep them in step: anything ignored because
 * a command writes it belongs here, and nothing else does. An allowlist is how a gate stops gating.
 */
const GENERATED_PREFIXES = [
  'e2e/test-results/',
  'e2e/playwright-report/',
  'e2e/blob-report/',
  'e2e/all-blob-reports/',
  'e2e/theme-grid-out/',
  'theme-grid-out/',
];
const GENERATED_FILES = new Set([
  'e2e/TEST-REPORT.md',  // npm run report
  'e2e/results.json',    // playwright json reporter
  'report_json.json',    // ZAP baseline output
]);
const isGenerated = (p) =>
  GENERATED_FILES.has(p) || GENERATED_PREFIXES.some((prefix) => p.startsWith(prefix));

/** Paths a doc points at, from markdown links and from backticked tokens that look like files. */
function pathsIn(text) {
  const out = new Set();

  for (const [, target] of text.matchAll(/\]\(([^)\s]+)\)/g)) {
    if (/^(https?:|mailto:|#)/.test(target)) continue;
    out.add(target.split('#')[0]);
  }
  for (const [, token] of text.matchAll(/`([^`\n]+)`/g)) {
    const t = token.trim();
    if (/\s/.test(t) || !PATH_EXT.test(t)) continue;
    if (/^(https?:|#)/.test(t)) continue;
    // wildcards, ranges and placeholders are patterns, not paths
    if (/[*?()]|\.\.|vNN|vNEW|vOLD|NNN?\b/.test(t)) continue;
    // a bare extension (`.html`, `.json`) is prose, not a reference
    if (/^\./.test(t) && !t.slice(1).includes('.')) continue;
    out.add(t);
  }
  return [...out];
}

/** Every filename in the repo, so a doc may name a file without spelling out its directory. */
let fileIndex = null;
const IGNORED_DIRS = new Set(['.git', 'node_modules', 'test-results', 'playwright-report', '.wrangler']);
function repoFilenames(dir = ROOT, acc = new Set()) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      repoFilenames(join(dir, entry.name), acc);
    } else {
      acc.add(entry.name);
    }
  }
  return acc;
}

function checkDeadPaths() {
  fileIndex ??= repoFilenames();
  const dead = [];
  for (const doc of present()) {
    const base = dirname(join(ROOT, doc));
    for (const p of pathsIn(read(doc))) {
      const clean = p.replace(/^\.?\//, '');
      if (isGenerated(clean)) continue;
      // private/ is the product worktree's gitignored corpus — real, but never present here
      if (clean.startsWith('private/')) continue;
      const resolves =
        existsSync(resolve(base, p)) ||
        existsSync(resolve(ROOT, clean)) ||
        // a bare filename counts if a file with that name exists anywhere in the repo
        (!clean.includes('/') && fileIndex.has(basename(clean)));
      if (!resolves) dead.push(`${doc} -> ${p}`);
    }
  }
  dead.length
    ? fail(1, `${dead.length} dead path(s):\n      ${dead.join('\n      ')}`)
    : pass(1, `${present().length} docs, every referenced path resolves`);
}

// ---------------------------------------------------------------- [2] no state in the router

function checkRouterHasNoState() {
  if (!has(ROUTER)) return fail(2, `${ROUTER} is missing`);
  const offences = [];
  read(ROUTER).split(/\r?\n/).forEach((line, i) => {
    const n = i + 1;
    // a concrete build number pins the router to one branch; vNN as a placeholder is fine
    for (const [m] of line.matchAll(/\bv\d{2,3}\b/g)) offences.push(`${n}: build literal ${m}`);
    if (/(^|[^\w.])private\//.test(line)) offences.push(`${n}: reference to private/ (absent in this worktree)`);
  });
  offences.length
    ? fail(2, `${ROUTER} carries branch state:\n      ${offences.join('\n      ')}`)
    : pass(2, `${ROUTER} states no build number and no private/ path`);
}

// ---------------------------------------------------------------- [3] router stays small

function checkRouterSize() {
  if (!has(ROUTER)) return fail(3, `${ROUTER} is missing`);
  const n = read(ROUTER).split(/\r?\n/).length;
  n > MAX_ROUTER_LINES
    ? fail(3, `${ROUTER} is ${n} lines, limit is ${MAX_ROUTER_LINES}`)
    : pass(3, `${ROUTER} is ${n} lines (limit ${MAX_ROUTER_LINES})`);
}

// ---------------------------------------------------------------- [4] no count drift

/**
 * Guards against drift, not against ambiguity: a number in the docs must be one the runner can
 * actually produce. Phrasing them consistently is an editorial job, not this script's.
 */
function checkTestCounts() {
  let counts;
  try {
    const raw = execFileSync(process.execPath, [join(ROOT, 'e2e', 'count-tests.js')], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    counts = JSON.parse(raw.slice(raw.indexOf('{')));
  } catch (err) {
    return fail(4, `could not run e2e/count-tests.js: ${err.message.split('\n')[0]}`);
  }

  const f = counts.functional.tests;
  const v = counts.visual.tests;
  const p = counts.prod.tests;
  const allowed = new Map([
    [f, 'functional'],
    [v, 'visual'],
    [p, 'prod smoke'],
    [f + v, 'functional + visual'],
  ]);

  const PATTERNS = [
    /e2e-(\d+)%20Playwright/g,          // README shields badge
    /\be2e[\s-](\d+)\b/gi,              // "e2e 85", "e2e-83"
    /\b(\d+)\s+(?:functional\s+)?(?:end-to-end|Playwright)\s+tests/gi,
    /\b(\d+)\s+smoke\s+tests/gi,
  ];

  const bad = [];
  for (const doc of present().filter((d) => d !== BUILD_LOG)) {
    const text = read(doc);
    for (const re of PATTERNS) {
      for (const [whole, num] of text.matchAll(re)) {
        const n = Number(num);
        if (!allowed.has(n)) bad.push(`${doc}: "${whole.trim()}" — runner reports ${f}/${v}/${p}`);
      }
    }
  }
  bad.length
    ? fail(4, `test counts drifted:\n      ${bad.join('\n      ')}`)
    : pass(4, `counts match the runner (${f} functional · ${v} visual · ${p} prod smoke)`);
}

// ---------------------------------------------------------------- [5] history is complete

function checkHistoryComplete() {
  if (!has(HEADINGS_BASELINE)) {
    return fail(5, `${HEADINGS_BASELINE} is missing — the baseline is what proves nothing was dropped`);
  }
  if (!has(BUILD_LOG)) return fail(5, `${BUILD_LOG} is missing`);

  const baseline = read(HEADINGS_BASELINE)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const log = read(BUILD_LOG);
  const missing = baseline.filter((h) => !log.includes(h));

  missing.length
    ? fail(5, `${missing.length} archived heading(s) missing from ${BUILD_LOG}:\n      ${missing.join('\n      ')}`)
    : pass(5, `all ${baseline.length} archived headings present in ${BUILD_LOG}`);
}

// ---------------------------------------------------------------- [6] router does not fork

function git(...a) {
  return execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

/**
 * Which branch this run represents.
 *
 * CI checks out a pull request as a detached HEAD at the merge commit, so asking git gives "HEAD"
 * and every branch-name rule silently stops applying. GitHub names the real branch in the
 * environment instead — GITHUB_HEAD_REF on a pull_request, GITHUB_REF_NAME on a push — so those win.
 */
function currentBranch() {
  const fromEnv = process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME;
  if (fromEnv) return fromEnv.trim();
  try {
    const head = git('rev-parse', '--abbrev-ref', 'HEAD');
    return head === 'HEAD' ? null : head; // detached, and nothing told us what it stands for
  } catch {
    return null;
  }
}

function checkRouterDoesNotFork() {
  const branch = currentBranch();
  if (!branch) {
    return fail(6, 'cannot tell which branch this is (detached HEAD, no GITHUB_HEAD_REF/GITHUB_REF_NAME)');
  }

  // Documentation branches are where the router is legitimately being changed. Without this the
  // rule would fire on every commit that edits it, and a rule people must bypass gets deleted.
  if (/^docs\//.test(branch)) {
    return skip(6, `on "${branch}" — the router is expected to change here (allowed)`);
  }

  const baseRef = ['main', 'origin/main'].find((r) => {
    try { git('rev-parse', '--verify', '--quiet', r); return true; } catch { return false; }
  });
  if (!baseRef) {
    return fail(6, 'no main / origin/main ref available — CI needs fetch-depth: 0 for this rule');
  }

  let baseline;
  try {
    baseline = git('show', `${baseRef}:${ROUTER}`);
  } catch {
    return fail(6, `${ROUTER} does not exist on ${baseRef}`);
  }

  const local = read(ROUTER).replace(/\r\n/g, '\n').trim();
  local === baseline.replace(/\r\n/g, '\n').trim()
    ? pass(6, `${ROUTER} is identical to ${baseRef}`)
    : fail(6, `${ROUTER} differs from ${baseRef} — the router must not fork per branch`);
}

// ---------------------------------------------------------------- run

const RULES = [
  ['no dead paths', checkDeadPaths],
  ['no state in the router', checkRouterHasNoState],
  ['router stays small', checkRouterSize],
  ['no test-count drift', checkTestCounts],
  ['history is complete', checkHistoryComplete],
  ['router does not fork', checkRouterDoesNotFork],
];

for (const [, fn] of RULES) {
  try {
    fn();
  } catch (err) {
    fail(RULES.findIndex(([, f]) => f === fn) + 1, `crashed: ${err.message}`);
  }
}

const failed = results.filter((r) => r.status === 'FAIL');
const skipped = results.filter((r) => r.status === 'SKIP');

if (asJson) {
  console.log(JSON.stringify({ ok: failed.length === 0, results }, null, 2));
} else {
  const mark = { PASS: 'ok  ', FAIL: 'FAIL', SKIP: 'skip' };
  console.log(`check-docs — ${ROOT}\n`);
  for (const r of results) {
    console.log(`  [${r.rule}] ${mark[r.status]}  ${RULES[r.rule - 1][0]}`);
    console.log(`        ${r.detail}`);
  }
  console.log();
  console.log(
    failed.length
      ? `FAILED — ${failed.length} rule(s) broken${skipped.length ? `, ${skipped.length} skipped` : ''}`
      : `OK — ${results.length - skipped.length} rule(s) passed${skipped.length ? `, ${skipped.length} skipped` : ''}`,
  );
}

process.exit(failed.length ? 1 : 0);
