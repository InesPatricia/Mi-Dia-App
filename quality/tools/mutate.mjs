// Break the application on purpose, and record which level of the suite notices.
//
// WHY THIS EXISTS
//   A green suite says the tests passed. It does not say what they would catch. The only way to
//   find that out is to introduce a defect deliberately and watch: if nothing goes red, the
//   coverage that looked like it was there is not there. Phase 5 of the QA arc records that answer
//   as a committed baseline, BEFORE the phase 6 refactor moves any assertion, because the whole
//   value of the number is the comparison afterwards. A mutation caught before and not caught after
//   means the refactor swallowed an assertion.
//
// WHY ANCHORS AND NOT AN AST
//   The application is one inlined build. There is no bundler and no module graph to walk, and a
//   parser that rewrote the file would reformat 653 KB of it, so a diff would say nothing. A named
//   anchor with a named replacement is a mutation a person can read in the report and reproduce by
//   hand, which matters more here than generating hundreds of them.
//
// THE TWO FAILURES THIS HARNESS IS BUILT AGAINST
//   Both were paid for by running the audit by hand in phases 3 and 4, and both produce the same
//   false result: a hole in the suite that is not there.
//
//   1. A mutation that did not apply looks exactly like a mutation nothing caught. An anchor that
//      matches twice gets replaced wherever the first occurrence happens to be, and a multi-line
//      anchor written with \n matches nothing at all in a file with CRLF endings. So every anchor
//      has to be unique, every application has to be verified against the text on disk, and the
//      CRLF case is translated rather than silently missed.
//   2. An equivalent mutation is not an uncaught one. Code guarded twice does not change behaviour
//      when one guard is removed. This tool cannot tell those apart, and it does not try: it
//      reports SURVIVED, and a person writes the verdict in the report. A survivor is a question,
//      not a finding.
//
//   A third, from the same sessions: the restore comes from this harness's own copy and never from
//   `git checkout --`, which once discarded an uncommitted correction that then had to be rewritten.
//   The copy is taken as bytes, written to a journal on disk before the first mutation, and put
//   back in a finally. If a run is killed anyway, the journal survives and `--restore` finishes the
//   job.
//
// WHAT IT IS NOT
//   Not a required check. Its failure is information about the suite, not a reason to block a
//   merge, so it is a manual run with a committed report. See docs/QA-STATUS.md, phase 5.
//
// USAGE
//   node quality/tools/mutate.mjs                 run every mutant through every level, write the report
//   node quality/tools/mutate.mjs --dry-run       apply and restore each mutant, run no tests
//   node quality/tools/mutate.mjs --only <id>     one mutant
//   node quality/tools/mutate.mjs --levels unit,integration   a subset, comma separated
//   node quality/tools/mutate.mjs --restore       put back the files a killed run left mutated
//
//   A full run is long. The end-to-end level is roughly 8 minutes per mutant on the machine in
//   quality/tools/BASELINE.md, and it runs once per mutant plus once clean.

import { readFileSync, writeFileSync, existsSync, unlinkSync, mkdtempSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(HERE, '..', '..');
const JOURNAL = path.join(HERE, '.mutate-restore.json');
const REPORT = path.join(HERE, 'MUTATION-REPORT.md');
const BLOCK_START = '<!-- mutate:results:start -->';
const BLOCK_END = '<!-- mutate:results:end -->';

export class MutationError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'MutationError';
    this.code = code;
  }
}

/** Occurrences of `needle` in `hay`, counting overlaps so a near-duplicate still reports as two. */
function occurrences(hay, needle) {
  let count = 0;
  for (let at = hay.indexOf(needle); at !== -1; at = hay.indexOf(needle, at + 1)) count += 1;
  return count;
}

const toCrlf = (text) => text.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');

/**
 * Replace the one occurrence of `anchor` with `replacement`, or refuse.
 *
 * Refusing is the point. Every way this can go wrong quietly produces a mutant nobody defined,
 * whose result would then be filed under the name of the one that was meant.
 *
 * @returns {string} the mutated text
 * @throws {MutationError} code 'no-op', 'not-found' or 'not-unique'
 */
