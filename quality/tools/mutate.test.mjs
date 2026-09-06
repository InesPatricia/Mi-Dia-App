/**
 * Tests for the mutation harness.
 *
 * The audit exists to answer one question: what would the suite fail to catch. A harness that
 * reports a hole which is not there answers it wrongly, and three of the misses found while running
 * this by hand in phases 3 and 4 were exactly that. So the parts that can lie are asserted in both
 * directions here: an anchor that matches nothing, an anchor that matches twice, a replacement that
 * changes nothing, a replacement that a naive string replace would rewrite on its way in, and a
 * restore that has to happen even when the run it wraps throws.
 *
 * The catalogue is checked against the real repository, not against a fixture. That is the half
 * that goes stale: a build is promoted, the inlined source moves, and an anchor that used to be
 * unique is either gone or duplicated. Reading the real files is what turns "verify the mutation
 * applied" from a rule in a document into a check that runs.
 *
 * Nothing here writes to a tracked file. The round trip is exercised in a temp directory, so a
 * process killed mid-test cannot leave the build mutated.
 *
 * Run:  node --test quality/tools/mutate.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { applyMutation, MutationError, withMutant, MUTANTS, renderResults, parseTap, isPartialRun } from './mutate.mjs';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** How many times `needle` appears in `hay`, counting overlaps, so a near-duplicate still shows. */
function occurrences(hay, needle) {
  let count = 0;
  for (let at = hay.indexOf(needle); at !== -1; at = hay.indexOf(needle, at + 1)) count += 1;
  return count;
}

function makeTree(files) {
  const root = mkdtempSync(join(tmpdir(), 'mutate-'));
  for (const [rel, body] of Object.entries(files)) {
    mkdirSync(join(root, dirname(rel)), { recursive: true });
    writeFileSync(join(root, rel), body, 'utf8');
  }
  return root;
}

/* ── applyMutation ───────────────────────────────────────────────────────────────────────── */

test('applyMutation replaces the single occurrence and leaves the rest alone', () => {
  const source = 'const a = 1;\nfunction dueToday(){ return true; }\nconst b = 2;\n';
  const out = applyMutation(source, 'function dueToday(){', 'function dueToday(){ return false;');

  assert.equal(out, 'const a = 1;\nfunction dueToday(){ return false; return true; }\nconst b = 2;\n');
});

test('applyMutation refuses an anchor that matches nothing', () => {
  const source = 'function isDone(){ return true; }\n';

  assert.throws(
    () => applyMutation(source, 'function dueToday(){', 'x'),
    (error) => error instanceof MutationError && error.code === 'not-found',
  );
});

test('applyMutation refuses an anchor that matches twice, and says how many', () => {
  const source = 'let n = 0;\nlet n = 0;\n';

  assert.throws(
    () => applyMutation(source, 'let n = 0;', 'let n = 1;'),
    (error) => error instanceof MutationError && error.code === 'not-unique' && /2/.test(error.message),
  );
});

test('applyMutation refuses a replacement identical to the anchor', () => {
  const source = 'return true;\n';

  assert.throws(
    () => applyMutation(source, 'return true;', 'return true;'),
    (error) => error instanceof MutationError && error.code === 'no-op',
  );
});

test('applyMutation writes a dollar-sign replacement literally', () => {
  // String.prototype.replace reads $& in a string replacement as "the matched text". A mutation
  // that carried one would land as something nobody wrote, and the run afterwards would be
  // measuring a mutant that is not in the catalogue.
  const source = 'const price = 0;\n';
  const out = applyMutation(source, 'const price = 0;', "const price = '$& $1 $$';");

  assert.equal(out, "const price = '$& $1 $$';\n");
});

test('applyMutation matches a multi-line anchor in a file with CRLF endings', () => {
  // A multi-line anchor written with \n matches nothing at all in a CRLF file, and a mutation that
  // did not apply looks exactly like a mutation nothing caught. The build is LF today; the harness
  // must not depend on that staying true.
  const source = 'function dueToday(r){\r\n  return true;\r\n}\r\n';
  const out = applyMutation(source, 'function dueToday(r){\n  return true;', 'function dueToday(r){\n  return false;');

  assert.equal(out, 'function dueToday(r){\r\n  return false;\r\n}\r\n');
});

