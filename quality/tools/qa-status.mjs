// Keep docs/QA-STATUS.md honest: derive what can be derived, and refuse a status the repository
// contradicts.
//
// WHY THIS EXISTS
//   A hand-maintained status file is a claim nobody re-checks, so it drifts, and a stale status is
//   worse than none: the next reader, human or agent, builds on a floor that was never poured. Same
//   failure mode as a CI gate that never runs, and as the README test count before count-tests.js
//   took that number over.
//
//   So this does two things. It REGENERATES the derived block (branch, commit, which artifacts are
//   actually on disk), and it CROSS-CHECKS the hand-written progress table against them. A phase may
//   only be marked DONE if the files it was supposed to produce exist.
//
// WHAT IT DELIBERATELY DOES NOT DO
//   It does not count tests. quality/e2e/count-tests.js already owns that number by asking the
//   runner, and a second source of truth for one number is how two numbers start disagreeing. This
//   points at it instead.
//
//   It also cannot verify every phase. A branch reconciliation and a set of documentation edits
//   leave no single file behind that proves them. Those are reported as "not machine-checkable"
//   rather than silently assumed, because a checker that pretends to cover everything is exactly the
//   thing this repository keeps finding and deleting.
//
// USAGE
//   node quality/tools/qa-status.mjs           rewrite the derived block in docs/QA-STATUS.md
//   node quality/tools/qa-status.mjs --check    verify it is current and consistent; exit 1 on drift
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const STATUS = path.join(ROOT, 'docs', 'QA-STATUS.md');
const START = '<!-- qa-status:derived:start -->';
const END = '<!-- qa-status:derived:end -->';

// A probe returns true, false, or null for "does not apply on this branch".
//
// The null matters, and it was found the hard way. The first version of this file asked whether
// garden.spec.js still carried a vacuous assertion by testing that the text was absent. That spec
// only exists on staging, so here the missing file read as "defect fixed" and the tool reported a
// green it had not earned. A probe must fail closed, so anything that reads a file says first
// whether the file is even there.
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const fileGone = (rel) => !exists(rel);
const fileHas = (rel, needle) => (exists(rel) ? read(rel).includes(needle) : null);
const fileLacks = (rel, needle) => (exists(rel) ? !read(rel).includes(needle) : null);
const all = (...values) => (values.includes(null) ? null : values.every(Boolean));

// Each phase names the evidence that it happened: a list of [label, probe].
// A phase with no probes cannot be machine-checked, and says so rather than guessing.
const PHASES = [
  {
    id: 0,
    title: 'Reconcile staging, open the working branch, record the baseline',
    probes: [],
    note: 'a merge and a set of measurements leave no single file behind',
  },
  {
    id: 1,
    title: 'Point defects',
    probes: [
      ['make-report retired', () => fileGone('quality/e2e/make-report.js')],
      // garden.spec.js is a staging-only spec for a staging-only feature, so this probe reports
      // "does not apply" on any branch that does not carry it. That fix belongs to staging.
      ['vacuous assertion gone', () => fileLacks('quality/e2e/tests/garden.spec.js', 'toBeGreaterThanOrEqual(0)')],
      ['fixed waits removed', () => all(
        fileLacks('quality/e2e/tests/ritual.spec.js', 'waitForTimeout'),
        fileLacks('quality/e2e/tests-prod/smoke-prod.spec.js', 'waitForTimeout'),
      )],
      // An identifier, not a fragment of the pattern. The first version searched for "s+tests",
      // which is already a substring of the pattern that was there before, so it matched the old
      // code and called it the new one.
      ['count rule widened', () => fileHas('quality/tools/check-docs.mjs', 'BARE_TEST_COUNT')],
    ],
  },
  {
    id: 2,
    title: 'Linting, and the status check armed in CI',
    probes: [
      ['eslint config present', () => exists('quality/e2e/eslint.config.mjs')],
      ['status check wired into CI', () => fileHas('.github/workflows/e2e.yml', 'qa-status.mjs --check')],
    ],
  },
  {
    id: 3,
    title: 'Unit level',
    probes: [
      ['module loader present', () => exists('quality/unit/load-module.mjs')],
      ['ritual calc tests present', () => exists('quality/unit/ritual-calc.test.mjs')],
      ['cycle calc tests present', () => exists('quality/unit/cycle-calc.test.mjs')],
    ],
  },
  {
    id: 4,
    title: 'Integration level',
    probes: [
      ['schema spec present', () => exists('quality/e2e/tests-integration/storage-schema.spec.js')],
      ['import spec present', () => exists('quality/e2e/tests-integration/backup-import.spec.js')],
      ['integration project declared', () => fileHas('quality/e2e/playwright.config.js', "name: 'integration'")],
    ],
  },
  {
    id: 5,
    title: 'Mutation audit: the tool, and the baseline recorded before the refactor',
    probes: [
      ['tool present', () => exists('quality/tools/mutate.mjs')],
      ['baseline report committed', () => exists('quality/tools/MUTATION-REPORT.md')],
    ],
  },
  {
    id: 6,
    title: 'E2E architecture: page objects, fixtures, strings',
    probes: [
      ['pages present', () => exists('quality/e2e/pages/app.page.js')],
      ['components present', () => exists('quality/e2e/components')],
      ['fixtures present', () => exists('quality/e2e/fixtures/app.fixture.js')],
      ['strings present', () => exists('quality/e2e/strings/en.js')],
    ],
  },
  {
    id: 7,
    title: 'New E2E coverage: offline, keyboard, aria contract',
    probes: [
      ['offline spec present', () => exists('quality/e2e/tests/offline.spec.js')],
      ['keyboard spec present', () => exists('quality/e2e/tests/keyboard-a11y.spec.js')],
      ['aria contract present', () => exists('quality/e2e/tests/aria-contract.spec.js')],
      ['pixel baselines retired', () => fileGone('quality/e2e/tests/visual.spec.js')],
    ],
  },
  {
    id: 8,
    title: 'Documentation and the published page',
    probes: [['architecture doc carries the four levels', () => fileHas('docs/QA-ARCHITECTURE.md', 'Four levels')]],
  },
];