export function applyMutation(source, anchor, replacement) {
  if (anchor === replacement) {
    throw new MutationError('replacement is identical to the anchor, so this mutant changes nothing', 'no-op');
  }

  // Try the anchor as written. Only if that finds nothing, and only if the file actually has CRLF
  // endings, try the same anchor with its newlines translated. Translating first would be wrong:
  // it would let a single-line anchor match in a file it was never meant for.
  let [needle, patch] = [anchor, replacement];
  if (occurrences(source, needle) === 0 && anchor.includes('\n') && source.includes('\r\n')) {
    [needle, patch] = [toCrlf(anchor), toCrlf(replacement)];
  }

  const found = occurrences(source, needle);
  if (found === 0) throw new MutationError(`anchor not found: ${JSON.stringify(anchor)}`, 'not-found');
  if (found > 1) throw new MutationError(`anchor occurs ${found} times, expected exactly 1: ${JSON.stringify(anchor)}`, 'not-unique');

  // indexOf and slice, not String.replace. A string replacement passed to replace() has $& and $1
  // read as substitutions, so a mutation carrying one would land as text nobody wrote.
  const at = source.indexOf(needle);
  const out = source.slice(0, at) + patch + source.slice(at + needle.length);

  // Verify at the exact offset rather than with includes(). A replacement that legitimately
  // contains its own anchor would pass a containment check while having landed nowhere.
  if (out.slice(at, at + patch.length) !== patch) {
    throw new MutationError('the replacement did not land where the anchor was', 'not-applied');
  }
  return out;
}

/* ── The catalogue ───────────────────────────────────────────────────────────────────────────
 *
 * Every mutant names both the module source and the build, because they are two copies of the same
 * code and three different levels read them: the unit level loads src/modules/*.js in a vm sandbox,
 * while the integration and end-to-end levels drive public/index.html in a browser. Mutating only
 * one of them would ask each level a different question and file both answers in one row.
 *
 * That the two copies are byte-identical in the calc block is not assumed. mutate.test.mjs asserts
 * every anchor occurs exactly once in every file its mutant names, against the real tree, so a
 * promoted build that reformats the block turns the test red instead of the audit wrong.
 */
const RITUAL_MODULE = 'src/modules/ritual.js';
const CYCLE_MODULE = 'src/modules/cycle.js';
const BUILD = 'public/index.html';
const BOTH = [RITUAL_MODULE, BUILD];
const BOTH_CYCLE = [CYCLE_MODULE, BUILD];

export const MUTANTS = [
  {
    id: 'due-today-false',
    what: 'dueToday always answers false, so no ritual is ever due',
    files: BOTH,
    anchor: '  function dueToday(r, date){',
    replacement: '  function dueToday(r, date){ return false;',
  },
  {
    id: 'streak-zero',
    what: 'streakOf always answers zero, so a streak never accumulates',
    files: BOTH,
    anchor: '  function streakOf(r, today){',
    replacement: '  function streakOf(r, today){ return 0;',
  },
  {
    id: 'done-off-by-one',
    what: 'isDone uses > 0 instead of >= 0, so the first day in the log never counts as done',
    files: BOTH,
    anchor: 'r.log.indexOf(dkey(date)) >= 0',
    replacement: 'r.log.indexOf(dkey(date)) > 0',
  },
  {
    id: 'seed-writes-nothing',
    what: 'seedDefaults returns before writing, so a first run starts with no rituals',
    files: BOTH,
    anchor: '  async function seedDefaults(){',
    replacement: '  async function seedDefaults(){ return;',
  },
  // A second module, because a report that samples one module can only speak about one module. The
  // first version of this audit covered `ritual` alone and said so in its own "what this does not
  // measure" section, which is a hole to close rather than a caveat to keep.
  {
    id: 'cycle-phase-off-by-one',
    what: 'phaseForDay uses < instead of <=, so the last bleeding day reads as follicular',
    files: BOTH_CYCLE,
    anchor: "    if (d <= avgBleed(cfg)) return 'menstruala';",
    replacement: "    if (d < avgBleed(cfg)) return 'menstruala';",
  },
  // Expected to survive, and included for that reason. Finding 5 of the arc says an equivalent
  // mutation is not an uncaught one and needs a verdict of its own, and until a real run produces
  // one, that column of the report has never existed. This is the safety bound on a loop that
  // breaks on the first missing day: no reachable input walks 3999 iterations, so removing one of
  // them cannot change an observable answer. A survivor here is the report working, not the suite
  // failing, and it is what makes the distinction legible to the next reader.
  {
    id: 'streak-guard-bound',
    what: 'streakOf walks 3999 days instead of 4000, a safety bound no reachable input reaches',
    files: BOTH,
    anchor: '    while(guard++ < 4000){',
    replacement: '    while(guard++ < 3999){',
  },
];

