// Refuse a disabled test in the gated suite unless a person wrote down why.
//
// WHY THIS EXISTS
//   The Playwright healer agent is an automated test repairer whose objective is a passing suite.
//   Its shipped instructions permitted it to mark a stubborn test `test.fixme()` so the run goes
//   green. That is the most dangerous edit anyone can make to this repository, and nothing here
//   noticed it: a skipped test still appears in `playwright test --list`, so the README badge does
//   not move, `count-tests --check` stays green, and the suite reports success while the coverage
//   is gone. Silent loss of coverage, with every signal still showing green.
//
//   The healer's local policy now forbids it (quality/e2e/.claude/agents/playwright-test-healer.md).
//   A policy in a prompt is a preference. This file is the rule.
//
// WHAT IT CHECKS
//   Only the GATED zone: everything a merge depends on. That is four directories now, not two, and
//   the list below is the thing to update when a fifth arrives. The `generated` project in
//   tests-generated/ is the authoring zone, where drafts are expected to be broken, half-finished
//   and skipped. Applying this rule there would make the quarantine useless.
//
//   The list went stale once already, which is the reason it is called out here. tests-integration/
//   was added to the merge-blocking command in phase 4 of the QA arc and not added here, so for the
//   length of that change a skipped test in the newest gated directory was invisible to the one
//   check written to see it. A gate whose scope is a hand-written list is a gate that drifts behind
//   the thing it guards.
//
// WHAT IT ALLOWS
//   Disabling a test, on purpose, in the open. Put a justification comment on the line before:
//
//       // DISABLED: waiting on the Android date-picker fix, see issue #57
//       test.fixme('native picker returns an ISO string', async ({ page }) => {
//
//   The reason must be at least 25 characters, because "// DISABLED: flaky" is how a suite rots.
//   This is a guard, not a prison: the escape hatch is deliberate, it just has to be legible in a
//   diff and attributable to a human.
//
// EXPECTED FAILURES ARE THE SAME HATCH BY A DIFFERENT NAME
//   `test.fail` is not a skip. Playwright runs the test and requires it to fail, so the day the
//   application is fixed the test goes red and asks for the annotation to be removed. That makes it
//   the right way to record a defect the suite can already see and the branch cannot fix, which is
//   how the four overlays in tests/keyboard-a11y.spec.js are carried.
//
//   It is still an escape hatch, and it is one word away from the four this file already refuses.
//   Left unguarded it is the cheaper route to a green suite over a known defect: nothing forces the
//   author to say what is broken, and a test.fail that starts failing for an unrelated reason goes
//   on reporting as expected. So it needs the same justification, with its own keyword since
//   "DISABLED" would be a lie about a test that runs:
//
//       // KNOWN FAILURE: no overlay traps Tab, see specs/BUGS.md BUG-006
//       test.fail('Tab does not escape to the page behind it', async ({ app, page }) => {
//
//   The rule was added in the same change that first used it. A gate written after its first
//   exception is a gate that starts with one.
//
// WHY NOT IN THE PRE-COMMIT HOOK
//   .githooks/pre-commit answers one question fast: is anything staged that must not be published?
//   This is a correctness check, and its own comment says correctness belongs in CI. So this runs
//   in the e2e workflow, next to the test-count check.
//
// USAGE
//   node quality/tools/check-skips.mjs                exit 0 clean, exit 1 with file:line
//   node quality/tools/check-skips.mjs --root <dir>   run against another tree, which is how its
//                                                     own tests hand it a deliberately broken one
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// --root exists for the tests. A checker that can only ever read this repository cannot be handed a
// fixture that is broken in exactly one way, and a gate nobody can watch fail is a gate on trust.
const args = process.argv.slice(2);
const rootFlag = args.indexOf('--root');
const ROOT = rootFlag === -1
  ? path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
  : path.resolve(args[rootFlag + 1]);

// The gated zone. Anything a merge depends on, and nothing else.
const GATED_DIRS = [
  path.join('quality', 'e2e', 'tests'),
  path.join('quality', 'e2e', 'tests-prod'),
  path.join('quality', 'e2e', 'tests-integration'),
  path.join('quality', 'unit'),
];

