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
//   Only the GATED zone: quality/e2e/tests/ and quality/e2e/tests-prod/. The `generated` project in
//   tests-generated/ is the authoring zone, where drafts are expected to be broken, half-finished
//   and skipped. Applying this rule there would make the quarantine useless.
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
// WHY NOT IN THE PRE-COMMIT HOOK
//   .githooks/pre-commit answers one question fast: is anything staged that must not be published?
//   This is a correctness check, and its own comment says correctness belongs in CI. So this runs
//   in the e2e workflow, next to the test-count check.
//
// USAGE
//   node quality/tools/check-skips.mjs        exit 0 clean, exit 1 with file:line on a violation
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// The gated zone. Anything a merge depends on, and nothing else.
const GATED_DIRS = [
  path.join('quality', 'e2e', 'tests'),
  path.join('quality', 'e2e', 'tests-prod'),
];

// `test.only` is already refused in CI by forbidOnly in playwright.config.js, but only in CI, and
// only for `test.only`. It is listed here so a local run catches it too, and so the message is the
// same one in both places.
const DISABLERS = /\b(?:test|describe)\.(skip|fixme|only)\s*\(/;

// A justification is a comment naming a reason. It may sit on the marker's own line or the one
// above it, which is where a person writing prose naturally puts it.
const JUSTIFIED = /(?:\/\/|\/\*|\*)\s*DISABLED:\s*(.+)/;
const MIN_REASON = 25;

function specFiles(dir) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs, { withFileTypes: true }).flatMap((entry) => {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) return specFiles(rel);
    return entry.name.endsWith('.spec.js') ? [rel] : [];
  });
}

const violations = [];

for (const dir of GATED_DIRS) {
  for (const rel of specFiles(dir)) {
    const lines = fs.readFileSync(path.join(ROOT, rel), 'utf8').split(/\r?\n/);
    lines.forEach((line, i) => {
      const found = line.match(DISABLERS);
      if (!found) return;

      // `test.skip(condition, reason)` called INSIDE a test body is Playwright's conditional-skip
      // API and is a legitimate pattern (skip on a browser that cannot do the thing). It is
      // indistinguishable from the annotation form by regex alone, so treat a justified comment as
      // the answer for both: if you meant it, say why. That keeps one rule instead of two.
      const reason = (lines[i - 1] ?? '').match(JUSTIFIED) ?? line.match(JUSTIFIED);
      if (reason && reason[1].trim().length >= MIN_REASON) return;

      violations.push({
        file: rel.replace(/\\/g, '/'),
        line: i + 1,
        marker: `${found[0].replace(/\s*\($/, '')}`,
        why: reason ? `justification too short (${reason[1].trim().length}/${MIN_REASON} chars)` : 'no justification comment',
      });
    });
  }
}

if (violations.length === 0) {
  console.log(`check-skips: no disabled tests in the gated suite. OK`);
  process.exit(0);
}

console.error(`\ncheck-skips: ${violations.length} disabled test(s) in the gated suite.\n`);
for (const v of violations) {
  console.error(`  ${v.file}:${v.line}  ${v.marker}  -- ${v.why}`);
}
console.error(`
A skipped test still lists, so the badge does not move and the suite still reports green.
Coverage leaves without a single red signal. That is why this is a gate and not a warning.

If disabling it is the right call, say so on the line above, with at least ${MIN_REASON} characters:

    // DISABLED: <what is broken, and the decision or issue that covers it>

If an agent wrote this, do not accept it. Read the failure instead:
quality/e2e/.claude/agents/playwright-test-healer.md forbids skipping on its own authority.
`);
process.exit(1);
