/**
 * Tests for check-skips.
 *
 * This checker is the one that stands between an automated test repairer and a suite it can turn
 * green by deleting coverage. It had no tests of its own for five phases, which put it on the list
 * of four merge-blocking checks that ship without one, and contradicted a sentence in
 * docs/REPO-LAYOUT.md. It was widened to cover `test.fail` before it was tested, which is the wrong
 * order, so this closes that first.
 *
 * Every rule is asserted in both directions: green on a clean fixture, red on a fixture broken in
 * exactly one way. A gate is only a gate if it fails when it should.
 *
 * Run:  node --test quality/tools/check-skips.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const CHECKER = join(dirname(fileURLToPath(import.meta.url)), 'check-skips.mjs');

const GATED = join('quality', 'e2e', 'tests');
const QUARANTINE = join('quality', 'e2e', 'tests-generated');
const UNIT = join('quality', 'unit');

/** A tree with one clean spec in the gated zone, plus whatever the test adds. */
function fixture(files = {}) {
  const root = mkdtempSync(join(tmpdir(), 'check-skips-'));
  const write = (rel, body) => {
    mkdirSync(join(root, dirname(rel)), { recursive: true });
    writeFileSync(join(root, rel), body, 'utf8');
  };
  write(join(GATED, 'clean.spec.js'), "test('a test that runs', async () => {});\n");
  for (const [rel, body] of Object.entries(files)) write(rel, body);
  return { root, write };
}

/**
 * Run the checker against a tree and report how it exited.
 *
 * Output is captured rather than inherited so a failing fixture does not print its own complaint
 * into the middle of this suite's results.
 */
function run(root) {
  try {
    const stdout = execFileSync(process.execPath, [CHECKER, '--root', root], { encoding: 'utf8' });
    return { code: 0, out: stdout };
  } catch (err) {
    return { code: err.status ?? 1, out: `${err.stdout ?? ''}${err.stderr ?? ''}` };
  }
}