// Two runners, two vocabularies, one rule.
//
// `test.only` is already refused in CI by forbidOnly in playwright.config.js, but only in CI, and
// only for `test.only`. It is listed here so a local run catches it too, and so the message is the
// same one in both places. `it` and `todo` are node:test's spellings, which arrived with the unit
// level: `todo` there marks a test that reports as passing while running nothing, which is the same
// silent loss of coverage under a friendlier name.
const DISABLERS = /\b(?:test|describe|it)\.(skip|fixme|only|todo)\s*\(/;

// node:test also disables through an options object, `test('name', { skip: true }, fn)`, which the
// pattern above cannot see. Anything but `false` counts, since `{ skip: 'reason' }` is the common
// form. Kept narrow, to one object with no nesting, because a broad version starts matching
// ordinary fixtures.
//
// The negative lookahead sits immediately after the colon and swallows the gap itself. It used
// to sit after a separate whitespace quantifier, and that version refused `{ skip: false }`:
// the quantifier backtracked to zero width, which put the lookahead in front of the space,
// where `false` does not match and the guard passed for free. A merge-blocking check that
// refuses correct code is the same class of defect as one that allows wrong code, and it was
// found by this file's own tests on their first run, which is the whole argument for them.
const DISABLING_OPTION = /\{[^{}]*\b(skip|todo|only)\s*:(?!\s*false\b)\s*[^,}]+/;

// An expected failure. Kept apart from DISABLERS so the report can say which of the two it found:
// a skipped test has lost its coverage, an expected failure has kept it and pinned it to a defect,
// and calling them the same thing would make this tool's own message wrong.
const EXPECTED_FAILURE = /\b(?:test|describe|it)\.fail\s*\(/;

// A justification is a comment naming a reason. It may sit on the marker's own line or the one
// above it, which is where a person writing prose naturally puts it.
//
// Two keywords, one for each kind, and the kinds are NOT interchangeable. A `// DISABLED:` above a
// test that still runs would misdescribe it to every later reader, and the reader is the whole
// point of requiring the comment. The first version of this accepted either word for either marker,
// which meant the paragraph above was a claim the tool did not enforce.
const JUSTIFIED_SKIP = /(?:\/\/|\/\*|\*)\s*DISABLED:\s*(.+)/;
const JUSTIFIED_FAILURE = /(?:\/\/|\/\*|\*)\s*KNOWN FAILURE:\s*(.+)/;
const MIN_REASON = 25;

function specFiles(dir) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs, { withFileTypes: true }).flatMap((entry) => {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) return specFiles(rel);
    // Two suffixes, because the unit level is node:test and names its files .test.mjs. Matching
    // only .spec.js would have added quality/unit to the list above and still read none of it,
    // which is the quietest way to widen a gate without widening what it sees.
    return /\.(spec\.js|test\.mjs)$/.test(entry.name) ? [rel] : [];
  });
}

const violations = [];

for (const dir of GATED_DIRS) {
  for (const rel of specFiles(dir)) {
    const lines = fs.readFileSync(path.join(ROOT, rel), 'utf8').split(/\r?\n/);
    lines.forEach((line, i) => {
      const expected = line.match(EXPECTED_FAILURE);
      const found = line.match(DISABLERS) ?? line.match(DISABLING_OPTION) ?? expected;
      if (!found) return;

      // `test.skip(condition, reason)` called INSIDE a test body is Playwright's conditional-skip
      // API and is a legitimate pattern (skip on a browser that cannot do the thing). It is
      // indistinguishable from the annotation form by regex alone, so treat a justified comment as
      // the answer for both: if you meant it, say why. That keeps one rule instead of two.
      const wanted = expected ? JUSTIFIED_FAILURE : JUSTIFIED_SKIP;
      const reason = (lines[i - 1] ?? '').match(wanted) ?? line.match(wanted);
      if (reason && reason[1].trim().length >= MIN_REASON) return;

      violations.push({
        file: rel.replace(/\\/g, '/'),
        line: i + 1,
        marker: found[0].replace(/\s*\($/, '').trim(),
        kind: expected ? 'expected failure' : 'disabled test',
        keyword: expected ? 'KNOWN FAILURE' : 'DISABLED',
        why: reason
          ? `justification too short (${reason[1].trim().length}/${MIN_REASON} chars)`
          : `no ${expected ? 'KNOWN FAILURE' : 'DISABLED'} justification comment`,
      });
    });
  }
}

if (violations.length === 0) {
  console.log(`check-skips: no unexplained disabled test or expected failure in the gated suite. OK`);
  process.exit(0);
}

console.error(`\ncheck-skips: ${violations.length} unexplained annotation(s) in the gated suite.\n`);
for (const v of violations) {
  console.error(`  ${v.file}:${v.line}  ${v.marker}  (${v.kind})  -- ${v.why}`);
}
console.error(`
A skipped test still lists, so the badge does not move and the suite still reports green.
Coverage leaves without a single red signal. That is why this is a gate and not a warning.

An expected failure keeps its coverage, but it is still a green report over a known defect, and one
that goes on reporting green if it later fails for an entirely different reason. It has to name what
it is waiting for.

Say so on the line above, with at least ${MIN_REASON} characters, using the keyword for what it is:

    // DISABLED: <what is broken, and the decision or issue that covers it>
    // KNOWN FAILURE: <the defect it pins, and where that defect is written down>

If an agent wrote this, do not accept it. Read the failure instead:
quality/e2e/.claude/agents/playwright-test-healer.md forbids skipping on its own authority.
`);
process.exit(1);
