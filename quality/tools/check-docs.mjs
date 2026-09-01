#!/usr/bin/env node
/**
 * check-docs — treat the documentation as a build artifact and gate it.
 *
 * The repo's own argument is that a change should be gated by something that runs, not by a
 * convention someone remembers. This applies that to the docs themselves.
 *
 * Ten rules:
 *   [1] no dead paths          — every file path mentioned in the docs exists on disk
 *   [2] no state in the router — CLAUDE.md must not hard-code build numbers or point at private/
 *   [3] router stays small     — CLAUDE.md under MAX_ROUTER_LINES
 *   [4] no count drift         — every test count in the docs matches what the runner reports
 *   [5] history is complete    — every archived changelog heading is still in the build log
 *   [6] router does not fork   — CLAUDE.md is identical on every branch
 *   [7] diagrams render        — no HTML in mermaid labels; GitHub strips it and fuses words
 *   [8] filenames are exact    — skill entry points are SKILL.md; no two tracked paths differ only by case
 *   [9] runs are pinned        — a documented `playwright test` names its project, not both of them
 *  [10] config paths resolve:    a path configured in dependabot, wrangler or a workflow still exists
 *
 * A skipped check is reported loudly and counts as a failure unless it is explicitly allowed.
 * A gate that quietly stops checking is worse than no gate — this repo has already had one.
 *
 * Usage:  node quality/tools/check-docs.mjs [--root <dir>] [--json]
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
 * are exactly as worth gating as the documentation itself. Only the skills this repository actually
 * ships, though — see shippableSkillDocs.
 */

/**
 * Populated by shippableSkillDocs, reported by rule 1 so the narrowing is never silent. Declared
 * before SCANNED because SCANNED calls the function that fills it.
 */
let SKIPPED_SKILL_DOCS = [];

const SCANNED = [
  ROUTER,
  'README.md',
  'CHANGELOG.md',
  ...topLevelDocs(),
  ...shippableSkillDocs(),
];

/**
 * Every markdown file directly inside docs/.
 *
 * This used to be a hand-written list of eight filenames, and it drifted the way hand-written lists
 * do: docs/testing-notes.md sat in the repository unscanned for months, pointing at a CLAUDE.md
 * section that had been deleted, and the gate stayed green because the file was never on the list.
 * A doc added tomorrow would have been ungated the same way, silently, by default.
 *
 * This file already says of a different allowlist that "an allowlist is how a gate stops gating".
 * It was true here too.
 *
 * docs/history/ is deliberately excluded. It is an archive of what past builds did, so it names
 * files that were correct when written and have since been pruned. Holding a record of the past to
 * the present state of the filesystem would fail the gate over the archive doing its job. Its own
 * rule, [5], checks the thing that actually matters about it: that nothing was quietly removed.
 */
function topLevelDocs() {
  const dir = join(ROOT, 'docs');
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.md'))
    .map((e) => `docs/${e.name}`);
}

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

/**
 * Skills that will actually reach somebody who clones this repository.
 *
 * A gitignored skill ships to nobody, so holding its links to the same standard as published
 * documentation fails the gate over a promise this repository never makes. Rule 8 already reasons
 * about tracked paths; this keeps rule 1 consistent with it instead of having one rule judge the
 * disk and another judge the repository.
 *
 * Untracked-but-not-ignored files are deliberately still scanned. A skill written this morning and
 * not yet committed is still going to ship, and that is the cheapest possible moment to find a dead
 * link in it. Only an explicit ignore rule takes a file out of scope.
 */
function shippableSkillDocs() {
  const all = skillDocs();
  const ignored = gitIgnored(all);
  SKIPPED_SKILL_DOCS = all.filter((p) => ignored.has(p));
  return all.filter((p) => !ignored.has(p));
}

/**
 * Which of these paths git is told to ignore.
 *
 * Fails OPEN. If git is unavailable or answers in a way this cannot parse, every path is treated as
 * in scope and gets checked. Narrowing a gate's scope on an error is how a gate quietly stops
 * gating, and this repository has already had one of those.
 */