/* ── withMutant: the round trip ──────────────────────────────────────────────────────────── */

test('withMutant applies to every file it names, then restores the exact bytes', async () => {
  const before = 'function dueToday(){ return true; }\n';
  const root = makeTree({ 'src/mod.js': before, 'public/index.html': `<script>${before}</script>` });
  const mutant = {
    id: 'demo',
    what: 'demo',
    files: ['src/mod.js', 'public/index.html'],
    anchor: 'function dueToday(){',
    replacement: 'function dueToday(){ return false;',
  };

  let seen = null;
  await withMutant(root, mutant, async () => {
    seen = {
      module: readFileSync(join(root, 'src/mod.js'), 'utf8'),
      build: readFileSync(join(root, 'public/index.html'), 'utf8'),
    };
    return 'result';
  });

  assert.ok(seen.module.includes('return false;'), 'the module was mutated while the body ran');
  assert.ok(seen.build.includes('return false;'), 'the build was mutated while the body ran');
  assert.equal(readFileSync(join(root, 'src/mod.js'), 'utf8'), before);
  assert.equal(readFileSync(join(root, 'public/index.html'), 'utf8'), `<script>${before}</script>`);
  rmSync(root, { recursive: true, force: true });
});

test('withMutant restores after the body throws', async () => {
  // Finding 6 of the arc: the restore has to come from the harness's own copy and it has to happen
  // on the failing path, which is the only path that matters. An audit that leaves the build
  // mutated after one bad run poisons every run after it.
  const before = 'function dueToday(){ return true; }\n';
  const root = makeTree({ 'src/mod.js': before });
  const mutant = {
    id: 'demo',
    what: 'demo',
    files: ['src/mod.js'],
    anchor: 'function dueToday(){',
    replacement: 'function dueToday(){ return false;',
  };

  await assert.rejects(
    withMutant(root, mutant, async () => {
      throw new Error('the level runner blew up');
    }),
    /the level runner blew up/,
  );
  assert.equal(readFileSync(join(root, 'src/mod.js'), 'utf8'), before);
  rmSync(root, { recursive: true, force: true });
});

test('withMutant writes nothing when one of its files does not carry the anchor', async () => {
  // All or nothing. A half-applied mutant is a mutant nobody defined, and its result would be
  // recorded under the name of the one that was meant.
  const good = 'function dueToday(){ return true; }\n';
  const bad = 'nothing to see here\n';
  const root = makeTree({ 'src/mod.js': good, 'public/index.html': bad });
  const mutant = {
    id: 'demo',
    what: 'demo',
    files: ['src/mod.js', 'public/index.html'],
    anchor: 'function dueToday(){',
    replacement: 'function dueToday(){ return false;',
  };

  let ran = false;
  await assert.rejects(
    withMutant(root, mutant, async () => {
      ran = true;
    }),
    (error) => error instanceof MutationError && error.code === 'not-found',
  );
  assert.equal(ran, false, 'the body never ran');
  assert.equal(readFileSync(join(root, 'src/mod.js'), 'utf8'), good, 'the first file was left alone');
  assert.equal(readFileSync(join(root, 'public/index.html'), 'utf8'), bad);
  rmSync(root, { recursive: true, force: true });
});

/* ── The catalogue, against the real repository ──────────────────────────────────────────── */

test('every mutant has a unique id', () => {
  const ids = MUTANTS.map((mutant) => mutant.id);

  assert.equal(new Set(ids).size, ids.length, `duplicate id in ${ids.join(', ')}`);
});

test('every mutant anchor occurs exactly once in every file the mutant names', () => {
  // This is the check that goes stale on its own. When a new build is promoted into public/, or a
  // module is edited, an anchor can vanish or gain a twin, and both failures look like a mutation
  // nothing caught rather than like a broken catalogue.
  for (const mutant of MUTANTS) {
    for (const rel of mutant.files) {
      const source = readFileSync(join(REPO_ROOT, rel), 'utf8');
      const found = occurrences(source, mutant.anchor);

      assert.equal(found, 1, `${mutant.id}: anchor occurs ${found} times in ${rel}, expected exactly 1`);
    }
  }
});