/** Assert the checker refuses this tree, and hand back its message so a test can read it. */
function expectRefused(files) {
  const { root } = fixture(files);
  try {
    const { code, out } = run(root);
    assert.equal(code, 1, `expected a refusal, got exit ${code}:\n${out}`);
    return out;
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

/** Assert the checker accepts this tree. */
function expectAccepted(files) {
  const { root } = fixture(files);
  try {
    const { code, out } = run(root);
    assert.equal(code, 0, `expected acceptance, got exit ${code}:\n${out}`);
    return out;
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------- the clean case

test('a gated suite with nothing disabled is accepted', () => {
  const out = expectAccepted({});
  assert.match(out, /OK/);
});

// ---------------------------------------------------------------- the four disablers

for (const marker of ['skip', 'fixme', 'only', 'todo']) {
  test(`an unjustified test.${marker} is refused`, () => {
    const out = expectRefused({
      [join(GATED, 'bad.spec.js')]: `test.${marker}('a test nobody will run', async () => {});\n`,
    });
    assert.match(out, new RegExp(`test\\.${marker}`));
    assert.match(out, /no DISABLED justification comment/);
  });
}

test('node:test disables through an options object too, and that is refused', () => {
  expectRefused({
    [join(UNIT, 'calc.test.mjs')]: "test('adds', { skip: true }, () => {});\n",
  });
});

test('an options object that says skip: false is left alone', () => {
  expectAccepted({
    [join(UNIT, 'calc.test.mjs')]: "test('adds', { skip: false }, () => {});\n",
  });
});

// ---------------------------------------------------------------- justifications

test('a disabled test with a long enough written reason is accepted', () => {
  expectAccepted({
    [join(GATED, 'held.spec.js')]: [
      '// DISABLED: waiting on the Android date-picker fix, tracked in issue #57',
      "test.fixme('native picker returns an ISO string', async () => {});",
      '',
    ].join('\n'),
  });
});

test('a justification on the marker line itself counts', () => {
  expectAccepted({
    [join(GATED, 'held.spec.js')]:
      "test.fixme('native picker', async () => {}); // DISABLED: waiting on the Android picker fix, issue #57\n",
  });
});

test('a justification shorter than the minimum is refused, and says by how much', () => {
  const out = expectRefused({
    [join(GATED, 'thin.spec.js')]: [
      '// DISABLED: flaky',
      "test.skip('something', async () => {});",
      '',
    ].join('\n'),
  });
  assert.match(out, /justification too short \(\d+\/25 chars\)/);
});

// ---------------------------------------------------------------- expected failures

test('an unjustified test.fail is refused, and is named as an expected failure', () => {
  const out = expectRefused({
    [join(GATED, 'pinned.spec.js')]: "test.fail('a defect nobody wrote down', async () => {});\n",
  });
  assert.match(out, /expected failure/);
  assert.match(out, /no KNOWN FAILURE justification comment/);
});

test('a test.fail with a long enough KNOWN FAILURE reason is accepted', () => {
  expectAccepted({
    [join(GATED, 'pinned.spec.js')]: [
      '// KNOWN FAILURE: no overlay traps Tab, recorded as BUG-006 in specs/BUGS.md',
      "test.fail('Tab does not escape the dialog', async () => {});",
      '',
    ].join('\n'),
  });
});

// The keyword is the whole reason there are two of them. "DISABLED" above a test that still runs
// tells every later reader the coverage is gone when it is not, and the tool documents that
// distinction, so it has to hold it.
test('DISABLED does not justify a test.fail, because it would misdescribe a test that runs', () => {
  const out = expectRefused({
    [join(GATED, 'pinned.spec.js')]: [
      '// DISABLED: no overlay traps Tab, recorded as BUG-006 in specs/BUGS.md',
      "test.fail('Tab does not escape the dialog', async () => {});",
      '',
    ].join('\n'),
  });
  assert.match(out, /no KNOWN FAILURE justification comment/);
});

test('KNOWN FAILURE does not justify a skip, for the same reason in reverse', () => {
  const out = expectRefused({
    [join(GATED, 'held.spec.js')]: [
      '// KNOWN FAILURE: waiting on the Android date-picker fix, tracked in issue #57',
      "test.fixme('native picker returns an ISO string', async () => {});",
      '',
    ].join('\n'),
  });
  assert.match(out, /no DISABLED justification comment/);
});

// ---------------------------------------------------------------- scope

test('the quarantine directory is out of scope, because drafts are expected to be broken', () => {
  expectAccepted({
    [join(QUARANTINE, 'draft.spec.js')]: "test.skip('an agent draft', async () => {});\n",
  });
});

test('every gated directory is read, not only the first', () => {
  for (const dir of [
    join('quality', 'e2e', 'tests-prod'),
    join('quality', 'e2e', 'tests-integration'),
    UNIT,
  ]) {
    const name = dir === UNIT ? 'level.test.mjs' : 'level.spec.js';
    expectRefused({ [join(dir, name)]: "test.skip('unjustified', async () => {});\n" });
  }
});

test('a file that is not a spec is ignored even inside a gated directory', () => {
  expectAccepted({
    [join(GATED, 'helpers.js')]: "// test.skip('this is prose about the rule', () => {});\n",
  });
});

test('more than one violation is reported, not just the first', () => {
  const out = expectRefused({
    [join(GATED, 'two.spec.js')]: [
      "test.skip('one', async () => {});",
      "test.fixme('two', async () => {});",
      '',
    ].join('\n'),
  });
  assert.match(out, /2 unexplained annotation\(s\)/);
});

test('the report names the file and the line, so it can be acted on without searching', () => {
  const out = expectRefused({
    [join(GATED, 'located.spec.js')]: [
      '// a comment that pushes the marker onto line two',
      "test.skip('somewhere', async () => {});",
      '',
    ].join('\n'),
  });
  assert.match(out, /quality\/e2e\/tests\/located\.spec\.js:2/);
});