function git(args) {
  try {
    return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

function evaluate() {
  return PHASES.map((phase) => {
    const results = phase.probes.map(([label, probe]) => {
      // A probe that throws is a broken probe, and a broken probe must never read as a pass.
      let outcome = false;
      try { outcome = probe(); } catch { outcome = false; }
      return { label, outcome };
    });
    const applicable = results.filter((r) => r.outcome !== null);
    const met = applicable.filter((r) => r.outcome === true).length;
    const state = phase.probes.length === 0
      ? 'UNVERIFIABLE'
      : applicable.length === 0 ? 'NOT ON THIS BRANCH'
      : met === 0 ? 'NONE'
      : met === applicable.length ? 'COMPLETE'
      : 'PARTIAL';
    return { ...phase, results, met, state };
  });
}

const MARK = { true: 'yes', false: 'no', null: 'n/a' };

function renderDerived(phases) {
  const lines = [
    START,
    '',
    '> Generated by `node quality/tools/qa-status.mjs`. Do not edit this block by hand.',
    '',
    // The branch is here because it says which worktree state the evidence below was read from.
    //
    // The commit hash is NOT here, and that is deliberate. An earlier version recorded it, which
    // made the block invalidate itself the moment this file was committed: --check went red on the
    // very commit that wrote it, and would have gone red on every pull request touching the file.
    // A check that cries wolf gets ignored, and then it is worth less than no check at all. How
    // fresh this snapshot is, is already answerable with `git log -1 -- docs/QA-STATUS.md`.
    `- Worktree branch: \`${git(['rev-parse', '--abbrev-ref', 'HEAD'])}\``,
    '- Authoritative test count: `node quality/e2e/count-tests.js`. This file keeps no second copy.',
    '',
    '| Phase | Evidence found on disk | State |',
    '|---|---|---|',
  ];
  for (const phase of phases) {
    const evidence = phase.probes.length === 0
      ? `not machine-checkable, ${phase.note}`
      : phase.results.map((probe) => `${MARK[probe.outcome]} ${probe.label}`).join('; ');
    lines.push(`| ${phase.id} | ${evidence} | ${phase.state} |`);
  }
  lines.push('', END);
  return lines.join('\n');
}

// Read the hand-written progress table. Splitting on the pipe is deliberately duller than a regex:
// the row shape is allowed to grow columns without this silently reading the wrong one.
//
// It MUST be given only the text above the derived block. The first version was handed the whole
// file, and the generated table also has rows that begin with a phase number, so the generated state
// overwrote the hand-written claim and the checker ended up comparing the tool against itself. It
// reported OK on a phase marked DONE with nothing on disk, which is to say it could not fail. Found
// by marking a phase DONE on purpose and watching it stay green.
function claimedStatuses(text) {
  const claims = new Map();
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|')) continue;
    const [phaseId, , status] = trimmed.split('|').slice(1, -1).map((cell) => cell.trim());
    if (/^\d$/.test(phaseId) && status) claims.set(Number(phaseId), status);
  }
  return claims;
}

if (!fs.existsSync(STATUS)) {
  console.error(`qa-status: ${path.relative(ROOT, STATUS)} does not exist.`);
  process.exit(1);
}

const current = fs.readFileSync(STATUS, 'utf8');
const phases = evaluate();
const startAt = current.indexOf(START);
const endAt = current.indexOf(END);
if (startAt === -1 || endAt === -1) {
  console.error('qa-status: the generated markers are missing from docs/QA-STATUS.md.');
  console.error(`Restore both, in order:\n  ${START}\n  ${END}`);
  process.exit(1);
}
const rebuilt = current.slice(0, startAt) + renderDerived(phases) + current.slice(endAt + END.length);

// A phase may only CLAIM to be done if the files it was supposed to produce are on disk.
const claims = claimedStatuses(current.slice(0, startAt));
const lies = [];
for (const phase of phases) {
  if (claims.get(phase.id) === 'DONE' && phase.probes.length && phase.state !== 'COMPLETE') {
    const missing = phase.results.filter((probe) => probe.outcome !== true).map((probe) => probe.label).join(', ');
    lies.push(`phase ${phase.id} is marked DONE but the evidence is ${phase.state}: missing ${missing}`);
  }
}

if (process.argv.includes('--check')) {
  const stale = rebuilt !== current;
  if (!stale && lies.length === 0) {
    console.log('qa-status: docs/QA-STATUS.md is current and consistent with the repository. OK');
    process.exit(0);
  }
  if (stale) console.error('qa-status: the derived block is out of date. Run: node quality/tools/qa-status.mjs');
  for (const lie of lies) console.error(`qa-status: ${lie}`);
  console.error('\nA status the repository contradicts is worse than no status: the next reader');
  console.error('builds on a floor that was never poured. Fix the claim, or finish the phase.');
  process.exit(1);
}

fs.writeFileSync(STATUS, rebuilt);
console.log(`qa-status: rewrote the derived block in ${path.relative(ROOT, STATUS)}.`);
for (const phase of phases) console.log(`  phase ${phase.id}  ${phase.state.padEnd(12)} ${phase.title}`);
if (lies.length) {
  console.log('');
  for (const lie of lies) console.error(`  WARNING: ${lie}`);
  process.exit(1);
}