/* ── Staging and restoring ──────────────────────────────────────────────────────────────── */

/**
 * Apply one mutant to every file it names, run `body`, and put the original bytes back.
 *
 * All or nothing: every file is read and every replacement computed before anything is written, so
 * an anchor missing from the second file leaves the first one untouched and never runs the body.
 *
 * The snapshot is taken as bytes and restored as bytes, so a file with a BOM or with CRLF endings
 * comes back exactly as it was rather than as whatever a utf8 round trip would produce.
 */
export async function withMutant(root, mutant, body) {
  const targets = mutant.files.map((rel) => {
    const abs = path.join(root, rel);
    const original = readFileSync(abs);
    const mutated = applyMutation(original.toString('utf8'), mutant.anchor, mutant.replacement);
    return { rel, abs, original, mutated };
  });

  writeJournal(targets);
  try {
    for (const target of targets) {
      writeFileSync(target.abs, target.mutated, 'utf8');
      // Read it back. A write that did not take, or took somewhere else, is the same false result
      // as an anchor that did not match: a mutant that is not in the build the tests then run.
      const onDisk = readFileSync(target.abs, 'utf8');
      if (onDisk !== target.mutated) {
        throw new MutationError(`${mutant.id}: ${target.rel} on disk does not match what was written`, 'not-applied');
      }
    }
    return await body();
  } finally {
    restore(targets);
    if (existsSync(JOURNAL)) unlinkSync(JOURNAL);
  }
}

function restore(targets) {
  for (const target of targets) {
    writeFileSync(target.abs, target.original);
    const back = readFileSync(target.abs);
    if (!back.equals(target.original)) {
      // Loud on purpose. A tracked file left mutated poisons every run after it, and the next
      // person to notice would be reading a diff they did not make.
      throw new Error(`mutate: FAILED TO RESTORE ${target.abs}. The journal at ${JOURNAL} holds the original.`);
    }
  }
}

function writeJournal(targets) {
  const entries = targets.map((target) => ({ abs: target.abs, base64: target.original.toString('base64') }));
  writeFileSync(JOURNAL, JSON.stringify({ writtenAt: new Date().toISOString(), entries }, null, 2), 'utf8');
}

/** Put back what a killed run left behind. The journal is the harness's own copy, not git's. */
function restoreFromJournal() {
  if (!existsSync(JOURNAL)) {
    console.log('mutate: no journal, nothing to restore. OK');
    return 0;
  }
  const { entries } = JSON.parse(readFileSync(JOURNAL, 'utf8'));
  for (const entry of entries) {
    writeFileSync(entry.abs, Buffer.from(entry.base64, 'base64'));
    console.log(`mutate: restored ${entry.abs}`);
  }
  unlinkSync(JOURNAL);
  return 0;
}

/* ── The levels ─────────────────────────────────────────────────────────────────────────────
 *
 * Retries are pinned to 0 for the audit. A retry exists to absorb a transient failure, and here a
 * failure is the signal being measured: re-running it would only slow the run down and could turn a
 * caught mutant into a "flaky" one, which is a status this report has no column for. The suite's
 * measured flake rate over 415 executions is 0 (quality/tools/BASELINE.md), so nothing is being
 * papered over by turning them off.
 */