function gitIgnored(paths) {
  if (!paths.length) return new Set();
  try {
    const out = execFileSync('git', ['check-ignore', '--stdin'], {
      cwd: ROOT,
      encoding: 'utf8',
      input: paths.join('\n'),
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    return new Set(out.split('\n').map((l) => l.trim().replace(/\\/g, '/')).filter(Boolean));
  } catch (err) {
    // `git check-ignore` exits 1 when none of the given paths are ignored. That is a normal answer.
    // Any other failure means we could not tell, so we check everything.
    if (err.status === 1 && typeof err.stdout === 'string') {
      return new Set(err.stdout.split('\n').map((l) => l.trim().replace(/\\/g, '/')).filter(Boolean));
    }
    return new Set();
  }
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
  'quality/e2e/test-results/',
  'quality/e2e/playwright-report/',
  'quality/e2e/blob-report/',
  'quality/e2e/all-blob-reports/',
  'quality/e2e/theme-grid-out/',
  'theme-grid-out/',
];
const GENERATED_FILES = new Set([
  'quality/e2e/TEST-REPORT.md',  // npm run report
  'quality/e2e/results.json',    // playwright json reporter
  'report_json.json',    // ZAP baseline output
]);
const isGenerated = (p) =>
  GENERATED_FILES.has(p) || GENERATED_PREFIXES.some((prefix) => p.startsWith(prefix));

/**
 * Paths a doc points at, split by how strictly they have to resolve.
 *
 * `link` — a markdown link. A reader clicks it, and GitHub resolves it literally, relative to the
 * file it sits in. `[x](lighthouserc.cjs)` from the README is a 404 the moment that file moves into
 * a folder, even though the file still exists. These get no leniency.
 *
 * `mention` — a backticked filename in prose. Naming `count-tests.js` in a sentence is not a
 * promise about where it lives, so a match anywhere in the repo is enough.
 */
function pathsIn(text) {
  const links = new Set();
  const mentions = new Set();

  for (const [, target] of text.matchAll(/\]\(([^)\s]+)\)/g)) {
    if (/^(https?:|mailto:|#)/.test(target)) continue;
    links.add(target.split('#')[0]);
  }
  for (const [, token] of text.matchAll(/`([^`\n]+)`/g)) {
    const t = token.trim();
    if (/\s/.test(t) || !PATH_EXT.test(t)) continue;
    if (/^(https?:|#)/.test(t)) continue;
    // wildcards, ranges and placeholders are patterns, not paths — including <branch>, <commit>
    if (/[*?()<>]|\.\.|vNN|vNEW|vOLD|NNN?\b/.test(t)) continue;
    // a bare extension (`.html`, `.json`) is prose, not a reference
    if (/^\./.test(t) && !t.slice(1).includes('.')) continue;
    mentions.add(t);
  }
  return { links: [...links], mentions: [...mentions] };
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

/** The real on-disk spelling of a path, as its parent directory lists it. */
function realNameOf(abs) {
  const parent = dirname(abs);
  const wanted = basename(abs).toLowerCase();
  return readdirSync(parent).find((n) => n.toLowerCase() === wanted) ?? basename(abs);
}

/** Whether every segment below ROOT is spelled the way the filesystem spells it. */
function caseExact(abs) {
  let cur = abs;
  while (cur.length > ROOT.length && cur !== dirname(cur)) {
    if (realNameOf(cur) !== basename(cur)) return false;
    cur = dirname(cur);
  }
  return true;
}

function checkDeadPaths() {
  fileIndex ??= repoFilenames();
  const dead = [];
  for (const doc of present()) {
    const base = dirname(join(ROOT, doc));
    const { links, mentions } = pathsIn(read(doc));

    // a link gets clicked, so it has to resolve exactly where it points
    for (const p of links) {
      const clean = p.replace(/^\.?\//, '');
      if (isGenerated(clean) || clean.startsWith('private/')) continue;
      // a documented command shows the shape of a URL: <branch>, <owner>, <commit> are placeholders
      if (/[<>]/.test(p)) continue;
      const target = resolve(base, p);
      if (!existsSync(target)) {
        dead.push(`${doc} -> ${p}  (broken link)`);
      } else if (!caseExact(target)) {
        // existsSync answers the filesystem, and this one folds case. GitHub does not, so a link
        // whose spelling is off by a capital resolves here and 404s where it is read. That is not a
        // hypothetical: a skill linked ../design-check/skill.md for weeks after the file became
        // SKILL.md, and this rule called it clean every single time.
        dead.push(`${doc} -> ${p}  (wrong case: on disk it is ${basename(realNameOf(target))})`);
      }
    }

    // a mention in prose only has to name something that exists
    for (const p of mentions) {
      const clean = p.replace(/^\.?\//, '');
      // private/ is the product worktree's gitignored corpus — real, but never present here
      if (isGenerated(clean) || clean.startsWith('private/')) continue;
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
    : pass(1, `${present().length} docs, every referenced path resolves${
        SKIPPED_SKILL_DOCS.length
          ? ` (${SKIPPED_SKILL_DOCS.length} gitignored skill doc(s) out of scope: ${SKIPPED_SKILL_DOCS.join(', ')})`
          : ''
      }`);
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
 *
 * The README badge is deliberately NOT judged here. `count-tests.js --check` already owns it and
 * requires it to equal the functional count exactly, while this rule accepts any figure the runner
 * can produce — so for a while the two disagreed, and a badge could pass one and fail the other.
 * Two graders for one number is the defect this whole checker exists to prevent, so the badge has
 * one authority and this rule calls it rather than re-deciding.
 */
function checkTestCounts() {
  let counts;
  try {
    const raw = execFileSync(process.execPath, [join(ROOT, 'quality', 'e2e', 'count-tests.js')], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    counts = JSON.parse(raw.slice(raw.indexOf('{')));
  } catch (err) {
    return fail(4, `could not run e2e/count-tests.js: ${err.message.split('\n')[0]}`);
  }

  // the badge: delegated
  try {
    execFileSync(process.execPath, [join(ROOT, 'quality', 'e2e', 'count-tests.js'), '--check'], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (err) {
    const why = String(err.stderr || err.stdout || err.message).trim().split('\n')[0];
    return fail(4, `count-tests --check rejected the README badge: ${why}`);
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
    : pass(4, `badge verified by count-tests --check; prose matches the runner (${f} functional · ${v} visual · ${p} prod smoke)`);
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

  // This rule is about long-lived branches drifting apart, not about proposals. A pull request
  // exists precisely to change main, so asserting "identical to main" on one would block every
  // legitimate edit to the router and force branches to be misnamed to get past it. Enforcement
  // belongs on the push to a long-lived branch, where divergence is the actual risk.
  if (process.env.GITHUB_HEAD_REF) {
    return skip(6, `pull request from "${branch}" — the router may change in a proposal (enforced on merge)`);
  }
  // The same allowance locally, where documentation work happens on a docs/* branch.
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

// ---------------------------------------------------------------- [7] diagrams render

/**
 * GitHub renders mermaid with HTML labels disabled, and silently strips the tags rather than
 * failing: `A["Name<br/><i>detail</i>"]` arrives as "Namedetail", words fused together. The diagram
 * still draws, so nothing looks broken until someone reads it.
 *
 * Keep labels plain. If a label needs two lines, it is usually two nodes, or the detail belongs in
 * the prose beside the diagram.
 */
function checkDiagramsRender() {
  const offences = [];
  let blocks = 0;

  for (const doc of present()) {
    const lines = read(doc).split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      if (!/^\s*```mermaid\s*$/.test(lines[i])) continue;
      blocks++;
      const start = i + 1;
      for (i++; i < lines.length && !/^\s*```\s*$/.test(lines[i]); i++) {
        const tag = lines[i].match(/<\/?[a-zA-Z][^>]*>/);
        if (tag) offences.push(`${doc}:${i + 1} (block at line ${start}): ${tag[0]}`);
      }
    }
  }

  offences.length
    ? fail(7, `HTML inside mermaid labels — GitHub strips it and fuses the words:\n      ${offences.join('\n      ')}`)
    : pass(7, `${blocks} mermaid block(s), no HTML in labels`);
}

/**
 * A skill is found by its filename, so the filename is an interface, and the standard is SKILL.md.
 *
 * Two halves, because the interesting failure is invisible to the first one.
 *
 * On disk: a directory whose entry point is `skill.md` works on Windows and macOS, where the
 * filesystem folds case, and can simply fail to load on a Linux runner or a case-sensitive volume,
 * with no error to read. Three of ten skills here were in that state.
 *
 * In the index: `design-check` was tracked TWICE, as `SKILL.md` and `skill.md`, both pointing at the
 * same blob — a rename that git accepted without dropping the old entry, because core.ignorecase is
 * true. Only one file existed on disk, so every filesystem check in the world would have called it
 * clean. Checking out that state where case matters materialises two files and leaves which one wins
 * undefined. So this half asks git what it is tracking, and it applies to the whole repository:
 * two paths that differ only by case is a defect wherever it happens.
 */
function checkSkillNaming() {
  const offences = [];
  const skills = join(ROOT, '.claude', 'skills');

  if (existsSync(skills)) {
    for (const entry of readdirSync(skills, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const found = readdirSync(join(skills, entry.name)).filter((f) => /^skill\.md$/i.test(f));
      const where = `.claude/skills/${entry.name}/`;
      if (found.length === 0) offences.push(`${where} has no SKILL.md`);
      else if (found.length > 1) offences.push(`${where} has ${found.join(' and ')} — one entry point, not two`);
      else if (found[0] !== 'SKILL.md') offences.push(`${where}${found[0]} must be SKILL.md (exact case)`);
    }
  }

  let tracked;
  try {
    tracked = git('ls-files').split(/\r?\n/).filter(Boolean);
  } catch {
    // A checkout without git is a fair place to run the disk half and stop.
    return offences.length
      ? fail(8, `skill entry points:\n      ${offences.join('\n      ')}`)
      : skip(8, 'entry points are named SKILL.md; case-duplicate check needs git');
  }

  const byLower = new Map();
  for (const p of tracked) {
    const k = p.toLowerCase();
    byLower.set(k, [...(byLower.get(k) ?? []), p]);
  }
  for (const [, paths] of byLower) {
    if (paths.length > 1) offences.push(`tracked twice, differing only by case: ${paths.join(' and ')}`);
  }

  offences.length
    ? fail(8, `${offences.join('\n      ')}`)
    : pass(8, `${tracked.length} tracked path(s), no case duplicates; every skill entry point is SKILL.md`);
}

// ---------------------------------------------------------------- [9] documented runs are pinned

/**
 * The Playwright config declares two projects: `mobile-chromium`, the reviewed suite that gates
 * every merge, and `generated`, the authoring zone where agent-drafted tests land unreviewed.
 * `playwright test` with no --project runs BOTH. A documented command without the pin therefore
 * tells the reader the quarantine is part of the gate: a red draft blocks work it does not gate,
 * and a green one reads as coverage nobody has reviewed.
 *
 * The boundary was already enforced in the two places a machine reads it — the shard command in
 * .github/workflows/e2e.yml and the badge count in quality/e2e/count-tests.js — and leaked in the
 * one place a human reads it. That asymmetry is the point of this rule. Prose has no runner to
 * contradict it, which is also how `cd e2e` survived a directory move in five files at once.
 *
 * An invocation passes if it names a --project (naming `generated` on purpose is legitimate, so
 * any project counts) or a --config, which brings its own projects, as the prod smoke does.
 *
 * Commands continued with && or a trailing backslash are joined before the check, so a pin on the
 * following line still counts. History is not scanned: BUILD-LOG.md records commands as they were
 * actually run, and rewriting that would be forging the record rather than fixing a defect.
 */
function checkDocumentedRunsArePinned() {
  const offences = [];
  let seen = 0;

  for (const doc of present()) {
    const lines = read(doc).split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const start = i + 1;
      let cmd = lines[i];
      while (/(&&|\\)\s*$/.test(cmd) && i + 1 < lines.length) cmd += ' ' + lines[++i].trim();
      if (!/\bplaywright test\b/.test(cmd)) continue;
      seen++;
      if (!/--project[= ]/.test(cmd) && !/--config[= ]/.test(cmd)) {
        offences.push(`${doc}:${start}: ${cmd.trim()}`);
      }
    }
  }

  offences.length
    ? fail(
        9,
        `playwright test with no --project also runs the ungated \`generated\` project:\n      ${offences.join('\n      ')}`,
      )
    : pass(9, `${seen} documented playwright run(s), every one pinned to a project or a config`);
}

// ---------------------------------------------------------------- [10] config paths resolve

/**
 * Configuration that names a path is a link like any other, and it rots in exactly the same way.
 *
 * Rule 1 only ever reads documents, so when the suite moved from e2e/ to quality/e2e/ the
 * `directory: "/e2e"` in .github/dependabot.yml sat outside every gate in this repository.
 * Dependabot did not report an error either. It rescanned the old path, found no manifest there,
 * concluded @playwright/test had been removed from the project, and closed its own open bump with
 * "no longer a dependency". Three weeks of silence that looked identical to having no work to do,
 * which is the same shape as a workflow that never fires.
 *
 * Only INPUT paths are checked, meaning something a run reads. A key that names an OUTPUT, such
 * as `path:` on upload-artifact or a runner-local cache location, points at something that does not
 * exist until a job has written it, so including those needs an allowlist, and an allowlist is how a
 * gate stops gating.
 *
 * For Dependabot the directory existing is not enough. A directory that survives while its manifest
 * moves out from under it fails in precisely the same silent way, so this asks the question
 * Dependabot itself asks, which is whether the ecosystem's manifest is in there.
 */
const CONFIG_INPUT_KEY =
  /^\s*(?:-\s*)?(working-directory|cache-dependency-path|rules_file_name|pages_build_output_dir)\s*[:=]\s*["']?([^"'\s#]+)/;

/** The manifest each ecosystem looks for inside its `directory`. This is Dependabot's own contract. */
const ECOSYSTEM_MANIFEST = {
  npm: 'package.json',
  'github-actions': '.github/workflows',
};

const DEPENDABOT = '.github/dependabot.yml';

/** Every workflow file, which is where most of the path-shaped configuration lives. */
function workflowFiles() {
  const dir = join(ROOT, '.github', 'workflows');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((n) => /\.ya?ml$/i.test(n))
    .map((n) => `.github/workflows/${n}`);
}

function checkConfigPaths() {
  const dead = [];
  let seen = 0;

  if (has(DEPENDABOT)) {
    let ecosystem = null;
    read(DEPENDABOT).split(/\r?\n/).forEach((line, i) => {
      const eco = line.match(/^\s*-?\s*package-ecosystem\s*:\s*["']?([\w-]+)/);
      if (eco) return void (ecosystem = eco[1]);
      const dir = line.match(/^\s*directory\s*:\s*["']?([^"'\s#]+)/);
      if (!dir || !ecosystem) return;
      seen++;
      // Dependabot writes `directory` repo-relative, with a leading slash. "/" is the repo root.
      const base = dir[1].replace(/^\/+/, '') || '.';
      const manifest = ECOSYSTEM_MANIFEST[ecosystem];
      const target = manifest ? `${base}/${manifest}` : base;
      if (!has(target)) {
        dead.push(
          `${DEPENDABOT}:${i + 1}: ${ecosystem} points at ${dir[1]}, which holds no ${manifest ?? 'such directory'}`,
        );
      }
    });
  }

  for (const file of ['wrangler.toml', ...workflowFiles()]) {
    if (!has(file)) continue;
    read(file).split(/\r?\n/).forEach((line, i) => {
      const m = line.match(CONFIG_INPUT_KEY);
      if (!m) return;
      const raw = m[2];
      // an expression is resolved by the runner; ~ or a drive letter is not in this repository
      if (/\$\{\{/.test(raw) || /^[~/]|^[A-Za-z]:/.test(raw) || raw === '.') return;
      seen++;
      const rel = raw.replace(/^\.\//, '').replace(/\/+$/, '');
      if (!has(rel)) dead.push(`${file}:${i + 1}: ${m[1]} points at ${raw}`);
    });
  }

  if (!seen) return skip(10, 'no dependabot, wrangler or workflow path to check');
  dead.length
    ? fail(10, `${dead.length} configured path(s) that no longer resolve:\n      ${dead.join('\n      ')}`)
    : pass(10, `${seen} configured input path(s) resolve, across dependabot, wrangler and the workflows`);
}

// ---------------------------------------------------------------- run

const RULES = [
  ['no dead paths', checkDeadPaths],
  ['no state in the router', checkRouterHasNoState],
  ['router stays small', checkRouterSize],
  ['no test-count drift', checkTestCounts],
  ['history is complete', checkHistoryComplete],
  ['router does not fork', checkRouterDoesNotFork],
  ['diagrams render', checkDiagramsRender],
  ['filenames are exact', checkSkillNaming],
  ['documented runs are pinned', checkDocumentedRunsArePinned],
  ['config paths resolve', checkConfigPaths],
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