test('every mutant actually changes the text of every file it names', () => {
  for (const mutant of MUTANTS) {
    for (const rel of mutant.files) {
      const source = readFileSync(join(REPO_ROOT, rel), 'utf8');

      assert.notEqual(applyMutation(source, mutant.anchor, mutant.replacement), source, `${mutant.id} in ${rel}`);
    }
  }
});

/* ── Reading the unit level's TAP output ─────────────────────────────────────────────────── */

// A real fragment, shortened. node:test nests: the describe reports `not ok` at column zero and
// the test that actually failed is the indented line under it.
//
// Four leaf tests and two `not ok` lines, deliberately. An earlier version of this fixture had one
// of each, which made "count the leaves" and "count the TAP lines" give the same answer, so the
// test below could not fail however the counting was written. That is the vacuous assertion this
// arc already removed from one spec, reintroduced here by accident and caught by breaking the code
// on purpose and watching nothing go red.
const TAP = [
  'TAP version 13',
  '# Subtest: phaseForDay',
  '    # Subtest: a day with no cycle has no phase',
  '    ok 1 - a day with no cycle has no phase',
  '    # Subtest: the first day is menstrual',
  '    ok 2 - the first day is menstrual',
  '    # Subtest: the day after the bleed is follicular',
  '    ok 3 - the day after the bleed is follicular',
  '    # Subtest: the last bleeding day is still menstrual',
  '    not ok 4 - the last bleeding day is still menstrual',
  '      ---',
  "      error: 'Expected values to be strictly equal'",
  '      ...',
  '    1..4',
  'not ok 1 - phaseForDay',
  '1..1',
  '# tests 4',
  '# suites 1',
  '# pass 3',
  '# fail 1',
].join('\n');

test('parseTap names the test that failed, not the describe block above it', () => {
  const parsed = parseTap(TAP);

  assert.deepEqual(parsed.failed, ['the last bleeding day is still menstrual']);
});

test('parseTap counts leaf tests rather than top-level TAP lines', () => {
  // The suite prints one top-level line per describe. Counting those reports 25 executions for a
  // run of 87 tests, which makes the report's "n of m failed" wrong in both numbers.
  const parsed = parseTap(TAP);

  assert.equal(parsed.ran, 4);
});

test('parseTap falls back to the top level when a failing test has no describe around it', () => {
  const flat = ['TAP version 13', 'not ok 1 - a bare test with no suite', '1..1', '# tests 1', '# fail 1'].join('\n');

  assert.deepEqual(parseTap(flat).failed, ['a bare test with no suite']);
});

/* ── Refusing to overwrite the baseline with a subset of itself ──────────────────────────── */

test('isPartialRun is true when only one mutant was asked for', () => {
  const every = ['unit', 'integration', 'e2e'];

  assert.equal(isPartialRun({ only: 'streak-zero', levels: every }, every), true);
});

test('isPartialRun is true when the level list was shortened', () => {
  const every = ['unit', 'integration', 'e2e'];

  assert.equal(isPartialRun({ only: undefined, levels: ['unit'] }, every), true);
});

test('isPartialRun is false only when every mutant runs through every level', () => {
  const every = ['unit', 'integration', 'e2e'];

  assert.equal(isPartialRun({ only: undefined, levels: every }, every), false);
});

/* ── The report ──────────────────────────────────────────────────────────────────────────── */

test('renderResults marks a mutant no level caught, and names the levels that caught the others', () => {
  const table = renderResults([
    { id: 'streak-zero', what: 'streaks are always zero', levels: { unit: { red: true, failed: ['streakOf counts back'] }, e2e: { red: false, failed: [] } } },
    { id: 'seed-nothing', what: 'the seed writes nothing', levels: { unit: { red: false, failed: [] }, e2e: { red: false, failed: [] } } },
  ]);

  assert.match(table, /streak-zero/);
  assert.match(table, /unit/);
  assert.match(table, /SURVIVED/);
  const survivedRows = table.split('\n').filter((line) => line.includes('SURVIVED'));
  assert.equal(survivedRows.length, 1, 'only the mutant nothing caught is marked SURVIVED');
  assert.match(survivedRows[0], /seed-nothing/);
});