const E2E_DIR = path.join(REPO_ROOT, 'quality', 'e2e');
const PLAYWRIGHT_CLI = path.join(E2E_DIR, 'node_modules', '@playwright', 'test', 'cli.js');

function runPlaywright(project, jsonPath) {
  const result = spawnSync(
    process.execPath,
    [PLAYWRIGHT_CLI, 'test', `--project=${project}`, '--retries=0', '--reporter=json'],
    { cwd: E2E_DIR, env: { ...process.env, PLAYWRIGHT_JSON_OUTPUT_FILE: jsonPath }, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );

  if (!existsSync(jsonPath)) {
    throw new Error(`mutate: playwright wrote no JSON report for ${project}. exit=${result.status}\n${result.stderr ?? ''}`);
  }
  const report = JSON.parse(readFileSync(jsonPath, 'utf8'));
  const failed = [];
  const walk = (suite, trail) => {
    const where = suite.title ? [...trail, suite.title] : trail;
    for (const spec of suite.specs ?? []) {
      if (spec.tests.some((one) => one.status === 'unexpected')) failed.push([...where, spec.title].join(' > '));
    }
    for (const child of suite.suites ?? []) walk(child, where);
  };
  for (const suite of report.suites ?? []) walk(suite, []);

  // Trust the stats, not the exit code alone: a run that dies before starting also exits non-zero,
  // and that is a broken harness rather than a caught mutation.
  return { red: report.stats.unexpected > 0, failed, ran: report.stats.expected + report.stats.unexpected, exit: result.status };
}

function runUnit() {
  // --test-reporter=tap rather than the default. The default is 'spec' on a TTY and 'tap'
  // otherwise, so the format would depend on how this process happened to be started.
  const result = spawnSync(process.execPath, ['--test', '--test-reporter=tap'], {
    cwd: path.join(REPO_ROOT, 'quality', 'unit'),
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
  const out = `${result.stdout ?? ''}`;
  return { ...parseTap(out), red: result.status !== 0, exit: result.status };
}

/**
 * Read node:test's TAP output into the names that failed and the number of tests that ran.
 *
 * The output nests. A `describe` reports its own `not ok` at column zero when any child fails, and
 * the test that actually failed is the indented line underneath. Reading only the top level names
 * the section rather than the case, which is the wrong half of the answer for a report that phase 6
 * compares against. Measured rather than assumed: this suite prints 25 top-level lines for 87 tests.
 *
 * The `# tests` summary counts leaves, which is what an execution means at the other two levels, so
 * the three rows of the report mean the same thing.
 */
export function parseTap(out) {
  const lines = [...out.matchAll(/^( *)not ok \d+ - (.+)$/gm)].map((match) => ({ depth: match[1].length, name: match[2].trim() }));
  const leaves = lines.filter((one) => one.depth > 0);
  const summary = /^# tests (\d+)$/m.exec(out);
  return {
    failed: (leaves.length ? leaves : lines).map((one) => one.name),
    ran: summary ? Number(summary[1]) : lines.length,
  };
}

const LEVELS = {
  unit: { label: 'unit', run: () => runUnit() },
  integration: { label: 'integration', run: (jsonPath) => runPlaywright('integration', jsonPath) },
  e2e: { label: 'e2e', run: (jsonPath) => runPlaywright('mobile-chromium', jsonPath) },
};

/* ── The report ─────────────────────────────────────────────────────────────────────────── */

/**
 * The generated half of MUTATION-REPORT.md.
 *
 * The column that matters is the last one. A mutant no level caught is written SURVIVED in capitals
 * so it cannot be skimmed past, and it is a question for a person: either the suite has a hole
 * there, or the mutation was equivalent and changed no observable behaviour.
 */
export function renderResults(results, levelIds = ['unit', 'integration', 'e2e']) {
  const head = `| Mutant | What it breaks | ${levelIds.join(' | ')} | Caught by |`;
  const rule = `|---|---|${levelIds.map(() => '---|').join('')}---|`;
  const rows = results.map((result) => {
    const cells = levelIds.map((id) => {
      const level = result.levels[id];
      if (!level) return 'not run';
      return level.red ? `red (${level.failed.length})` : 'green';
    });
    const caught = levelIds.filter((id) => result.levels[id]?.red);
    const verdict = caught.length ? caught.join(', ') : '**SURVIVED**';
    return `| \`${result.id}\` | ${result.what} | ${cells.join(' | ')} | ${verdict} |`;
  });
  return [head, rule, ...rows].join('\n');
}

function renderDetail(results) {
  const parts = [];
  for (const result of results) {
    parts.push(`### \`${result.id}\``, '', `${result.what}`, '');
    for (const [id, level] of Object.entries(result.levels)) {
      if (!level.red) {
        parts.push(`- **${id}**: green, ${level.ran} executions, nothing failed.`);
        continue;
      }
      const shown = level.failed.slice(0, 5).map((name) => `  - ${name}`);
      const more = level.failed.length > 5 ? [`  - and ${level.failed.length - 5} more`] : [];
      parts.push(`- **${id}**: red, ${level.failed.length} of ${level.ran} executions failed.`, ...shown, ...more);
    }
    parts.push('');
  }
  return parts.join('\n');
}

const SKELETON = `# Mutation audit

Generated by \`node quality/tools/mutate.mjs\`. Everything between the markers is rewritten by that
command; the prose around it is written by hand and survives a re-run.

${BLOCK_START}
${BLOCK_END}
`;

function writeReport(body) {
  const existing = existsSync(REPORT) ? readFileSync(REPORT, 'utf8') : SKELETON;
  const from = existing.indexOf(BLOCK_START);
  const to = existing.indexOf(BLOCK_END);
  if (from === -1 || to === -1) {
    throw new Error(`mutate: ${REPORT} has no ${BLOCK_START} block. Refusing to overwrite a file written by hand.`);
  }
  const next = `${existing.slice(0, from + BLOCK_START.length)}\n\n${body}\n\n${existing.slice(to)}`;
  writeFileSync(REPORT, next, 'utf8');
}

/* ── The run ────────────────────────────────────────────────────────────────────────────── */

/**
 * Was this run narrower than the baseline it would otherwise overwrite?
 *
 * `--only` and a shortened `--levels` are for iterating on one mutant, and their table is a sample.
 * Writing it into the committed report would replace a measurement with a subset of itself,
 * silently, and the phase 6 comparison would then be made against whatever the last debugging run
 * happened to cover. Found the way most footguns are found, by walking into it: an early `--only`
 * smoke run overwrote the full table, which then had to be restored from a copy taken by hand.
 */
export function isPartialRun(args, everyLevelId) {
  return Boolean(args.only) || args.levels.length !== everyLevelId.length;
}

function parseArgs(argv) {
  const has = (flag) => argv.includes(flag);
  const value = (flag) => {
    const at = argv.indexOf(flag);
    return at === -1 ? undefined : argv[at + 1];
  };
  return {
    dryRun: has('--dry-run'),
    restore: has('--restore'),
    only: value('--only'),
    levels: (value('--levels') ?? 'unit,integration,e2e').split(',').map((one) => one.trim()).filter(Boolean),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.restore) return restoreFromJournal();

  if (existsSync(JOURNAL)) {
    console.error(`\nmutate: a journal is already at ${JOURNAL}.`);
    console.error('A previous run was killed before it restored. Run --restore first, then check `git status`.\n');
    return 1;
  }

  const mutants = args.only ? MUTANTS.filter((one) => one.id === args.only) : MUTANTS;
  if (!mutants.length) {
    console.error(`mutate: no mutant named ${args.only}. Known: ${MUTANTS.map((one) => one.id).join(', ')}`);
    return 1;
  }
  for (const id of args.levels) {
    if (!LEVELS[id]) {
      console.error(`mutate: no level named ${id}. Known: ${Object.keys(LEVELS).join(', ')}`);
      return 1;
    }
  }

  const scratch = mkdtempSync(path.join(tmpdir(), 'mutate-run-'));
  try {
    if (args.dryRun) {
      for (const mutant of mutants) {
        await withMutant(REPO_ROOT, mutant, async () => {
          for (const rel of mutant.files) {
            const text = readFileSync(path.join(REPO_ROOT, rel), 'utf8');
            if (!text.includes(mutant.replacement)) throw new MutationError(`${mutant.id}: ${rel} does not carry the replacement`, 'not-applied');
          }
          console.log(`mutate: ${mutant.id} applied to ${mutant.files.length} file(s) and verified`);
        });
      }
      console.log('\nmutate: dry run complete, every file restored. OK');
      return 0;
    }

    // The control run. Without it a red level says nothing: it could be the mutant, or it could be
    // a suite that was already failing before anything was touched.
    console.log('mutate: control run, no mutation applied.');
    const control = {};
    for (const id of args.levels) {
      const started = Date.now();
      control[id] = LEVELS[id].run(path.join(scratch, `control-${id}.json`));
      console.log(`  ${id}: ${control[id].red ? 'RED' : 'green'}, ${control[id].ran} executions, ${Math.round((Date.now() - started) / 1000)} s`);
    }
    const dirty = args.levels.filter((id) => control[id].red);
    if (dirty.length) {
      console.error(`\nmutate: the suite is not green before mutating (${dirty.join(', ')}). Every result after this would be unattributable.`);
      for (const id of dirty) for (const name of control[id].failed) console.error(`  ${id}: ${name}`);
      return 1;
    }

    const results = [];
    for (const mutant of mutants) {
      console.log(`\nmutate: ${mutant.id} -- ${mutant.what}`);
      const levels = {};
      await withMutant(REPO_ROOT, mutant, async () => {
        for (const id of args.levels) {
          const started = Date.now();
          levels[id] = LEVELS[id].run(path.join(scratch, `${mutant.id}-${id}.json`));
          console.log(`  ${id}: ${levels[id].red ? `RED, ${levels[id].failed.length} failed` : 'green'}, ${levels[id].ran} executions, ${Math.round((Date.now() - started) / 1000)} s`);
        }
      });
      results.push({ id: mutant.id, what: mutant.what, levels });
    }

    const survivors = results.filter((result) => !args.levels.some((id) => result.levels[id]?.red));
    const body = [
      `Run on ${new Date().toISOString().slice(0, 10)}, levels: ${args.levels.join(', ')}.`,
      '',
      renderResults(results, args.levels),
      '',
      `**${survivors.length} of ${results.length} mutants survived every level.**`,
      ...(survivors.length ? ['', 'A survivor is a question rather than a finding. The verdict for each one is written by hand, under Verdicts below.'] : []),
      '',
      '## Per mutant',
      '',
      renderDetail(results),
    ].join('\n');

    if (isPartialRun(args, Object.keys(LEVELS))) {
      console.log(`\n${body}\n`);
      console.log('mutate: partial run, so the report was NOT written. Run with no --only and no --levels to refresh the baseline.');
      return 0;
    }
    writeReport(body);

    console.log(`\nmutate: ${survivors.length} of ${results.length} survived. Report written to ${path.relative(REPO_ROOT, REPORT).replace(/\\/g, '/')}`);
    // Exit 0 even with survivors. A survivor is information about the suite and a question for a
    // person, not a failure of this command.
    return 0;
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

// Only when run as a command. Importing this from the test file must not start a suite.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then((code) => process.exit(code), (error) => {
    console.error(`\nmutate: ${error.stack ?? error.message}`);
    console.error(`\nIf a tracked file was left mutated, run: node quality/tools/mutate.mjs --restore`);
    process.exit(1);
  });
}
